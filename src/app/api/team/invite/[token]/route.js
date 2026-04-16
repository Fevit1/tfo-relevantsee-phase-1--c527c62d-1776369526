import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/team/invite/[token]
 *
 * Public endpoint — validates invite token.
 * Returns 404 for invalid tokens, 410 for expired/accepted tokens.
 * Returns { account_name, role, email } on success.
 */
export async function GET(req, { params }) {
  const { token } = params

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  }

  const serviceClient = createServiceClient()

  const { data: invite, error } = await serviceClient
    .from('team_invites')
    .select('id, account_id, email, role, status, expires_at, accounts(name)')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // Check if already accepted
  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 410 })
  }

  // Check expiry
  const now = new Date()
  const expiresAt = new Date(invite.expires_at)

  if (invite.status === 'expired' || now > expiresAt) {
    // Mark as expired in DB if not already flagged
    if (invite.status !== 'expired') {
      await serviceClient
        .from('team_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)
    }
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // Must be pending to be valid
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invite is not valid' }, { status: 410 })
  }

  return NextResponse.json({
    account_name: invite.accounts?.name || 'Unknown Account',
    role: invite.role,
    email: invite.email,
  })
}