'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ── Spinner ──────────────────────────────────────────────── */
function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

/* ── Password strength ────────────────────────────────────── */
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Fair', color: 'bg-orange-400' }
  if (score === 3) return { score, label: 'Good', color: 'bg-yellow-400' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null

  const segments = 4
  const filledSegments = Math.min(Math.ceil((score / 5) * segments), segments)

  return (
    <div className="mt-2 space-y-1.5" aria-live="polite" aria-atomic="true">
      <div className="flex gap-1" role="img" aria-label={`Password strength: ${label}`}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < filledSegments ? color : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium transition-colors duration-200 ${
        score <= 1 ? 'text-red-400' :
        score === 2 ? 'text-orange-400' :
        score === 3 ? 'text-yellow-400' :
        'text-green-400'
      }`}>
        {label}
      </p>
    </div>
  )
}

/* ── Error card ───────────────────────────────────────────── */
function InviteErrorCard({ title, message, ctaText, ctaHref, showContactAdmin = false }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 text-center shadow-xl">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-900/30 ring-1 ring-red-800/40">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
        </div>
        <h1 className="mb-2 text-xl font-bold text-white">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-gray-400">{message}</p>
        <div className="flex flex-col items-center gap-3">
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {ctaText}
          </a>
          {showContactAdmin && (
            <p className="text-xs text-gray-500">
              Need a new invite?{' '}
              <span className="text-gray-400">Contact your team admin.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Field component ──────────────────────────────────────── */
function FormField({ id, label, type = 'text', autoComplete, value, onChange, placeholder, error, hint, ariaLabel }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel || label}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
          ${error
            ? 'border-red-600 focus-visible:border-red-500 focus-visible:ring-red-500'
            : 'border-gray-700 hover:border-gray-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500'
          }`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────── */
export default function InvitePage({ params }) {
  const { token } = params
  const router = useRouter()

  const [inviteData, setInviteData] = useState(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState(null)
  const [inviteErrorType, setInviteErrorType] = useState(null)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) return

    async function fetchInvite() {
      setLoadingInvite(true)
      setInviteError(null)
      setInviteErrorType(null)

      try {
        const res = await fetch(`/api/team/invite/${token}`)

        if (res.status === 404) {
          setInviteErrorType('invalid')
          setInviteError('This invite link is invalid or does not exist. Please check the link and try again, or contact your team admin for a new invite.')
          return
        }

        if (res.status === 410) {
          const data = await res.json().catch(() => ({}))
          const msg = data?.error || ''
          if (msg.toLowerCase().includes('accepted') || msg.toLowerCase().includes('already')) {
            setInviteErrorType('accepted')
            setInviteError('This invite has already been accepted. If you already have an account, please sign in. If you need help, contact your team admin.')
          } else {
            setInviteErrorType('expired')
            setInviteError('This invite link has expired. Invite links are valid for 7 days. Please contact your team admin to request a new invitation.')
          }
          return
        }

        if (res.status === 401 || res.status === 403) {
          setInviteErrorType('generic')
          setInviteError('You do not have permission to access this invite. Please contact your team admin.')
          return
        }

        if (res.status === 429) {
          setInviteErrorType('generic')
          setInviteError('Too many requests. Please wait a moment and try refreshing the page.')
          return
        }

        if (!res.ok) {
          setInviteErrorType('generic')
          setInviteError('Unable to load this invitation. Please try refreshing the page or contact your team admin.')
          return
        }

        const data = await res.json()
        setInviteData(data)
      } catch {
        setInviteErrorType('generic')
        setInviteError('A network error occurred while loading this invitation. Please check your connection and try again.')
      } finally {
        setLoadingInvite(false)
      }
    }

    fetchInvite()
  }, [token])

  function validateFields() {
    const errors = {}

    if (!fullName.trim()) {
      errors.fullName = 'Please enter your full name.'
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.'
    }

    if (!password) {
      errors.password = 'Please enter a password.'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one letter and one number.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    setFieldErrors({})

    const errors = validateFields()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/team/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), password }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        setSubmitError('An account with this email address already exists. Please sign in instead, or contact your admin if you need help.')
        return
      }

      if (res.status === 410) {
        const msg = data?.error || ''
        if (msg.toLowerCase().includes('accepted')) {
          setSubmitError('This invite has already been accepted. Please sign in to your existing account.')
        } else {
          setSubmitError('This invite link has expired. Please contact your team admin for a new invitation.')
        }
        return
      }

      if (res.status === 401 || res.status === 403) {
        setSubmitError('You do not have permission to accept this invite. Please contact your team admin.')
        return
      }

      if (res.status === 429) {
        setSubmitError('Too many requests. Please wait a moment before trying again.')
        return
      }

      if (res.status === 422) {
        setSubmitError(data?.error || 'The information you provided is invalid. Please check your details and try again.')
        return
      }

      if (!res.ok) {
        setSubmitError(data?.error || 'Failed to create your account. Please try again or contact your team admin.')
        return
      }

      const email = inviteData?.email || data?.user?.email
      if (!email) {
        setSubmitError('Account created, but we could not determine your email. Please go to the login page and sign in manually.')
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setSubmitError('Your account was created successfully, but automatic sign-in failed. Please go to the login page and sign in with your new credentials.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1400)
    } catch {
      setSubmitError('A network error occurred. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Loading ──────────────────────────────────────────── */
  if (loadingInvite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-4">
        <Spinner className="h-9 w-9 text-indigo-500" />
        <p className="text-sm text-gray-500">Validating your invitation…</p>
      </div>
    )
  }

  /* ── Error states ─────────────────────────────────────── */
  if (inviteErrorType === 'invalid') {
    return (
      <InviteErrorCard
        title="Invite Not Found"
        message={inviteError}
        ctaText="Go to Login"
        ctaHref="/login"
        showContactAdmin
      />
    )
  }

  if (inviteErrorType === 'expired') {
    return (
      <InviteErrorCard
        title="Invite Expired"
        message={inviteError}
        ctaText="Go to Login"
        ctaHref="/login"
        showContactAdmin
      />
    )
  }

  if (inviteErrorType === 'accepted') {
    return (
      <InviteErrorCard
        title="Invite Already Accepted"
        message={inviteError}
        ctaText="Sign In"
        ctaHref="/login"
        showContactAdmin={false}
      />
    )
  }

  if (inviteErrorType === 'generic' || (inviteError && !inviteData)) {
    return (
      <InviteErrorCard
        title="Invite Unavailable"
        message={inviteError || 'Unable to load this invitation. Please try again.'}
        ctaText="Go to Login"
        ctaHref="/login"
        showContactAdmin
      />
    )
  }

  /* ── Success ──────────────────────────────────────────── */
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 text-center shadow-xl animate-fade-in-up">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-900/30 ring-1 ring-green-800/40">
              <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">Account Created!</h1>
          <p className="text-sm text-gray-400">Signing you in and redirecting to your dashboard…</p>
          <div className="mt-5 flex justify-center">
            <Spinner className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
      </div>
    )
  }

  /* ── Invite form ──────────────────────────────────────── */
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-950 px-4 py-10 sm:items-center sm:py-12">
      <div className="w-full max-w-md animate-fade-in-up">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-5 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Accept Your Invitation
          </h1>
          <p className="mt-2 text-sm text-gray-400 sm:text-base">
            You&apos;ve been invited to join{' '}
            <span className="font-semibold text-indigo-400">{inviteData?.account_name || 'a team'}</span>
          </p>
        </div>

        {/* Invite details card */}
        <div className="mb-5 rounded-xl border border-gray-800 bg-gray-900/60 px-5 py-4 shadow-sm">
          <dl className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-200 truncate ml-4">{inviteData?.email}</dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-gray-500">Role</dt>
              <dd>
                <span className="inline-flex items-center rounded-full bg-indigo-900/40 px-2.5 py-0.5 text-xs font-semibold capitalize text-indigo-300 ring-1 ring-inset ring-indigo-700/50">
                  {inviteData?.role || 'editor'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl sm:p-8">
          <form onSubmit={handleSubmit} noValidate aria-label="Create account form">
            <div className="space-y-5">

              {/* Full Name */}
              <FormField
                id="full_name"
                label="Full Name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }))
                }}
                placeholder="Jane Smith"
                error={fieldErrors.fullName}
              />

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
                      if (fieldErrors.confirmPassword && confirmPassword === e.target.value) {
                        setFieldErrors((p) => ({ ...p, confirmPassword: undefined }))
                      }
                    }}
                    placeholder="At least 8 characters"
                    aria-label="Password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                    className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 pr-11 text-sm text-white placeholder-gray-500 transition-all duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                      ${fieldErrors.password
                        ? 'border-red-600 focus-visible:border-red-500 focus-visible:ring-red-500'
                        : 'border-gray-700 hover:border-gray-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors duration-150 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800 rounded"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-400">
                    {fieldErrors.password}
                  </p>
                )}
                {!fieldErrors.password && (
                  <p id="password-hint" className="mt-1.5 text-xs text-gray-500">
                    Must be at least 8 characters with letters and numbers.
                  </p>
                )}
                <PasswordStrengthBar password={password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: undefined }))
                    }}
                    placeholder="Repeat your password"
                    aria-label="Confirm password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
                    className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 pr-11 text-sm text-white placeholder-gray-500 transition-all duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                      ${fieldErrors.confirmPassword
                        ? 'border-red-600 focus-visible:border-red-500 focus-visible:ring-red-500'
                        : 'border-gray-700 hover:border-gray-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors duration-150 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800 rounded"
                  >
                    {showConfirm ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="confirm-error" role="alert" className="mt-1.5 text-xs text-red-400">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
                {/* Match indicator */}
                {!fieldErrors.confirmPassword && confirmPassword && password && (
                  <p className={`mt-1.5 text-xs transition-colors duration-200 ${
                    password === confirmPassword ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {password === confirmPassword ? '✓ Passwords match' : 'Passwords do not match yet'}
                  </p>
                )}
              </div>

              {/* Submit error */}
              {submitError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3"
                >
                  <div className="flex items-start gap-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="text-sm text-red-400">{submitError}</p>
                  </div>
                  {submitError.includes('sign in') && (
                    <div className="mt-2 pl-6">
                      <a
                        href="/login"
                        className="text-xs text-indigo-400 transition-colors duration-150 hover:text-indigo-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                      >
                        Go to Login →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                aria-label={submitting ? 'Creating your account, please wait' : 'Create account and sign in'}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-150
                  hover:bg-indigo-500 active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                  disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100
                  motion-reduce:transition-none"
              >
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Creating account…</span>
                  </>
                ) : (
                  'Create Account & Sign In'
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-indigo-400 transition-colors duration-150 hover:text-indigo-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}