import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request) {
  try {
    const { youtubeUrl, userId, authToken, language = 'italian' } = await request.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    )

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' })
    }

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' })
    }

    // Get song info
    const songInfo = await getSongInfo(videoId)
    
    // Get lyrics
    const lyricsText = await getLyrics(songInfo.title, songInfo.artist)
    
    // Generate summary using AI
    const summary = await generateSummary(songInfo.title, songInfo.artist, lyricsText, language)
    
    // Generate bilingual lyrics with translations
    const bilingualLyrics = await generateBilingualLyrics(lyricsText, language)
    
    // Extract vocabulary using AI
    const vocabulary = await extractVocabulary(lyricsText, songInfo.title, language)

    // Save song to database
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        user_id: userId,
        title: songInfo.title,
        artist: songInfo.artist,
        youtube_url: youtubeUrl,
        lyrics: JSON.stringify(bilingualLyrics),
        summary: summary,
        language: language
      })
      .select()
      .single()

    if (songError) throw songError

    // Save vocabulary to database
    const vocabularyRecords = vocabulary.map(word => ({
      song_id: song.id,
      italian_word: word.italian,
      english_translation: word.english,
      context: word.context
    }))

    const { error: vocabError } = await supabase
      .from('vocabulary')
      .insert(vocabularyRecords)

    if (vocabError) throw vocabError

    return NextResponse.json({ 
      success: true, 
      song,
      vocabularyCount: vocabulary.length,
      songId: song.id
    })
  } catch (error) {
    console.error('Error processing song:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    })
  }
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function getSongInfo(videoId) {
  try {
    const response = await axios.get(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    
    const fullTitle = response.data.title
    let artist = 'Unknown Artist'
    let title = fullTitle
    
    if (fullTitle.includes('-')) {
      const parts = fullTitle.split('-')
      artist = parts[0].trim()
      title = parts[1].trim()
    } else if (fullTitle.includes('|')) {
      const parts = fullTitle.split('|')
      artist = parts[0].trim()
      title = parts[1].trim()
    }
    
    return { title, artist }
  } catch (error) {
    return { title: 'Unknown Song', artist: 'Unknown Artist' }
  }
}

async function getLyrics(title, artist) {
  // Placeholder - you can integrate Genius API or Musixmatch here
  return `[Verse 1]\n(Lyrics placeholder - integrate lyrics API or paste manually)\n\n[Chorus]\n...`
}

async function generateSummary(title, artist, lyrics, language) {
  try {
    const languageLabel = language === 'spanish' ? 'Spanish' : 'Italian'
    
    const prompt = `You are a music expert. Write a brief, engaging 2-3 sentence summary of this ${languageLabel} song:

Title: "${title}" by ${artist}

Lyrics excerpt:
${lyrics.substring(0, 500)}...

Write a summary that describes the song's theme, mood, and what it's about. Be concise and interesting.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    })

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error generating summary:', error)
    return `A beautiful ${language === 'spanish' ? 'Spanish' : 'Italian'} song by ${artist}.`
  }
}

async function generateBilingualLyrics(lyrics, language) {
  try {
    const languageLabel = language === 'spanish' ? 'Spanish' : 'Italian'
    const languageCode = language === 'spanish' ? 'es' : 'it'
    
    const prompt = `Translate these ${languageLabel} lyrics to English line by line. Return ONLY a JSON array where each object has:
- "${languageCode}": the original ${languageLabel} line
- "en": the English translation

Format:
[
  {"${languageCode}": "original line", "en": "translation"},
  {"${languageCode}": "", "en": ""} // for blank lines
]

Lyrics:
${lyrics}

Return ONLY the JSON array, no other text.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 3000
    })

    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Fallback: simple structure
    return lyrics.split('\n').map(line => ({
      [languageCode]: line,
      en: ''
    }))
  } catch (error) {
    console.error('Error generating bilingual lyrics:', error)
    const languageCode = language === 'spanish' ? 'es' : 'it'
    return lyrics.split('\n').map(line => ({
      [languageCode]: line,
      en: ''
    }))
  }
}

async function extractVocabulary(lyrics, songTitle, language) {
  try {
    const languageLabel = language === 'spanish' ? 'Spanish' : 'Italian'
    const languageCode = language === 'spanish' ? 'Spanish' : 'Italian'
    
    const prompt = `You are a ${languageLabel} language teacher. Analyze these ${languageLabel} song lyrics and extract the 15-20 most useful vocabulary words for language learners.

For each word, provide:
1. The ${languageLabel} word
2. English translation
3. The context/phrase from the lyrics where it appears

Return ONLY a JSON array in this exact format:
[
  {
    "italian": "word",
    "english": "translation",
    "context": "phrase from lyrics"
  }
]

Lyrics:
${lyrics}

Focus on:
- Common verbs and nouns
- Useful everyday expressions
- Words that are not too basic (skip "il", "la", "è", etc.)
- Include any interesting idioms or expressions`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })

    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    return []
  } catch (error) {
    console.error('Error extracting vocabulary:', error)
    return []
  }
}
