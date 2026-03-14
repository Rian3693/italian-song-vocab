import { NextResponse } from 'next/server'
import { getClients, requireAuthedUser, getApprovalRow, hashCode } from '../_utils'

export async function POST(request) {
  try {
    const { userId, authToken, code } = await request.json()
    if (!userId || !authToken || !code) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
    }

    const { userClient, adminClient } = getClients(authToken)
    await requireAuthedUser(userClient, authToken, userId)

    const row = await getApprovalRow(adminClient, userId)
    if (!row?.pending_code_hash || !row?.code_expires_at) {
      return NextResponse.json({ success: false, error: 'No active code. Request a new code.' }, { status: 400 })
    }

    if (new Date(row.code_expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'Code expired. Request a new code.' }, { status: 400 })
    }

    const incomingHash = hashCode(userId, String(code).trim())
    if (incomingHash !== row.pending_code_hash) {
      await adminClient
        .from('user_access_approvals')
        .update({
          failed_attempts: Number(row.failed_attempts || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 })
    }

    await adminClient
      .from('user_access_approvals')
      .upsert({
        user_id: userId,
        approved: true,
        pending_code_hash: null,
        code_expires_at: null,
        failed_attempts: 0,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    return NextResponse.json({ success: true, approved: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Could not verify code' }, { status: 500 })
  }
}
