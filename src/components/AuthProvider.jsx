'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const AuthContext = createContext(null)

/**
 * AuthProvider
 *
 * Provides auth state (session, user, dbUser, role, loading) to the entire app.
 * Wraps the root layout. Handles Supabase auth state changes reactively.
 *
 * dbUser is always fetched from the `users` table — never from JWT claims.
 *
 * Error handling:
 * - getSession() network errors are caught and surfaced as authError
 * - 401/403 responses clear session and redirect to /login
 * - onAuthStateChange errors are caught and surfaced
 * - authError is exposed for consumers (ProtectedRoute, etc.)
 */
export function AuthProvider({ children }) {
  const [supabase] = useState(() => createClient())
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [dbUser, setDbUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authError, setAuthError] = useState(null)
  const router = useRouter()
  const mountedRef = useRef(true)

  const handleUnauthorized = useCallback(() => {
    setSession(null)
    setUser(null)
    setDbUser(null)
    setAuthError('Your session has expired. Please sign in again.')
    router.push('/login')
  }, [router])

  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  const fetchDbUser = useCallback(
    async (authUser) => {
      if (!authUser) {
        setDbUser(null)
        return
      }
      try {
        const { data, error: dbError } = await supabase
          .from('users')
          .select('id, account_id, role, full_name, email')
          .eq('id', authUser.id)
          .single()

        if (!mountedRef.current) return

        if (dbError) {
          // 401 / permission denied — treat as unauthorized
          if (
            dbError.code === 'PGRST301' ||
            dbError.message?.toLowerCase().includes('jwt') ||
            dbError.message?.toLowerCase().includes('unauthorized') ||
            dbError.message?.toLowerCase().includes('403')
          ) {
            handleUnauthorized()
            return
          }
          console.error('[AuthProvider] DB user fetch error:', dbError.message)
          setDbUser(null)
          setAuthError(`Failed to load your profile: ${dbError.message}`)
        } else {
          setDbUser(data)
          setAuthError(null)
        }
      } catch (err) {
        if (!mountedRef.current) return
        console.error('[AuthProvider] Unexpected error fetching DB user:', err)
        setDbUser(null)

        // Network-level errors
        if (err.message?.toLowerCase().includes('401') || err.status === 401) {
          handleUnauthorized()
          return
        }
        if (err.message?.toLowerCase().includes('403') || err.status === 403) {
          handleUnauthorized()
          return
        }

        setAuthError('An unexpected error occurred loading your profile. Please refresh.')
      }
    },
    [supabase, handleUnauthorized]
  )

  useEffect(() => {
    mountedRef.current = true

    const initialize = async () => {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        if (sessionError) {
          console.error('[AuthProvider] getSession error:', sessionError.message)

          if (
            sessionError.status === 401 ||
            sessionError.message?.toLowerCase().includes('unauthorized')
          ) {
            handleUnauthorized()
          } else {
            setError(sessionError.message)
            setAuthError('Could not retrieve your session. Please sign in again.')
          }
          setLoading(false)
          return
        }

        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        await fetchDbUser(initialSession?.user ?? null)
      } catch (err) {
        if (!mountedRef.current) return

        console.error('[AuthProvider] Initialization error:', err)

        // Network error (offline, DNS failure, etc.)
        if (
          err instanceof TypeError ||
          err.message?.toLowerCase().includes('network') ||
          err.message?.toLowerCase().includes('fetch')
        ) {
          setAuthError(
            'Unable to connect to the authentication service. Please check your connection and refresh.'
          )
        } else if (err.status === 401 || err.message?.toLowerCase().includes('401')) {
          handleUnauthorized()
        } else {
          setError(err.message)
          setAuthError('An unexpected error occurred during sign-in. Please try again.')
        }
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mountedRef.current) return

      try {
        // Handle explicit sign-out or token expiry events
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setDbUser(null)
          setLoading(false)
          return
        }

        if (event === 'TOKEN_REFRESHED' && !newSession) {
          // Refresh failed — session is gone
          handleUnauthorized()
          return
        }

        setSession(newSession)
        setUser(newSession?.user ?? null)
        setLoading(true)

        await fetchDbUser(newSession?.user ?? null)
      } catch (err) {
        if (!mountedRef.current) return
        console.error('[AuthProvider] onAuthStateChange handler error:', err)

        if (err.status === 401 || err.message?.toLowerCase().includes('401')) {
          handleUnauthorized()
        } else {
          setAuthError('An error occurred while updating your session. Please refresh.')
        }
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchDbUser, handleUnauthorized])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error('[AuthProvider] Sign out error:', signOutError.message)
        // Even on sign-out error, clear local state
      }
    } catch (err) {
      console.error('[AuthProvider] Unexpected sign out error:', err)
    } finally {
      setSession(null)
      setUser(null)
      setDbUser(null)
      setAuthError(null)
      setLoading(false)
    }
  }, [supabase])

  const value = {
    supabase,
    session,
    user,
    dbUser,
    role: dbUser?.role ?? null,
    accountId: dbUser?.account_id ?? null,
    userId: dbUser?.id ?? null,
    loading,
    error,
    authError,
    clearAuthError,
    signOut,
    isAdmin: dbUser?.role === 'admin',
    isEditor: dbUser?.role === 'editor',
    isViewer: dbUser?.role === 'viewer',
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div
          role="status"
          aria-label="Loading application"
          aria-live="polite"
          aria-busy="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          {/* Spinner */}
          <div className="relative flex items-center justify-center">
            {/* Outer glow ring */}
            <span
              className="absolute inline-block h-16 w-16 rounded-full bg-primary/10"
              aria-hidden="true"
            />
            {/* Spinning border ring */}
            <span
              className="inline-block h-12 w-12 animate-spin rounded-full border-[3px] border-solid border-primary border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
              style={{
                boxShadow: '0 0 12px hsl(217 91% 60% / 0.25)',
              }}
            />
            {/* Inner dot */}
            <span
              className="absolute inline-block h-2.5 w-2.5 rounded-full bg-primary"
              aria-hidden="true"
            />
          </div>

          {/* Accessible text label */}
          <p className="mt-5 text-sm font-medium text-muted-foreground tracking-wide select-none">
            Loading&hellip;
          </p>

          {/* sr-only fallback for screen readers */}
          <span className="sr-only">Application is loading, please wait.</span>
        </div>
      ) : (
        <>
          {/* aria-live region announces when loading is done */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            Application ready.
          </div>
          {children}
        </>
      )}
    </AuthContext.Provider>
  )
}

/**
 * useAuth
 * Primary hook for consuming auth state throughout the app.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthProvider