'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

const resetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

/**
 * Maps Supabase auth error messages/codes to user-friendly text.
 */
function mapAuthError(error) {
  if (!error) return 'Sign in failed. Please try again.'

  const msg = error.message || ''
  const code = error.code || ''

  if (
    code === 'invalid_credentials' ||
    msg.includes('Invalid login credentials') ||
    msg.includes('invalid_credentials') ||
    msg.includes('Invalid credentials')
  ) {
    return 'Incorrect email or password. Please check your credentials and try again.'
  }

  if (
    code === 'email_not_confirmed' ||
    msg.includes('Email not confirmed') ||
    msg.includes('email_not_confirmed')
  ) {
    return 'Please verify your email address before signing in. Check your inbox for a confirmation link.'
  }

  if (
    code === 'too_many_requests' ||
    code === 'over_email_send_rate_limit' ||
    msg.includes('Too many requests') ||
    msg.includes('too_many_requests') ||
    msg.includes('rate limit') ||
    msg.includes('Rate limit')
  ) {
    return 'Too many login attempts. Please wait a few minutes before trying again.'
  }

  if (code === 'user_not_found' || msg.includes('User not found')) {
    return 'Incorrect email or password. Please check your credentials and try again.'
  }

  if (
    code === 'user_banned' ||
    msg.includes('User is banned') ||
    msg.includes('user_banned')
  ) {
    return 'This account has been disabled. Please contact your administrator.'
  }

  if (msg.includes('session') || msg.includes('Session')) {
    return 'Your session has expired. Please sign in again.'
  }

  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('Network') ||
    msg.includes('Failed to fetch')
  ) {
    return 'Network error — please check your connection and try again.'
  }

  return msg || 'Sign in failed. Please try again.'
}

/**
 * Login
 *
 * Email/password sign-in only — no self-signup (invite-only platform).
 * Handles forgot password via Supabase reset email.
 *
 * Designed for use at /login route.
 * On success, redirects to ?redirectTo param or /dashboard.
 */
