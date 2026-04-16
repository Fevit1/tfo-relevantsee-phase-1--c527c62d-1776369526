'use client'

import { useState, useEffect, useRef } from 'react'
import { scoreCampaign } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { RateLimitError, AuthError, PermissionError } from '@/lib/api'

// SVG ring constants
const RING_RADIUS = 44
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ScoreRing({ score, loading, size = 120 }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [dashOffset, setDashOffset] = useState(RING_CIRCUMFERENCE)
  const animationRef = useRef(null)
  const startTimeRef = useRef(null)

  const hasScore = score !== null && score !== undefined
  const isGreen = hasScore && score >= 80
  const isAmber = hasScore && score >= 50 && score < 80
  const isRed = hasScore && score < 50

  const ringColor = loading
    ? '#6366f1'
    : !hasScore
    ? '#374151'
    : isGreen
    ? '#34d399'
    : isAmber
    ? '#fbbf24'
    : '#f87171'

  const textColor = loading
    ? 'text-indigo-400'
    : !hasScore
    ? 'text-gray-400'
    : isGreen
    ? 'text-emerald-400'
    : isAmber
    ? 'text-amber-400'
    : 'text-red-400'

  useEffect(() => {
    if (loading || !hasScore) {
      setAnimatedScore(0)
      setDashOffset(RING_CIRCUMFERENCE)
      return
    }

    const duration = 800
    const targetOffset = RING_CIRCUMFERENCE * (1 - score / 100)
    const startScore = animatedScore
    const startOffset = dashOffset

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const prefersReduced = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

    if (prefersReduced) {
      setAnimatedScore(score)
      setDashOffset(targetOffset)
      return
    }

    startTimeRef.current = null

    function animate(timestamp) {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      setAnimatedScore(Math.round(startScore + (score - startScore) * eased))
      setDashOffset(startOffset + (targetOffset - startOffset) * eased)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, loading])

  const viewBox = `0 0 ${size} ${size}`
  const cx = size / 2
  const cy = size / 2
  const strokeWidth = size < 100 ? 6 : 8

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        className="absolute inset-0"
        aria-hidden="true"
        role="presentation"
      >
        {/* Track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={RING_RADIUS * (size / 120)}
          fill="none"
          stroke="#1f2937"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        {loading ? (
          <circle
            cx={cx}
            cy={cy}
            r={RING_RADIUS * (size / 120)}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE * (size / 120) * 2}
            strokeDashoffset={RING_CIRCUMFERENCE * (size / 120) * 1.5}
            transform={`rotate(-90 ${cx} ${cy})`}
            className="animate-spin-slow opacity-60"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ) : (
          <circle
            cx={cx}
            cy={cy}
            r={RING_RADIUS * (size / 120)}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE * (size / 120)}
            strokeDashoffset={dashOffset * (size / 120)}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: 'stroke 300ms ease, stroke-dashoffset 50ms linear',
              filter: hasScore ? `drop-shadow(0 0 6px ${ringColor}88)` : 'none',
            }}
          />
        )}
        {/* 85-threshold tick */}
        {!loading && (
          (() => {
            const angle = (85 / 100) * 360 - 90
            const rad = (angle * Math.PI) / 180
            const r = RING_RADIUS * (size / 120)
            const inner = r - strokeWidth / 2 - 2
            const outer = r + strokeWidth / 2 + 2
            const x1 = cx + inner * Math.cos(rad)
            const y1 = cy + inner * Math.sin(rad)
            const x2 = cx + outer * Math.cos(rad)
            const y2 = cy + outer * Math.sin(rad)
            return (
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            )
          })()
        )}
      </svg>

      {/* Score text */}
      <div
        className="relative z-10 flex flex-col items-center justify-center"
        aria-label={
          loading
            ? 'Calculating brand score'
            : hasScore
            ? `Brand score: ${score} out of 100`
            : 'Brand score not yet calculated'
        }
        role="text"
      >
        {loading ? (
          <span className="text-xs text-indigo-400 font-medium animate-pulse">…</span>
        ) : (
          <>
            <span className={`font-bold tabular-nums leading-none ${textColor} ${size < 100 ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
              {hasScore ? animatedScore : '—'}
            </span>
            {hasScore && (
              <span className="text-gray-500 text-xs mt-0.5 leading-none">/100</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ScoreTooltip({ children }) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef(null)

  function show() {
    clearTimeout(timeoutRef.current)
    setVisible(true)
  }

  function hide() {
    timeoutRef.current = setTimeout(() => setVisible(false), 150)
  }

  return (
    <div className="relative inline-flex items-center">
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="cursor-help"
      >
        {children}
      </span>
      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 rounded-lg bg-gray-900 border border-gray-700 shadow-card-lg animate-fade-in pointer-events-none"
        >
          <p className="text-xs text-gray-300 font-medium mb-1">What is the Brand Score?</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            A two-phase compliance check: Phase 1 detects banned phrases. Phase 2 uses AI to score tone & style alignment with your brand guidelines. <span className="text-emerald-400 font-medium">85+</span> is required to submit for approval.
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              80–100 On-brand
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              50–79 Review
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              &lt;50 Fail
            </span>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700" />
          </div>
        </div>
      )}
    </div>
  )
}

export function BrandScoreWidget({
  score,
  campaignId,
  onScoreUpdate,
  scoringData: initialScoringData,
  readOnly = false,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCountdown, setRetryCountdown] = useState(null)
  const [scoringData, setScoringData] = useState(initialScoringData || null)
  const toast = useToast()

  const hasScore = score !== null && score !== undefined
  const isGreen = hasScore && score >= 80
  const isAmber = hasScore && score >= 50 && score < 80
  const isRed = hasScore && score < 50

  const borderColor = loading
    ? 'border-indigo-800'
    : !hasScore
    ? 'border-gray-800'
    : isGreen
    ? 'border-emerald-800'
    : isAmber
    ? 'border-amber-800'
    : 'border-red-800'

  const bgColor = loading
    ? 'bg-indigo-950/20'
    : !hasScore
    ? 'bg-gray-900'
    : isGreen
    ? 'bg-emerald-950/30'
    : isAmber
    ? 'bg-amber-950/30'
    : 'bg-red-950/30'

  async function handleScore() {
    if (!campaignId || loading) return
    setLoading(true)
    setError(null)
    setRetryCountdown(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const result = await scoreCampaign({ campaign_id: campaignId })
      setScoringData({
        phase1: result.phase1,
        phase2: result.phase2,
      })
      if (onScoreUpdate) {
        onScoreUpdate(result.brand_score, result)
      }
      toast.success(`Brand score: ${result.brand_score}/100`, {
        title: result.brand_score >= 85 ? 'Ready to submit!' : 'Score updated',
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        const msg = 'Scoring timed out after 30 seconds. Please try again.'
        setError(msg)
        toast.error(msg, { title: 'Scoring timeout' })
      } else if (err instanceof AuthError) {
        setError('Your session has expired. Please log in again.')
        toast.error('Your session has expired. Please log in again.', { title: 'Session expired' })
      } else if (err instanceof PermissionError) {
        setError('You do not have permission to score this campaign.')
        toast.error('You do not have permission to score this campaign.', { title: 'Permission denied' })
      } else if (err instanceof RateLimitError) {
        const retryAfter = err.retryAfter ?? 60
        setRetryCountdown(retryAfter)
        setError(
          `Too many requests. Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''} before trying again.`
        )
        toast.warning(`Rate limit reached. Retry in ${retryAfter}s.`, { title: 'Rate limited' })

        let remaining = retryAfter
        const interval = setInterval(() => {
          remaining -= 1
          setRetryCountdown(remaining)
          if (remaining <= 0) {
            clearInterval(interval)
            setRetryCountdown(null)
            setError(null)
          }
        }, 1000)
      } else {
        const msg = err.message || 'Scoring failed. Please try again.'
        setError(msg)
        toast.error(msg, { title: 'Scoring failed' })
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-4 sm:p-5 transition-colors duration-300`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-gray-300 leading-tight">
              Brand Compliance Score
            </h3>
            <ScoreTooltip>
              <button
                type="button"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full"
                aria-label="Learn about brand score"
                tabIndex={0}
              >
                <svg
                  className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300 transition-colors duration-150"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
              </button>
            </ScoreTooltip>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">85+ required to submit for approval</p>
        </div>
      </div>

      {/* Score ring — centered */}
      <div className="flex justify-center mb-4">
        <ScoreRing
          score={score}
          loading={loading}
          size={typeof window !== 'undefined' && window.innerWidth < 400 ? 100 : 120}
        />
      </div>

      {/* Color tier legend */}
      {!loading && (
        <div className="flex items-center justify-center gap-3 mb-4 text-xs">
          <span className={`flex items-center gap-1 ${isGreen ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isGreen ? 'bg-emerald-400' : 'bg-gray-600'} flex-shrink-0`} />
            80+
          </span>
          <span className={`flex items-center gap-1 ${isAmber ? 'text-amber-400 font-medium' : 'text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAmber ? 'bg-amber-400' : 'bg-gray-600'} flex-shrink-0`} />
            50–79
          </span>
          <span className={`flex items-center gap-1 ${isRed ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRed ? 'bg-red-400' : 'bg-gray-600'} flex-shrink-0`} />
            &lt;50
          </span>
        </div>
      )}

      {/* Loading message */}
      {loading && (
        <div className="mb-4 p-3 bg-indigo-950/40 rounded-lg border border-indigo-900/50">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-xs text-indigo-300 font-medium">Running brand compliance check…</p>
              <p className="text-xs text-indigo-500 mt-0.5">
                Phase 1: Checking banned phrases • Phase 2: Tone &amp; style analysis
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gate warning / status */}
      {!loading && hasScore && (
        <div className="mb-4">
          {score >= 85 ? (
            <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Ready to submit for approval
            </p>
          ) : (
            <p className="text-xs text-amber-400 flex items-center justify-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              Need {85 - score} more point{85 - score !== 1 ? 's' : ''} to submit
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasScore && !error && (
        <div className="mb-4 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-xs text-gray-300 font-medium">Not yet scored</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Click "Score Content" to run a two-phase brand compliance check. Your content must
                score 85 or above to be submitted for approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Score breakdown */}
      {!loading && scoringData && (
        <div className="mb-4 pt-3 border-t border-gray-800 space-y-2 animate-fade-in">
          <p className="text-xs font-medium text-gray-400 mb-2">Score Breakdown</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Phase 1 — Banned phrase check</span>
            <span className={scoringData.phase1?.passed ? 'text-emerald-400' : 'text-red-400'}>
              {scoringData.phase1?.passed
                ? '✓ Passed'
                : `✗ ${scoringData.phase1?.banned_phrase_hits?.length || 0} hit(s)`}
            </span>
          </div>
          {scoringData.phase2?.score !== null && scoringData.phase2?.score !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Phase 2 — Tone &amp; style alignment</span>
              <span className="text-white font-medium">{scoringData.phase2.score}/100</span>
            </div>
          )}
          {scoringData.phase1?.banned_phrase_hits?.length > 0 && (
            <div className="mt-2 p-2 bg-red-950/30 rounded border border-red-900/50">
              <p className="text-xs text-red-400 font-medium">Banned phrases detected:</p>
              <ul className="mt-1 space-y-0.5">
                {scoringData.phase1.banned_phrase_hits.map((phrase, i) => (
                  <li key={i} className="text-xs text-red-300 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true" />
                    &ldquo;{phrase}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="mb-4 p-3 bg-red-950/30 rounded-lg border border-red-900/50 animate-fade-in">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-300 font-medium">Scoring failed</p>
              <p className="text-xs text-red-400 mt-0.5 break-words">{error}</p>
              {retryCountdown !== null && (
                <p className="text-xs text-red-500 mt-1">Retry available in {retryCountdown}s…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Score Content button */}
      {campaignId && !readOnly && (
        <button
          type="button"
          onClick={handleScore}
          disabled={loading || retryCountdown !== null}
          className={`
            w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
            ${
              loading || retryCountdown !== null
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-70'
                : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:scale-[0.98] text-white cursor-pointer shadow-sm hover:shadow-glow-blue'
            }
          `}
          aria-busy={loading}
          aria-label={
            loading
              ? 'Scoring campaign content…'
              : retryCountdown !== null
              ? `Retry scoring in ${retryCountdown} seconds`
              : error
              ? 'Retry scoring campaign content'
              : 'Score campaign content for brand compliance'
          }
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Scoring…
            </>
          ) : retryCountdown !== null ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Retry in {retryCountdown}s
            </>
          ) : error ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Retry Scoring
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Score Content
            </>
          )}
        </button>
      )}

      {/* Read-only no-score notice */}
      {readOnly && !hasScore && (
        <p className="text-xs text-gray-500 text-center mt-2">Score not yet available</p>
      )}
    </div>
  )
}