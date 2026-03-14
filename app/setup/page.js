'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { saveUserPreferences, getUserPreferences } from '@/lib/preferences'
import { nativeLanguageNames, learningLanguageNames } from '@/lib/translations'

export default function SetupPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [nativeLang, setNativeLang] = useState('en')
  const [learningLang, setLearningLang] = useState('italian')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      router.replace('/login')
      return
    }

    setUser(session.user)

    // If prefs already exist, redirect to home
    const prefs = await getUserPreferences(session.user.id)
    if (prefs) {
      router.replace('/')
      return
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)

    try {
      await saveUserPreferences(user.id, {
        native_language: nativeLang,
        learning_language: learningLang
      })
      router.replace('/')
    } catch (error) {
      alert('Failed to save preferences: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-indigo-900 mb-2 text-center">
          Set Up Your Languages
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Choose your native language and the language you want to learn
        </p>

        <div className="space-y-6">
          {/* Native Language */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Your Native Language
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(nativeLanguageNames).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setNativeLang(code)}
                  className={`p-4 rounded-xl border-2 text-center transition font-semibold ${
                    nativeLang === code
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {code === 'en' ? '🇺🇸' : code === 'he' ? '🇮🇱' : '🇧🇷'}
                  </div>
                  <div className="text-sm">{name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Learning Language */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Language You Want to Learn
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(learningLanguageNames).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setLearningLang(code)}
                  className={`p-4 rounded-xl border-2 text-center transition font-semibold ${
                    learningLang === code
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {code === 'italian' ? '🇮🇹' : code === 'spanish' ? '🇪🇸' : '🇺🇸'}
                  </div>
                  <div className="text-sm">{name}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 disabled:bg-gray-400 font-bold text-lg mt-4"
          >
            {saving ? 'Saving...' : 'Start Learning'}
          </button>
        </div>
      </div>
    </div>
  )
}
