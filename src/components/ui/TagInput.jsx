'use client'

import { useState, useRef } from 'react'

export function TagInput({
  value = [],
  onChange,
  placeholder = 'Type and press Enter',
  maxItems,
  disabled,
  'aria-label': ariaLabel,
  id,
}) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  const addTag = (raw) => {
    const newTag = raw.trim()
    if (!newTag) return
    if (value.includes(newTag)) {
      setInputValue('')
      return
    }
    if (maxItems && value.length >= maxItems) return
    onChange([...value, newTag])
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (tag) => {
    onChange(value.filter((t) => t !== tag))
    inputRef.current?.focus()
  }

  const atLimit = maxItems && value.length >= maxItems
  const showInput = !disabled && !atLimit

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={[
        'flex flex-wrap gap-1.5 min-h-[44px] w-full rounded-lg border bg-gray-800 px-3 py-2 cursor-text',
        'transition-colors duration-150',
        isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900'
          : 'border-gray-700 hover:border-gray-600',
        disabled ? 'opacity-60 cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className={[
            'inline-flex items-center gap-1 px-2 py-1 rounded',
            'bg-indigo-900/60 border border-indigo-700/60 text-indigo-100 text-xs font-medium',
            'animate-tag-in',
            '@media (prefers-reduced-motion: reduce) animate-none',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            animation: 'tag-scale-in 150ms ease-out both',
          }}
        >
          <span>{tag}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(tag)
              }}
              className={[
                'inline-flex items-center justify-center',
                'w-4 h-4 min-w-[1rem] rounded-full',
                'text-indigo-300 hover:text-white hover:bg-indigo-600',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-indigo-900',
                'transition-colors duration-150',
                'leading-none',
              ].join(' ')}
              aria-label={`Remove ${tag}`}
              tabIndex={0}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 8 8"
                width="8"
                height="8"
                fill="currentColor"
              >
                <path d="M1.293 1.293a1 1 0 011.414 0L4 2.586l1.293-1.293a1 1 0 111.414 1.414L5.414 4l1.293 1.293a1 1 0 01-1.414 1.414L4 5.414 2.707 6.707a1 1 0 01-1.414-1.414L2.586 4 1.293 2.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          )}
        </span>
      ))}

      {showInput && (
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            // commit partial input on blur
            if (inputValue.trim()) addTag(inputValue)
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          aria-label={ariaLabel ?? placeholder}
          className={[
            'flex-1 min-w-[120px] h-[28px]',
            'bg-transparent text-sm text-white placeholder-gray-500',
            'focus:outline-none',
          ].join(' ')}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      )}

      {atLimit && !disabled && (
        <span className="text-xs text-gray-500 self-center ml-1" aria-live="polite">
          Max {maxItems} items
        </span>
      )}

      <style jsx global>{`
        @keyframes tag-scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes tag-scale-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>
  )
}