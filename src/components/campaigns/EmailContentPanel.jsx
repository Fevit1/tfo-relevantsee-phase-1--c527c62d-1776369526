'use client'

import { useState, useMemo, useCallback } from 'react'
import DOMPurify from 'isomorphic-dompurify'

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const MailIcon = () => (
  <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
)

const WarningIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

function hasEmailContent(content) {
  if (!content || typeof content !== 'object') return false
  const hasSubjects = Array.isArray(content.subject_lines) && content.subject_lines.length > 0
  const hasBody = !!(content.html_body || content.body)
  const hasPreview = !!content.preview_text
  return hasSubjects || hasBody || hasPreview
}

function CopyButton({ text, copyKey, copied, onCopy, label }) {
  const isCopied = copied === copyKey
  return (
    <button
      type="button"
      onClick={() => onCopy(text, copyKey)}
      className={`
        flex-shrink-0 p-1.5 rounded
        text-gray-400 hover:text-white
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
        motion-reduce:transition-none
      `}
      aria-label={isCopied ? `${label} copied!` : label}
      title={isCopied ? 'Copied!' : label}
    >
      <span className="transition-opacity duration-150 motion-reduce:transition-none">
        {isCopied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  )
}

function CopyButtonWithText({ text, copyKey, copied, onCopy, label }) {
  const isCopied = copied === copyKey
  return (
    <button
      type="button"
      onClick={() => onCopy(text, copyKey)}
      className={`
        flex items-center gap-1.5 text-xs px-2 py-1 rounded border
        transition-colors duration-150 motion-reduce:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
        ${isCopied
          ? 'text-green-400 border-green-700 bg-green-950/20'
          : 'text-gray-400 hover:text-white border-gray-700 hover:border-gray-500 hover:bg-gray-700/40'
        }
      `}
      aria-label={isCopied ? `${label} copied!` : label}
      title={isCopied ? 'Copied!' : label}
    >
      {isCopied ? <CheckIcon /> : <CopyIcon />}
      <span>{isCopied ? 'Copied!' : label}</span>
    </button>
  )
}

export function EmailContentPanel({ content, loading }) {
  const [activeSubject, setActiveSubject] = useState(0)
  const [copied, setCopied] = useState(null)
  const [copyError, setCopyError] = useState(null)

  const sanitizedHtml = useMemo(() => {
    if (!content?.html_body || typeof content.html_body !== 'string') return ''
    try {
      return DOMPurify.sanitize(content.html_body, {
        FORCE_BODY: true,
        ADD_TAGS: ['style'],
        ADD_ATTR: ['target'],
      })
    } catch {
      return ''
    }
  }, [content?.html_body])

  const handleCopy = useCallback(async (text, key) => {
    if (!text || typeof text !== 'string') return
    setCopyError(null)
    try {
      if (!navigator?.clipboard?.writeText) {
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      } else {
        await navigator.clipboard.writeText(text)
      }
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopyError('Could not copy to clipboard. Please copy manually.')
      setTimeout(() => setCopyError(null), 3000)
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading email content">
        <div className="h-4 bg-gray-800 rounded w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-800 rounded" />
          ))}
        </div>
        <div className="h-4 bg-gray-800 rounded w-24 mt-4" />
        <div className="h-48 bg-gray-800 rounded" />
        <p className="text-xs text-gray-500 text-center pt-2">Loading email content…</p>
      </div>
    )
  }

  // Error state
  if (content?.error) {
    return (
      <div className="text-center py-10 px-4" role="alert">
        <div className="flex justify-center mb-4">
          <MailIcon />
        </div>
        <p className="mt-3 text-sm text-red-400 font-medium">Email content could not be loaded</p>
        <p className="text-xs mt-1 text-gray-500">{content.error}</p>
      </div>
    )
  }

  // Empty / not-yet-generated state
  if (!hasEmailContent(content)) {
    return (
      <div className="text-center py-12 px-4">
        <div className="flex justify-center mb-4">
          <MailIcon />
        </div>
        <p className="text-sm font-medium text-gray-300 mb-1">No email content yet</p>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Generate your campaign to see subject lines, preview text, and a full HTML email template here.
        </p>
      </div>
    )
  }

  const subjectLines = Array.isArray(content?.subject_lines) ? content.subject_lines.filter(Boolean) : []
  const previewText = typeof content?.preview_text === 'string' ? content.preview_text : null
  const recommendedSendTime = typeof content?.recommended_send_time === 'string' ? content.recommended_send_time : null
  const bodyText = typeof content?.body === 'string' ? content.body : null

  return (
    <div className="space-y-6">
      {/* Copy error alert */}
      {copyError && (
        <div
          role="alert"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300"
        >
          <WarningIcon />
          {copyError}
        </div>
      )}

      {/* Subject Lines */}
      {subjectLines.length > 0 && (
        <section aria-labelledby="email-subjects-heading">
          <h3
            id="email-subjects-heading"
            className="text-sm font-semibold text-gray-300 mb-3"
          >
            Subject Lines
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({subjectLines.length})
            </span>
          </h3>
          <div className="space-y-2" role="radiogroup" aria-label="Email subject lines">
            {subjectLines.map((subject, i) => (
              <div
                key={i}
                onClick={() => setActiveSubject(i)}
                role="radio"
                aria-checked={activeSubject === i}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveSubject(i)
                  }
                }}
                className={`
                  flex items-center justify-between p-3 rounded-lg border cursor-pointer
                  transition-colors duration-150 motion-reduce:transition-none
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                  ${activeSubject === i
                    ? 'border-indigo-500 bg-indigo-950/30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
                  }
                `}
              >
                <span className="text-sm text-white break-words min-w-0 mr-2 leading-relaxed">
                  {subject}
                </span>
                <CopyButton
                  text={subject}
                  copyKey={`subject-${i}`}
                  copied={copied}
                  onCopy={handleCopy}
                  label={`Copy email subject ${i + 1}: ${subject.slice(0, 40)}${subject.length > 40 ? '…' : ''}`}
                />
              </div>
            ))}
          </div>
          {activeSubject < subjectLines.length && (
            <p className="text-xs text-gray-500 mt-1.5" aria-live="polite">
              Subject {activeSubject + 1} selected
            </p>
          )}
        </section>
      )}

      {/* Preview Text */}
      {previewText && (
        <section aria-labelledby="email-preview-heading">
          <h3
            id="email-preview-heading"
            className="text-sm font-semibold text-gray-300 mb-2"
          >
            Preview Text
          </h3>
          <div className="flex items-start justify-between p-3 rounded-lg border border-gray-700 bg-gray-800 gap-2 hover:bg-gray-750 transition-colors duration-150 motion-reduce:transition-none">
            <span className="text-sm text-gray-300 break-words min-w-0 leading-relaxed">
              {previewText}
            </span>
            <CopyButton
              text={previewText}
              copyKey="preview"
              copied={copied}
              onCopy={handleCopy}
              label="Copy email preview text"
            />
          </div>
          {copied === 'preview' && (
            <p className="text-xs text-green-400 mt-1" aria-live="polite">
              Preview text copied!
            </p>
          )}
        </section>
      )}

      {/* Recommended Send Time */}
      {recommendedSendTime && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <ClockIcon />
          <span>Recommended:</span>
          <span className="text-white font-medium">{recommendedSendTime}</span>
        </div>
      )}

      {/* HTML Email Preview */}
      {sanitizedHtml ? (
        <section aria-labelledby="email-preview-render-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
            <h3
              id="email-preview-render-heading"
              className="text-sm font-semibold text-gray-300"
            >
              Email Preview
            </h3>
            <CopyButtonWithText
              text={content.html_body}
              copyKey="html"
              copied={copied}
              onCopy={handleCopy}
              label="Copy HTML source"
            />
          </div>
          <div className="rounded-lg border border-gray-700 overflow-hidden bg-white">
            <iframe
              srcDoc={sanitizedHtml}
              sandbox="allow-same-origin"
              title="Rendered email preview"
              style={{ width: '100%', minHeight: '400px', border: 'none', display: 'block' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Rendered preview — scripts and external resources are blocked
          </p>
        </section>
      ) : bodyText ? (
        /* Plain text body fallback */
        <section aria-labelledby="email-body-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
            <h3
              id="email-body-heading"
              className="text-sm font-semibold text-gray-300"
            >
              Email Body
            </h3>
            <CopyButtonWithText
              text={bodyText}
              copyKey="body"
              copied={copied}
              onCopy={handleCopy}
              label="Copy email body"
            />
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 hover:bg-gray-750 transition-colors duration-150 motion-reduce:transition-none">
            <div className="overflow-x-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed break-words min-w-0">
                {bodyText}
              </pre>
            </div>
          </div>
          {copied === 'body' && (
            <p className="text-xs text-green-400 mt-1" aria-live="polite">
              Body text copied!
            </p>
          )}
        </section>
      ) : null}

      {/* Section-level empty hint if only subjects/preview exist */}
      {subjectLines.length > 0 && !sanitizedHtml && !bodyText && (
        <div
          className="text-center py-4 px-4 rounded-lg border border-dashed border-gray-700"
          role="note"
        >
          <p className="text-xs text-gray-500">
            No email body was generated. Only subject lines and preview text are available.
          </p>
        </div>
      )}
    </div>
  )
}