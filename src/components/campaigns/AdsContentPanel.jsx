'use client'

import { useState } from 'react'

function CopyableField({ label, value, maxChars, multiLine }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopyError(true)
      setTimeout(() => setCopyError(false), 2000)
    }
  }

  if (!value) return null

  const charCount = value.length
  const over = maxChars && charCount > maxChars

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 transition-shadow duration-150 hover:shadow-md hover:shadow-black/40 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-xs text-gray-500 mb-1" id={`field-label-${label.replace(/\s+/g, '-').toLowerCase()}`}>
              {label}
            </p>
          )}
          <p className={`text-sm text-gray-200 break-words ${multiLine ? 'whitespace-pre-wrap' : ''}`}>
            {value}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {maxChars && (
            <span
              className={`text-xs tabular-nums font-mono ${over ? 'text-red-400' : 'text-gray-500'}`}
              aria-label={`${charCount} of ${maxChars} characters`}
            >
              {charCount}/{maxChars}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={
              copyError
                ? `Failed to copy ${label}`
                : copied
                ? `Copied ${label}`
                : `Copy ${label} to clipboard`
            }
            title={copyError ? 'Copy failed' : copied ? 'Copied!' : 'Copy to clipboard'}
            className={`p-1.5 rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800 ${
              copyError
                ? 'text-red-400'
                : copied
                ? 'text-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : copyError ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 4.5h-1.5a2.251 2.251 0 00-2.15 1.836m5.4 0h.003M15 13.5a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function CopyAllButton({ items, label, ariaLabel }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const validItems = (items || []).filter(Boolean)
  if (validItems.length === 0) return null

  const handleCopyAll = async () => {
    try {
      const text = validItems.join('\n')
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy all:', err)
      setCopyError(true)
      setTimeout(() => setCopyError(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopyAll}
      aria-label={
        copyError
          ? `Failed to copy all ${ariaLabel || label}`
          : copied
          ? `All ${ariaLabel || label} copied`
          : `Copy all ${ariaLabel || label} to clipboard`
      }
      className={`text-xs px-2 py-1 rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 ${
        copyError
          ? 'text-red-400 bg-red-900/20'
          : copied
          ? 'text-emerald-400 bg-emerald-900/20'
          : 'text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {copyError ? 'Failed' : copied ? `✓ ${label} copied` : `Copy all ${label}`}
    </button>
  )
}

export function AdsContentPanel({ content, loading }) {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" aria-label="Loading ads content" role="status">
        {[1, 2].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-800 rounded w-28" />
            <div className="space-y-2">
              {[1, 2, 3].map(j => (
                <div key={j} className="h-12 bg-gray-800 rounded" />
              ))}
            </div>
          </div>
        ))}
        <span className="sr-only">Loading ads content…</span>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
        <svg className="w-10 h-10 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
        <p className="text-sm font-medium text-gray-400">No ads content yet</p>
        <p className="text-xs text-gray-600 mt-1">Generate content to see Google &amp; Meta ad copy here</p>
      </div>
    )
  }

  if (content.error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
        <svg className="w-10 h-10 text-red-500/50 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm font-medium text-gray-400">Ads content unavailable</p>
        <p className="text-xs text-gray-600 mt-1">There was an issue generating ads content. Try regenerating.</p>
      </div>
    )
  }

  const googleHeadlines = (content.google?.headlines || []).filter(Boolean)
  const googleDescriptions = (content.google?.descriptions || []).filter(Boolean)
  const metaHeadline = content.meta?.headline || null
  const metaPrimaryText = content.meta?.primary_text || null

  const hasGoogle = googleHeadlines.length > 0 || googleDescriptions.length > 0
  const hasMeta = metaHeadline || metaPrimaryText

  if (!hasGoogle && !hasMeta) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
        <svg className="w-10 h-10 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
        <p className="text-sm font-medium text-gray-400">No ads content generated</p>
        <p className="text-xs text-gray-600 mt-1">Ads content was not included in this generation run</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Google Ads */}
      {hasGoogle && (
        <section aria-labelledby="google-ads-heading">
          <div className="flex items-center gap-2 mb-4">
            <h3
              id="google-ads-heading"
              className="text-sm font-semibold text-gray-300"
            >
              Google Ads
            </h3>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              Platform-ready format
            </span>
          </div>

          <div className="space-y-5">
            {googleHeadlines.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Headlines{' '}
                    <span className="normal-case font-normal">(max 30 chars each)</span>
                  </h4>
                  <CopyAllButton
                    items={googleHeadlines}
                    label="headlines"
                    ariaLabel="Google Ads headlines"
                  />
                </div>
                {/* 1 col mobile, 2 col lg+ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {googleHeadlines.map((headline, i) => (
                    <CopyableField
                      key={i}
                      label={`Google headline ${i + 1}`}
                      value={headline}
                      maxChars={30}
                    />
                  ))}
                </div>
              </div>
            )}

            {googleDescriptions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Descriptions{' '}
                    <span className="normal-case font-normal">(max 90 chars each)</span>
                  </h4>
                  <CopyAllButton
                    items={googleDescriptions}
                    label="descriptions"
                    ariaLabel="Google Ads descriptions"
                  />
                </div>
                {/* 1 col mobile, 2 col lg+ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {googleDescriptions.map((description, i) => (
                    <CopyableField
                      key={i}
                      label={`Google description ${i + 1}`}
                      value={description}
                      maxChars={90}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Meta Ads */}
      {hasMeta && (
        <section aria-labelledby="meta-ads-heading">
          <div className="flex items-center gap-2 mb-4">
            <h3
              id="meta-ads-heading"
              className="text-sm font-semibold text-gray-300"
            >
              Meta Ads
            </h3>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              Facebook &amp; Instagram
            </span>
          </div>

          {/* 1 col mobile, 2 col lg+ — each variant in its own column when both present */}
          <div className={`grid grid-cols-1 gap-2 ${metaHeadline && metaPrimaryText ? 'lg:grid-cols-2' : ''}`}>
            {metaHeadline && (
              <CopyableField
                label="Meta headline"
                value={metaHeadline}
              />
            )}
            {metaPrimaryText && (
              <CopyableField
                label="Meta primary text"
                value={metaPrimaryText}
                multiLine
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}