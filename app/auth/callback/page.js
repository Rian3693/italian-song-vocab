'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Confirming your account...')

  useEffect(() => {
    let cancelled = false

    async function completeAuth() {
      try {
        if (cancelled) return

        // Supabase verify links can safely return users to login after confirmation.
        setStatus('Email confirmed. Please sign in.')
        router.replace('/login?confirmed=1')
      } catch (error) {
        if (cancelled) return
        console.error('Auth callback failed:', error)
        setStatus('Could not complete email confirmation. Please sign in manually.')
        router.replace('/login')
      }
    }

    completeAuth()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-indigo-900 mb-3">Confirming account</h1>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  )
}
