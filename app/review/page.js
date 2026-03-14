'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureApprovedOrRedirect } from '@/lib/access-client'
import { t, learningLanguageFullNames } from '@/lib/translations'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const DAILY_NEW_LIMIT_DEFAULT = 20
const DAILY_LIMIT_STORAGE_KEY = 'dailyNewCardsLimit'
const STUDY_NOW_SESSION_SIZE = 40
const AI_HINTS_STORAGE_PREFIX = 'reviewAiHints'

const aiHintDataByCardId = new Map()
const aiHintPromiseByCardId = new Map()

function getHintsStorageKey(userId) {
  return `${AI_HINTS_STORAGE_PREFIX}:${userId}`
}

function readStoredHints(userId) {
  if (typeof window === 'undefined' || !userId) return {}
  try {
    const raw = window.localStorage.getItem(getHintsStorageKey(userId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredHint(userId, cardId, hintData) {
  if (typeof window === 'undefined' || !userId || !cardId || !hintData?.sentence) return

  const current = readStoredHints(userId)
  current[cardId] = hintData
  window.localStorage.setItem(getHintsStorageKey(userId), JSON.stringify(current))
}

function calculateCustomSchedule(quality, previous = {}) {
  const dayMs = 24 * 60 * 60 * 1000
  const previousQuality = Number(previous.quality)
  const previousInterval = Number(previous.interval || 0)

  let intervalDays = 0
  let mastered = false

  if (quality === 4) {
    intervalDays = 1
  } else if (quality === 5) {
    if (previousQuality === 5 && previousInterval >= 30) {
      intervalDays = 36500
      mastered = true
    } else if (previousQuality === 5 && previousInterval >= 4) {
      intervalDays = 30
    } else {
      intervalDays = 4
    }
  } else {
    intervalDays = 0
  }

  return {
    mastered,
    interval: intervalDays,
    repetitions: quality <= 3 ? 0 : (Number(previous.repetitions || 0) + 1),
    easeFactor: Number(previous.easiness || 2.5),
    nextReview: intervalDays > 0
      ? new Date(Date.now() + intervalDays * dayMs).toISOString()
      : new Date().toISOString()
  }
}

function getStoredDailyLimit() {
  if (typeof window === 'undefined') return DAILY_NEW_LIMIT_DEFAULT
  const raw = window.localStorage.getItem(DAILY_LIMIT_STORAGE_KEY)
  const parsed = Number.parseInt(raw || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return DAILY_NEW_LIMIT_DEFAULT
  return parsed
}

function ReviewContent() {
  const [user, setUser] = useState(null)
  const [prefs, setPrefs] = useState(null)
  const [deck, setDeck] = useState([])
  const [sessionTotal, setSessionTotal] = useState(0)
  const [sessionDone, setSessionDone] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingReview, setSavingReview] = useState(false)
  const [aiHints, setAiHints] = useState({})
  const [creatingWord, setCreatingWord] = useState('')
  const [createdWords, setCreatedWords] = useState({})
  const [dailyNewLimit, setDailyNewLimit] = useState(DAILY_NEW_LIMIT_DEFAULT)
  const [newCardsLearnedToday, setNewCardsLearnedToday] = useState(0)
  const [emptyReason, setEmptyReason] = useState('no-cards')
  const [showGuide, setShowGuide] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const songId = searchParams.get('song')
  const reviewMode = searchParams.get('mode')
  const isStudyNowMode = reviewMode === 'all'
  const currentCard = deck[0]
  const lang = prefs?.native_language || 'en'

  useEffect(() => {
    const limit = getStoredDailyLimit()
    setDailyNewLimit(limit)
    loadReviewCards(limit)
  }, [songId, reviewMode])

  useEffect(() => {
    if (!deck.length) return
    if (showAnswer) return
    if (!currentCard?.italian_word) return

    const locale = currentCard.songs?.language === 'spanish' ? 'es-ES' : currentCard.songs?.language === 'english' ? 'en-US' : 'it-IT'
    speakWord(currentCard.italian_word, locale)
  }, [deck, showAnswer])

  useEffect(() => {
    if (!deck.length) return
    if (!currentCard?.id) return
    if (aiHints[currentCard.id]) return

    const cachedHint = aiHintDataByCardId.get(currentCard.id)
    if (cachedHint) {
      setAiHints(prev => ({ ...prev, [currentCard.id]: cachedHint }))
      return
    }

    generateAiHint(currentCard)
  }, [deck, aiHints])

  useEffect(() => {
    if (!user?.id) return
    const storedHints = readStoredHints(user.id)

    for (const [cardId, hint] of Object.entries(storedHints)) {
      if (hint?.sentence) {
        aiHintDataByCardId.set(cardId, hint)
      }
    }

    setAiHints(prev => ({ ...storedHints, ...prev }))
  }, [user?.id])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!showAnswer || savingReview) return

      if (event.key === '1') { event.preventDefault(); handleRating(0) }
      if (event.key === '2') { event.preventDefault(); handleRating(3) }
      if (event.key === '3') { event.preventDefault(); handleRating(4) }
      if (event.key === '4') { event.preventDefault(); handleRating(5) }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showAnswer, savingReview, deck])

  function speakWord(word, locale) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = locale
    utterance.rate = 0.85
    utterance.pitch = 1.0
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  function normalizeHintWord(word) {
    return String(word || '').trim().replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').toLowerCase()
  }

  async function createFlashcardFromHintWord(clickedWord) {
    const cleanWord = normalizeHintWord(clickedWord)
    if (!cleanWord || cleanWord.length < 2) return
    if (!currentCard?.song_id || !user?.id) return
    if (creatingWord) return

    const alreadyCreatedKey = `${currentCard.song_id}:${cleanWord}`
    if (createdWords[alreadyCreatedKey]) return

    try {
      setCreatingWord(cleanWord)
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Missing auth session')

      const response = await fetch('/api/context-word-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          authToken: token,
          songId: currentCard.song_id,
          language: currentCard.songs?.language || 'italian',
          nativeLanguage: prefs?.native_language || 'en',
          word: cleanWord,
          sourceSentence: currentHint?.sentence || currentCard.context || ''
        })
      })

      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Could not create flashcard')
      }

      setCreatedWords(prev => ({ ...prev, [alreadyCreatedKey]: true }))
    } catch (error) {
      console.error('Failed to create flashcard from hint word:', error)
      alert('Could not create flashcard from this word right now.')
    } finally {
      setCreatingWord('')
    }
  }

  function renderClickableHintSentence(sentence) {
    const text = sentence || ''
    const chunks = text.match(/[A-Za-z]+|[^A-Za-z]+/g) || [text]

    return chunks.map((chunk, index) => {
      const cleanWord = normalizeHintWord(chunk)
      const isWord = /^[A-Za-z]+$/.test(cleanWord)

      if (!isWord) return <span key={`sep-${index}`}>{chunk}</span>

      const alreadyCreatedKey = `${currentCard.song_id}:${cleanWord}`
      const isCreated = !!createdWords[alreadyCreatedKey]
      const isLoadingThisWord = creatingWord === cleanWord

      return (
        <button
          key={`w-${index}-${cleanWord}`}
          type="button"
          onClick={(e) => { e.stopPropagation(); createFlashcardFromHintWord(cleanWord) }}
          disabled={isLoadingThisWord || isCreated}
          className={`underline decoration-dotted px-[1px] rounded-sm ${isCreated ? 'text-emerald-700' : 'hover:text-indigo-600'} ${isLoadingThisWord ? 'opacity-60' : ''}`}
          title={isCreated ? 'Flashcard already created' : 'Create flashcard'}
        >
          {chunk}
        </button>
      )
    })
  }

  async function generateAiHint(card) {
    try {
      if (!aiHintPromiseByCardId.has(card.id)) {
        const hintPromise = (async () => {
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData?.session?.access_token
          if (!user?.id || !token) throw new Error('Missing auth session')

          const res = await fetch('/api/review-hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              authToken: token,
              word: card.italian_word,
              translation: card.english_translation,
              language: card.songs?.language || 'italian',
              nativeLanguage: prefs?.native_language || 'en',
              context: card.context || ''
            })
          })

          if (!res.ok) throw new Error('Could not generate hint')

          const data = await res.json()
          return {
            sentence: data.sentence || '',
            translation: data.translation || '',
            contextTranslation: data.contextTranslation || ''
          }
        })()

        aiHintPromiseByCardId.set(card.id, hintPromise)
      }

      const hintData = await aiHintPromiseByCardId.get(card.id)
      aiHintDataByCardId.set(card.id, hintData)
      if (user?.id) writeStoredHint(user.id, card.id, hintData)
      setAiHints(prev => ({ ...prev, [card.id]: hintData }))
    } catch {
      setAiHints(prev => ({ ...prev, [card.id]: { sentence: '', translation: '', contextTranslation: '' } }))
    } finally {
      aiHintPromiseByCardId.delete(card.id)
    }
  }

  async function loadReviewCards(limitOverride = DAILY_NEW_LIMIT_DEFAULT) {
    setEmptyReason('no-cards')

    const gate = await ensureApprovedOrRedirect(router, '/login')
    if (!gate.ok || !gate.user) return

    const user = gate.user
    setUser(user)
    setPrefs(gate.prefs)

    const learningLang = gate.prefs?.learning_language

    let query = supabase
      .from('vocabulary')
      .select('*, songs!inner(user_id, title, language)')
      .eq('songs.user_id', user.id)

    if (songId) {
      query = query.eq('song_id', songId)
    } else if (learningLang) {
      query = query.eq('songs.language', learningLang)
    }

    const { data } = await query

    if (data && data.length > 0) {
      const vocabularyIds = data.map(card => card.id)
      const vocabularyIdSet = new Set(vocabularyIds)

      const { data: allReviewsData } = await supabase
        .from('reviews')
        .select('vocabulary_id, quality, easiness, interval, repetitions, next_review_date, reviewed_at')
        .eq('user_id', user.id)
        .order('reviewed_at', { ascending: false })

      const latestReviewByCard = new Map()
      const firstReviewDateByCard = new Map()

      for (const review of allReviewsData || []) {
        if (vocabularyIdSet.has(review.vocabulary_id) && !latestReviewByCard.has(review.vocabulary_id)) {
          latestReviewByCard.set(review.vocabulary_id, review)
        }
        const existingFirst = firstReviewDateByCard.get(review.vocabulary_id)
        const reviewedAt = new Date(review.reviewed_at)
        if (!existingFirst || reviewedAt < existingFirst) {
          firstReviewDateByCard.set(review.vocabulary_id, reviewedAt)
        }
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      let learnedNewToday = 0
      for (const firstReviewDate of firstReviewDateByCard.values()) {
        if (firstReviewDate >= todayStart) learnedNewToday += 1
      }
      setNewCardsLearnedToday(learnedNewToday)

      const now = new Date()
      const dueCards = data
        .map(card => ({ ...card, lastReview: latestReviewByCard.get(card.id) }))
        .filter(card => {
          if (!card.lastReview?.next_review_date) return true
          return new Date(card.lastReview.next_review_date) <= now
        })

      if (isStudyNowMode) {
        const randomAllCards = [...data]
          .map(card => ({ ...card, lastReview: latestReviewByCard.get(card.id) }))
          .sort(() => Math.random() - 0.5)
          .slice(0, STUDY_NOW_SESSION_SIZE)

        setDeck(randomAllCards)
        setSessionTotal(randomAllCards.length)
        setSessionDone(0)
        if (randomAllCards.length === 0) setEmptyReason('no-cards')
      } else {
        const reviewCards = dueCards.filter(card => !!card.lastReview)
        const newCards = dueCards.filter(card => !card.lastReview)
        const remainingNewSlots = Math.max(limitOverride - learnedNewToday, 0)

        const shuffledReviewCards = reviewCards.sort(() => Math.random() - 0.5)
        const shuffledNewCards = newCards.sort(() => Math.random() - 0.5)
        const allowedNewCards = shuffledNewCards.slice(0, remainingNewSlots)

        const sessionCards = [...shuffledReviewCards, ...allowedNewCards].sort(() => Math.random() - 0.5)
        setDeck(sessionCards)
        setSessionTotal(sessionCards.length)
        setSessionDone(0)

        if (sessionCards.length === 0 && reviewCards.length === 0 && newCards.length > 0 && remainingNewSlots === 0) {
          setEmptyReason('daily-limit-reached')
        } else if (sessionCards.length === 0) {
          setEmptyReason('no-cards')
        }
      }
    }

    setLoading(false)
  }

  async function handleRating(quality) {
    if (savingReview) return
    if (!currentCard || !user) return

    setSavingReview(true)

    const previous = currentCard.lastReview || {}
    const scheduled = calculateCustomSchedule(quality, previous)
    const nowIso = new Date().toISOString()

    try {
      await supabase.from('reviews').insert({
        user_id: user.id,
        vocabulary_id: currentCard.id,
        quality,
        easiness: scheduled.easeFactor,
        interval: scheduled.interval,
        repetitions: scheduled.repetitions,
        next_review_date: scheduled.nextReview,
        reviewed_at: nowIso
      })

      await supabase.from('vocabulary').update({
        times_reviewed: (currentCard.times_reviewed || 0) + 1,
        last_reviewed_at: nowIso
      }).eq('id', currentCard.id)

      setShowAnswer(false)

      const shouldRepeatInDeck = quality === 0 || quality === 3

      setDeck((prevDeck) => {
        const [, ...rest] = prevDeck
        if (!shouldRepeatInDeck) return rest

        const updatedCard = {
          ...currentCard,
          lastReview: { ...currentCard.lastReview, quality, interval: scheduled.interval, repetitions: scheduled.repetitions, easiness: scheduled.easeFactor, next_review_date: scheduled.nextReview, reviewed_at: nowIso }
        }

        const insertAt = rest.length === 0 ? 0 : Math.floor(Math.random() * (rest.length + 1))
        const requeued = [...rest]
        requeued.splice(insertAt, 0, updatedCard)
        return requeued
      })

      if (!shouldRepeatInDeck) {
        setSessionDone((prev) => prev + 1)
        if (deck.length <= 1) {
          alert(t(lang, 'deckCompleted') + ' 🎉')
          router.push('/')
        }
      }
    } catch (error) {
      console.error('Failed to save review:', error)
      alert('Could not save your review. Please try again.')
    } finally {
      setSavingReview(false)
    }
  }

  function flipCard() {
    setShowAnswer(!showAnswer)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center">
        <div className="text-xl">{t(lang, 'loadingFlashcards')}</div>
      </div>
    )
  }

  if (deck.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-8">
        <div className="max-w-2xl mx-auto text-center">
          {emptyReason === 'daily-limit-reached' ? (
            <>
              <h1 className="text-4xl font-bold text-gray-800 mb-4">{t(lang, 'dailyGoalReached')}</h1>
              <p className="text-gray-600 mb-8">{t(lang, 'dailyGoalExplanation')}</p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/stats">
                  <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold">{t(lang, 'openStats')}</button>
                </Link>
                <Link href="/">
                  <button className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold border border-indigo-200">{t(lang, 'backHomeBtn')}</button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-gray-800 mb-4">{t(lang, 'noCardsToReview')}</h1>
              <p className="text-gray-600 mb-8">{t(lang, 'addSongsFirst')}</p>
              <Link href="/">
                <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold">{t(lang, 'addSongs')}</button>
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  const progress = sessionTotal > 0 ? Math.min((sessionDone / sessionTotal) * 100, 100) : 0
  const currentLocale = currentCard?.songs?.language === 'spanish' ? 'es-ES' : currentCard?.songs?.language === 'english' ? 'en-US' : 'it-IT'
  const currentHint = aiHints[currentCard?.id]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {isStudyNowMode && (
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 text-center">
            {t(lang, 'studyNowMode')}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-600 font-semibold">{t(lang, 'completed')} {sessionDone} / {sessionTotal || deck.length}</p>
          <button
            onClick={() => setShowGuide((prev) => !prev)}
            className="text-sm bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-50"
          >
            {showGuide ? t(lang, 'hideGuide') : t(lang, 'guide')}
          </button>
        </div>

        {showGuide && (
          <div className="mb-4 rounded-xl bg-white border border-indigo-100 p-4 text-sm text-slate-700 space-y-2">
            <p className="font-semibold text-indigo-700">{t(lang, 'guideTitle')}</p>
            <p>{t(lang, 'guideAgain')}</p>
            <p>{t(lang, 'guideGood')}</p>
            <p>{t(lang, 'guideEasy')}</p>
            <p>{t(lang, 'guideMastered')}</p>
            <p>{t(lang, 'guideReset')}</p>
          </div>
        )}

        <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div
          onClick={flipCard}
          className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 mb-8 min-h-[520px] flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-500 font-medium">{t(lang, 'fromSong')} {currentCard.songs?.title || 'Song'}</p>
              <span className="text-xs uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold tracking-wide">
                {learningLanguageFullNames[currentCard.songs?.language] || 'Italian'}
              </span>
            </div>

            <div className="text-center mb-5" dir="ltr">
              <div className="flex items-center justify-center gap-3 mb-3">
                <h2 className="text-5xl sm:text-6xl font-bold text-slate-900">{currentCard.italian_word}</h2>
                <button
                  onClick={(e) => { e.stopPropagation(); speakWord(currentCard.italian_word, currentLocale) }}
                  className="text-4xl hover:scale-110 transition-transform"
                  title="Play pronunciation"
                >
                  🔊
                </button>
              </div>

              {currentCard.context && (
                <div className="text-slate-500 italic text-lg">
                  <p>{t(lang, 'fromLyrics')} "{currentCard.context}"</p>
                  {currentHint?.contextTranslation && (
                    <p className="text-slate-400 text-sm not-italic mt-1" dir="auto">{currentHint?.contextTranslation}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 text-center mb-6">
              <p className="text-indigo-600 font-bold uppercase tracking-wide text-sm mb-2">{t(lang, 'howToUse')}</p>
              {currentHint?.sentence && (
                <div className="flex items-center justify-center gap-2" dir="ltr">
                  <p className="text-2xl text-slate-700 italic font-serif">
                    "{renderClickableHintSentence(currentHint?.sentence)}"
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); speakWord(currentHint.sentence, currentLocale) }}
                    className="text-2xl hover:scale-110 transition-transform flex-shrink-0"
                    title="Play sentence"
                  >
                    🔊
                  </button>
                </div>
              )}
              {currentHint?.translation && (
                <p className="text-indigo-600 text-2xl italic font-semibold mt-3" dir="auto">{currentHint?.translation}</p>
              )}
              <p className="text-xs text-slate-500 mt-3 not-italic">{t(lang, 'clickWordHint')}</p>
            </div>

            {showAnswer && (
              <div className="bg-green-50 rounded-xl border border-green-100 p-6 text-center mb-6">
                <p className="text-5xl font-bold text-green-700">{currentCard.english_translation}</p>
              </div>
            )}
          </div>

          {!showAnswer && (
            <p className="text-center text-slate-400 text-sm">{t(lang, 'clickToShowAnswer')}</p>
          )}
        </div>

        {showAnswer && (
          <div className="grid grid-cols-4 gap-4">
            <button onClick={() => handleRating(0)} disabled={savingReview} className="bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 transition leading-tight">
              <div>{t(lang, 'again')}</div>
              <div className="text-xs opacity-90 mt-1">&lt;1m</div>
            </button>
            <button onClick={() => handleRating(3)} disabled={savingReview} className="bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition leading-tight">
              <div>{t(lang, 'hard')}</div>
              <div className="text-xs opacity-90 mt-1">&lt;10m</div>
            </button>
            <button onClick={() => handleRating(4)} disabled={savingReview} className="bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition leading-tight">
              <div>{t(lang, 'good')}</div>
              <div className="text-xs opacity-90 mt-1">1d</div>
            </button>
            <button onClick={() => handleRating(5)} disabled={savingReview} className="bg-blue-500 text-white font-semibold py-3 rounded-xl hover:bg-blue-600 transition leading-tight">
              <div>{t(lang, 'easy')}</div>
              <div className="text-xs opacity-90 mt-1">4d</div>
            </button>
          </div>
        )}

        <p className="text-center text-slate-500 text-sm mt-4">
          {t(lang, 'dailyNewCardsLimit')} <span className="font-semibold">{dailyNewLimit}</span> | {t(lang, 'newCardsToday')} <span className="font-semibold">{newCardsLearnedToday}</span>
        </p>

        <div className="text-center mt-10 flex justify-center gap-8 text-slate-500">
          <Link href="/"><button className="hover:text-slate-700">{t(lang, 'exitReview')}</button></Link>
          <Link href="/stats"><button className="hover:text-indigo-600">📊 {t(lang, 'viewStats')}</button></Link>
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  )
}
