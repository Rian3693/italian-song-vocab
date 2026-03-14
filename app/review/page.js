'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ReviewPage() {
  const [user, setUser] = useState(null)
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewCount, setReviewCount] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const songId = searchParams.get('song')

  useEffect(() => {
    loadReviewCards()
  }, [])

  async function loadReviewCards() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    setUser(user)

    let query = supabase
      .from('vocabulary')
      .select(`
        *,
        songs!inner(user_id, title, language)
      `)
      .eq('songs.user_id', user.id)

    if (songId) {
      query = query.eq('song_id', songId)
    }

    const { data } = await query

    if (data && data.length > 0) {
      // Shuffle cards
      const shuffled = data.sort(() => Math.random() - 0.5)
      setCards(shuffled)
    }

    setLoading(false)
  }

  function handleRating(quality) {
    setReviewCount(prev => prev + 1)
    setShowAnswer(false)
    
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      // Finished all cards
      alert(`Great job! You reviewed ${cards.length} words! 🎉`)
      router.push('/')
    }
  }

  function flipCard() {
    setShowAnswer(!showAnswer)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-xl">Loading flashcards...</div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">No cards to review!</h1>
          <p className="text-gray-600 mb-8">Add some songs first to create flashcards.</p>
          <Link href="/">
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold">
              Add Songs
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <button className="text-green-700 hover:text-green-900 font-semibold">
              ← Back
            </button>
          </Link>
          <div className="text-green-700 font-semibold">
            {currentIndex + 1} / {cards.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Flashcard */}
        <div 
          onClick={flipCard}
          className="bg-white rounded-3xl shadow-2xl p-12 mb-8 cursor-pointer min-h-[400px] flex flex-col items-center justify-center transition-all hover:shadow-xl"
        >
          {!showAnswer ? (
            <>
              <p className="text-gray-500 text-sm uppercase tracking-wide mb-4">
                {currentCard.songs?.language === 'spanish' ? 'Spanish' : 'Italian'}
              </p>
              <h2 className="text-5xl font-bold text-gray-800 mb-4 text-center">
                {currentCard.italian_word}
              </h2>
              {currentCard.context && (
                <p className="text-gray-500 italic text-center mt-4">
                  "{currentCard.context}"
                </p>
              )}
              <p className="text-gray-400 text-sm mt-8">Click to reveal</p>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm uppercase tracking-wide mb-4">Translation</p>
              <h2 className="text-4xl font-bold text-green-600 mb-4 text-center">
                {currentCard.english_translation}
              </h2>
              <div className="border-t border-gray-200 w-full my-6" />
              <p className="text-2xl text-gray-600 text-center">
                {currentCard.italian_word}
              </p>
              {currentCard.context && (
                <p className="text-gray-500 italic text-center mt-4">
                  "{currentCard.context}"
                </p>
              )}
            </>
          )}
        </div>

        {/* Rating Buttons */}
        {showAnswer && (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handleRating(2)}
              className="bg-red-100 text-red-700 font-semibold py-4 rounded-xl hover:bg-red-200 transition"
            >
              😕 Again
            </button>
            <button
              onClick={() => handleRating(4)}
              className="bg-yellow-100 text-yellow-700 font-semibold py-4 rounded-xl hover:bg-yellow-200 transition"
            >
              🤔 Hard
            </button>
            <button
              onClick={() => handleRating(5)}
              className="bg-green-100 text-green-700 font-semibold py-4 rounded-xl hover:bg-green-200 transition"
            >
              ✅ Easy
            </button>
          </div>
        )}

        {/* Helper Text */}
        {!showAnswer && (
          <p className="text-center text-gray-500 text-sm mt-6">
            💡 Tip: Try to recall the meaning before flipping
          </p>
        )}

        {/* Stats */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Reviewed today: <span className="font-bold text-green-600">{reviewCount}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
