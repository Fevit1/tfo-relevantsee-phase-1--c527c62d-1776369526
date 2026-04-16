'use client'

import { useState, useCallback } from 'react'

// Platform character limits
const PLATFORM_LIMITS = {
  twitter: 280,
  instagram: 2200,
  linkedin: 3000,
}

function CopyButton({ text, ariaLabel, size = 'sm' }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }, [text])

  if (error) {
    return (
      <button
        type="button"
        aria-label={`Failed to copy${ariaLabel ? `: ${ariaLabel}` : ''}`}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-colors duration-150"
      >
        <svg className="w-3.5 h-3.5" aria-hidden="true" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Failed
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel ? `Copy ${ariaLabel}` : 'Copy to clipboard'}
      disabled={!text}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-all duration-150 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" aria-hidden="true" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 4.5h-1.5a2.251 2.251 0 00-2.15 1.836m5.4 0h.003M15 13.5a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

function CharacterCounter({ text = '', limit, showBar = false }) {
  const len = (text ?? '').length
  const remaining = limit - len
  const overLimit = remaining < 0
  const nearLimit = !overLimit && remaining <= Math.ceil(limit * 0.1)
  const pct = Math.min(len / limit, 1)

  const color = overLimit
    ? '#f87171'
    : nearLimit
    ? '#fbbf24'
    : '#6366f1'

  const textColor = overLimit
    ? 'text-red-400'
    : nearLimit
    ? 'text-amber-400'
    : 'text-gray-500'

  const circumference = 2 * Math.PI * 8

  return (
    <div className="flex items-center gap-2" aria-label={`${len} of ${limit} characters used${overLimit ? `, ${Math.abs(remaining)} over limit` : ''}`}>
      <span className={`text-xs tabular-nums font-medium ${textColor}`} aria-hidden="true">
        {overLimit ? `${remaining}` : remaining} / {limit}
      </span>
      {showBar && (
        <svg className="w-5 h-5 -rotate-90 flex-shrink-0" aria-hidden="true" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="#374151" strokeWidth="2.5" />
          <circle
            cx="10" cy="10" r="8"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${circumference * (1 - pct)}`}
            className="transition-all duration-200"
          />
        </svg>
      )}
    </div>
  )
}

const TABS = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (
      <svg className="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    icon: (
      <svg className="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: (
      <svg className="w-4 h-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
]

function EmptyState({ message = 'No social content generated yet' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-800/60 border border-gray-700 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-gray-500" aria-hidden="true" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-400">{message}</p>
      <p className="text-xs text-gray-600 mt-1">Generate a campaign to see social content here</p>
    </div>
  )
}

function OverLimitWarning({ count }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2" role="alert">
      <svg className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      Exceeds limit by {Math.abs(count)} character{Math.abs(count) !== 1 ? 's' : ''}
    </div>
  )
}

/* ─── Card wrapper with hover shadow transition ─────────────────────────── */
function ContentCard({ children, className = '' }) {
  return (
    <div
      className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-shadow duration-200 hover:shadow-md hover:shadow-black/40 motion-reduce:transition-none ${className}`}
    >
      {children}
    </div>
  )
}

function CardHeader({ children }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 bg-gray-800/50">
      {children}
    </div>
  )
}

function CardBody({ children }) {
  return <div className="p-4">{children}</div>
}

/* ─── Instagram ─────────────────────────────────────────────────────────── */
function InstagramPanel({ data }) {
  if (!data) return <EmptyState message="No Instagram content available" />

  const caption = data?.caption ?? ''
  const hashtags = Array.isArray(data?.hashtags) ? data.hashtags : []
  const cta = data?.cta ?? ''
  const captionLen = caption.length
  const captionLimit = PLATFORM_LIMITS.instagram
  const captionOverLimit = captionLen > captionLimit

  const hasContent = caption || hashtags.length > 0 || cta
  if (!hasContent) return <EmptyState message="No Instagram content available" />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Caption — spans full width on mobile, full width on desktop too (main content) */}
      {caption && (
        <div className="md:col-span-2">
          <ContentCard>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Caption</span>
                <CharacterCounter text={caption} limit={captionLimit} showBar={false} />
              </div>
              <CopyButton text={caption} ariaLabel="Instagram caption" />
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{caption}</p>
              {captionOverLimit && <OverLimitWarning count={captionLen - captionLimit} />}
            </CardBody>
          </ContentCard>
        </div>
      )}

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <ContentCard>
          <CardHeader>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Hashtags
              <span className="ml-2 text-gray-600 font-normal normal-case">({hashtags.length})</span>
            </span>
            <CopyButton
              text={hashtags.map(h => `#${(h ?? '').replace(/^#/, '')}`).join(' ')}
              ariaLabel="Instagram hashtags"
            />
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-900/40 text-indigo-300 border border-indigo-700/50"
                >
                  #{(tag ?? '').replace(/^#/, '')}
                </span>
              ))}
            </div>
          </CardBody>
        </ContentCard>
      )}

      {/* Call to Action */}
      {cta && (
        <ContentCard>
          <CardHeader>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Call to Action</span>
            <CopyButton text={cta} ariaLabel="Instagram call to action" />
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-200">{cta}</p>
          </CardBody>
        </ContentCard>
      )}
    </div>
  )
}

