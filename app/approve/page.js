'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { t } from '@/lib/translations'

export default function ApprovePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [sessionToken, setSessionToken] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [requestingCode, setRequestingCode] = useState(false)
  const [codeAlreadyRequested, setCodeAlreadyRequested] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // No prefs yet on approve page, default to English
  const lang = 'en'

  useEffect(() => {
    initialize()
  }, [])

  async function initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/login')
        return
      }

      setUser(session.user)
      setSessionToken(session.access_token)

      const statusResponse = await fetch('/api/access/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, authToken: session.access_token })
      })

      const statusResult = await statusResponse.json().catch(() => ({}))
      if (statusResponse.ok && statusResult?.success && statusResult.approved) {
        router.replace('/')
        return
      }

      if (statusResult?.codeRequested) {
        setCodeAlreadyRequested(true)
        setMessage(t(lang, 'codeAlreadySent'))
      } else {
        setMessage(t(lang, 'requestCodePrompt'))
      }
    } finally {
      setLoading(false)
    }
  }

  async function requestCode() {
    if (!user?.id || !sessionToken) return

    setRequestingCode(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/access/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, authToken: sessionToken })
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Could not request code')
      }

      if (result.approved) {
        router.replace('/')
        return
      }

      setCodeAlreadyRequested(true)
      setMessage(t(lang, 'codeRequested'))
    } catch (err) {
      if (err.message?.includes('already been requested')) {
        setCodeAlreadyRequested(true)
      }
      setError(err.message || 'Failed to request code')
    } finally {
      setRequestingCode(false)
    }
  }

  async function verifyCode(e) {
    e.preventDefault()
    if (!user?.id || !sessionToken || !code.trim()) return

    setVerifying(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/access/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, authToken: sessionToken, code: code.trim() })
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Invalid code')
      }

      setMessage(t(lang, 'accountApproved'))
      setTimeout(() => router.replace('/'), 500)
    } catch (err) {
      setError(err.message || 'Could not verify code')
    } finally {
      setVerifying(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="text-xl text-gray-700">{t(lang, 'loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-indigo-900 mb-2">{t(lang, 'approvalRequired')}</h1>
        <p className="text-gray-600 text-sm mb-6">
          {t(lang, 'signedInAs')} <span className="font-semibold">{user?.email || 'unknown user'}</span>
        </p>

        {!codeAlreadyRequested && (
          <button
            onClick={requestCode}
            disabled={requestingCode}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold"
          >
            {requestingCode ? t(lang, 'sendingCode') : t(lang, 'requestCode')}
          </button>
        )}

        <form onSubmit={verifyCode} className="mt-4 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t(lang, 'enterCode')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            inputMode="numeric"
            maxLength={6}
            required
          />
          <button
            type="submit"
            disabled={verifying || code.trim().length < 6}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
          >
            {verifying ? t(lang, 'verifying') : t(lang, 'verifyAndContinue')}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-green-700 bg-green-50 p-3 rounded-lg">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}

        <details className="mt-6 text-sm text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">{t(lang, 'whyCode')}</summary>
          <p className="mt-2 text-gray-600 leading-relaxed">{t(lang, 'whyCodeExplanation')}</p>
        </details>

        <button
          onClick={handleLogout}
          className="w-full mt-4 text-sm text-gray-600 hover:text-gray-800 underline"
        >
          {t(lang, 'logout')}
        </button>
      </div>
    </div>
  )
}
