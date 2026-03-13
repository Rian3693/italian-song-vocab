'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Stats() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoadStats()
  }, [])

  async function checkUserAndLoadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    setUser(user)
    await loadStats(user.id)
    setLoading(false)
  }

  async function loadStats(userId) {
    // Get total vocabulary count
    const { count: totalCards } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .in('song_id', 
        supabase.from('songs').select('id').eq('user_id', userId)
      )

    // Get total songs
    const { count: totalSongs } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get songs added today
    const today = new Date().toISOString().split('T')[0]
    const { count: songsToday } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)

    setStats({
      totalCards: totalCards || 0,
      totalSongs: totalSongs || 0,
      songsToday: songsToday || 0,
      streak: calculateStreak(songsToday)
    })
  }

  function calculateStreak(songsToday) {
    return songsToday > 0 ? 1 : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl">Loading stats...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/">
          <button className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            ← Back to Home
          </button>
        </Link>

        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          📊 Your Learning Statistics
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-indigo-600">{stats?.totalCards || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Total Words</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-green-600">{stats?.totalSongs || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Total Songs</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">{stats?.songsToday || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Songs Today</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-orange-600">{stats?.streak || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Day Streak 🔥</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🎯 Quick Stats
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-gray-700">Average words per song:</span>
              <span className="font-bold text-indigo-600">
                {stats?.totalSongs > 0 ? Math.round(stats.totalCards / stats.totalSongs) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-gray-700">Songs remaining today:</span>
              <span className="font-bold text-green-600">
                {3 - (stats?.songsToday || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
