import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/team
 *
 * Admin only. Returns current team members and pending invites for the account.
 * Includes member count for soft-cap logic.
 */
export async function GET(req) {
  let authContext
  try {
    authContext = await getAuthenticatedUser()
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: err.status || 401 })
  }

  if (authContext.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 })
  }

  const supabase = await createClient()

  // Fetch team members — RLS scopes this to the admin's account
  const { data: members, error: membersError } = await supabase
    .from('users')
    .select('id, email, role, full_name, created_at')
    .eq('account_id', authContext.accountId)
    .order('created_at', { ascending: true })

  if (membersError) {
    console.error('[team] Members fetch failed:', membersError?.message)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }

  // Fetch pending invites — RLS scopes this to the admin's account
  const { data: pendingInvites, error: invitesError } = await supabase
    .from('team_invites')
    .select('id, email, role, status, created_at, expires_at, invited_by')
    .eq('account_id', authContext.accountId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (invitesError) {
    console.error('[team] Invites fetch failed:', invitesError?.message)
    return NextResponse.json({ error: 'Failed to fetch pending invites' }, { status: 500 })
  }

  const memberList = members || []
  const pendingInviteList = pendingInvites || []
  const memberCount = memberList.length
  const pendingInviteCount = pendingInviteList.length
  const totalCount = memberCount + pendingInviteCount

  return NextResponse.json({
    members: memberList,
    pending_invites: pendingInviteList,
    member_count: memberCount,
    pending_invite_count: pendingInviteCount,
    total_count: totalCount,
    soft_cap_warning: totalCount >= 25,
  })
}