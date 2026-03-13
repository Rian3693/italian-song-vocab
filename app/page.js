'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [user, setUser] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [vocabulary, setVocabulary] = useState([])
  const [dailyUsage, setDailyUsage] = useState(0)
  const router = useRouter()

  const DAILY_LIMIT = 3

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    setUser(user)
    loadSongs(user.id)
    checkDailyUsage(user.id)
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

  async function loadSongs(userId) {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setSongs(data)
  }

  async function loadVocabulary(songId) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('song_id', songId)
    
    if (data) setVocabulary(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (dailyUsage >= DAILY_LIMIT) {
      alert(`Daily limit reached! You can add ${DAILY_LIMIT} songs per day. Come back tomorrow! 🎵`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/process-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          youtubeUrl,
          userId: user.id 
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Song processed successfully!')
        setYoutubeUrl('')
        loadSongs(user.id)
        checkDailyUsage(user.id)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      alert('Error processing song: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function selectSong(song) {
    setSelectedSong(song)
    loadVocabulary(song.id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  }

  const remainingSongs = DAILY_LIMIT - dailyUsage

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900">
            🎵 Italian Song Vocabulary
          </h1>
          <button
            onClick={handleLogout}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Logout
          </button>
        </div>

        {/* Daily Usage Indicator */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">Today's Usage</h3>
              <p className="text-sm text-gray-600">
                {remainingSongs > 0 
                  ? `${remainingSongs} song${remainingSongs !== 1 ? 's' : ''} remaining today` 
                  : 'Daily limit reached! Come back tomorrow 🎵'}
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
          <h2 className="text-2xl font-semibold mb-4">Add New Song</h2>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              disabled={remainingSongs === 0}
            />
            <button
              type="submit"
              disabled={loading || remainingSongs === 0}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Processing...' : 'Add Song'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Songs List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Your Songs</h2>
            <div className="space-y-2">
              {songs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => selectSong(song)}
                  className={`p-4 rounded-lg cursor-pointer transition ${
                    selectedSong?.id === song.id
                      ? 'bg-indigo-100 border-2 border-indigo-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <h3 className="font-semibold text-lg">{song.title}</h3>
                  <p className="text-gray-600">{song.artist}</p>
                </div>
              ))}
              {songs.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No songs yet. Add one above!
                </p>
              )}
            </div>
          </div>

          {/* Vocabulary Display */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Vocabulary</h2>
            {selectedSong ? (
              <div>
                <h3 className="text-lg font-medium text-indigo-600 mb-4">
                  From: {selectedSong.title}
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
                      No vocabulary extracted yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Select a song to view vocabulary
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
