'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

/**
 * ProtectedRoute
 *
 * Client-side route guard component. Wraps page content that requires
 * authentication and/or a specific role.
 *
 * Handles:
 * - Loading state with spinner while auth is being determined
 * - Unauthenticated users → redirect to /login
 * - Auth errors → redirect to /login?error=auth_error
 * - Orphaned auth users (session exists but no users table row) → redirect to /login?error=orphaned_user
 * - Role-gated access → redirect to redirectTo with ?error=unauthorized
 *
 * Props:
 *   allowedRoles: string[] — e.g. ['admin'] or ['admin', 'editor']
 *                 If omitted, any authenticated user is allowed.
 *   redirectTo: string — path to redirect unauthorized users (default: '/dashboard')
 *   children: React node
 *   fallback: React node — shown while loading (optional)
 */
export function ProtectedRoute({
  allowedRoles,
  redirectTo = '/dashboard',
  children,
  fallback = null,
}) {
  const { user, dbUser, loading, role, error } = useAuth()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (loading) return
    if (hasRedirected.current) return

    // Auth error (e.g. Supabase returned an error during session fetch)
    if (error) {
      hasRedirected.current = true
      router.replace('/login?error=auth_error')
      return
    }

    // Not authenticated
    if (!user) {
      hasRedirected.current = true
      router.replace('/login')
      return
    }

    // User session exists but no DB row found — orphaned auth user
    // We wait briefly to allow dbUser to load; if still null after loading completes, it's orphaned
    if (user && !dbUser) {
      hasRedirected.current = true
      router.replace('/login?error=orphaned_user')
      return
    }

    // Role check
    if (allowedRoles && !allowedRoles.includes(role)) {
      hasRedirected.current = true
      router.replace(`${redirectTo}?error=unauthorized`)
      return
    }
  }, [user, dbUser, loading, role, allowedRoles, redirectTo, router, error])

  // Reset redirect flag when loading restarts (e.g. auth state change)
  useEffect(() => {
    if (loading) {
      hasRedirected.current = false
    }
  }, [loading])

  if (loading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
            <p className="text-sm text-gray-400">Verifying session…</p>
          </div>
        </div>
      )
    )
  }

  // Auth error — show a brief message before redirect fires
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-red-500" />
          <p className="text-sm text-red-400">Authentication error. Redirecting…</p>
        </div>
      </div>
    )
  }

  // Not authenticated — render nothing while redirect fires
  if (!user) return null

  // Orphaned auth user — render nothing while redirect fires
  if (!dbUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-yellow-500" />
          <p className="text-sm text-yellow-400">Account not found. Redirecting…</p>
        </div>
      </div>
    )
  }

  // Role check failed — render nothing while redirect fires
  if (allowedRoles && !allowedRoles.includes(role)) return null

  return <>{children}</>
}

/**
 * AdminOnly
 * Convenience wrapper — renders children only for admin role.
 * Non-admins see nothing (or optional fallback).
 */
export function AdminOnly({ children, fallback = null }) {
  const { role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
      </div>
    )
  }
  if (role !== 'admin') return fallback
  return <>{children}</>
}

/**
 * EditorOrAdmin
 * Convenience wrapper — renders children for admin or editor roles.
 */
export function EditorOrAdmin({ children, fallback = null }) {
  const { role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
      </div>
    )
  }
  if (!['admin', 'editor'].includes(role)) return fallback
  return <>{children}</>
}

export default ProtectedRoute