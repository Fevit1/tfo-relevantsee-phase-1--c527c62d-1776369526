'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TagInput } from '@/components/ui/TagInput'
import { useToast } from '@/components/ui/Toast'

const BRAND_VOICE_MAX_LENGTH = 2000

function FirstRunBanner() {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-yellow-600 bg-yellow-900/30 px-4 py-3 flex items-start gap-3"
    >
      <span className="text-yellow-400 text-xl mt-0.5" aria-hidden="true">⚡</span>
      <div>
        <p className="text-yellow-300 font-semibold text-sm">Welcome! Set up your Brand Voice</p>
        <p className="text-yellow-200/80 text-sm mt-0.5">
          Your brand voice hasn't been configured yet. Fill in the fields below so the AI can generate on-brand content for your campaigns.
        </p>
      </div>
    </div>
  )
}

function UnsavedChangesBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-lg border border-amber-600 bg-amber-900/20 px-4 py-2.5 flex items-center gap-2"
    >
      <span className="text-amber-400 text-sm" aria-hidden="true">●</span>
      <p className="text-amber-300 text-sm">You have unsaved changes.</p>
    </div>
  )
}

function SaveSuccessAnimation() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Saved successfully">
      <svg
        className="h-4 w-4 text-green-400 animate-[scale-in_0.2s_ease-out]"
        style={{ animation: 'scaleIn 0.2s ease-out' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Saved!
    </span>
  )
}

const EMPTY_FORM = {
  accountName: '',
  brandVoice: '',
  toneKeywords: [],
  bannedPhrases: [],
  exampleContent: [],
  logoUrl: '',
  primaryColor: '#6366f1',
}

