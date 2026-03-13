const youtubedl = require('youtube-dl-exec');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

async function getVideoInfo(youtubeUrl) {
  try {
    const info = await withTimeout(
      youtubedl(youtubeUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        skipDownload: true,
        noPlaylist: true
      }),
      10000,
      'YouTube timeout (>10s)'
    );
    
    const rawTitle = info.title || '';
    const rawUploader = info.uploader || info.channel || '';
    
    console.log(`   Raw: "${rawTitle}" by "${rawUploader}"`);
    
    const aiCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Extract clean artist and song title. Remove junk: "Official", "Video", "Audio", "VEVO", etc.

Return ONLY JSON:
{"artist": "Name", "title": "Song"}`
      }, {
        role: "user",
        content: `Title: "${rawTitle}"\nChannel: "${rawUploader}"`
      }],
      temperature: 0.1
    });
    
    let artist = '', title = '';
    
    try {
      let raw = aiCompletion.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(raw);
      artist = parsed.artist || rawUploader;
      title = parsed.title || rawTitle;
    } catch (e) {
      title = rawTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      artist = rawUploader.replace(/Official/gi, '').trim();
      
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
    }
    
    console.log(`   ✅ Cleaned: "${title}" by "${artist}"`);
    return { title, artist };
  } catch (error) {
    throw new Error(`Can't get video info: ${error.message}`);
  }
}

async function fetchLyrics(artist, title, options = {}) {
  console.log(`🔍 Searching: "${artist}" - "${title}"`);
  
  return await withTimeout(
    (async () => {
      const cleanArtist = cleanSearchTerm(artist);
      const cleanTitle = cleanSearchTerm(title);
      
      const sources = [
        { name: 'Musixmatch', run: () => fetchFromMusixmatch(cleanArtist, cleanTitle) },
        { name: 'AZLyrics', run: () => fetchFromAZLyrics(cleanArtist, cleanTitle) },
        { name: 'LyricsCom', run: () => fetchFromLyricsCom(cleanArtist, cleanTitle) },
        { name: 'GeniusSearch', run: () => fetchFromGeniusSearch(cleanArtist, cleanTitle) },
      ];

      for (const source of sources) {
        try {
          console.log(`  → ${source.name}...`);
          return await source.run();
        } catch (e) {
          console.log(`  ✗ ${e.message}`);
        }
      }
      
      console.log('  → AI Google Search (fallback)...');
      try {
        return await fetchViaAIGoogleSearch(cleanArtist, cleanTitle);
      } catch (e) {
        console.log(`  ✗ ${e.message}`);
      }
      
      console.log('  → Title-only fallback...');
      try {
        return await fetchFromMusixmatchTitleOnly(cleanTitle);
      } catch (e) {
        console.log(`  ✗ ${e.message}`);
      }

      console.log('  → LRCLIB fallback...');
      try {
        return await fetchFromLrcLib(cleanArtist, cleanTitle);
      } catch (e) {
        console.log(`  ✗ ${e.message}`);
      }

      if (options.youtubeUrl) {
        console.log('  → YouTube captions fallback...');
        try {
          return await fetchFromYouTubeCaptions(options.youtubeUrl, options.language);
        } catch (e) {
          console.log(`  ✗ ${e.message}`);
        }
      }
      
      throw new Error('Not found');
    })(),
    25000,
    'Lyrics timeout (>25s)'
  );
}

