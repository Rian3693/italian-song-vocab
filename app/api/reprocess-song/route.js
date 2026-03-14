import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getClients, requireAuthedUser, requireApproved } from '../access/_utils'
import { fetchLyrics } from '@/lib/lyrics'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function normalizeWord(value) {
  return String(value || '')
    .trim()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    .toLowerCase()
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

export async function POST(request) {
  try {
    const { songId, userId, authToken, nativeLanguage = 'en' } = await request.json()

    if (!userId || !authToken || !songId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
    }

    const { userClient, adminClient } = getClients(authToken)
    await requireAuthedUser(userClient, authToken, userId)
    await requireApproved(adminClient, userId)

    // Get the existing song
    const { data: song, error: songError } = await userClient
      .from('songs')
      .select('*')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (songError || !song) {
      return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 })
    }

    const language = song.language || 'italian'
    const youtubeUrl = song.youtube_url

    // Fetch real lyrics
    let lyricsText = ''
    try {
      const lyrics = await fetchLyrics(song.artist, song.title)
      if (lyrics && lyrics.trim().length > 50) {
        lyricsText = lyrics.trim()
      }
    } catch (err) {
      console.error('fetchLyrics failed:', err.message)
    }

    // AI fallback for lyrics
    if (!lyricsText) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: `Write the full lyrics of the song "${song.title}" by ${song.artist}. Write ONLY the lyrics, nothing else. If you don't know the exact lyrics, write as close as you can remember.`
          }],
          temperature: 0.3,
          max_tokens: 3000
        })
        const aiLyrics = response.choices[0].message.content.trim()
        if (aiLyrics.length > 50) lyricsText = aiLyrics
      } catch (err) {
        console.error('AI lyrics fallback failed:', err.message)
      }
    }

    if (!lyricsText) {
      return NextResponse.json({ success: false, error: 'Could not find lyrics for this song' })
    }

    // Generate summary
    const languageLabel = getLearningLangName(language)
    const nativeLangName = getNativeLangName(nativeLanguage)
    let summary = song.summary

    try {
      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: `You are a music expert. Write a brief, engaging 2-3 sentence summary of this ${languageLabel} song in ${nativeLangName}:\n\nTitle: "${song.title}" by ${song.artist}\n\nLyrics excerpt:\n${lyricsText.substring(0, 500)}...\n\nWrite the summary in ${nativeLangName}. Describe the song's theme, mood, and what it's about. Be concise and interesting.` }],
        temperature: 0.7,
        max_tokens: 400
      })
      summary = summaryResponse.choices[0].message.content.trim()
    } catch (err) {
      console.error('Summary generation failed:', err.message)
    }

    // Generate bilingual lyrics
    const languageCode = getLearningLangCode(language)
    let bilingualLyrics

    try {
      const bilingualResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: `Translate these ${languageLabel} lyrics to ${nativeLangName} line by line. Return ONLY a JSON array where each object has:\n- "${languageCode}": the original ${languageLabel} line\n- "translation": the ${nativeLangName} translation\n\nFormat:\n[\n  {"${languageCode}": "original line", "translation": "translated line"},\n  {"${languageCode}": "", "translation": ""} // for blank lines\n]\n\nLyrics:\n${lyricsText}\n\nReturn ONLY the JSON array, no other text.` }],
        temperature: 0.3,
        max_tokens: 3000
      })
      const content = bilingualResponse.choices[0].message.content
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        bilingualLyrics = JSON.parse(jsonMatch[0])
      }
    } catch (err) {
      console.error('Bilingual lyrics failed:', err.message)
    }

    if (!bilingualLyrics) {
      bilingualLyrics = lyricsText.split('\n').map(line => ({
        [languageCode]: line,
        translation: ''
      }))
    }

    // Update song with new lyrics and summary
    const { error: updateError } = await userClient
      .from('songs')
      .update({
        lyrics: JSON.stringify(bilingualLyrics),
        summary: summary
      })
      .eq('id', songId)

    if (updateError) throw updateError

    // Delete old vocabulary for this song
    const { error: deleteVocabError } = await adminClient
      .from('vocabulary')
      .delete()
      .eq('song_id', songId)

    if (deleteVocabError) {
      console.error('Failed to delete old vocab:', deleteVocabError)
    }

    // Extract new vocabulary
    let vocabulary = []
    try {
      const vocabResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: `You are a ${languageLabel} language teacher. Analyze these ${languageLabel} song lyrics and extract 30-50 vocabulary words for language learners. Extract as many useful words as possible.\n\nFor each word, provide:\n1. The ${languageLabel} word (use key "word")\n2. ${nativeLangName} translation (use key "translation")\n3. The context/phrase from the lyrics where it appears (use key "context")\n\nReturn ONLY a JSON array in this exact format:\n[\n  {\n    "word": "${languageLabel} word here",\n    "translation": "${nativeLangName} translation here",\n    "context": "phrase from lyrics"\n  }\n]\n\nLyrics:\n${lyricsText}\n\nFocus on:\n- All verbs, nouns, adjectives, and adverbs\n- Useful everyday expressions\n- Words that are not too basic (skip articles like "il", "la", "el", basic pronouns like "io", "tu", "yo")\n- Include any interesting idioms or expressions\n- Include conjugated verb forms with their infinitive as the word` }],
        temperature: 0.7,
        max_tokens: 4000
      })

      const content = vocabResponse.choices[0].message.content
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) vocabulary = JSON.parse(jsonMatch[0])
    } catch (err) {
      console.error('Vocabulary extraction failed:', err.message)
    }

    // Build existing words set (from OTHER songs, not this one since we deleted its vocab)
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
        song_id: songId,
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
      vocabularyCount: vocabularyRecords.length,
      lyricsFound: lyricsText.length > 50
    })
  } catch (error) {
    console.error('Error reprocessing song:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}
