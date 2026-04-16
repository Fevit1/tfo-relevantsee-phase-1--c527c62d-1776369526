'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ─── Constants ──────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 5000;

const VARIANTS = {
  success: {
    bg: 'bg-green-950 border-green-700',
    icon: (
      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    titleColor: 'text-green-50',
    msgColor: 'text-green-200',
    progressColor: 'bg-green-400',
    closeColor: 'text-green-300 hover:text-green-50',
    ariaLive: 'polite',
    role: 'status',
  },
  error: {
    bg: 'bg-red-950 border-red-700',
    icon: (
      <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    titleColor: 'text-red-50',
    msgColor: 'text-red-200',
    progressColor: 'bg-red-400',
    closeColor: 'text-red-300 hover:text-red-50',
    ariaLive: 'assertive',
    role: 'alert',
  },
  warning: {
    bg: 'bg-yellow-950 border-yellow-700',
    icon: (
      <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    titleColor: 'text-yellow-50',
    msgColor: 'text-yellow-200',
    progressColor: 'bg-yellow-400',
    closeColor: 'text-yellow-300 hover:text-yellow-50',
    ariaLive: 'assertive',
    role: 'alert',
  },
  info: {
    bg: 'bg-blue-950 border-blue-700',
    icon: (
      <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
      </svg>
    ),
    titleColor: 'text-blue-50',
    msgColor: 'text-blue-200',
    progressColor: 'bg-blue-400',
    closeColor: 'text-blue-300 hover:text-blue-50',
    ariaLive: 'polite',
    role: 'status',
  },
};

// ─── Single Toast Item ───────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }) {
  const [phase, setPhase] = useState('entering'); // 'entering' | 'visible' | 'exiting'
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const dismissTimeoutRef = useRef(null);
  const startTimeRef = useRef(null);
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const isPausedRef = useRef(false);
  const variant = VARIANTS[toast.variant] ?? VARIANTS.info;

  // Animate in: entering → visible
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleDismiss = useCallback(() => {
    if (phase === 'exiting') return;
    setPhase('exiting');
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    dismissTimeoutRef.current = setTimeout(() => onDismiss(toast.id), 350);
  }, [phase, onDismiss, toast.id]);

  const startTimer = useCallback(() => {
    if (isPausedRef.current) return;
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / remainingRef.current) * 100);
      setProgress(pct);
    }, 50);

    timeoutRef.current = setTimeout(() => {
      handleDismiss();
    }, remainingRef.current);
  }, [handleDismiss]);

  const pauseTimer = useCallback(() => {
    isPausedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  const resumeTimer = useCallback(() => {
    isPausedRef.current = false;
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, [startTimer]);

  // Transition classes based on phase
  const transitionClasses = (() => {
    if (phase === 'entering') {
      return 'opacity-0 translate-x-full sm:translate-x-8 translate-y-0';
    }
    if (phase === 'exiting') {
      return 'opacity-0 translate-x-full sm:translate-x-8 scale-95';
    }
    return 'opacity-100 translate-x-0 translate-y-0 scale-100';
  })();

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={resumeTimer}
      className={`
        relative w-full sm:w-80 sm:max-w-sm rounded-lg border shadow-2xl overflow-hidden
        transition-all duration-300 ease-in-out motion-reduce:transition-none
        ${transitionClasses}
        ${variant.bg}
      `}
      role={variant.role}
      aria-live={variant.ariaLive}
      aria-atomic="true"
    >
      {/* Content */}
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5">{variant.icon}</span>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className={`text-sm font-semibold leading-tight ${variant.titleColor}`}>
              {toast.title}
            </p>
          )}
          {toast.message && (
            <p className={`text-sm leading-snug break-words ${toast.title ? 'mt-1' : ''} ${variant.msgColor}`}>
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className={`
            flex-shrink-0 transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1
            focus-visible:ring-offset-transparent rounded p-0.5
            ${variant.closeColor}
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar — auto-dismiss countdown */}
      <div className="h-0.5 w-full bg-black/30" aria-hidden="true">
        <div
          className={`h-full transition-none ${variant.progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Portal Container ────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-label="Notifications"
      aria-relevant="additions removals"
      className={`
        fixed z-[9999] pointer-events-none
        bottom-0 left-0 right-0 flex flex-col-reverse gap-2 p-3
        sm:bottom-4 sm:right-4 sm:left-auto sm:w-80 sm:flex-col sm:p-0
      `}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ variant = 'info', title, message }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      // Limit to 5 toasts max to avoid overflow
      const updated = [...prev, { id, variant, title, message }];
      return updated.slice(-5);
    });
    return id;
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      if (typeof message === 'string') {
        return addToast({ variant: 'info', message, ...options });
      }
      return addToast({ variant: 'info', ...message });
    },
    [addToast]
  );

  toast.success = useCallback(
    (message, options = {}) => addToast({ variant: 'success', message, ...options }),
    [addToast]
  );

  toast.error = useCallback(
    (message, options = {}) => addToast({ variant: 'error', message, ...options }),
    [addToast]
  );

  toast.warning = useCallback(
    (message, options = {}) => addToast({ variant: 'warning', message, ...options }),
    [addToast]
  );

  toast.info = useCallback(
    (message, options = {}) => addToast({ variant: 'info', message, ...options }),
    [addToast]
  );

  toast.dismiss = dismiss;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useToast() returns a toast function with variants:
 *   toast('message')
 *   toast.success('message', { title: 'Optional title' })
 *   toast.error('message')
 *   toast.warning('message')
 *   toast.info('message')
 *   toast.dismiss(id)
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}