function stripVttMetadata(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .filter(line => !line.includes('-->'))
    .filter(line => !/^WEBVTT/i.test(line))
    .filter(line => !/^NOTE/i.test(line))
    .filter(line => !/^\d+$/.test(line))
    .join('\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
}

function parseJson3Captions(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const lines = [];

  for (const event of events) {
    const segs = Array.isArray(event?.segs) ? event.segs : [];
    const text = segs.map(seg => seg?.utf8 || '').join('').trim();
    if (!text) continue;
    lines.push(text);
  }

  return lines.join('\n').trim();
}

async function fetchFromYouTubeCaptions(youtubeUrl, language = 'italian') {
  const info = await withTimeout(
    youtubedl(youtubeUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      skipDownload: true,
      noPlaylist: true
    }),
    12000,
    'YouTube captions timeout (>12s)'
  );

  const langPrefix = language === 'spanish' ? 'es' : 'it';
  const subtitles = info?.subtitles || {};
  const auto = info?.automatic_captions || {};
  const keys = [...Object.keys(subtitles), ...Object.keys(auto)];

  const exactLang = keys.find(k => k.toLowerCase() === langPrefix);
  const prefixedLang = keys.find(k => k.toLowerCase().startsWith(`${langPrefix}-`));
  const anyLang = keys[0];
  const chosenLang = exactLang || prefixedLang || anyLang;

  if (!chosenLang) {
    throw new Error('No YouTube subtitles available');
  }

  const tracks = [
    ...(subtitles[chosenLang] || []),
    ...(auto[chosenLang] || [])
  ];

  if (tracks.length === 0) {
    throw new Error('No usable YouTube subtitle tracks');
  }

  const preferred =
    tracks.find(t => t.ext === 'vtt') ||
    tracks.find(t => t.ext === 'json3') ||
    tracks[0];

  if (!preferred?.url) {
    throw new Error('Subtitle track URL missing');
  }

  const response = await axios.get(preferred.url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 12000
  });

  let text = '';
  if (preferred.ext === 'json3') {
    text = parseJson3Captions(response.data);
  } else {
    text = stripVttMetadata(String(response.data || ''));
  }

  if (text.length > 50) {
    console.log(`    ✅ Found in YouTube captions (${chosenLang})!`);
    return text;
  }

  throw new Error('YouTube captions were empty');
}

async function fetchViaAIGoogleSearch(artist, title) {
  const searchQuery = `${artist} ${title} lyrics site:genius.com OR site:musixmatch.com OR site:azlyrics.com`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  
  const response = await axios.get(googleUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
    timeout: 8000
  });
  
  const $ = cheerio.load(response.data);
  
  let lyricsUrl = null;
  $('a').each((i, elem) => {
    const href = $(elem).attr('href');
    if (href && (href.includes('genius.com/') || href.includes('musixmatch.com/lyrics/') || href.includes('azlyrics.com/lyrics/'))) {
      const match = href.match(/url\?q=([^&]+)/);
      if (match) {
        lyricsUrl = decodeURIComponent(match[1]);
        return false;
      } else if (href.startsWith('http')) {
        lyricsUrl = href;
        return false;
      }
    }
  });
  
  if (!lyricsUrl) throw new Error('No lyrics page in Google results');
  
  const lyricsPage = await axios.get(lyricsUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000
  });
  
  const $$ = cheerio.load(lyricsPage.data);
  let lyrics = '';
  
  if (lyricsUrl.includes('genius.com')) {
    $$('div[class^="Lyrics__Container"]').each((i, elem) => {
      lyrics += $$(elem).text() + '\n';
    });
  } else if (lyricsUrl.includes('musixmatch.com')) {
    $$('span.lyrics__content__ok').each((i, elem) => {
      lyrics += $$(elem).text() + '\n';
    });
  } else if (lyricsUrl.includes('azlyrics.com')) {
    $$('div').each((i, elem) => {
      const html = $$(elem).html();
      if (html && html.includes('<!-- Usage of azlyrics.com')) {
        lyrics = $$(elem).text().trim();
        return false;
      }
    });
  }
  
  if (lyrics.trim().length > 50) {
    console.log('    ✅ Found via Google!');
    return lyrics.trim();
  }
  
  throw new Error('Could not extract lyrics');
}

