'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { t } from '@/lib/translations'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // No prefs yet on login page, default to English
  const lang = 'en'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('confirmed') === '1') {
      setMessage(t(lang, 'emailConfirmed'))
      setIsSignUp(false)
    }
  }, [])

  function getEmailRedirectUrl() {
    if (typeof window === 'undefined') return undefined
    return `${window.location.origin}/login?confirmed=1`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const response = await fetch('/api/auth/sign-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, emailRedirectTo: getEmailRedirectUrl() })
        })

        const result = await response.json()
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Sign up failed')
        }

        if (result?.requiresEmailConfirmation === false) {
          setMessage(t(lang, 'accountCreated'))
          setIsSignUp(false)
        } else {
          setMessage(t(lang, 'checkEmail'))
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/approve')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-indigo-900 mb-2 text-center">
          🎵 {t(lang, 'appTitle')}
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {isSignUp ? t(lang, 'createAccount') : t(lang, 'signInContinue')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t(lang, 'email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t(lang, 'password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg ${(message.includes('Check') || message.toLowerCase().includes('confirmed') || message.toLowerCase().includes('successfully')) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? t(lang, 'loading') : isSignUp ? t(lang, 'signUp') : t(lang, 'signIn')}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-4 text-indigo-600 hover:text-indigo-800"
        >
          {isSignUp ? t(lang, 'alreadyHaveAccount') : t(lang, 'noAccount')}
        </button>

        <div className="mt-6 text-center text-sm text-gray-600 space-y-2">
          <p>✨ {t(lang, 'freePlan')}</p>
          <p className="text-xs">
            {t(lang, 'agreePrivacy')}{' '}
            <a href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">
              {t(lang, 'privacyPolicy')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