/* ─── Twitter / X ───────────────────────────────────────────────────────── */
function TwitterPanel({ data }) {
  if (!data) return <EmptyState message="No Twitter/X content available" />

  const post = data?.post ?? ''
  const thread = Array.isArray(data?.thread) ? data.thread.filter(t => t != null) : []
  const postLen = post.length
  const limit = PLATFORM_LIMITS.twitter
  const remaining = limit - postLen
  const overLimit = remaining < 0

  const hasContent = post || thread.length > 0
  if (!hasContent) return <EmptyState message="No Twitter/X content available" />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Main post — full width */}
      {post && (
        <div className="md:col-span-2">
          <ContentCard>
            <CardHeader>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Post</span>
              <div className="flex items-center gap-3">
                <CharacterCounter text={post} limit={limit} showBar />
                <CopyButton text={post} ariaLabel="Twitter main post" />
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{post}</p>
              {overLimit && <OverLimitWarning count={postLen - limit} />}
            </CardBody>
          </ContentCard>
        </div>
      )}

      {/* Thread continuation — each tweet as its own card in the grid */}
      {thread.length > 0 && thread.map((tweet, idx) => {
        const tweetText = tweet ?? ''
        const tweetLen = tweetText.length
        const tweetOver = tweetLen > limit
        return (
          <ContentCard key={idx}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 font-medium flex-shrink-0" aria-hidden="true">
                  {idx + 2}
                </div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <span className="sr-only">Thread tweet </span>{idx + 2}
                </span>
                <span
                  className={`text-xs tabular-nums font-medium ${tweetOver ? 'text-red-400' : 'text-gray-500'}`}
                  aria-label={`${tweetLen} of ${limit} characters`}
                >
                  {tweetLen}/{limit}
                </span>
              </div>
              <CopyButton text={tweetText} ariaLabel={`Twitter thread tweet ${idx + 2}`} />
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed break-words">{tweetText}</p>
              {tweetOver && <OverLimitWarning count={tweetLen - limit} />}
            </CardBody>
          </ContentCard>
        )
      })}
    </div>
  )
}

