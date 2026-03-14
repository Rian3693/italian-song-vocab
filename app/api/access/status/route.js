import { NextResponse } from 'next/server'
import { getClients, requireAuthedUser, getApprovalRow } from '../_utils'

export async function POST(request) {
  try {
    const { userId, authToken } = await request.json()
    if (!userId || !authToken) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
    }

    const { userClient, adminClient } = getClients(authToken)
    await requireAuthedUser(userClient, authToken, userId)

    const row = await getApprovalRow(adminClient, userId)

    return NextResponse.json({
      success: true,
      approved: !!row?.approved,
      codeRequested: !!row?.pending_code_hash
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}
