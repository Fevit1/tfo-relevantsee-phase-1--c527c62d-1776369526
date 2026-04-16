'use client';

import { useState, useEffect } from 'react';

export default function FirstRunBanner({ onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-down after mount
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    // Give the exit transition time before calling onDismiss
    setTimeout(() => {
      onDismiss?.();
    }, 200);
  };

  return (
    <div
      role="banner"
      aria-live="polite"
      aria-atomic="true"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 250ms ease, opacity 200ms ease',
      }}
      className="relative flex items-start gap-3 rounded-lg border border-amber-500/60 bg-amber-950/60 px-4 py-3 sm:px-5 sm:py-4 shadow-sm"
    >
      {/* Icon */}
      <span
        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20"
        aria-hidden="true"
      >
        <svg
          className="h-4 w-4 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
          />
        </svg>
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-300 leading-snug">
          Brand setup required
        </p>
        <p className="mt-0.5 text-sm text-amber-200/80 leading-relaxed">
          Configure your brand model to start generating campaigns. Fill in your brand voice, tone
          keywords, banned phrases, and example content below.
        </p>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss setup banner"
        className="
          ml-1 mt-0.5 flex-shrink-0 rounded-md p-1.5
          text-amber-400 hover:bg-amber-500/20 hover:text-amber-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
          transition-colors duration-150
        "
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Decorative left accent bar */}
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-lg bg-amber-500/70"
        aria-hidden="true"
      />
    </div>
  );
}