export function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [authError, setAuthError] = useState(null)
  const [resetSent, setResetSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submittingRef = useRef(false)

  const supabase = createClient()

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  })

  const handleSignIn = async (values) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        setAuthError(mapAuthError(error))
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      console.error('[Login] Sign in error:', err)
      if (
        err instanceof TypeError &&
        (err.message.includes('fetch') || err.message.includes('network'))
      ) {
        setAuthError('Network error — please check your connection and try again.')
      } else {
        setAuthError('An unexpected error occurred. Please try again.')
      }
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async (values) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        const msg = error.message || ''
        const code = error.code || ''

        if (
          code === 'too_many_requests' ||
          code === 'over_email_send_rate_limit' ||
          msg.includes('Too many requests') ||
          msg.includes('rate limit')
        ) {
          setAuthError('Too many reset attempts. Please wait a few minutes before trying again.')
        } else if (
          msg.includes('fetch') ||
          msg.includes('network') ||
          msg.includes('Failed to fetch')
        ) {
          setAuthError('Network error — please check your connection and try again.')
        } else {
          setAuthError(error.message || 'Failed to send reset email. Please try again.')
        }
        return
      }

      setResetSent(true)
    } catch (err) {
      console.error('[Login] Password reset error:', err)
      if (
        err instanceof TypeError &&
        (err.message.includes('fetch') || err.message.includes('network'))
      ) {
        setAuthError('Network error — please check your connection and try again.')
      } else {
        setAuthError('An unexpected error occurred. Please try again.')
      }
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const switchToReset = () => {
    setMode('reset')
    setAuthError(null)
    loginForm.reset()
  }

  const switchToLogin = () => {
    setMode('login')
    setResetSent(false)
    setAuthError(null)
    resetForm.reset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Logo / Branding */}
        <div className="mb-8 text-center sm:mb-10">
          {/* Logo mark */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            RelevantSee
          </h1>
          <p className="mt-1.5 text-sm text-gray-400">AI Marketing Campaign Copilot</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl shadow-black/50 sm:p-8">
          {mode === 'login' ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Sign in
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Enter your credentials to access your account
                </p>
              </div>

              <form
                onSubmit={loginForm.handleSubmit(handleSignIn)}
                noValidate
                className="space-y-5"
                aria-label="Sign in form"
              >
                {/* Global auth error */}
                {authError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                      <p className="text-sm text-red-400">{authError}</p>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    aria-label="Email address"
                    aria-describedby={
                      loginForm.formState.errors.email ? 'login-email-error' : undefined
                    }
                    aria-invalid={!!loginForm.formState.errors.email}
                    {...loginForm.register('email')}
                    className={[
                      'w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500',
                      'transition-colors duration-150',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                      loginForm.formState.errors.email
                        ? 'border-red-700 focus-visible:ring-red-500'
                        : 'border-gray-700 hover:border-gray-600 focus:border-indigo-500',
                    ].join(' ')}
                    placeholder="you@company.com"
                  />
                  {loginForm.formState.errors.email && (
                    <p id="login-email-error" className="flex items-center gap-1 text-xs text-red-400" role="alert">
                      <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={switchToReset}
                      className="text-xs text-indigo-400 transition-colors duration-150 hover:text-indigo-300 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    aria-label="Password"
                    aria-describedby={
                      loginForm.formState.errors.password ? 'login-password-error' : undefined
                    }
                    aria-invalid={!!loginForm.formState.errors.password}
                    {...loginForm.register('password')}
                    className={[
                      'w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500',
                      'transition-colors duration-150',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                      loginForm.formState.errors.password
                        ? 'border-red-700 focus-visible:ring-red-500'
                        : 'border-gray-700 hover:border-gray-600 focus:border-indigo-500',
                    ].join(' ')}
                    placeholder="••••••••"
                  />
                  {loginForm.formState.errors.password && (
                    <p id="login-password-error" className="flex items-center gap-1 text-xs text-red-400" role="alert">
                      <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  aria-label={isSubmitting ? 'Signing in, please wait' : 'Sign in'}
                  className={[
                    'relative w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white',
                    'transition-colors duration-150 hover:bg-indigo-500 active:bg-indigo-700',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    '@media (prefers-reduced-motion: reduce) { transition: none }',
                  ].join(' ')}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                        aria-hidden="true"
                        style={{ animationDuration: '0.6s' }}
                      />
                      <span>Signing in…</span>
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="mt-6 border-t border-gray-800 pt-5">
                <p className="text-center text-xs text-gray-500">
                  Don&apos;t have an account?{' '}
                  <span className="text-gray-400">
                    Contact your account administrator for an invitation.
                  </span>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Password Reset Mode */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Reset password
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Enter your email to receive a password reset link
                </p>
              </div>

              {resetSent ? (
                <div className="space-y-4">
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-lg border border-green-800 bg-green-950/50 px-4 py-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-green-400">
                        If an account exists for that email, a reset link has been sent.
                        Please check your inbox (and spam folder).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    aria-label="Back to sign in"
                    className={[
                      'w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300',
                      'transition-colors duration-150 hover:border-gray-600 hover:bg-gray-700 hover:text-white active:bg-gray-600',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                    ].join(' ')}
                  >
                    ← Back to sign in
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={resetForm.handleSubmit(handlePasswordReset)}
                  noValidate
                  className="space-y-5"
                  aria-label="Password reset form"
                >
                  {authError && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <svg
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          />
                        </svg>
                        <p className="text-sm text-red-400">{authError}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="reset-email"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      aria-label="Email address for password reset"
                      aria-describedby={
                        resetForm.formState.errors.email ? 'reset-email-error' : undefined
                      }
                      aria-invalid={!!resetForm.formState.errors.email}
                      {...resetForm.register('email')}
                      className={[
                        'w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500',
                        'transition-colors duration-150',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                        resetForm.formState.errors.email
                          ? 'border-red-700 focus-visible:ring-red-500'
                          : 'border-gray-700 hover:border-gray-600 focus:border-indigo-500',
                      ].join(' ')}
                      placeholder="you@company.com"
                    />
                    {resetForm.formState.errors.email && (
                      <p id="reset-email-error" className="flex items-center gap-1 text-xs text-red-400" role="alert">
                        <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        {resetForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    aria-label={isSubmitting ? 'Sending reset link, please wait' : 'Send password reset link'}
                    className={[
                      'w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white',
                      'transition-colors duration-150 hover:bg-indigo-500 active:bg-indigo-700',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                    ].join(' ')}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                          aria-hidden="true"
                          style={{ animationDuration: '0.6s' }}
                        />
                        <span>Sending…</span>
                      </span>
                    ) : (
                      'Send reset link'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={switchToLogin}
                    aria-label="Cancel and go back to sign in"
                    className={[
                      'w-full rounded-lg border border-gray-700 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-400',
                      'transition-colors duration-150 hover:border-gray-600 hover:bg-gray-800/50 hover:text-gray-300 active:bg-gray-800',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                    ].join(' ')}
                  >
                    ← Back to sign in
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} RelevantSee. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Login