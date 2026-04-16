'use client'

import { useEffect, useRef, useCallback, useId } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  loading = false,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
}) {
  const overlayRef = useRef(null)
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)
  const titleId = useId()

  const handleClose = useCallback(() => {
    if (loading) return
    onClose()
  }, [loading, onClose])

  // Focus trap + Escape key + body scroll lock
  useEffect(() => {
    if (!open) return

    // Capture the element that triggered the modal open
    previousActiveElement.current = document.activeElement

    const getFocusable = () => {
      if (!modalRef.current) return []
      return Array.from(
        modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
    }

    // Focus the first focusable element (or the modal panel itself)
    const focusFirst = () => {
      const focusable = getFocusable()
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        modalRef.current?.focus()
      }
    }

    // Small delay ensures the modal is painted before we try to focus
    const rafId = requestAnimationFrame(focusFirst)

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleClose()
        return
      }

      if (e.key === 'Tab') {
        const focusable = getFocusable()
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''

      // Restore focus to the element that opened the modal
      const el = previousActiveElement.current
      if (el && typeof el.focus === 'function') {
        // Use rAF to ensure DOM is settled before restoring focus
        requestAnimationFrame(() => el.focus())
      }
    }
  }, [open, handleClose])

  if (!open) return null

  const maxWidth = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }[size] ?? 'sm:max-w-lg'

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 focus-visible:ring-red-500 text-white'
      : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-500 text-white'

  return (
    <div
      ref={overlayRef}
      className="
        fixed inset-0 z-50
        flex items-end sm:items-center justify-center
        p-0 sm:p-4
        bg-black/70
        animate-fade-in
      "
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose()
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Modal panel */}
      <div
        ref={modalRef}
        className={`
          w-full ${maxWidth}
          bg-gray-900 border border-gray-800 shadow-2xl
          rounded-t-2xl sm:rounded-xl
          flex flex-col
          max-h-[92dvh] sm:max-h-[85vh]
          animate-scale-in
          motion-safe:transition-[opacity,transform]
          motion-safe:duration-200
        `}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        // Prevent clicks inside from bubbling to overlay
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
            <h2
              id={titleId}
              className="text-base sm:text-lg font-semibold text-white leading-snug"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close modal"
              className="
                -mr-1 ml-3 p-1.5
                text-gray-400 hover:text-white
                rounded-md
                transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              disabled={loading}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body — scrollable */}
        <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>

        {/* Footer — only rendered when confirm/cancel props are provided */}
        {(onConfirm || cancelLabel) && (
          <div className="
            flex items-center justify-end gap-3
            px-5 py-4
            border-t border-gray-800
            flex-shrink-0
          ">
            {cancelLabel && (
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="
                  px-4 py-2 text-sm font-medium
                  text-gray-300 bg-gray-800 hover:bg-gray-700
                  rounded-lg border border-gray-700
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                "
              >
                {cancelLabel}
              </button>
            )}
            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`
                  flex items-center gap-2
                  px-4 py-2 text-sm font-medium
                  rounded-lg
                  transition-colors duration-150
                  disabled:opacity-60 disabled:cursor-not-allowed
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                  ${confirmButtonClass}
                `}
              >
                {loading && (
                  <svg
                    className="w-4 h-4 animate-spin motion-reduce:hidden"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                <span>{loading ? 'Processing…' : (confirmLabel || 'Confirm')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}