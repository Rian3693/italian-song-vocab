import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request) {
  try {
    const { youtubeUrl } = await request.json()

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' })
    }

    // Get song info and lyrics
    const songInfo = await getSongInfo(videoId)
    const lyrics = await getLyrics(songInfo.title, songInfo.artist)

    // Save song to database
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        title: songInfo.title,
        artist: songInfo.artist,
        youtube_url: youtubeUrl,
        lyrics: lyrics
      })
      .select()
      .single()

    if (songError) throw songError

    // Extract vocabulary using OpenAI
    const vocabulary = await extractVocabulary(lyrics, songInfo.title)

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

    return NextResponse.json({ success: true, song })
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
    // Use YouTube oEmbed API to get video title
    const response = await axios.get(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    
    const fullTitle = response.data.title
    
    // Try to split into artist and title
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
    console.error('Error getting song info:', error)
    return { title: 'Unknown Song', artist: 'Unknown Artist' }
  }
}

async function getLyrics(title, artist) {
  try {
    // Try Genius lyrics
    const searchQuery = encodeURIComponent(`${artist} ${title} lyrics`)
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    const $ = cheerio.load(response.data)
    
    // This is a simplified version - you might need to adjust based on actual HTML structure
    // For a production app, consider using a proper lyrics API like Genius API or Musixmatch
    
    return "Lyrics extraction placeholder - please paste lyrics manually or integrate a lyrics API"
  } catch (error) {
    console.error('Error fetching lyrics:', error)
    return "Could not fetch lyrics automatically"
  }
}

async function extractVocabulary(lyrics, songTitle) {
  try {
    const prompt = `You are an Italian language teacher. Analyze these Italian song lyrics and extract the 15-20 most useful vocabulary words for language learners.

For each word, provide:
1. The Italian word
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
