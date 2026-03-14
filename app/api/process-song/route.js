import { NextResponse } from 'next/server'
import axios from 'axios'
import OpenAI from 'openai'
import { getClients, requireAuthedUser, requireApproved } from '../access/_utils'
import { fetchLyrics } from '@/lib/lyrics'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const AI_MODEL = 'gpt-4o-mini'

function normalizeWord(value) {
  return String(value || '')
    .trim()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    .toLowerCase()
}

export async function POST(request) {
  try {
    const { youtubeUrl, userId, authToken, language = 'italian', nativeLanguage = 'en' } = await request.json()

    if (!userId || !authToken) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
    }

    const { userClient, adminClient } = getClients(authToken)
    await requireAuthedUser(userClient, authToken, userId)
    await requireApproved(adminClient, userId)

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' })
    }

    // Get song info
    const songInfo = await getSongInfo(videoId)

    // Get lyrics
    const lyricsText = await getLyrics(songInfo.title, songInfo.artist)

    const languageLabel = getLearningLangName(language)
    const languageCode = getLearningLangCode(language)
    const nativeLangName = getNativeLangName(nativeLanguage)

    // Run all 3 AI calls IN PARALLEL to stay within Vercel timeout
    const [summary, bilingualLyrics, vocabulary] = await Promise.all([
      generateSummary(songInfo.title, songInfo.artist, lyricsText, languageLabel, nativeLangName),
      generateBilingualLyrics(lyricsText, languageLabel, languageCode, nativeLangName),
      extractVocabulary(lyricsText, languageLabel, nativeLangName)
    ])

    // Save song to database
    const { data: song, error: songError } = await userClient
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

    // Build a set of existing words for this user to avoid duplicates globally.
    const { data: existingWordsRows } = await userClient
      .from('vocabulary')
      .select('italian_word, songs!inner(user_id)')

    const existingWords = new Set(
      (existingWordsRows || [])
        .map((row) => normalizeWord(row.italian_word))
        .filter(Boolean)
    )

    const seenInThisBatch = new Set()
    const vocabularyRecords = []

    for (const word of vocabulary || []) {
      const rawWord = word.word || word.italian || word.spanish || word.english || ''
      const rawTranslation = word.translation || word.english || ''
      const normalized = normalizeWord(rawWord)
      if (!normalized) continue
      if (existingWords.has(normalized)) continue
      if (seenInThisBatch.has(normalized)) continue

      seenInThisBatch.add(normalized)
      vocabularyRecords.push({
        song_id: song.id,
        italian_word: normalized,
        english_translation: String(rawTranslation || '').trim() || normalized,
        context: String(word.context || '').trim()
      })
    }

    if (vocabularyRecords.length > 0) {
      const { error: vocabError } = await userClient
        .from('vocabulary')
        .insert(vocabularyRecords)

      if (vocabError) throw vocabError
    }

    return NextResponse.json({
      success: true,
      song,
      vocabularyCount: vocabularyRecords.length,
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
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { timeout: 5000 }
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
  try {
    const lyrics = await fetchLyrics(artist, title)
    if (lyrics && lyrics.trim().length > 50) {
      return lyrics.trim()
    }
  } catch (err) {
    console.error('fetchLyrics failed:', err.message)
  }

  // Last resort: ask AI to generate approximate lyrics from memory
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{
        role: 'user',
        content: `Write the full lyrics of the song "${title}" by ${artist}. Write ONLY the lyrics, nothing else. If you don't know the exact lyrics, write as close as you can remember.`
      }],
      temperature: 0.3,
      max_tokens: 3000
    })
    const aiLyrics = response.choices[0].message.content.trim()
    if (aiLyrics.length > 50) return aiLyrics
  } catch (err) {
    console.error('AI lyrics fallback failed:', err.message)
  }

  throw new Error('Could not find lyrics for this song.')
}

const NATIVE_LANG_NAMES = { en: 'English', he: 'Hebrew', pt: 'Portuguese' }
const LEARNING_LANG_NAMES = { italian: 'Italian', spanish: 'Spanish', english: 'English' }

function getNativeLangName(code) { return NATIVE_LANG_NAMES[code] || 'English' }
function getLearningLangName(code) { return LEARNING_LANG_NAMES[code] || 'Italian' }
function getLearningLangCode(language) {
  if (language === 'spanish') return 'es'
  if (language === 'english') return 'en'
  return 'it'
}

async function generateSummary(title, artist, lyrics, languageLabel, nativeLangName) {
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: `You are a music expert. Write a brief, engaging 2-3 sentence summary of this ${languageLabel} song in ${nativeLangName}:\n\nTitle: "${title}" by ${artist}\n\nLyrics excerpt:\n${lyrics.substring(0, 500)}...\n\nWrite the summary in ${nativeLangName}. Describe the song's theme, mood, and what it's about.` }],
      temperature: 0.7,
      max_tokens: 400
    })
    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error generating summary:', error)
    return `A beautiful ${languageLabel} song by ${artist}.`
  }
}

async function generateBilingualLyrics(lyrics, languageLabel, languageCode, nativeLangName) {
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: `Translate these ${languageLabel} lyrics to ${nativeLangName} line by line. Return ONLY a JSON array where each object has:\n- "${languageCode}": the original ${languageLabel} line\n- "translation": the ${nativeLangName} translation\n\nFormat:\n[\n  {"${languageCode}": "original line", "translation": "translated line"},\n  {"${languageCode}": "", "translation": ""}\n]\n\nLyrics:\n${lyrics}\n\nReturn ONLY the JSON array, no other text.` }],
      temperature: 0.3,
      max_tokens: 4000
    })

    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])

    return lyrics.split('\n').map(line => ({ [languageCode]: line, translation: '' }))
  } catch (error) {
    console.error('Error generating bilingual lyrics:', error)
    return lyrics.split('\n').map(line => ({ [languageCode]: line, translation: '' }))
  }
}

async function extractVocabulary(lyrics, languageLabel, nativeLangName) {
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: `You are a ${languageLabel} language teacher. Analyze these ${languageLabel} song lyrics and extract 30-50 vocabulary words for language learners.\n\nFor each word, provide:\n1. The ${languageLabel} word (key: "word")\n2. ${nativeLangName} translation (key: "translation")\n3. Context phrase from lyrics (key: "context")\n\nReturn ONLY a JSON array:\n[\n  {"word": "...", "translation": "...", "context": "..."}\n]\n\nLyrics:\n${lyrics}\n\nFocus on verbs, nouns, adjectives, adverbs, expressions. Skip basic articles and pronouns.` }],
      temperature: 0.7,
      max_tokens: 4000
    })

    const content = response.choices[0].message.content
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return []
  } catch (error) {
    console.error('Error extracting vocabulary:', error)
    return []
  }
}
