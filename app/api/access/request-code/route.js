import { NextResponse } from 'next/server'
import { randomInt } from 'node:crypto'
import { getClients, requireAuthedUser, getApprovalRow, hashCode } from '../_utils'

async function sendTelegramCode(code, email, ip) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN')
  }

  if (!chatId) {
    throw new Error('Missing TELEGRAM_ADMIN_CHAT_ID')
  }

  const text = [
    'New login approval request',
    `Email: ${email || 'unknown'}`,
    `IP: ${ip || 'unknown'}`,
    `Time: ${new Date().toISOString()}`,
    `Code: ${code}`,
    'This code expires in 10 minutes.'
  ].join('\n')

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const detail = payload?.description || 'unknown Telegram API error'
    throw new Error(`Failed to send Telegram message: ${detail}`)
  }
}

export async function POST(request) {
  try {
    const { userId, authToken } = await request.json()
    if (!userId || !authToken) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
    }

    const { userClient, adminClient } = getClients(authToken)
    const user = await requireAuthedUser(userClient, authToken, userId)

    const row = await getApprovalRow(adminClient, userId)
    const now = new Date()

    if (row?.approved) {
      return NextResponse.json({ success: true, approved: true })
    }

    if (row?.pending_code_hash) {
      return NextResponse.json({ success: false, error: 'A code has already been requested. Please enter the code provided by the admin.', alreadyRequested: true }, { status: 409 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const code = String(randomInt(100000, 1000000))
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString()

    await sendTelegramCode(code, user.email, ip)

    await adminClient
      .from('user_access_approvals')
      .upsert({
        user_id: userId,
        approved: false,
        pending_code_hash: hashCode(userId, code),
        code_expires_at: expiresAt,
        last_requested_at: now.toISOString(),
        updated_at: now.toISOString()
      })

    return NextResponse.json({ success: true, approved: false })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || 'Could not request code' }, { status: 500 })
  }
}
