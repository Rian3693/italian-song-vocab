import { supabase } from '@/lib/supabase'

const PREFS_CACHE_KEY = 'userPreferences'

export async function getUserPreferences(userId) {
  // Check localStorage cache first
  if (typeof window !== 'undefined') {
    try {
      const cached = JSON.parse(localStorage.getItem(PREFS_CACHE_KEY) || 'null')
      if (cached && cached.user_id === userId) {
        return cached
      }
    } catch {}
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (data && typeof window !== 'undefined') {
    localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(data))
  }

  return data || null
}

export async function saveUserPreferences(userId, { native_language, learning_language }) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      native_language,
      learning_language,
      updated_at: now
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error

  if (typeof window !== 'undefined') {
    localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('prefsUpdated'))
  }

  return data
}

export async function hasCompletedSetup(userId) {
  const prefs = await getUserPreferences(userId)
  return !!prefs
}

export function clearPrefsCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PREFS_CACHE_KEY)
  }
}
