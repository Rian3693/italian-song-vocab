'use client'

import './globals.css'
import { useEffect } from 'react'

const PREFS_CACHE_KEY = 'userPreferences'

function RTLHandler() {
  useEffect(() => {
    function applyDir() {
      try {
        const cached = JSON.parse(localStorage.getItem(PREFS_CACHE_KEY) || 'null')
        const lang = cached?.native_language || 'en'
        document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
        document.documentElement.lang = lang
      } catch {
        document.documentElement.dir = 'ltr'
      }
    }

    applyDir()
    window.addEventListener('storage', applyDir)
    // Also listen for custom event so same-tab updates work
    window.addEventListener('prefsUpdated', applyDir)
    return () => {
      window.removeEventListener('storage', applyDir)
      window.removeEventListener('prefsUpdated', applyDir)
    }
  }, [])

  return null
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Song Vocabulary</title>
        <meta name="description" content="Learn languages through music" />
      </head>
      <body>
        <RTLHandler />
        {children}
      </body>
    </html>
  )
}
