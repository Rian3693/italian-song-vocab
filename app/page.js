'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureApprovedOrRedirect } from '@/lib/access-client'
import { saveUserPreferences } from '@/lib/preferences'
import { t, learningLanguageNames, learningLanguageFullNames } from '@/lib/translations'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [user, setUser] = useState(null)
  const [prefs, setPrefs] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [vocabulary, setVocabulary] = useState([])
  const [dailyUsage, setDailyUsage] = useState(0)
  const router = useRouter()

  const DAILY_LIMIT = 3
  const lang = prefs?.native_language || 'en'

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (!loading) return undefined

    setProcessingProgress(5)
    setProcessingStatus(t(lang, 'processingStarting'))

    const timer = setInterval(() => {
      setProcessingProgress((prev) => {
        const next = prev < 92 ? prev + Math.max(1, Math.round((96 - prev) / 10)) : prev

        if (next < 25) setProcessingStatus(t(lang, 'processingAnalyzing'))
        else if (next < 45) setProcessingStatus(t(lang, 'processingFetching'))
        else if (next < 65) setProcessingStatus(t(lang, 'processingLyrics'))
        else if (next < 85) setProcessingStatus(t(lang, 'processingVocab'))
        else setProcessingStatus(t(lang, 'processingFinalizing'))

        return Math.min(next, 95)
      })
    }, 500)

    return () => clearInterval(timer)
  }, [loading, lang])

  async function checkUser() {
    const gate = await ensureApprovedOrRedirect(router, '/login')
    if (!gate.ok || !gate.user) return

    setUser(gate.user)
    setPrefs(gate.prefs)
    loadSongs(gate.user.id, gate.prefs?.learning_language)
    checkDailyUsage(gate.user.id)
  }

  async function checkDailyUsage(userId) {
    const today = new Date().toISOString().split('T')[0]

    const { count } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)

    setDailyUsage(count || 0)
  }

  async function loadSongs(userId, learningLang) {
    let query = supabase
      .from('songs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (learningLang) {
      query = query.eq('language', learningLang)
    }

    const { data } = await query
    if (data) setSongs(data)
  }

  async function loadVocabulary(songId) {
    const { data } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('song_id', songId)

    if (data) setVocabulary(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (dailyUsage >= DAILY_LIMIT) {
      alert(t(lang, 'dailyLimitAlert')(DAILY_LIMIT))
      return
    }

    setLoading(true)
    setProcessingProgress(5)
    setProcessingStatus(t(lang, 'processingStarting'))
    let completedSuccessfully = false

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/process-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl,
          userId: user.id,
          authToken: session?.access_token,
          language: prefs?.learning_language || 'italian',
          nativeLanguage: prefs?.native_language || 'en'
        })
      })

      if (!response.ok && response.headers.get('content-type')?.includes('text/html')) {
        throw new Error('Server error — the request timed out. Please try again.')
      }

      const result = await response.json()

      if (result.success) {
        setProcessingProgress(100)
        setProcessingStatus('Ready!')
        completedSuccessfully = true
        alert(t(lang, 'successCreated')(result.vocabularyCount, result.song.title))
        setYoutubeUrl('')
        loadSongs(user.id, prefs?.learning_language)
        checkDailyUsage(user.id)

        setTimeout(() => {
          window.location.href = `/song/${result.songId}`
        }, 1500)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      alert('Error processing song: ' + error.message)
    } finally {
      if (completedSuccessfully) {
        setTimeout(() => {
          setLoading(false)
          setProcessingProgress(0)
          setProcessingStatus('')
        }, 300)
      } else {
        setLoading(false)
        setProcessingProgress(0)
        setProcessingStatus('')
      }
    }
  }

  function selectSong(song) {
    setSelectedSong(song)
    loadVocabulary(song.id)
  }

  function studySongDeck(song) {
    window.location.href = `/review?song=${song.id}`
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function switchLearningLanguage(newLang) {
    if (!user || !prefs) return
    try {
      await saveUserPreferences(user.id, {
        native_language: prefs.native_language,
        learning_language: newLang
      })
      setPrefs(prev => ({ ...prev, learning_language: newLang }))
      setSelectedSong(null)
      setVocabulary([])
      loadSongs(user.id, newLang)
    } catch (error) {
      console.error('Failed to switch language:', error)
    }
  }

  if (!user) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-xl">{t(lang, 'loading')}</div>
    </div>
  }

  const remainingSongs = DAILY_LIMIT - dailyUsage

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900">
            🎵 {t(lang, 'appTitle')}
          </h1>
          <div className="flex gap-3 items-center">
            {/* Learning language switcher */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-md">
              <span className="text-sm font-semibold text-gray-600">{t(lang, 'learningLangLabel')}</span>
              <select
                value={prefs?.learning_language || 'italian'}
                onChange={(e) => switchLearningLanguage(e.target.value)}
                className="bg-transparent text-indigo-700 font-semibold text-sm focus:outline-none cursor-pointer"
              >
                {Object.entries(learningLanguageNames).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <a
              href="/review?mode=all"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold shadow-md"
            >
              ⚡ {t(lang, 'studyNowAll')}
            </a>
            <a
              href="/all-cards"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold shadow-md"
            >
              📚 {t(lang, 'allCards')}
            </a>
            <a
              href="/stats"
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 font-semibold shadow-md"
            >
              📊 {t(lang, 'stats')}
            </a>
            <a
              href="/tips"
              className="bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50 font-semibold shadow-md"
            >
              💡 {t(lang, 'tips')}
            </a>
            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              {t(lang, 'logout')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border border-indigo-100">
          <h3 className="font-semibold text-indigo-800 mb-2">{t(lang, 'studyModeGuideTitle')}</h3>
          <p className="text-sm text-gray-700">
            <strong>{t(lang, 'studyNowAll')}</strong> {t(lang, 'studyModeGuideAll').replace(t(lang, 'studyNowAll') + ' ', '')}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            <strong>{t(lang, 'studyNow').replace(' →', '')}</strong> {t(lang, 'studyModeGuideSong').replace(t(lang, 'studyNow').replace(' →', '') + ' ', '')}
          </p>
        </div>

        {/* Daily Usage Indicator */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">{t(lang, 'todaysUsage')}</h3>
              <p className="text-sm text-gray-600">
                {remainingSongs > 0
                  ? t(lang, 'songsRemaining')(remainingSongs)
                  : t(lang, 'dailyLimitReached')}
              </p>
            </div>
            <div className="flex gap-2">
              {[...Array(DAILY_LIMIT)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < dailyUsage ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Add Song Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t(lang, 'addNewSong')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder={t(lang, 'pasteYoutube')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                disabled={remainingSongs === 0}
              />
              <button
                type="submit"
                disabled={loading || remainingSongs === 0}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? t(lang, 'processing') : t(lang, 'addSong')}
              </button>
            </div>

            {loading && (
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div className="flex justify-between text-sm text-indigo-700 mb-1">
                  <span>{processingStatus || t(lang, 'processing')}</span>
                  <span>{processingProgress}%</span>
                </div>
                <div className="w-full bg-indigo-100 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <p>
                <strong>{t(lang, 'whyLimit')}</strong> {t(lang, 'whyLimitExplanation')}
              </p>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Songs List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">{t(lang, 'yourSongs')}</h2>
            <div className="space-y-2">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className={`p-4 rounded-lg transition ${
                    selectedSong?.id === song.id
                      ? 'bg-indigo-100 border-2 border-indigo-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div onClick={() => selectSong(song)} className="cursor-pointer">
                    <h3 className="font-semibold text-lg">{song.title}</h3>
                    <p className="text-gray-600 text-sm">{song.artist}</p>
                  </div>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => studySongDeck(song)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {t(lang, 'studyNow')}
                    </button>
                    <a
                      href={`/song/${song.id}`}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
                    >
                      {t(lang, 'translatedLyrics')}
                    </a>
                  </div>
                </div>
              ))}
              {songs.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  {t(lang, 'noSongsYet')}
                </p>
              )}
            </div>
          </div>

          {/* Vocabulary Display */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">{t(lang, 'vocabulary')}</h2>
            {selectedSong ? (
              <div>
                <h3 className="text-lg font-medium text-indigo-600 mb-4">
                  {t(lang, 'from')} {selectedSong.title}
                </h3>
                <div className="space-y-3">
                  {vocabulary.map((word) => (
                    <div key={word.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-lg font-semibold text-indigo-900">
                          {word.italian_word}
                        </span>
                        <span className="text-gray-700">
                          {word.english_translation}
                        </span>
                      </div>
                      {word.context && (
                        <p className="text-sm text-gray-600 italic">
                          "{word.context}"
                        </p>
                      )}
                    </div>
                  ))}
                  {vocabulary.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      {t(lang, 'noVocabExtracted')}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {t(lang, 'selectSongToView')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>
            {t(lang, 'madeWithLove')} • {' '}
            <a href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">
              {t(lang, 'privacyPolicy')}
            </a>
          </p>
          <p className="mt-2 text-xs">
            {t(lang, 'dataPrivate')}
          </p>
        </div>
      </div>
    </div>
  )
}
