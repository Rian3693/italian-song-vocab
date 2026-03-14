import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

export function getClients(authToken) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    }
  })

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  return { userClient, adminClient }
}

export async function requireAuthedUser(userClient, authToken, claimedUserId) {
  const { data, error } = await userClient.auth.getUser(authToken)
  if (error || !data?.user) {
    throw new Error('Unauthorized')
  }
  if (claimedUserId && data.user.id !== claimedUserId) {
    throw new Error('Unauthorized')
  }
  return data.user
}

export async function getApprovalRow(adminClient, userId) {
  const { data, error } = await adminClient
    .from('user_access_approvals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function requireApproved(adminClient, userId) {
  const row = await getApprovalRow(adminClient, userId)
  if (!row?.approved) {
    throw new Error('Not approved')
  }
  return row
}

export function hashCode(userId, code) {
  const salt = process.env.ACCESS_CODE_SECRET || 'default-access-code-secret'
  return createHash('sha256').update(`${userId}:${code}:${salt}`).digest('hex')
}
