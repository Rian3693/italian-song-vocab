import { NextResponse } from 'next/server'
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
    const languageLabel = getLearningLangName(language)
    const languageCode = getLearningLangCode(language)
    const nativeLangName = getNativeLangName(nativeLanguage)

    // Fetch real lyrics
    let lyricsText = ''
    try {
      const lyrics = await fetchLyrics(song.artist, song.title)
      if (lyrics && lyrics.trim().length > 50) lyricsText = lyrics.trim()
    } catch (err) {
      console.error('fetchLyrics failed:', err.message)
    }

    // AI fallback for lyrics
    if (!lyricsText) {
      try {
        const response = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [{
            role: 'user',
            content: `Write the full lyrics of the song "${song.title}" by ${song.artist}. Write ONLY the lyrics, nothing else.`
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

    // Run all 3 AI calls in parallel
    const [summary, bilingualLyrics, vocabulary] = await Promise.all([
      (async () => {
        try {
          const r = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [{ role: 'user', content: `You are a music expert. Write a brief 2-3 sentence summary of this ${languageLabel} song in ${nativeLangName}:\n\nTitle: "${song.title}" by ${song.artist}\n\nLyrics excerpt:\n${lyricsText.substring(0, 500)}...\n\nWrite in ${nativeLangName}.` }],
            temperature: 0.7,
            max_tokens: 400
          })
          return r.choices[0].message.content.trim()
        } catch { return song.summary || '' }
      })(),
      (async () => {
        try {
          const r = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [{ role: 'user', content: `Translate these ${languageLabel} lyrics to ${nativeLangName} line by line. Return ONLY a JSON array:\n[{"${languageCode}": "original", "translation": "translated"}]\n\nLyrics:\n${lyricsText}\n\nReturn ONLY the JSON array.` }],
            temperature: 0.3,
            max_tokens: 4000
          })
          const content = r.choices[0].message.content
          const match = content.match(/\[[\s\S]*\]/)
          if (match) return JSON.parse(match[0])
        } catch {}
        return lyricsText.split('\n').map(line => ({ [languageCode]: line, translation: '' }))
      })(),
      (async () => {
        try {
          const r = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [{ role: 'user', content: `Extract 30-50 ${languageLabel} vocabulary words from these lyrics. Return ONLY JSON:\n[{"word": "...", "translation": "${nativeLangName} translation", "context": "phrase from lyrics"}]\n\nLyrics:\n${lyricsText}\n\nSkip basic articles and pronouns.` }],
            temperature: 0.7,
            max_tokens: 4000
          })
          const content = r.choices[0].message.content
          const match = content.match(/\[[\s\S]*\]/)
          if (match) return JSON.parse(match[0])
        } catch {}
        return []
      })()
    ])

    // Update song
    await userClient
      .from('songs')
      .update({ lyrics: JSON.stringify(bilingualLyrics), summary })
      .eq('id', songId)

    // Delete old vocabulary
    await adminClient
      .from('vocabulary')
      .delete()
      .eq('song_id', songId)

    // Build existing words set
    const { data: existingWordsRows } = await userClient
      .from('vocabulary')
      .select('italian_word, songs!inner(user_id)')

    const existingWords = new Set(
      (existingWordsRows || []).map(r => normalizeWord(r.italian_word)).filter(Boolean)
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
      lyricsFound: true
    })
  } catch (error) {
    console.error('Error reprocessing song:', error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
