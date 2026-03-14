'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureApprovedOrRedirect } from '@/lib/access-client'
import { t } from '@/lib/translations'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DAILY_NEW_WORD_LIMIT_DEFAULT = 20
const DAILY_LIMIT_STORAGE_KEY = 'dailyNewCardsLimit'
const HEATMAP_ROWS = 7
const HEATMAP_COLS = 53

function getStoredDailyLimit() {
  if (typeof window === 'undefined') return DAILY_NEW_WORD_LIMIT_DEFAULT
  const raw = window.localStorage.getItem(DAILY_LIMIT_STORAGE_KEY)
  const parsed = Number.parseInt(raw || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return DAILY_NEW_WORD_LIMIT_DEFAULT
  return parsed
}

function toDateKey(dateLike) {
  const d = new Date(dateLike)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDisplayDate(dateLike) {
  const d = new Date(dateLike)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function getHeatColor(reviewedCount, requiredCount) {
  if (!reviewedCount) return 'bg-slate-100'
  const ratio = Math.min(reviewedCount / Math.max(requiredCount, 1), 1)
  if (ratio < 0.25) return 'bg-green-200'
  if (ratio < 0.5) return 'bg-green-400'
  if (ratio < 0.75) return 'bg-green-500'
  if (ratio < 1) return 'bg-green-700'
  return 'bg-green-900'
}

function calculateStreak(reviewsByDate) {
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 3650; i += 1) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)
    const key = toDateKey(checkDate)
    if ((reviewsByDate[key] || 0) > 0) { streak += 1 } else { break }
  }
  return streak
}

function buildHeatmapCells(reviewsByDate, requiredPerDay) {
  const totalCells = HEATMAP_ROWS * HEATMAP_COLS
  const dateKeys = Object.keys(reviewsByDate).sort()
  const start = dateKeys.length > 0 ? new Date(`${dateKeys[0]}T00:00:00`) : new Date()
  start.setHours(0, 0, 0, 0)

  const cells = []
  for (let i = 0; i < totalCells; i += 1) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    const key = toDateKey(day)
    cells.push({ key, count: reviewsByDate[key] || 0, required: requiredPerDay })
  }
  return { cells, startDate: start }
}

