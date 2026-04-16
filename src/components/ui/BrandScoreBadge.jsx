export function BrandScoreBadge({ score, interactive = false }) {
  if (score === null || score === undefined) {
    return (
      <span
        className="inline-flex items-center gap-1 text-sm text-gray-400"
        aria-label="Brand score: not available"
      >
        <svg
          className="w-3.5 h-3.5 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707" />
        </svg>
        <span>—</span>
      </span>
    )
  }

  const tier =
    score >= 80 ? 'high' :
    score >= 50 ? 'mid' :
    'low'

  const styles = {
    high: {
      wrapper: 'bg-score-high-bg border border-score-high-border text-score-high-text',
      icon: 'text-emerald-400',
      glow: 'hover:shadow-glow-green',
    },
    mid: {
      wrapper: 'bg-score-mid-bg border border-score-mid-border text-score-mid-text',
      icon: 'text-amber-400',
      glow: 'hover:shadow-glow-amber',
    },
    low: {
      wrapper: 'bg-score-low-bg border border-score-low-border text-score-low-text',
      icon: 'text-red-400',
      glow: 'hover:shadow-glow-red',
    },
  }

  const { wrapper, icon, glow } = styles[tier]

  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold tabular-nums',
        'transition-all duration-150 motion-reduce:transition-none',
        wrapper,
        interactive ? `cursor-default ${glow} hover:scale-105 active:scale-100` : '',
      ].join(' ')}
      aria-label={`Brand score: ${score}`}
      role="status"
    >
      {/* Sparkle icon */}
      <svg
        className={`w-3.5 h-3.5 flex-shrink-0 ${icon}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
        <path
          opacity="0.5"
          d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"
        />
        <path
          opacity="0.35"
          d="M5 17l.6 1.4L7 19l-1.4.6L5 21l-.6-1.4L3 19l1.4-.6L5 17z"
        />
      </svg>
      <span>{score}</span>
    </span>
  )
}