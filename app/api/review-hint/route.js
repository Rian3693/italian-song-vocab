import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getClients, requireAuthedUser, requireApproved } from '../access/_utils'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  if (!setA.size || !setB.size) return 0

  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection += 1
  }
  const union = setA.size + setB.size - intersection
  return union ? intersection / union : 0
}

function safeFallback(word, translation, language) {
  const fallback = language === 'spanish'
    ? `Cuando escucho la cancion, repito la palabra ${word}.`
    : `Quando ascolto la canzone, ripeto la parola ${word}.`

  return {
    sentence: fallback,
    translation: translation || '',
    contextTranslation: ''
  }
}

async function translateContext(context, targetLangName = 'English') {
  if (!openai || !context) return ''

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'Return only valid JSON with key: translation.'
      },
      {
        role: 'user',
        content: `Translate this sentence to ${targetLangName}. Return only the translation text in JSON. Sentence: "${context}"`
      }
    ],
    response_format: { type: 'json_object' }
  })

  const raw = completion.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw)
  return String(parsed?.translation || '').trim()
}

export async function POST(req) {
  try {
    const body = await req.json()
    const userId = String(body?.userId || '').trim()
    const authToken = String(body?.authToken || '').trim()
    const word = String(body?.word || '').trim()
    const translation = String(body?.translation || '').trim()
    const language = String(body?.language || 'italian').toLowerCase()
    const nativeLanguage = String(body?.nativeLanguage || 'en').toLowerCase()
    const context = String(body?.context || '').trim()

    if (!userId || !authToken) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    const { userClient, adminClient } = getClients(authToken)
    await requireAuthedUser(userClient, authToken, userId)
    await requireApproved(adminClient, userId)

    if (!openai) {
      return NextResponse.json(safeFallback(word, translation, language))
    }

    const targetLanguageName = language === 'spanish' ? 'Spanish' : language === 'english' ? 'English' : 'Italian'
    const NATIVE_NAMES = { en: 'English', he: 'Hebrew', pt: 'Portuguese' }
    const nativeLangName = NATIVE_NAMES[nativeLanguage] || 'English'
    const sourceHint = context ? `\nContext from lyrics: ${context}` : ''

    const buildUserPrompt = (forceDifferent) => {
      const differenceRule = forceDifferent
        ? 'The generated sentence is currently too close to the lyric context. Rewrite it with different wording and structure while still using the target word.'
        : 'The generated sentence must not copy the lyric phrase or reuse the same structure. Use the target word in a different real-life situation.'

      return `Create one short, natural ${targetLanguageName} sentence that includes the word "${word}". ${differenceRule} Then provide a ${nativeLangName} translation. If context from lyrics is provided, also translate that context line to ${nativeLangName} and place it in contextTranslation. Use an empty string when context is missing.${sourceHint}`
    }

    const runGeneration = async (forceDifferent = false) => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.75,
        messages: [
          {
            role: 'system',
            content: 'You are a language tutor. Return only valid JSON with keys: sentence, translation, contextTranslation.'
          },
          {
            role: 'user',
            content: buildUserPrompt(forceDifferent)
          }
        ],
        response_format: { type: 'json_object' }
      })

      const raw = completion.choices?.[0]?.message?.content || '{}'
      const parsed = JSON.parse(raw)
      return {
        sentence: String(parsed?.sentence || '').trim(),
        translation: String(parsed?.translation || '').trim(),
        contextTranslation: String(parsed?.contextTranslation || '').trim()
      }
    }

    let generated = await runGeneration(false)

    if (context && generated.sentence && jaccardSimilarity(generated.sentence, context) > 0.45) {
      generated = await runGeneration(true)
    }

    const sentence = generated.sentence
    const english = generated.translation
    let contextTranslation = generated.contextTranslation

    // If the "translation" is missing or looks too similar to the original line,
    // force a dedicated translation pass to avoid showing duplicated text.
    if (
      context &&
      (!contextTranslation || jaccardSimilarity(contextTranslation, context) > 0.45)
    ) {
      try {
        const forcedTranslation = await translateContext(context, nativeLangName)
        if (forcedTranslation) {
          contextTranslation = forcedTranslation
        }
      } catch {
        // Ignore translation retry errors and keep best available text.
      }
    }

    if (!sentence) {
      return NextResponse.json(safeFallback(word, translation, language))
    }

    return NextResponse.json({
      sentence,
      translation: english || translation || '',
      contextTranslation
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate hint' }, { status: 500 })
  }
}
