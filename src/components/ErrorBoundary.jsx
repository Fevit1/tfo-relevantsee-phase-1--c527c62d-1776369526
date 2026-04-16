'use client';

import { Component } from 'react';
import Link from 'next/link';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback, showDetails = false } = this.props;

    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({ error: this.state.error, reset: this.handleReset });
      }
      return fallback;
    }

    const errorMessage =
      this.state.error?.message ||
      'An unexpected error occurred while rendering this section.';

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-[200px] flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 text-center shadow-xl shadow-black/40">

          {/* Icon cluster */}
          <div className="flex items-center justify-center mx-auto mb-6">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-red-950/60 border-2 border-red-700/60 ring-4 ring-red-900/20">
              {/* Outer pulse ring — respects reduced-motion */}
              <span
                className="absolute inset-0 rounded-full bg-red-600/10 motion-safe:animate-ping"
                aria-hidden="true"
              />
              <svg
                className="relative w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
            Something went wrong
          </h2>

          {/* Sub-heading */}
          <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-4">
            Render error
          </p>

          {/* Divider */}
          <div className="w-12 h-px bg-gray-700 mx-auto mb-4" aria-hidden="true" />

          {/* Error message */}
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-6 break-words">
            {errorMessage}
          </p>

          {/* Optional stack trace for development */}
          {showDetails && this.state.errorInfo?.componentStack && (
            <details className="mb-6 text-left group">
              <summary className="text-xs text-gray-500 cursor-pointer select-none hover:text-gray-300 transition-colors duration-150 mb-2 list-none flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 transition-transform duration-150 group-open:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Show technical details
              </summary>
              <pre className="text-xs text-red-300 bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap mt-2 leading-relaxed">
                {this.state.error?.stack || this.state.error?.toString()}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className={[
                'inline-flex items-center justify-center gap-2 px-5 py-2.5',
                'rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
                'text-white text-sm font-semibold',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                'shadow-md shadow-indigo-900/40 hover:shadow-indigo-800/50',
              ].join(' ')}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try again
            </button>

            <Link
              href="/dashboard"
              className={[
                'inline-flex items-center justify-center gap-2 px-5 py-2.5',
                'rounded-lg bg-gray-800 hover:bg-gray-700 active:bg-gray-900',
                'text-gray-200 text-sm font-semibold',
                'border border-gray-700 hover:border-gray-600',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
              ].join(' ')}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

/**
 * Higher-order component that wraps a component with an ErrorBoundary.
 *
 * Usage:
 *   const SafeComponent = withErrorBoundary(MyComponent, { fallback: <p>Error</p> });
 *
 * @param {React.ComponentType} WrappedComponent
 * @param {object} boundaryProps  Props forwarded to ErrorBoundary (fallback, onReset, showDetails)
 */
export function withErrorBoundary(WrappedComponent, boundaryProps = {}) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundaryWrapper.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundaryWrapper;
}