async function fetchFromGeniusSearch(artist, title) {
  const searchUrl = `https://genius.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
  const response = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000
  });

  const $ = cheerio.load(response.data);
  let lyricsUrl = null;

  $('a[href*="genius.com/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (href.includes('/lyrics') || href.endsWith('-lyrics')) {
      lyricsUrl = href;
      return false;
    }
  });

  if (!lyricsUrl) {
    throw new Error('No Genius search result');
  }

  const page = await axios.get(lyricsUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000
  });

  const $$ = cheerio.load(page.data);
  let lyrics = '';

  $$('div[data-lyrics-container="true"]').each((i, elem) => {
    lyrics += $$(elem).text() + '\n';
  });

  if (lyrics.trim().length > 50) {
    console.log('    ✅ Found on Genius!');
    return lyrics.trim();
  }

  throw new Error('No lyrics on Genius page');
}

async function fetchFromLrcLib(artist, title) {
  const searchUrl = 'https://lrclib.net/api/search';
  const response = await axios.get(searchUrl, {
    params: {
      artist_name: artist,
      track_name: title
    },
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000
  });

  const rows = Array.isArray(response.data) ? response.data : [];
  if (rows.length === 0) {
    throw new Error('No LRCLIB results');
  }

  const normalizedArtist = artist.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const bestMatch =
    rows.find(r => String(r.artistName || '').toLowerCase().includes(normalizedArtist) && String(r.trackName || '').toLowerCase().includes(normalizedTitle)) ||
    rows[0];

  const plain = String(bestMatch.plainLyrics || '').trim();
  if (plain.length > 50) {
    console.log('    ✅ Found on LRCLIB!');
    return plain;
  }

  const synced = String(bestMatch.syncedLyrics || '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
  if (synced.length > 50) {
    console.log('    ✅ Found synced lyrics on LRCLIB!');
    return synced;
  }

  throw new Error('LRCLIB result had no usable lyrics');
}

function cleanSearchTerm(term) {
  return term.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchFromMusixmatch(artist, title) {
  const cleanArtist = artist.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
  const cleanTitle = title.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
  const url = `https://www.musixmatch.com/lyrics/${cleanArtist}/${cleanTitle}`;
  
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 9000
  });
  
  const $ = cheerio.load(response.data);
  let lyrics = '';
  $('span.lyrics__content__ok').each((i, elem) => {
    lyrics += $(elem).text() + '\n';
  });
  
  if (lyrics.trim().length > 50) {
    console.log('    ✅ Found!');
    return lyrics.trim();
  }
  throw new Error('No lyrics');
}

async function fetchFromMusixmatchTitleOnly(title) {
  const searchUrl = `https://www.musixmatch.com/search/${encodeURIComponent(title)}`;
  const response = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 9000
  });
  
  const $ = cheerio.load(response.data);
  const firstLink = $('a[href*="/lyrics/"]').first().attr('href');
  if (!firstLink) throw new Error('No results');
  
  const page = await axios.get(`https://www.musixmatch.com${firstLink}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 9000
  });
  
  const $$ = cheerio.load(page.data);
  let lyrics = '';
  $$('span.lyrics__content__ok').each((i, elem) => {
    lyrics += $$(elem).text() + '\n';
  });
  
  if (lyrics.trim().length > 50) {
    console.log('      ✅ Found!');
    return lyrics.trim();
  }
  throw new Error('No lyrics');
}

async function fetchFromAZLyrics(artist, title) {
  const cleanArtist = artist.replace(/\s+/g, '').replace(/[^\w]/g, '').toLowerCase();
  const cleanTitle = title.replace(/\s+/g, '').replace(/[^\w]/g, '').toLowerCase();
  const url = `https://www.azlyrics.com/lyrics/${cleanArtist}/${cleanTitle}.html`;
  
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 5000
  });
  
  const $ = cheerio.load(response.data);
  let lyrics = '';
  $('div').each((i, elem) => {
    const html = $(elem).html();
    if (html && html.includes('<!-- Usage of azlyrics.com content -->')) {
      lyrics = $(elem).text().trim();
      return false;
    }
  });
  
  if (lyrics.length > 50) {
    console.log('    ✅ Found!');
    return lyrics;
  }
  throw new Error('No lyrics');
}

async function fetchFromLyricsCom(artist, title) {
  const searchUrl = `https://www.lyrics.com/serp.php?st=${encodeURIComponent(artist + ' ' + title)}`;
  
  const response = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 5000
  });
  
  const $ = cheerio.load(response.data);
  const firstLink = $('a[href*="/lyric/"]').first().attr('href');
  if (!firstLink) throw new Error('No results');
  
  const lyricsUrl = firstLink.startsWith('http') ? firstLink : `https://www.lyrics.com${firstLink}`;
  const page = await axios.get(lyricsUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 5000
  });
  
  const $$ = cheerio.load(page.data);
  const lyrics = $$('#lyric-body-text').text().trim();
  
  if (lyrics.length > 50) {
    console.log('    ✅ Found!');
    return lyrics;
  }
  throw new Error('No lyrics');
}

module.exports = {
  getVideoInfo,
  fetchLyrics
};
