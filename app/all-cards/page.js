'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AllCardsPage() {
  const [user, setUser] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadAllCards()
  }, [])

  async function loadAllCards() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    setUser(user)

    // Load all vocabulary cards with song info
    const { data } = await supabase
      .from('vocabulary')
      .select(`
        *,
        songs!inner(user_id, title, artist, language)
      `)
      .eq('songs.user_id', user.id)
      .order('created_at', { ascending: false })

    setCards(data || [])
    setLoading(false)
  }

  const filteredCards = cards.filter(card => 
    card.italian_word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.english_translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.songs?.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-xl">Loading vocabulary...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            📚 All Vocabulary Cards
          </h1>
          <Link href="/">
            <button className="bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 font-semibold shadow-md">
              ← Back
            </button>
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vocabulary..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">{cards.length}</p>
            <p className="text-sm text-gray-600 mt-2">Total Words</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-green-600">{filteredCards.length}</p>
            <p className="text-sm text-gray-600 mt-2">Matching Search</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-blue-600">
              {[...new Set(cards.map(c => c.songs?.title))].length}
            </p>
            <p className="text-sm text-gray-600 mt-2">Songs</p>
          </div>
        </div>

        {/* Cards Grid */}
        {filteredCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map((card) => (
              <div key={card.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="mb-3">
                  <p className="text-2xl font-bold text-gray-800">{card.italian_word}</p>
                  <p className="text-lg text-gray-600">{card.english_translation}</p>
                </div>
                
                {card.context && (
                  <p className="text-sm text-gray-500 italic mb-3">
                    "{card.context}"
                  </p>
                )}
                
                <Link href={`/song/${card.song_id}`}>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-purple-600 hover:text-purple-800 font-semibold">
                      From: {card.songs?.title}
                    </p>
                    <p className="text-xs text-gray-500">{card.songs?.artist}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No cards match your search.' : 'No vocabulary cards yet. Add some songs!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
