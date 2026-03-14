import { supabase } from '@/lib/supabase'
import { getUserPreferences } from '@/lib/preferences'

export async function getApprovalStatus(userId, authToken) {
  const response = await fetch('/api/access/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, authToken })
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Could not verify account approval')
  }

  return !!payload.approved
}

export async function ensureApprovedOrRedirect(router, fallbackPath = '/') {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    router.replace('/login')
    return { ok: false, user: null, session: null, prefs: null }
  }

  try {
    const approved = await getApprovalStatus(user.id, session.access_token)
    if (!approved) {
      router.replace('/approve')
      return { ok: false, user, session, prefs: null }
    }

    // Check if user has completed language setup
    const prefs = await getUserPreferences(user.id)
    if (!prefs) {
      router.replace('/setup')
      return { ok: false, user, session, prefs: null }
    }

    return { ok: true, user, session, prefs }
  } catch {
    router.replace(fallbackPath)
    return { ok: false, user, session, prefs: null }
  }
}
