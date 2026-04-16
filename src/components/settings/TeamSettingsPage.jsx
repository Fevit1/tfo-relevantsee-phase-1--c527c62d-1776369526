'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  getTeam,
  inviteTeamMember,
  updateMemberRole,
  removeMember,
  AuthError,
  PermissionError,
  RateLimitError,
  getApiErrorMessage,
} from '@/lib/api'

const ROLES = ['admin', 'editor', 'viewer']

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function validateEmail(email) {
  if (!email || !email.trim()) return 'Email address is required.'
  const trimmed = email.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) return 'Please enter a valid email address.'
  return null
}

// ─── Role badge helper ────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-indigo-900 text-indigo-200 border border-indigo-600',
    editor: 'bg-sky-900 text-sky-200 border border-sky-700',
    viewer: 'bg-gray-700 text-gray-200 border border-gray-600',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[role] || styles.viewer}`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-700 bg-gray-800/30 p-4 animate-pulse"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded bg-gray-700 w-1/3" />
              <div className="h-3 rounded bg-gray-700/70 w-1/2" />
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-700" />
            <div className="h-7 w-20 rounded-md bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 4 }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-800/60">
            {['Name', 'Email', 'Role', 'Joined', 'Actions'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="bg-gray-800/20">
              {Array.from({ length: 5 }).map((__, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-4 rounded bg-gray-700/60 animate-pulse w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmRemoveModal({ member, onConfirm, onCancel, isRemoving }) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && !isRemoving) onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isRemoving, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-remove-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3
          id="confirm-remove-title"
          className="text-lg font-semibold text-white"
        >
          Remove team member?
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          <span className="font-medium text-gray-200">
            {member.full_name || member.email}
          </span>{' '}
          will lose access immediately. This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isRemoving}
            className="rounded-md border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isRemoving}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRemoving ? (
              <>
                <Spinner />
                Removing…
              </>
            ) : (
              'Yes, remove'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Member Row (mobile card) ─────────────────────────────────────────────────

function MemberCard({ member, currentUserId, onRoleChange, onRemove, updatingRole, removing }) {
  const isSelf = member.id === currentUserId
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-150 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {member.full_name || '—'}
            {isSelf && (
              <span className="ml-2 text-xs text-indigo-400 font-normal">(you)</span>
            )}
          </p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{member.email}</p>
          <p className="text-xs text-gray-500 mt-1">Joined {formatDate(member.created_at)}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {isSelf ? (
            <RoleBadge role={member.role} />
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                value={member.role}
                onChange={(e) => onRoleChange(member.id, e.target.value, member.email)}
                disabled={updatingRole}
                className="bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded-md px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                aria-label={`Change role for ${member.full_name || member.email}`}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
              {updatingRole && <Spinner />}
            </div>
          )}
          {!isSelf && (
            <button
              onClick={() => onRemove(member)}
              disabled={removing || updatingRole}
              className="text-xs px-2.5 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Remove ${member.full_name || member.email} from team`}
            >
              {removing ? 'Removing…' : 'Remove'}
            </button>
          )}
          {isSelf && (
            <span className="text-xs text-gray-500 italic">You</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamSettingsPage({ currentUserId }) {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [memberCount, setMemberCount] = useState(0)
  const [softCapWarning, setSoftCapWarning] = useState(false)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteEmailError, setInviteEmailError] = useState(null)

  // Per-member action state
  const [roleUpdateLoading, setRoleUpdateLoading] = useState({})
  const [removeLoading, setRemoveLoading] = useState({})
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTeam()
      setMembers(data.members || [])
      setPendingInvites(data.pending_invites || [])
      setMemberCount(data.member_count || 0)
      setSoftCapWarning(data.soft_cap_warning || false)
    } catch (err) {
      const msg = getApiErrorMessage(err)
      setError(msg)
      if (err instanceof PermissionError) {
        toast.error(msg, { title: 'Access denied' })
      } else if (err instanceof RateLimitError) {
        toast.warning(msg, { title: 'Rate limit reached' })
      } else {
        toast.error(msg, { title: 'Failed to load team' })
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  async function handleRoleChange(userId, newRole, userEmail) {
    setRoleUpdateLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await updateMemberRole(userId, { role: newRole })
      toast.success(`Role updated to ${newRole}.`, { title: 'Role changed' })
      await fetchTeam()
    } catch (err) {
      const msg = getApiErrorMessage(err)
      if (err instanceof PermissionError) {
        toast.error('Only admins can change member roles.', { title: 'Access denied' })
      } else if (err instanceof RateLimitError) {
        toast.warning(msg, { title: 'Rate limit reached' })
      } else {
        toast.error(msg, { title: 'Role change failed' })
      }
      await fetchTeam()
    } finally {
      setRoleUpdateLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  function handleRemoveClick(member) {
    setConfirmRemoveMember(member)
  }

  async function handleConfirmRemove() {
    if (!confirmRemoveMember) return
    const userId = confirmRemoveMember.id
    const displayName = confirmRemoveMember.full_name || confirmRemoveMember.email
    setRemoveLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await removeMember(userId)
      setConfirmRemoveMember(null)
      toast.success(`${displayName} has been removed from the team.`, { title: 'Member removed' })
      await fetchTeam()
    } catch (err) {
      const msg = getApiErrorMessage(err)
      if (err instanceof PermissionError) {
        toast.error('Only admins can remove team members.', { title: 'Access denied' })
      } else if (err instanceof RateLimitError) {
        toast.warning(msg, { title: 'Rate limit reached' })
      } else {
        toast.error(msg, { title: 'Remove failed' })
      }
    } finally {
      setRemoveLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  async function handleInviteSubmit(e) {
    e.preventDefault()
    setInviteEmailError(null)

    const validationError = validateEmail(inviteEmail)
    if (validationError) {
      setInviteEmailError(validationError)
      return
    }

    setInviteLoading(true)
    try {
      const data = await inviteTeamMember({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      })

      if (data.email_sent) {
        toast.success(`Invite sent to ${data.invite?.email}.`, { title: 'Invite sent' })
      } else {
        toast.warning(
          `Invite created for ${data.invite?.email}, but email delivery failed. Share the link manually if needed.`,
          { title: 'Invite created' }
        )
      }

      setInviteEmail('')
      setInviteRole('editor')
      await fetchTeam()
    } catch (err) {
      const msg = getApiErrorMessage(err)
      if (err instanceof PermissionError) {
        toast.error('Only admins can invite team members.', { title: 'Access denied' })
      } else if (err instanceof RateLimitError) {
        toast.warning(msg, { title: 'Rate limit reached' })
      } else if (err instanceof AuthError) {
        toast.error('Your session has expired. Please log in again.', { title: 'Session expired' })
      } else {
        toast.error(msg, { title: 'Invite failed' })
      }
    } finally {
      setInviteLoading(false)
    }
  }

  const isRemovingMember = confirmRemoveMember
    ? (removeLoading[confirmRemoveMember.id] || false)
    : false

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Confirmation modal */}
      {confirmRemoveMember && (
        <ConfirmRemoveModal
          member={confirmRemoveMember}
          isRemoving={isRemovingMember}
          onConfirm={handleConfirmRemove}
          onCancel={() => {
            if (!isRemovingMember) setConfirmRemoveMember(null)
          }}
        />
      )}

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-white">Team Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage team members, roles, and invitations.
        </p>
      </div>

      {/* Soft cap warning */}
      {softCapWarning && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
          <span className="text-yellow-400 text-lg leading-none mt-0.5" aria-hidden="true">⚠</span>
          <div>
            <p className="text-sm font-medium text-yellow-300">Team size limit approaching</p>
            <p className="text-xs text-yellow-200 mt-0.5">
              Your account has reached 25 or more members (including pending invites). Contact
              support if you need to expand your team.
            </p>
          </div>
        </div>
      )}

      {/* Load error */}
      {error && (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3"
          role="alert"
        >
          <span className="text-red-400 text-lg leading-none mt-0.5" aria-hidden="true">✕</span>
          <div className="flex-1">
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button
            onClick={fetchTeam}
            className="text-xs text-red-300 underline hover:text-red-200 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded transition-colors duration-150"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Members section ─────────────────────────────────────────────────── */}
      <section aria-labelledby="members-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="members-heading" className="text-lg font-semibold text-white">
            Members{' '}
            {!loading && (
              <span className="text-sm font-normal text-gray-400">({memberCount})</span>
            )}
          </h2>
        </div>

        {loading ? (
          <>
            {/* Mobile skeleton */}
            <div className="md:hidden">
              <CardSkeleton rows={4} />
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:block">
              <TableSkeleton rows={4} />
            </div>
          </>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800/40 px-4 py-10 text-center">
            <svg
              className="mx-auto h-8 w-8 text-gray-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-3-3.87m6 5.87a4 4 0 01-3-3.87M15 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <p className="text-sm text-gray-500">No team members found.</p>
          </div>
        ) : (
          <>
            {/* ── Mobile: card list ── */}
            <div className="md:hidden space-y-3">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  currentUserId={currentUserId}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemoveClick}
                  updatingRole={roleUpdateLoading[member.id] || false}
                  removing={removeLoading[member.id] || false}
                />
              ))}
            </div>

            {/* ── Desktop: table ── */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/60">
                    {['Name', 'Email', 'Role', 'Joined', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {members.map((member) => {
                    const isSelf = member.id === currentUserId
                    const updatingRole = roleUpdateLoading[member.id] || false
                    const removing = removeLoading[member.id] || false

                    return (
                      <tr
                        key={member.id}
                        className="bg-gray-800/20 hover:bg-gray-800/50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          {member.full_name || '—'}
                          {isSelf && (
                            <span className="ml-2 text-xs text-indigo-300 font-normal">(you)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{member.email}</td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <RoleBadge role={member.role} />
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.id, e.target.value, member.email)
                                }
                                disabled={updatingRole}
                                className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-md px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                aria-label={`Change role for ${member.full_name || member.email}`}
                              >
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </option>
                                ))}
                              </select>
                              {updatingRole && <Spinner />}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDate(member.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <span className="text-xs text-gray-500 italic">Cannot remove self</span>
                          ) : (
                            <button
                              onClick={() => handleRemoveClick(member)}
                              disabled={removing || updatingRole}
                              className="text-xs px-3 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Remove ${member.full_name || member.email} from team`}
                            >
                              {removing ? 'Removing…' : 'Remove'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Pending Invites ─────────────────────────────────────────────────── */}
      <section aria-labelledby="invites-heading">
        <h2 id="invites-heading" className="text-lg font-semibold text-white mb-3">
          Pending Invites{' '}
          {!loading && pendingInvites.length > 0 && (
            <span className="text-sm font-normal text-gray-400">({pendingInvites.length})</span>
          )}
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-700/40 animate-pulse" />
            ))}
          </div>
        ) : pendingInvites.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800/40 px-4 py-5 text-center text-sm text-gray-400">
            No pending invites.
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-3">
              {pendingInvites.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date()
                return (
                  <div
                    key={invite.id}
                    className="rounded-lg border border-gray-700 bg-gray-800/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-200 truncate">{invite.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Sent {formatDate(invite.created_at)} · Expires {formatDate(invite.expires_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <RoleBadge role={invite.role} />
                        {isExpired ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-900 text-red-200 border border-red-700">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-900 text-amber-200 border border-amber-700">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/60">
                    {['Email', 'Role', 'Sent', 'Expires', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {pendingInvites.map((invite) => {
                    const isExpired = new Date(invite.expires_at) < new Date()
                    return (
                      <tr
                        key={invite.id}
                        className="bg-gray-800/20 hover:bg-gray-800/50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 text-gray-200">{invite.email}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={invite.role} />
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDate(invite.created_at)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDate(invite.expires_at)}
                        </td>
                        <td className="px-4 py-3">
                          {isExpired ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-900 text-red-200 border border-red-700">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-900 text-amber-200 border border-amber-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Invite form ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="invite-form-heading">
        <h2 id="invite-form-heading" className="text-lg font-semibold text-white mb-3">
          Invite a Team Member
        </h2>
        <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-5 transition-all duration-200">
          <form
            onSubmit={handleInviteSubmit}
            noValidate
            className="flex flex-col sm:flex-row gap-3 items-start sm:items-end"
          >
            <div className="flex-1 min-w-0 w-full">
              <label
                htmlFor="invite-email"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  if (inviteEmailError) setInviteEmailError(null)
                }}
                placeholder="colleague@company.com"
                aria-invalid={!!inviteEmailError}
                aria-describedby={inviteEmailError ? 'invite-email-error' : 'invite-email-hint'}
                className={`w-full bg-gray-700 border text-gray-200 placeholder-gray-500 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-colors duration-150 ${
                  inviteEmailError ? 'border-red-500' : 'border-gray-600 hover:border-gray-500'
                }`}
                autoComplete="off"
              />
              {inviteEmailError ? (
                <p
                  id="invite-email-error"
                  className="mt-1.5 text-xs text-red-300"
                  role="alert"
                >
                  {inviteEmailError}
                </p>
              ) : (
                <p id="invite-email-hint" className="sr-only">
                  Enter the email address of the person you want to invite.
                </p>
              )}
            </div>

            <div className="w-full sm:w-36">
              <label
                htmlFor="invite-role"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent hover:border-gray-500 transition-colors duration-150"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-shrink-0 w-full sm:w-auto">
              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteLoading ? (
                  <>
                    <Spinner />
                    Sending…
                  </>
                ) : (
                  'Send Invite'
                )}
              </button>
            </div>
          </form>

          <p className="mt-3 text-xs text-gray-500">
            The invitee will receive an email with a link to set up their account. Invites expire
            after 7 days.
          </p>
        </div>
      </section>
    </div>
  )
}