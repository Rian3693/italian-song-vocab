const { getVideoInfo, fetchLyrics } = require('../../lib/youtube');
const { saveSong, saveFlashcards, setSelectedLanguage } = require('../../lib/db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: '10mb' },
  },
  maxDuration: 90,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { youtubeUrl, manualLyrics, language } = req.body;
  const selectedLanguage = language === 'spanish' ? 'spanish' : 'italian';
  const languageName = selectedLanguage === 'spanish' ? 'Spanish' : 'Italian';
  const languageCode = selectedLanguage === 'spanish' ? 'es' : 'it';
  if (!youtubeUrl) {
    return res.status(400).json({ error: 'YouTube URL required' });
  }
  
  console.log('\n🎵 NEW REQUEST:', youtubeUrl.substring(0, 50) + '...');
  if (manualLyrics) {
    console.log('📝 Manual lyrics provided');
  }
  const startTime = Date.now();
  
  try {
    // Step 1: Video info
    console.log('📹 [1/5] Getting video info...');
    const { title, artist } = await getVideoInfo(youtubeUrl);
    console.log(`   ✅ "${title}" by "${artist}" (${Date.now() - startTime}ms)`);
    
    // Step 2: Lyrics
    let lyrics;
    if (manualLyrics && manualLyrics.trim().length > 50) {
      console.log('📝 [2/5] Using manual lyrics...');
      lyrics = manualLyrics.trim();
      console.log(`   ✅ ${lyrics.length} characters`);
    } else {
      console.log('🔍 [2/5] Searching lyrics...');
      try {
        lyrics = await fetchLyrics(artist, title, {
          youtubeUrl,
          language: selectedLanguage
        });
        console.log(`   ✅ Found (${Date.now() - startTime}ms)`);
      } catch (lyricsError) {
        console.error(`   ❌ ${lyricsError.message}`);
        return res.status(404).json({ 
          error: `Lyrics not found.\n\nSearched: "${artist}" - "${title}"\n\nReason: lyric sites often block/timeout automated requests for some songs.\n\nTip: Click "Paste them manually" below!`
        });
      }
    }

    // Step 3: Translation
    console.log(`🤖 [3/5] AI translating from ${languageName}...`);
    
    const combinedCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Clean and translate ${languageName} lyrics line-by-line. Return ONLY:
      {"translated": [{"${languageCode}": "line", "en": "translation"}, ...]}`
      }, {
        role: "user",
        content: lyrics
      }],
      temperature: 0.2
    });

    let translatedLyrics = [];
    try {
      let raw = combinedCompletion.choices[0].message.content;
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(raw);
      translatedLyrics = (parsed.translated || []).map((line) => ({
        it: line[languageCode] || line.it || line.es || '',
        en: line.en || ''
      }));
      console.log(`   ✅ ${translatedLyrics.length} lines (${Date.now() - startTime}ms)`);
    } catch (e) {
      console.error('   ⚠️ Parse error');
      translatedLyrics = lyrics.split('\n').map(l => ({ it: l.trim(), en: '' }));
    }
    
    const cleanedLyrics = translatedLyrics.map(l => l.it).join('\n');
    
    // Step 4 & 5: Flashcards + Summary (parallel)
    console.log('🧠 [4/5] Generating flashcards + summary...');
    
    const [vocabResult, summaryResult] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `Extract 15-20 ${languageName} words from the lyrics. Return ONLY JSON array:
[{"italian":"word in ${languageName}","english":"English translation","example":"line from lyrics in ${languageName}","example_english":"English translation","ai_example":"new ${languageName} sentence using the word","ai_example_english":"English translation"}]`
        }, {
          role: "user",
          content: cleanedLyrics
        }],
        temperature: 0.3
      }),
      
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "Summarize in 2 sentences (English)."
        }, {
          role: "user",
          content: `"${title}" by ${artist}\n${cleanedLyrics}`
        }],
        temperature: 0.5
      })
    ]);
    
    let vocabulary = [];
    try {
      let raw = vocabResult.choices[0].message.content;
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      vocabulary = JSON.parse(raw);
      console.log(`   ✅ ${vocabulary.length} flashcards (${Date.now() - startTime}ms)`);
    } catch (e) {
      console.error('   ⚠️ Vocab parse failed');
    }
    
    const summary = summaryResult.choices[0].message.content;
    
    // Step 6: Save
    console.log('💾 [5/5] Saving...');
    const sanitized = vocabulary.map(v => ({
      italian: String(v.italian || ''),
      english: String(v.english || ''),
      example: String(v.example || ''),
      example_english: String(v.example_english || ''),
      ai_example: String(v.ai_example || ''),
      ai_example_english: String(v.ai_example_english || '')
    }));

    const songId = saveSong(
      youtubeUrl,
      title,
      artist,
      JSON.stringify(translatedLyrics),
      summary,
      selectedLanguage
    );
    saveFlashcards(songId, sanitized, selectedLanguage);
    setSelectedLanguage(selectedLanguage);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ DONE in ${totalTime}s\n`);
    
    res.status(200).json({
      success: true,
      songId,
      title,
      artist,
      language: selectedLanguage,
      summary,
      vocabularyCount: vocabulary.length
    });
    
  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ FAILED after ${totalTime}s:`, error.message);
    res.status(500).json({ 
      error: `Processing failed: ${error.message}`
    });
  }
}