/* ─── LinkedIn ──────────────────────────────────────────────────────────── */
function LinkedInPanel({ data }) {
  if (!data) return <EmptyState message="No LinkedIn content available" />

  const post = data?.post ?? ''
  const headline = data?.headline ?? ''
  const hashtags = Array.isArray(data?.hashtags) ? data.hashtags : []
  const postLen = post.length
  const limit = PLATFORM_LIMITS.linkedin
  const overLimit = postLen > limit

  const hasContent = post || headline || hashtags.length > 0
  if (!hasContent) return <EmptyState message="No LinkedIn content available" />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Post — full width */}
      {post && (
        <div className="md:col-span-2">
          <ContentCard>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Post</span>
                <CharacterCounter text={post} limit={limit} showBar={false} />
              </div>
              <CopyButton text={post} ariaLabel="LinkedIn post" />
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{post}</p>
              {overLimit && <OverLimitWarning count={postLen - limit} />}
            </CardBody>
          </ContentCard>
        </div>
      )}

      {/* Headline */}
      {headline && (
        <ContentCard>
          <CardHeader>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Headline</span>
            <CopyButton text={headline} ariaLabel="LinkedIn headline" />
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-200 font-medium">{headline}</p>
          </CardBody>
        </ContentCard>
      )}

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <ContentCard>
          <CardHeader>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Hashtags
              <span className="ml-2 text-gray-600 font-normal normal-case">({hashtags.length})</span>
            </span>
            <CopyButton
              text={hashtags.map(h => `#${(h ?? '').replace(/^#/, '')}`).join(' ')}
              ariaLabel="LinkedIn hashtags"
            />
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50"
                >
                  #{(tag ?? '').replace(/^#/, '')}
                </span>
              ))}
            </div>
          </CardBody>
        </ContentCard>
      )}
    </div>
  )
}

/* ─── Main export ───────────────────────────────────────────────────────── */
export function SocialContentPanel({ content, loading }) {
  const [activeTab, setActiveTab] = useState('instagram')

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Loading social content">
        <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 flex-1 bg-gray-800 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-gray-800 rounded-lg md:col-span-2" />
          <div className="h-24 bg-gray-800 rounded-lg" />
          <div className="h-24 bg-gray-800 rounded-lg" />
        </div>
      </div>
    )
  }

  // Handle error state
  if (content?.error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
        <div className="w-12 h-12 rounded-full bg-red-900/20 border border-red-800/40 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-red-400" aria-hidden="true" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-red-400">Social content unavailable</p>
        <p className="text-xs text-gray-500 mt-1">There was an error generating social content</p>
      </div>
    )
  }

  // Handle completely missing content
  if (!content) {
    return <EmptyState />
  }

  // Normalize content structure: accept either flat or nested under .social
  const social = (content?.instagram || content?.twitter || content?.linkedin)
    ? content
    : (content?.social ?? content)

  const instagramData = social?.instagram ?? null
  const twitterData = social?.twitter ?? null
  const linkedinData = social?.linkedin ?? null

  // Build available tabs based on present content keys
  const availableTabs = TABS.filter(tab => {
    if (tab.key === 'instagram') return !!instagramData
    if (tab.key === 'twitter') return !!twitterData
    if (tab.key === 'linkedin') return !!linkedinData
    return false
  })

  // Show empty state if no platforms have content
  if (availableTabs.length === 0) {
    return <EmptyState />
  }

  // Default to first available if current tab is not available
  const currentTab = availableTabs.find(t => t.key === activeTab)?.key ?? availableTabs[0]?.key ?? 'instagram'

  return (
    <div className="space-y-4">
      {/* Platform Tab Bar */}
      <div
        role="tablist"
        aria-label="Social media platforms"
        className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1"
      >
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={currentTab === tab.key}
            aria-controls={`social-panel-${tab.key}`}
            id={`social-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex-1 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 motion-reduce:transition-none ${
              currentTab === tab.key
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {tab.icon}
            {/* Platform name always visible for accessibility; hidden visually only on very small screens */}
            <span className="hidden sm:inline">{tab.label}</span>
            {/* Visually hidden label for screen readers on mobile */}
            <span className="sr-only sm:hidden">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div
        role="tabpanel"
        id={`social-panel-${currentTab}`}
        aria-labelledby={`social-tab-${currentTab}`}
      >
        {currentTab === 'instagram' && <InstagramPanel data={instagramData} />}
        {currentTab === 'twitter' && <TwitterPanel data={twitterData} />}
        {currentTab === 'linkedin' && <LinkedInPanel data={linkedinData} />}
      </div>
    </div>
  )
}