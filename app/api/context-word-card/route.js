import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getClients, requireAuthedUser, requireApproved } from '../access/_utils'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

function normalizeWord(word) {
  return String(word || '')
    .trim()
    .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')
    .toLowerCase()
}

const NATIVE_NAMES = { en: 'English', he: 'Hebrew', pt: 'Portuguese' }
const LEARNING_NAMES = { italian: 'Italian', spanish: 'Spanish', english: 'English' }

async function generateCardData(word, language, sourceSentence, nativeLang = 'en') {
  if (!openai) {
    return {
      translation: word,
      context: sourceSentence || ''
    }
  }

  const languageName = LEARNING_NAMES[language] || 'Italian'
  const nativeLangName = NATIVE_NAMES[nativeLang] || 'English'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Return only valid JSON with keys: translation and context.'
      },
      {
        role: 'user',
        content: `For the ${languageName} word "${word}", provide a ${nativeLangName} translation and one short ${languageName} context sentence that uses this word naturally. If a source sentence is provided, make the new context sentence different in wording and structure. Source sentence: ${sourceSentence || 'N/A'}`
      }
    ]
  })

  const raw = response.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw)

  return {
    translation: String(parsed?.translation || '').trim() || word,
    context: String(parsed?.context || '').trim() || sourceSentence || ''
  }
}

export async function POST(request) {
  try {
    const { userId, authToken, songId, language = 'italian', nativeLanguage = 'en', word, sourceSentence = '' } = await request.json()

    if (!userId || !authToken || !songId || !word) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const cleanWord = normalizeWord(word)
    if (!cleanWord || cleanWord.length < 2) {
      return NextResponse.json({ success: false, error: 'Invalid word' }, { status: 400 })
    }

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

    const { adminClient } = getClients(authToken)
    await requireAuthedUser(supabase, authToken, userId)
    await requireApproved(adminClient, userId)

    const { data: existingCard } = await supabase
      .from('vocabulary')
      .select('id, italian_word, song_id, songs!inner(user_id)')
      .eq('songs.user_id', userId)
      .ilike('italian_word', cleanWord)
      .limit(1)
      .maybeSingle()

    if (existingCard?.id) {
      return NextResponse.json({
        success: true,
        created: false,
        vocabularyId: existingCard.id,
        word: existingCard.italian_word
      })
    }

    const generated = await generateCardData(cleanWord, language, sourceSentence, nativeLanguage)

    const { data: insertedCard, error: insertError } = await supabase
      .from('vocabulary')
      .insert({
        song_id: songId,
        italian_word: cleanWord,
        english_translation: generated.translation,
        context: generated.context,
        times_reviewed: 0
      })
      .select('id, italian_word, english_translation')
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      created: true,
      vocabularyId: insertedCard.id,
      word: insertedCard.italian_word,
      translation: insertedCard.english_translation
    })
  } catch (error) {
    console.error('Failed to create context-word flashcard:', error)
    return NextResponse.json({ success: false, error: 'Failed to create flashcard' }, { status: 500 })
  }
}
