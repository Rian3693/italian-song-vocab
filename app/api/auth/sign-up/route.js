import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

const MAX_USERS_PER_IP = 2
const TEMP_BYPASS_EMAIL_CONFIRMATION_FOR_ALL = true

function normalizeIp(ip) {
  const raw = String(ip || '').trim()
  if (!raw) return ''

  // Normalize IPv4-mapped IPv6 format: ::ffff:1.2.3.4
  if (raw.startsWith('::ffff:')) {
    return raw.slice(7)
  }

  return raw
}

function isAdminIp(clientIp) {
  const configured = process.env.ADMIN_SIGNUP_IPS || process.env.ADMIN_SIGNUP_IP || ''
  const allowed = configured
    .split(',')
    .map((ip) => normalizeIp(ip))
    .filter(Boolean)

  if (!allowed.length) return false
  return allowed.includes(normalizeIp(clientIp))
}

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.trim()

  return null
}

function hashIp(ip) {
  return createHash('sha256').update(ip).digest('hex')
}

export async function POST(request) {
  try {
    const { email, password, emailRedirectTo } = await request.json()
    void emailRedirectTo

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    void supabaseAnonKey

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Server is missing Supabase configuration for sign-up protection'
      }, { status: 500 })
    }

    const clientIp = getClientIp(request)
    if (!clientIp) {
      return NextResponse.json({
        success: false,
        error: 'Could not verify your network. Please try again.'
      }, { status: 400 })
    }

    const normalizedClientIp = normalizeIp(clientIp)
    const ipHash = hashIp(normalizedClientIp)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { count: existingFromIp, error: countError } = await adminClient
      .from('signup_ip_limits')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)

    if (countError) {
      console.error('IP limit check failed:', countError)
      return NextResponse.json({
        success: false,
        error: 'Could not validate signup limit. Please try again shortly.'
      }, { status: 500 })
    }

    const adminIp = isAdminIp(normalizedClientIp)

    if (!adminIp && (existingFromIp || 0) >= MAX_USERS_PER_IP) {
      return NextResponse.json({
        success: false,
        error: 'This network has reached the maximum number of accounts (2).'
      }, { status: 429 })
    }

    let signUpData = null
    let requiresEmailConfirmation = true

    if (TEMP_BYPASS_EMAIL_CONFIRMATION_FOR_ALL) {
      const { data: createdData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (createError) {
        const message = /already registered|already exists/i.test(createError.message)
          ? 'This email is already registered.'
          : createError.message
        return NextResponse.json({ success: false, error: message }, { status: 400 })
      }

      signUpData = { user: createdData?.user }
      requiresEmailConfirmation = false
    }

    const createdUserId = signUpData?.user?.id

    if (createdUserId) {
      const { error: logError } = await adminClient
        .from('signup_ip_limits')
        .insert({
          user_id: createdUserId,
          email,
          ip_hash: ipHash
        })

      if (logError) {
        console.error('Failed to log signup IP:', logError)
      }
    }

    return NextResponse.json({ success: true, requiresEmailConfirmation })
  } catch (error) {
    console.error('Sign-up API failed:', error)
    return NextResponse.json({ success: false, error: 'Sign up failed' }, { status: 500 })
  }
}