export default function Stats() {
  const [user, setUser] = useState(null)
  const [prefs, setPrefs] = useState(null)
  const [stats, setStats] = useState(null)
  const [heatmap, setHeatmap] = useState({ cells: [], startDate: null })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [dailyNewLimit, setDailyNewLimit] = useState(DAILY_NEW_WORD_LIMIT_DEFAULT)
  const [limitInput, setLimitInput] = useState(String(DAILY_NEW_WORD_LIMIT_DEFAULT))
  const router = useRouter()
  const lang = prefs?.native_language || 'en'

  useEffect(() => {
    const storedLimit = getStoredDailyLimit()
    setDailyNewLimit(storedLimit)
    setLimitInput(String(storedLimit))
    checkUserAndLoadStats(storedLimit)
  }, [])

  async function checkUserAndLoadStats(limitOverride = dailyNewLimit) {
    try {
      setError('')
      const gate = await ensureApprovedOrRedirect(router, '/login')
      if (!gate.ok || !gate.user) return

      setUser(gate.user)
      setPrefs(gate.prefs)
      await loadStats(gate.user.id, limitOverride)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError(t(lang, 'couldNotLoadStats'))
    } finally {
      setLoading(false)
    }
  }

  async function loadStats(userId, requiredPerDay) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('id, created_at')
      .eq('user_id', userId)

    if (songsError) throw songsError

    const songIds = (songsData || []).map(song => song.id)

    let vocabularyData = []
    if (songIds.length > 0) {
      const { data: vocabRows, error: vocabError } = await supabase
        .from('vocabulary')
        .select('id, created_at, song_id')
        .in('song_id', songIds)

      if (vocabError) throw vocabError
      vocabularyData = vocabRows || []
    }

    const { data: reviewRows, error: reviewError } = await supabase
      .from('reviews')
      .select('vocabulary_id, reviewed_at')
      .eq('user_id', userId)

    if (reviewError) throw reviewError

    const totalCards = vocabularyData.length
    const totalReviews = (reviewRows || []).length
    const reviewedToday = (reviewRows || []).filter(r => new Date(r.reviewed_at) >= todayStart).length

    const firstReviewByCard = new Map()
    for (const review of reviewRows || []) {
      const existing = firstReviewByCard.get(review.vocabulary_id)
      const currentReviewDate = new Date(review.reviewed_at)
      if (!existing || currentReviewDate < existing) {
        firstReviewByCard.set(review.vocabulary_id, currentReviewDate)
      }
    }

    let newWordsToday = 0
    for (const firstReviewDate of firstReviewByCard.values()) {
      if (firstReviewDate >= todayStart) newWordsToday += 1
    }

    const reviewsByDate = {}
    for (const review of reviewRows || []) {
      const key = toDateKey(review.reviewed_at)
      reviewsByDate[key] = (reviewsByDate[key] || 0) + 1
    }

    const streak = calculateStreak(reviewsByDate)
    const heatmapData = buildHeatmapCells(reviewsByDate, requiredPerDay)

    setHeatmap(heatmapData)
    setStats({ totalReviews, reviewedToday, newWordsToday, streak, totalCards, totalSongs: (songsData || []).length })
  }

  async function saveDailyLimit() {
    const parsed = Number.parseInt(limitInput, 10)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
      alert(t(lang, 'dailyLimitRange'))
      return
    }

    window.localStorage.setItem(DAILY_LIMIT_STORAGE_KEY, String(parsed))
    setDailyNewLimit(parsed)

    if (user?.id) {
      try {
        await loadStats(user.id, parsed)
      } catch {
        setError(t(lang, 'savedButError'))
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center">
        <div className="text-xl text-slate-700">{t(lang, 'loadingStats')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-8">
        <div className="max-w-2xl mx-auto text-center mt-20">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button onClick={checkUserAndLoadStats} className="bg-indigo-600 text-white px-6 py-2 rounded-lg">
            {t(lang, 'retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/">
          <button className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            {t(lang, 'backHome')}
          </button>
        </Link>

        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-8">
          📊 {t(lang, 'yourStats')}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center min-h-[170px] flex flex-col justify-center">
            <p className="text-5xl font-bold text-indigo-500">{stats?.totalReviews || 0}</p>
            <p className="text-lg text-slate-600 mt-2">{t(lang, 'totalReviews')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center min-h-[170px] flex flex-col justify-center">
            <p className="text-5xl font-bold text-green-600">{stats?.reviewedToday || 0}</p>
            <p className="text-lg text-slate-600 mt-2">{t(lang, 'reviewedToday')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center min-h-[170px] flex flex-col justify-center">
            <p className="text-5xl font-bold text-purple-600">{stats?.newWordsToday || 0}</p>
            <p className="text-lg text-slate-600 mt-2">{t(lang, 'newWordsToday')}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mt-3">{t(lang, 'dailyLimit')}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <input
                type="number"
                min="1"
                max="200"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                className="w-20 text-center px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-semibold"
              />
              <button
                onClick={saveDailyLimit}
                className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                {t(lang, 'save')}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center min-h-[170px] flex flex-col justify-center">
            <p className="text-5xl font-bold text-orange-500">{stats?.streak || 0}</p>
            <p className="text-lg text-slate-600 mt-2">{t(lang, 'dayStreak')} 🔥</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center min-h-[170px] flex flex-col justify-center">
            <p className="text-5xl font-bold text-blue-600">{stats?.totalCards || 0}</p>
            <p className="text-lg text-slate-600 mt-2">{t(lang, 'totalCards')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">🗓️ {t(lang, 'reviewHeatmap')}</h2>

          <div className="overflow-x-auto pb-2">
            <div
              className="inline-grid gap-1"
              style={{ gridAutoFlow: 'column', gridTemplateRows: `repeat(${HEATMAP_ROWS}, minmax(0, 1fr))` }}
            >
              {heatmap.cells.map((cell, index) => {
                const count = cell?.count || 0
                const required = cell?.required || dailyNewLimit
                const progressPct = Math.round((Math.min(count / Math.max(required, 1), 1)) * 100)

                return (
                  <div
                    key={`cell-${index}`}
                    className={`w-4 h-4 rounded-[3px] ${getHeatColor(count, required)}`}
                    title={`${cell?.key ? toDisplayDate(cell.key) : ''} | Reviewed: ${count} | Target: ${required} | Progress: ${progressPct}%`}
                  />
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 mt-6 text-xl">
            <span>{t(lang, 'less')}</span>
            <div className="w-4 h-4 rounded-[3px] bg-slate-100" />
            <div className="w-4 h-4 rounded-[3px] bg-green-200" />
            <div className="w-4 h-4 rounded-[3px] bg-green-400" />
            <div className="w-4 h-4 rounded-[3px] bg-green-500" />
            <div className="w-4 h-4 rounded-[3px] bg-green-700" />
            <div className="w-4 h-4 rounded-[3px] bg-green-900" />
            <span>{t(lang, 'more')}</span>
          </div>

          {heatmap.startDate && (
            <div className="text-slate-500 mt-4 text-sm sm:text-base">
              📍 {t(lang, 'heatmapStart')(toDisplayDate(heatmap.startDate))}
            </div>
          )}

          <div className="text-slate-400 mt-1 text-xs sm:text-sm">
            {t(lang, 'heatmapScale')(dailyNewLimit)}
          </div>
        </div>
      </div>
    </div>
  )
}