function formFromAccount(acc) {
  return {
    accountName: acc.name || '',
    brandVoice: acc.brand_voice || '',
    toneKeywords: acc.tone_keywords || [],
    bannedPhrases: acc.banned_phrases || [],
    exampleContent:
      Array.isArray(acc.example_content) && acc.example_content.length > 0
        ? acc.example_content.map(item =>
            typeof item === 'string' ? item : JSON.stringify(item)
          )
        : [],
    logoUrl: acc.logo_url || '',
    primaryColor: acc.primary_color || '#6366f1',
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Shared input class helpers
const inputBase =
  'w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500'
const inputNormal = `${inputBase} border-gray-700`
const inputError = `${inputBase} border-red-600 focus-visible:ring-red-500`

export default function BrandSettingsPage() {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [isFirstRun, setIsFirstRun] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Form fields
  const [accountName, setAccountName] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [toneKeywords, setToneKeywords] = useState([])
  const [bannedPhrases, setBannedPhrases] = useState([])
  const [exampleContent, setExampleContent] = useState([])
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')

  // Validation
  const [logoUrlError, setLogoUrlError] = useState('')
  const [brandVoiceError, setBrandVoiceError] = useState('')

  // Dirty tracking
  const savedFormRef = useRef(EMPTY_FORM)
  const [isDirty, setIsDirty] = useState(false)

  // Success animation timeout ref
  const successTimeoutRef = useRef(null)

  const currentForm = useCallback(() => ({
    accountName,
    brandVoice,
    toneKeywords,
    bannedPhrases,
    exampleContent,
    logoUrl,
    primaryColor,
  }), [accountName, brandVoice, toneKeywords, bannedPhrases, exampleContent, logoUrl, primaryColor])

  useEffect(() => {
    setIsDirty(!deepEqual(currentForm(), savedFormRef.current))
  }, [currentForm])

  // Clear success state when form becomes dirty again
  useEffect(() => {
    if (isDirty && saveSuccess) {
      setSaveSuccess(false)
    }
  }, [isDirty, saveSuccess])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [])

  const applyFormData = useCallback((acc) => {
    const f = formFromAccount(acc)
    setAccountName(f.accountName)
    setBrandVoice(f.brandVoice)
    setToneKeywords(f.toneKeywords)
    setBannedPhrases(f.bannedPhrases)
    setExampleContent(f.exampleContent)
    setLogoUrl(f.logoUrl)
    setPrimaryColor(f.primaryColor)
    savedFormRef.current = f
    setIsDirty(false)
  }, [])

  const fetchBrandModel = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/accounts/brand')

      if (res.status === 401) {
        setFetchError('Your session has expired. Please log in again.')
        setLoading(false)
        return
      }

      if (res.status === 403) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      if (res.status === 429) {
        setFetchError('Too many requests. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load brand settings (${res.status})`)
      }

      const data = await res.json()
      setIsFirstRun(data.first_run || false)
      applyFormData(data.account)
      setIsAdmin(true)
    } catch (err) {
      setFetchError(err.message || 'Failed to load brand settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [applyFormData])

  useEffect(() => {
    fetchBrandModel()
  }, [fetchBrandModel])

  // Warn on page unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const validateLogoUrl = (url) => {
    if (!url) {
      setLogoUrlError('')
      return true
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') {
        setLogoUrlError('Logo URL must use HTTPS')
        return false
      }
      setLogoUrlError('')
      return true
    } catch {
      setLogoUrlError('Must be a valid URL (e.g. https://example.com/logo.png)')
      return false
    }
  }

  const validateBrandVoice = (val) => {
    if (!val.trim()) {
      setBrandVoiceError('Brand voice is required.')
      return false
    }
    if (val.length > BRAND_VOICE_MAX_LENGTH) {
      setBrandVoiceError(`Brand voice must be ${BRAND_VOICE_MAX_LENGTH} characters or fewer. Currently: ${val.length}.`)
      return false
    }
    setBrandVoiceError('')
    return true
  }

  const handleLogoUrlChange = (e) => {
    const val = e.target.value
    setLogoUrl(val)
    validateLogoUrl(val)
  }

  const handleBrandVoiceChange = (e) => {
    const val = e.target.value
    setBrandVoice(val)
    validateBrandVoice(val)
  }

  const addExampleContent = () => {
    if (exampleContent.length < 3) {
      setExampleContent([...exampleContent, ''])
    }
  }

  const removeExampleContent = (index) => {
    setExampleContent(exampleContent.filter((_, i) => i !== index))
  }

  const updateExampleContent = (index, value) => {
    const updated = [...exampleContent]
    updated[index] = value
    setExampleContent(updated)
  }

  const handleReset = () => {
    applyFormData({
      name: savedFormRef.current.accountName,
      brand_voice: savedFormRef.current.brandVoice,
      tone_keywords: savedFormRef.current.toneKeywords,
      banned_phrases: savedFormRef.current.bannedPhrases,
      example_content: savedFormRef.current.exampleContent,
      logo_url: savedFormRef.current.logoUrl,
      primary_color: savedFormRef.current.primaryColor,
    })
    setLogoUrlError('')
    setBrandVoiceError('')
    setSaveSuccess(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    const logoValid = validateLogoUrl(logoUrl)
    const voiceValid = validateBrandVoice(brandVoice)

    if (!logoValid || !voiceValid) return

    if (primaryColor && !/^#[0-9A-Fa-f]{3,8}$/.test(primaryColor)) {
      toast.error('Please enter a valid hex color before saving.')
      return
    }

    setSaving(true)
    setSaveSuccess(false)

    const payload = {
      name: accountName,
      brand_voice: brandVoice,
      tone_keywords: toneKeywords,
      banned_phrases: bannedPhrases,
      example_content: exampleContent.filter(e => e.trim() !== ''),
      logo_url: logoUrl || null,
      primary_color: primaryColor || null,
    }

    try {
      const res = await fetch('/api/accounts/brand', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        toast.error('Your session has expired. Please log in again.', { title: 'Session expired' })
        return
      }

      if (res.status === 403) {
        toast.error('You do not have permission to update brand settings.', { title: 'Access denied' })
        return
      }

      if (res.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.', { title: 'Rate limited' })
        return
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Failed to save brand settings (${res.status})`)
      }

      const acc = data.account
      setIsFirstRun(data.first_run || false)
      applyFormData(acc)

      setSaveSuccess(true)
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 3000)

      toast.success('Brand settings saved successfully.', { title: 'Saved' })
    } catch (err) {
      toast.error(err.message || 'Failed to save brand settings. Please try again.', { title: 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading State ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite" aria-label="Loading brand settings">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <p className="text-gray-400 text-sm">Loading brand settings…</p>
        </div>
      </div>
    )
  }

  // ─── Fetch Error State ───────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-6 text-center" role="alert">
          <svg className="h-10 w-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-red-300 text-sm font-medium mb-1">Failed to load brand settings</p>
          <p className="text-red-400/70 text-xs mb-4">{fetchError}</p>
          <button
            onClick={fetchBrandModel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ─── Non-admin State ─────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center" role="alert">
          <svg className="h-10 w-10 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-300 text-sm font-medium mb-1">Admin access required</p>
          <p className="text-gray-500 text-xs">Only admins can view and edit brand settings. Contact your account admin for access.</p>
        </div>
      </div>
    )
  }

  const colorError = primaryColor && !/^#[0-9A-Fa-f]{3,8}$/.test(primaryColor)
  const saveDisabled = saving || !!logoUrlError || !!brandVoiceError || !!colorError
  const brandVoiceOverLimit = brandVoice.length > BRAND_VOICE_MAX_LENGTH

  // ─── Main Form ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Brand Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure your brand voice and guidelines. These settings are used by the AI to generate on-brand campaign content.
        </p>
      </div>

      {isFirstRun && <FirstRunBanner />}
      {isDirty && !isFirstRun && <UnsavedChangesBanner />}

      <form onSubmit={handleSave} noValidate className="space-y-8" aria-label="Brand settings form">

        {/* ── Section: Identity ───────────────────────────────────────────── */}
        <fieldset className="space-y-6">
          <legend className="text-base font-semibold text-white border-b border-gray-700 pb-2 w-full">
            Brand Identity
          </legend>

          {/* Account Name — full width on mobile, constrained on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-300 mb-1.5">
                Account Name
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                aria-describedby="accountName-hint"
                className={inputNormal}
                placeholder="Your company or brand name"
              />
              <p id="accountName-hint" className="mt-1 text-xs text-gray-500">
                Used to identify your account across the platform.
              </p>
            </div>

            {/* Primary Color — in same row on lg */}
            <div>
              <label htmlFor="primaryColorHex" className="block text-sm font-medium text-gray-300 mb-1.5">
                Primary Brand Color
              </label>
              <p id="primaryColor-hint" className="text-xs text-gray-500 mb-2">
                Used for UI accents and report generation.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor || '#6366f1'}
                  onChange={e => setPrimaryColor(e.target.value)}
                  aria-label="Pick primary brand color"
                  className="h-10 w-14 rounded border border-gray-700 bg-gray-800 cursor-pointer p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors duration-150"
                />
                <input
                  id="primaryColorHex"
                  type="text"
                  value={primaryColor || ''}
                  onChange={e => setPrimaryColor(e.target.value)}
                  aria-describedby="primaryColor-hint"
                  className={`w-32 rounded-lg border px-3 py-2 text-sm text-white placeholder-gray-500 bg-gray-800 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-mono ${
                    colorError ? 'border-red-600 focus-visible:ring-red-500' : 'border-gray-700'
                  }`}
                  placeholder="#6366f1"
                  maxLength={9}
                />
                {primaryColor && (
                  <span
                    className="h-8 w-8 rounded-full border border-gray-600 shadow-inner flex-shrink-0"
                    style={{ backgroundColor: primaryColor }}
                    aria-label={`Color preview: ${primaryColor}`}
                    role="img"
                  />
                )}
              </div>
              {colorError && (
                <p className="mt-1 text-xs text-red-400" role="alert">Must be a valid hex color (e.g. #FF5733)</p>
              )}
            </div>
          </div>

          {/* Logo URL — full width */}
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-300 mb-1.5">
              Logo URL
            </label>
            <p id="logoUrl-hint" className="text-xs text-gray-500 mb-2">
              Must be an HTTPS URL pointing to your logo image.
            </p>
            <input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={handleLogoUrlChange}
              aria-describedby={logoUrlError ? 'logoUrl-error logoUrl-hint' : 'logoUrl-hint'}
              aria-invalid={!!logoUrlError}
              className={logoUrlError ? inputError : inputNormal}
              placeholder="https://example.com/logo.png"
            />
            {logoUrlError && (
              <p id="logoUrl-error" className="mt-1 text-xs text-red-400" role="alert">{logoUrlError}</p>
            )}
            {logoUrl && !logoUrlError && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-8 max-w-[120px] object-contain rounded bg-gray-700 p-1"
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            )}
          </div>
        </fieldset>

        {/* ── Section: Voice & Tone ──────────────────────────────────────── */}
        <fieldset className="space-y-6">
          <legend className="text-base font-semibold text-white border-b border-gray-700 pb-2 w-full">
            Voice &amp; Tone
          </legend>

          {/* Brand Voice — full width */}
          <div>
            <label htmlFor="brandVoice" className="block text-sm font-medium text-gray-300 mb-1.5">
              Brand Voice <span className="text-red-400" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <p id="brandVoice-hint" className="text-xs text-gray-500 mb-2">
              Describe your brand's personality, communication style, and tone. This is the primary input the AI uses when generating content.
            </p>
            <textarea
              id="brandVoice"
              value={brandVoice}
              onChange={handleBrandVoiceChange}
              rows={5}
              required
              aria-required="true"
              aria-describedby={brandVoiceError ? 'brandVoice-error brandVoice-hint' : 'brandVoice-hint'}
              aria-invalid={!!brandVoiceError}
              className={`${brandVoiceError ? inputError : inputNormal} resize-vertical`}
              placeholder="e.g. We're an approachable, professional technology brand that speaks plainly. We avoid jargon, use active voice, and always lead with customer benefit. Our tone is confident but never arrogant."
            />
            <div className="flex items-start justify-between mt-1 gap-2">
              <div>
                {brandVoiceError && (
                  <p id="brandVoice-error" className="text-xs text-red-400" role="alert">{brandVoiceError}</p>
                )}
              </div>
              <span
                className={`text-xs flex-shrink-0 tabular-nums transition-colors duration-150 ${
                  brandVoiceOverLimit ? 'text-red-400 font-medium' : brandVoice.length > BRAND_VOICE_MAX_LENGTH * 0.85 ? 'text-amber-400' : 'text-gray-500'
                }`}
                aria-live="polite"
                aria-atomic="true"
              >
                {brandVoice.length}/{BRAND_VOICE_MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Tone Keywords + Banned Phrases — side-by-side on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tone Keywords */}
            <div>
              <label htmlFor="toneKeywords-input" className="block text-sm font-medium text-gray-300 mb-1.5">
                Tone Keywords
                <span className="ml-2 text-xs text-gray-500 font-normal" aria-hidden="true">
                  ({toneKeywords.length}/20)
                </span>
                <span className="sr-only">, {toneKeywords.length} of 20 added</span>
              </label>
              <p id="toneKeywords-hint" className="text-xs text-gray-500 mb-2">
                Single words or short phrases that describe your brand tone. Press Enter or comma to add. Up to 20 keywords.
              </p>
              <TagInput
                value={toneKeywords}
                onChange={setToneKeywords}
                placeholder="e.g. professional, friendly, bold…"
                maxItems={20}
                aria-label="Tone keywords — press Enter or comma to add a keyword"
                aria-describedby="toneKeywords-hint"
              />
              {toneKeywords.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-500/80" role="status">
                  Adding at least one tone keyword helps the AI stay on-brand.
                </p>
              )}
            </div>

            {/* Banned Phrases */}
            <div>
              <label htmlFor="bannedPhrases-input" className="block text-sm font-medium text-gray-300 mb-1.5">
                Banned Phrases
                <span className="ml-2 text-xs text-gray-500 font-normal" aria-hidden="true">
                  ({bannedPhrases.length}/50)
                </span>
                <span className="sr-only">, {bannedPhrases.length} of 50 added</span>
              </label>
              <p id="bannedPhrases-hint" className="text-xs text-gray-500 mb-2">
                Words or phrases the AI must never use. The brand scorer will flag any generated content containing these. Press Enter or comma to add. Up to 50.
              </p>
              <TagInput
                value={bannedPhrases}
                onChange={setBannedPhrases}
                placeholder="e.g. cheap, guarantee, limited time…"
                maxItems={50}
                aria-label="Banned phrases — press Enter or comma to add a phrase"
                aria-describedby="bannedPhrases-hint"
              />
            </div>
          </div>
        </fieldset>

        {/* ── Section: Example Content ───────────────────────────────────── */}
        <fieldset className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <legend className="text-base font-semibold text-white">
              Example Approved Content
              <span className="ml-2 text-xs text-gray-500 font-normal" aria-hidden="true">
                ({exampleContent.length}/3)
              </span>
              <span className="sr-only">, {exampleContent.length} of 3 added</span>
            </legend>
            {exampleContent.length < 3 && (
              <button
                type="button"
                onClick={addExampleContent}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-150 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 py-0.5"
                aria-label="Add example content"
              >
                <span aria-hidden="true">+</span> Add example
              </button>
            )}
          </div>
          <p id="exampleContent-hint" className="text-xs text-gray-500">
            Paste up to 3 examples of approved on-brand copy. The AI uses these as reference during brand scoring.
          </p>
          {exampleContent.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-700 p-6 text-center">
              <p className="text-gray-500 text-sm">No example content added yet.</p>
              <button
                type="button"
                onClick={addExampleContent}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 py-0.5"
              >
                + Add first example
              </button>
            </div>
          )}
          <div className="space-y-4">
            {exampleContent.map((content, index) => {
              const charCount = content.length
              const exId = `example-content-${index}`
              return (
                <div key={index} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor={exId} className="text-xs font-medium text-gray-400">
                      Example {index + 1}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeExampleContent(index)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1 py-0.5"
                      aria-label={`Remove example ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    id={exId}
                    value={content}
                    onChange={e => updateExampleContent(index, e.target.value)}
                    rows={4}
                    aria-describedby={`${exId}-counter exampleContent-hint`}
                    className={`${inputNormal} resize-vertical`}
                    placeholder="Paste an example of approved, on-brand copy here…"
                  />
                  <div className="flex justify-end mt-1">
                    <span
                      id={`${exId}-counter`}
                      className={`text-xs tabular-nums transition-colors duration-150 ${charCount > 2000 ? 'text-amber-400' : 'text-gray-600'}`}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {charCount} chars
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>

        {/* ── Save / Reset ───────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || !isDirty}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded px-2 py-1 self-start sm:self-auto"
          >
            Reset changes
          </button>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {isDirty && !saving && (
              <span className="text-xs text-amber-400" aria-live="polite">Unsaved changes</span>
            )}
            <button
              type="submit"
              disabled={saveDisabled}
              aria-busy={saving}
              aria-label={saving ? 'Saving brand settings…' : saveSuccess ? 'Brand settings saved' : 'Save brand settings'}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg
                transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                ${saveSuccess
                  ? 'bg-green-600 hover:bg-green-500 focus-visible:ring-green-500'
                  : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600
                ${saving ? 'cursor-wait' : ''}
              `}
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Saving…
                </>
              ) : saveSuccess ? (
                <SaveSuccessAnimation />
              ) : (
                'Save Brand Settings'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Inline keyframe for success checkmark — scoped to avoid global pollution */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-spin { animation: none; }
        }
      `}</style>
    </div>
  )
}