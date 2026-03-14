import axios from 'axios'
import * as cheerio from 'cheerio'

function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ])
}

function cleanSearchTerm(term) {
  return term.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim()
}

async function fetchFromMusixmatch(artist, title) {
  const cleanArtist = artist.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase()
  const cleanTitle = title.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase()
  const url = `https://www.musixmatch.com/lyrics/${cleanArtist}/${cleanTitle}`

  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 9000
  })

  const $ = cheerio.load(response.data)
  let lyrics = ''
  $('span.lyrics__content__ok').each((i, elem) => {
    lyrics += $(elem).text() + '\n'
  })

  if (lyrics.trim().length > 50) return lyrics.trim()
  throw new Error('No lyrics on Musixmatch')
}

async function fetchFromMusixmatchTitleOnly(title) {
  const searchUrl = `https://www.musixmatch.com/search/${encodeURIComponent(title)}`
  const response = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 9000
  })

  const $ = cheerio.load(response.data)
  const firstLink = $('a[href*="/lyrics/"]').first().attr('href')
  if (!firstLink) throw new Error('No results')

  const page = await axios.get(`https://www.musixmatch.com${firstLink}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 9000
  })

  const $$ = cheerio.load(page.data)
  let lyrics = ''
  $$('span.lyrics__content__ok').each((i, elem) => {
    lyrics += $$(elem).text() + '\n'
  })

  if (lyrics.trim().length > 50) return lyrics.trim()
  throw new Error('No lyrics')
}

async function fetchFromAZLyrics(artist, title) {
  const cleanArtist = artist.replace(/\s+/g, '').replace(/[^\w]/g, '').toLowerCase()
  const cleanTitle = title.replace(/\s+/g, '').replace(/[^\w]/g, '').toLowerCase()
  const url = `https://www.azlyrics.com/lyrics/${cleanArtist}/${cleanTitle}.html`

  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 5000
  })

  const $ = cheerio.load(response.data)
  let lyrics = ''
  $('div').each((i, elem) => {
    const html = $(elem).html()
    if (html && html.includes('<!-- Usage of azlyrics.com content -->')) {
      lyrics = $(elem).text().trim()
      return false
    }
  })

  if (lyrics.length > 50) return lyrics
  throw new Error('No lyrics on AZLyrics')
}

async function fetchFromLyricsCom(artist, title) {
  const searchUrl = `https://www.lyrics.com/serp.php?st=${encodeURIComponent(artist + ' ' + title)}`

  const response = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 5000
  })

  const $ = cheerio.load(response.data)
  const firstLink = $('a[href*="/lyric/"]').first().attr('href')
  if (!firstLink) throw new Error('No results')

  const lyricsUrl = firstLink.startsWith('http') ? firstLink : `https://www.lyrics.com${firstLink}`
  const page = await axios.get(lyricsUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 5000
  })

  const $$ = cheerio.load(page.data)
  const lyrics = $$('#lyric-body-text').text().trim()

  if (lyrics.length > 50) return lyrics
  throw new Error('No lyrics on Lyrics.com')
}

async function fetchFromGeniusSearch(artist, title) {
  const searchUrl = `https://genius.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`
  const response = await axios.get(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 8000
  })

  const $ = cheerio.load(response.data)
  let lyricsUrl = null

  $('a[href*="genius.com/"]').each((i, el) => {
    const href = $(el).attr('href')
    if (!href) return
    if (href.includes('/lyrics') || href.endsWith('-lyrics')) {
      lyricsUrl = href
      return false
    }
  })

  if (!lyricsUrl) throw new Error('No Genius search result')

  const page = await axios.get(lyricsUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 8000
  })

  const $$ = cheerio.load(page.data)
  let lyrics = ''

  $$('div[data-lyrics-container="true"]').each((i, elem) => {
    lyrics += $$(elem).text() + '\n'
  })

  if (lyrics.trim().length > 50) return lyrics.trim()
  throw new Error('No lyrics on Genius page')
}

async function fetchFromLrcLib(artist, title) {
  const searchUrl = 'https://lrclib.net/api/search'
  const response = await axios.get(searchUrl, {
    params: { artist_name: artist, track_name: title },
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 8000
  })

  const rows = Array.isArray(response.data) ? response.data : []
  if (rows.length === 0) throw new Error('No LRCLIB results')

  const normalizedArtist = artist.toLowerCase()
  const normalizedTitle = title.toLowerCase()
  const bestMatch =
    rows.find(r =>
      String(r.artistName || '').toLowerCase().includes(normalizedArtist) &&
      String(r.trackName || '').toLowerCase().includes(normalizedTitle)
    ) || rows[0]

  const plain = String(bestMatch.plainLyrics || '').trim()
  if (plain.length > 50) return plain

  const synced = String(bestMatch.syncedLyrics || '')
    .replace(/\[[^\]]+\]/g, '')
    .trim()
  if (synced.length > 50) return synced

  throw new Error('LRCLIB result had no usable lyrics')
}

export async function fetchLyrics(artist, title) {
  console.log(`Searching lyrics: "${artist}" - "${title}"`)

  return await withTimeout(
    (async () => {
      const cleanArtist = cleanSearchTerm(artist)
      const cleanTitle = cleanSearchTerm(title)

      const sources = [
        { name: 'LrcLib', run: () => fetchFromLrcLib(cleanArtist, cleanTitle) },
        { name: 'Musixmatch', run: () => fetchFromMusixmatch(cleanArtist, cleanTitle) },
        { name: 'AZLyrics', run: () => fetchFromAZLyrics(cleanArtist, cleanTitle) },
        { name: 'LyricsCom', run: () => fetchFromLyricsCom(cleanArtist, cleanTitle) },
        { name: 'GeniusSearch', run: () => fetchFromGeniusSearch(cleanArtist, cleanTitle) },
      ]

      for (const source of sources) {
        try {
          console.log(`  -> ${source.name}...`)
          const result = await source.run()
          console.log(`  OK from ${source.name}`)
          return result
        } catch (e) {
          console.log(`  X ${source.name}: ${e.message}`)
        }
      }

      // Title-only fallback
      try {
        console.log('  -> Musixmatch title-only...')
        return await fetchFromMusixmatchTitleOnly(cleanTitle)
      } catch (e) {
        console.log(`  X ${e.message}`)
      }

      throw new Error('Could not find lyrics from any source')
    })(),
    25000,
    'Lyrics search timeout (>25s)'
  )
}
