'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { createCampaign, generateCampaignContent, scoreCampaign, submitCampaign } from '@/lib/api'
import { EmailContentPanel } from '@/components/campaigns/EmailContentPanel'
import { SocialContentPanel } from '@/components/campaigns/SocialContentPanel'
import { AdsContentPanel } from '@/components/campaigns/AdsContentPanel'
import { BrandScoreWidget } from '@/components/campaigns/BrandScoreWidget'

const BRIEF_MAX = 2000
const BRIEF_WARN_THRESHOLD = 0.85
const GENERATE_TIMEOUT_MS = 60000

const CHANNELS = [
  { value: 'email', label: 'Email', description: '3 subject variants, HTML body, send time' },
  { value: 'social', label: 'Social', description: 'Instagram, Twitter/X, LinkedIn' },
  { value: 'ads', label: 'Ads', description: 'Google & Meta ad copy, clipboard-ready' },
]

const STEPS = [
  { id: 'brief', label: 'Brief' },
  { id: 'generating', label: 'Generating' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'review', label: 'Review' },
]

const briefSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200, 'Name must be 200 characters or fewer'),
  brief: z
    .string()
    .min(10, 'Brief must be at least 10 characters')
    .max(BRIEF_MAX, `Brief cannot exceed ${BRIEF_MAX} characters`),
  channels: z.array(z.string()).min(1, 'Select at least one channel'),
})

// ============================================================
// Toast notification system
// ============================================================

