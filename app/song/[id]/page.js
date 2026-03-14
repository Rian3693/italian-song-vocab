'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureApprovedOrRedirect } from '@/lib/access-client'
import { t, learningLanguageFullNames } from '@/lib/translations'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SongPage({ params }) {
  const [song, setSong] = useState(null)
  const [vocabulary, setVocabulary] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [prefs, setPrefs] = useState(null)
  const router = useRouter()
  const lang = prefs?.native_language || 'en'

  useEffect(() => {
    loadSongData()
  }, [params.id])

  async function loadSongData() {
    const gate = await ensureApprovedOrRedirect(router, '/login')
    if (!gate.ok || !gate.user) return

    setPrefs(gate.prefs)
    const user = gate.user

    const { data: songData } = await supabase
      .from('songs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!songData) {
      router.push('/')
      return
    }

    setSong(songData)

    const { data: vocabData } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('song_id', params.id)

    setVocabulary(vocabData || [])
    setLoading(false)
  }

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/reprocess-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: params.id,
          userId: session.user.id,
          authToken: session.access_token,
          nativeLanguage: prefs?.native_language || 'en'
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(t(lang, 'refreshSuccess')(result.vocabularyCount))
        loadSongData()
      } else {
        alert(result.error || t(lang, 'refreshFailed'))
      }
    } catch (err) {
      alert(t(lang, 'refreshFailed'))
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl">{t(lang, 'loadingSong')}</div>
      </div>
    )
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{t(lang, 'songNotFound')}</h1>
          <Link href="/">
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg">{t(lang, 'goHome')}</button>
          </Link>
        </div>
      </div>
    )
  }

  const languageLabel = learningLanguageFullNames[song.language] || 'Italian'
  const languageCode = song.language === 'spanish' ? 'es' : song.language === 'english' ? 'en' : 'it'

  let parsedLyrics = []
  try {
    parsedLyrics = JSON.parse(song.lyrics || '[]')
  } catch {
    parsedLyrics = []
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <button className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold">
            {t(lang, 'backHome')}
          </button>
        </Link>

        {/* Song Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{song.title}</h1>
          {song.artist && <p className="text-xl text-gray-600 mb-6">{t(lang, 'by')} {song.artist}</p>}
          <span className="inline-block mb-6 text-xs uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold tracking-wide">
            {languageLabel}
          </span>

          {song.summary && (
            <div className="bg-indigo-50 p-6 rounded-lg mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">📖 {t(lang, 'summary')}</h2>
              <p className="text-gray-700">{song.summary}</p>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-green-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">{vocabulary.length}</p>
              <p className="text-sm text-gray-600">{t(lang, 'words')}</p>
            </div>
            <div className="flex-1 bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600">
                {new Date(song.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">{t(lang, 'added')}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={`/review?song=${song.id}`} className="flex-1">
              <button className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition">
                🎯 {t(lang, 'startLearningBtn')}
              </button>
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition"
            >
              {refreshing ? t(lang, 'refreshing') : `🔄 ${t(lang, 'refreshSong')}`}
            </button>
          </div>
        </div>

        {/* Bilingual Lyrics */}
        {parsedLyrics.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">🎤 {languageLabel} {t(lang, 'lyricsAndTranslation')}</h2>
            <div className="space-y-6 font-serif">
              {parsedLyrics.map((line, i) => {
                const originalText = line[languageCode] || line.it || ''
                const translatedText = line.translation || line.en || ''

                if (originalText.trim() === '') return <div key={i} className="h-4" />

                if (originalText.trim().startsWith('[') && originalText.trim().endsWith(']')) {
                  return (
                    <p key={i} className="text-gray-400 font-bold mt-6 mb-2 text-sm uppercase tracking-wider">
                      {originalText}
                    </p>
                  )
                }

                return (
                  <div key={i} className="pl-0 py-0.5">
                    <p className="text-xl text-gray-800 font-medium leading-tight">{originalText}</p>
                    {translatedText && <p className="text-sm text-gray-400 italic mt-0.5">{translatedText}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Vocabulary List */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 {t(lang, 'vocabTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vocabulary.map((card) => (
              <div key={card.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xl font-bold text-gray-800">{card.italian_word}</p>
                <p className="text-gray-600">{card.english_translation}</p>
                {card.context && (
                  <p className="text-sm text-gray-500 italic mt-2">"{card.context}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