const TOAST_TYPES = {
  success: {
    bg: 'bg-emerald-900/90',
    border: 'border-emerald-700',
    text: 'text-emerald-300',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-950/90',
    border: 'border-red-800',
    text: 'text-red-300',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-950/90',
    border: 'border-amber-700',
    text: 'text-amber-300',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-indigo-950/90',
    border: 'border-indigo-700',
    text: 'text-indigo-300',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const style = TOAST_TYPES[toast.type] || TOAST_TYPES.info
        return (
          <div
            key={toast.id}
            role="alert"
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg pointer-events-auto transition-all duration-300 ${style.bg} ${style.border}`}
          >
            <span className={style.text} aria-hidden="true">{style.icon}</span>
            <p className={`text-sm flex-1 leading-snug ${style.text}`}>{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className={`shrink-0 ${style.text} opacity-60 hover:opacity-100 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded`}
              aria-label="Dismiss notification"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = 'info', duration = 5000) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev.slice(-4), { id, message, type }])
      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss]
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  return { toasts, addToast, dismiss }
}

// ============================================================
// Generation phase messages
// ============================================================

const GENERATION_PHASES = [
  { label: 'Analyzing your brief…', delay: 0 },
  { label: 'Drafting channel content…', delay: 8000 },
  { label: 'Polishing copy for each channel…', delay: 20000 },
  { label: 'Finalizing your campaign content…', delay: 35000 },
  { label: 'Almost there — wrapping up…', delay: 50000 },
]

function useGenerationPhase(isGenerating) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const timersRef = useRef([])

  useEffect(() => {
    if (!isGenerating) {
      setPhaseIndex(0)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      return
    }

    setPhaseIndex(0)
    timersRef.current = GENERATION_PHASES.slice(1).map((phase, i) =>
      setTimeout(() => setPhaseIndex(i + 1), phase.delay)
    )

    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [isGenerating])

  return GENERATION_PHASES[phaseIndex]?.label || GENERATION_PHASES[0].label
}

// ============================================================
// Error message helpers
// ============================================================

function getErrorMessage(err, context = '') {
  if (err?.status === 401 || err?.status === 403) {
    return "You don't have permission to perform this action. Please check your account access."
  }
  if (err?.status === 429) {
    return "You've hit the rate limit. Please wait a moment before trying again."
  }
  if (err?.status >= 500) {
    return `Server error${context ? ` during ${context}` : ''}. Please try again in a moment.`
  }
  return err?.message || `Something went wrong${context ? ` during ${context}` : ''}. Please try again.`
}

// ============================================================
// Step indicator
// ============================================================

function StepIndicator({ currentStep }) {
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <nav aria-label="Campaign creation progress">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < stepIndex
          const isCurrent = index === stepIndex
          const isUpcoming = index > stepIndex

          return (
            <li key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors duration-200 ${
                    isCompleted
                      ? 'bg-indigo-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-950'
                      : 'bg-gray-800 text-gray-500 border border-gray-700'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span aria-hidden="true">{index + 1}</span>
                  )}
                  <span className="sr-only">
                    {step.label} — {isCompleted ? 'completed' : isCurrent ? 'current step' : 'upcoming'}
                  </span>
                </div>
                <span
                  className={`hidden sm:block text-xs font-medium transition-colors duration-200 ${
                    isCurrent ? 'text-indigo-300' : isCompleted ? 'text-gray-400' : 'text-gray-600'
                  }`}
                  aria-hidden="true"
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px w-8 sm:w-12 transition-colors duration-200 ${
                    index < stepIndex ? 'bg-indigo-600' : 'bg-gray-800'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ============================================================
// Main component
// ============================================================

export function CampaignBuilderPage() {
  const router = useRouter()
  const { toasts, addToast, dismiss } = useToasts()

  const [step, setStep] = useState('brief') // 'brief' | 'generating' | 'scoring' | 'review'
  const [campaignId, setCampaignId] = useState(null)
  const [generatedContent, setGeneratedContent] = useState(null)
  const [selectedChannelsForReview, setSelectedChannelsForReview] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [brandScore, setBrandScore] = useState(null)
  const [scoringData, setScoringData] = useState(null)
  const [activeTab, setActiveTab] = useState('email')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

  const generationPhaseLabel = useGenerationPhase(isGenerating)
  const generateTimeoutRef = useRef(null)
  const statusRegionRef = useRef(null)

  const form = useForm({
    resolver: zodResolver(briefSchema),
    defaultValues: { name: '', brief: '', channels: ['email'] },
  })

  const briefValue = form.watch('brief') || ''
  const selectedChannels = form.watch('channels') || []

  const briefLength = briefValue.length
  const briefNearLimit = briefLength >= BRIEF_MAX * BRIEF_WARN_THRESHOLD
  const briefAtLimit = briefLength >= BRIEF_MAX

  const toggleChannel = (ch) => {
    const cur = form.getValues('channels') || []
    if (cur.includes(ch)) {
      form.setValue('channels', cur.filter((c) => c !== ch), { shouldValidate: true })
    } else {
      form.setValue('channels', [...cur, ch], { shouldValidate: true })
    }
  }

  const runScore = async (id) => {
    setScoreLoading(true)
    try {
      const result = await scoreCampaign({ campaign_id: id })
      setBrandScore(result.brand_score)
      setScoringData(result)
    } catch (err) {
      addToast(
        getErrorMessage(err, 'auto-scoring') + ' You can retry scoring manually.',
        'warning',
        8000
      )
    } finally {
      setScoreLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current)
    }
  }, [])

  const handleGenerate = async (values) => {
    setIsCreatingCampaign(true)
    setIsGenerating(false)

    if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current)

    let newCampaignId = null

    try {
      const { campaign } = await createCampaign({
        name: values.name,
        brief: values.brief,
        channels: values.channels,
      })
      newCampaignId = campaign.id
      setCampaignId(newCampaignId)
      setSelectedChannelsForReview(values.channels)
      setActiveTab(values.channels[0])

      addToast(`Campaign "${values.name}" created successfully.`, 'success', 4000)

      setIsCreatingCampaign(false)
      setIsGenerating(true)
      setStep('generating')

      const generatePromise = generateCampaignContent({
        campaign_id: newCampaignId,
        channels: values.channels,
      })

      const timeoutPromise = new Promise((_, reject) => {
        generateTimeoutRef.current = setTimeout(() => {
          reject(Object.assign(new Error('Generation timed out after 60 seconds. Please try again.'), { isTimeout: true }))
        }, GENERATE_TIMEOUT_MS)
      })

      const result = await Promise.race([generatePromise, timeoutPromise])
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current)

      const content = result.campaign?.generated_content || {}
      setGeneratedContent(content)
      setIsGenerating(false)

      if (result.channel_errors?.length > 0) {
        addToast(
          `Content generated, but ${result.channel_errors.length} channel(s) had errors. Check the tabs for details.`,
          'warning',
          8000
        )
      }

      setStep('scoring')
      await runScore(newCampaignId)
      setStep('review')
    } catch (err) {
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current)
      setIsGenerating(false)
      setIsCreatingCampaign(false)
      setStep('brief')

      const message = err.isTimeout
        ? 'Generation timed out after 60 seconds. Your campaign was saved — please try generating again.'
        : getErrorMessage(err, err.message?.includes('creat') ? 'campaign creation' : 'content generation')

      addToast(message, 'error', 10000)
    }
  }

  const handleScore = async () => {
    if (!campaignId) return
    setScoreLoading(true)
    try {
      const result = await scoreCampaign({ campaign_id: campaignId })
      setBrandScore(result.brand_score)
      setScoringData(result)
      addToast('Brand compliance score updated.', 'success', 3000)
    } catch (err) {
      addToast(getErrorMessage(err, 'scoring'), 'error', 7000)
    } finally {
      setScoreLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!campaignId) return
    setSubmitLoading(true)
    try {
      await submitCampaign(campaignId)
      addToast('Campaign submitted for approval!', 'success', 3000)
      setTimeout(() => router.push(`/campaigns/${campaignId}`), 800)
    } catch (err) {
      addToast(getErrorMessage(err, 'submission'), 'error', 7000)
      setSubmitLoading(false)
    }
  }

  const canSubmit = brandScore !== null && brandScore >= 85
  const isProcessing = step === 'generating' || step === 'scoring'
  const isBusy = isCreatingCampaign || isGenerating || isProcessing

  // Derive the live status message for aria-live region
  const liveStatusMessage = isCreatingCampaign
    ? 'Creating campaign…'
    : isGenerating
    ? generationPhaseLabel
    : step === 'scoring'
    ? 'Analyzing brand compliance…'
    : step === 'review'
    ? 'Campaign ready for review.'
    : ''

  return (
    <ProtectedRoute allowedRoles={['admin', 'editor']}>
      <Layout>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />

        {/* Screen-reader live region for generation status */}
        <div
          ref={statusRegionRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveStatusMessage}
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">New Campaign</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Build an AI-powered marketing campaign across all your channels
              </p>
            </div>
            <div className="shrink-0">
              <StepIndicator currentStep={step} />
            </div>
          </div>

          {/* Brief form — visible during brief/generating/scoring steps */}
          {(step === 'brief' || isProcessing) && (
            <form
              onSubmit={form.handleSubmit(handleGenerate)}
              className="space-y-6"
              noValidate
            >
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-5">
                {/* Two-column grid on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Campaign name */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label
                      htmlFor="campaign-name"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Campaign Name
                      <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="campaign-name"
                      type="text"
                      {...form.register('name')}
                      placeholder="e.g. Summer Collection Launch"
                      disabled={isBusy}
                      aria-required="true"
                      aria-invalid={!!form.formState.errors.name}
                      aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
                      className={`w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors duration-150
                        ${form.formState.errors.name ? 'border-red-700' : 'border-gray-700 hover:border-gray-600'}`}
                    />
                    {form.formState.errors.name && (
                      <p
                        id="name-error"
                        role="alert"
                        className="flex items-center gap-1 text-xs text-red-400"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Brief — full width */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label
                        htmlFor="campaign-brief"
                        className="block text-sm font-medium text-gray-300"
                      >
                        Campaign Brief
                        <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {briefNearLimit && !briefAtLimit && (
                          <span className="text-xs text-amber-400" aria-live="polite">Approaching limit</span>
                        )}
                        {briefAtLimit && (
                          <span className="text-xs text-red-400 font-medium" aria-live="assertive">Limit reached</span>
                        )}
                        <span
                          id="brief-char-count"
                          aria-live="off"
                          className={`text-xs tabular-nums font-mono px-1.5 py-0.5 rounded ${
                            briefAtLimit
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : briefNearLimit
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-gray-800 text-gray-500 border border-gray-700'
                          }`}
                        >
                          <span aria-label={`${briefLength} of ${BRIEF_MAX} characters used`}>
                            {briefLength.toLocaleString()} / {BRIEF_MAX.toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>
                    <textarea
                      id="campaign-brief"
                      {...form.register('brief')}
                      rows={6}
                      placeholder="Describe your campaign goals, target audience, key messages, tone of voice, and any specific requirements…"
                      disabled={isBusy}
                      maxLength={BRIEF_MAX}
                      aria-required="true"
                      aria-invalid={!!form.formState.errors.brief}
                      aria-describedby={[
                        'brief-char-count',
                        form.formState.errors.brief ? 'brief-error' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      className={`w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500
                        resize-none disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors duration-150
                        ${
                          form.formState.errors.brief
                            ? 'border-red-700'
                            : briefAtLimit
                            ? 'border-red-700 hover:border-red-600'
                            : briefNearLimit
                            ? 'border-amber-700 hover:border-amber-600'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                    />
                    {/* Character progress bar */}
                    <div
                      className="w-full h-1 bg-gray-800 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={briefLength}
                      aria-valuemin={0}
                      aria-valuemax={BRIEF_MAX}
                      aria-label="Brief character count"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          briefAtLimit
                            ? 'bg-red-500'
                            : briefNearLimit
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min((briefLength / BRIEF_MAX) * 100, 100)}%` }}
                      />
                    </div>
                    {form.formState.errors.brief && (
                      <p
                        id="brief-error"
                        role="alert"
                        className="flex items-center gap-1 text-xs text-red-400"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        {form.formState.errors.brief.message}
                      </p>
                    )}
                  </div>

                  {/* Channel selection — full width */}
                  <fieldset
                    className="space-y-2 md:col-span-2"
                    aria-describedby={form.formState.errors.channels ? 'channels-error' : undefined}
                  >
                    <legend className="block text-sm font-medium text-gray-300">
                      Channels
                      <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {CHANNELS.map((ch) => {
                        const selected = selectedChannels.includes(ch.value)
                        return (
                          <button
                            key={ch.value}
                            type="button"
                            onClick={() => toggleChannel(ch.value)}
                            disabled={isBusy}
                            aria-pressed={selected}
                            className={`flex flex-col items-start p-4 rounded-lg border text-left
                              transition-colors duration-150
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                              disabled:opacity-50 disabled:cursor-not-allowed
                              ${
                                selected
                                  ? 'border-indigo-500 bg-indigo-950/50 text-white'
                                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                              }`}
                          >
                            <span className="text-sm font-semibold">{ch.label}</span>
                            <span className="text-xs mt-0.5 opacity-70">{ch.description}</span>
                          </button>
                        )
                      })}
                    </div>
                    {form.formState.errors.channels && (
                      <p
                        id="channels-error"
                        role="alert"
                        className="flex items-center gap-1 text-xs text-red-400"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        {form.formState.errors.channels.message}
                      </p>
                    )}
                  </fieldset>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={isBusy || form.formState.isSubmitting}
                  aria-busy={isBusy}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500
                    active:bg-indigo-700
                    disabled:opacity-60 disabled:cursor-not-allowed
                    text-white text-sm font-semibold rounded-lg
                    transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  {isCreatingCampaign ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Creating campaign…
                    </>
                  ) : isGenerating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      {generationPhaseLabel}
                    </>
                  ) : step === 'scoring' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Scoring brand compliance…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                      Generate with AI
                    </>
                  )}
                </button>

                {isGenerating && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This may take up to 60 seconds
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Generating skeleton loaders */}
          {step === 'generating' && (
            <div className="space-y-6">
              {/* Generation status banner */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-indigo-950/50 border border-indigo-800 rounded-lg"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-indigo-300">{generationPhaseLabel}</p>
                  <p className="text-xs text-indigo-400/70 mt-0.5">
                    Generating content for {selectedChannelsForReview.join(', ')}
                  </p>
                </div>
              </div>

              <div
                className="flex flex-wrap gap-1 p-1 bg-gray-900 rounded-lg border border-gray-800 w-fit"
                role="tablist"
                aria-label="Channel previews"
              >
                {selectedChannelsForReview.map((ch) => (
                  <div
                    key={ch}
                    role="tab"
                    aria-selected={activeTab === ch}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize ${
                      activeTab === ch ? 'bg-indigo-600 text-white' : 'text-gray-400'
                    }`}
                  >
                    {ch}
                  </div>
                ))}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6" aria-busy="true" aria-label="Loading campaign content">
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-32" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-800 rounded" />
                    ))}
                  </div>
                  <div className="h-4 bg-gray-800 rounded w-24 mt-4" />
                  <div className="h-48 bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          )}

          {/* Scoring skeleton — content is ready, scoring in progress */}
          {step === 'scoring' && generatedContent && (
            <div className="space-y-6">
              <div
                className="flex items-center gap-3 px-4 py-3 bg-amber-950/50 border border-amber-800 rounded-lg"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Analyzing brand compliance…</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    Running two-phase scoring against your brand guidelines
                  </p>
                </div>
              </div>

              <div
                className="flex flex-wrap gap-1 p-1 bg-gray-900 rounded-lg border border-gray-800 w-fit"
                role="tablist"
                aria-label="Channel content"
              >
                {selectedChannelsForReview.map((ch) => (
                  <button
                    key={ch}
                    role="tab"
                    aria-selected={activeTab === ch}
                    onClick={() => setActiveTab(ch)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize
                      transition-colors duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900
                      ${activeTab === ch ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6" role="tabpanel">
                {activeTab === 'email' && <EmailContentPanel content={generatedContent.email} />}
                {activeTab === 'social' && <SocialContentPanel content={generatedContent.social} />}
                {activeTab === 'ads' && <AdsContentPanel content={generatedContent.ads} />}
              </div>

              <BrandScoreWidget
                score={null}
                scoringData={null}
                loading={true}
                onScore={handleScore}
              />
            </div>
          )}

          {/* Review step — full content + score widget + actions */}
          {step === 'review' && generatedContent && (
            <div className="space-y-6">
              {/* Channel tabs */}
              <div
                className="flex flex-wrap gap-1 p-1 bg-gray-900 rounded-lg border border-gray-800 w-fit"
                role="tablist"
                aria-label="Channel content"
              >
                {selectedChannelsForReview.map((ch) => (
                  <button
                    key={ch}
                    role="tab"
                    aria-selected={activeTab === ch}
                    id={`tab-${ch}`}
                    aria-controls={`panel-${ch}`}
                    onClick={() => setActiveTab(ch)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize
                      transition-colors duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900
                      ${activeTab === ch ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Panel content */}
              <div
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6"
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
              >
                {activeTab === 'email' && <EmailContentPanel content={generatedContent.email} />}
                {activeTab === 'social' && <SocialContentPanel content={generatedContent.social} />}
                {activeTab === 'ads' && <AdsContentPanel content={generatedContent.ads} />}
              </div>

              {/* Brand score widget */}
              <BrandScoreWidget
                score={brandScore}
                scoringData={scoringData}
                loading={scoreLoading}
                onScore={handleScore}
              />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                <button
                  onClick={handleScore}
                  disabled={scoreLoading}
                  aria-busy={scoreLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700
                    active:bg-gray-900
                    disabled:opacity-50 disabled:cursor-not-allowed
                    border border-gray-700 hover:border-gray-600
                    text-sm font-medium text-white rounded-lg
                    transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  {scoreLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-white" aria-hidden="true" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  )}
                  {scoreLoading ? 'Scoring…' : 'Re-score Brand Compliance'}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitLoading || !canSubmit}
                    aria-busy={submitLoading}
                    aria-disabled={!canSubmit}
                    title={
                      !canSubmit
                        ? brandScore === null
                          ? 'Score your campaign first'
                          : `Brand score must be ≥ 85 (current: ${brandScore})`
                        : 'Submit campaign for admin approval'
                    }
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600
                      active:bg-emerald-800
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-sm font-semibold text-white rounded-lg
                      transition-colors duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                  >
                    {submitLoading && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                    )}
                    {submitLoading ? 'Submitting…' : 'Submit for Approval'}
                  </button>

                  {brandScore !== null && brandScore < 85 && (
                    <span className="text-xs text-amber-400" aria-live="polite">
                      Score must be ≥ 85 — need {85 - brandScore} more point{85 - brandScore !== 1 ? 's' : ''}
                    </span>
                  )}
                  {brandScore === null && (
                    <span className="text-xs text-gray-500" aria-live="polite">
                      Scoring required before submitting
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}