import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center max-w-lg w-full animate-fade-in-up">
        {/* Large gradient 404 */}
        <p
          className="text-[7rem] sm:text-[10rem] lg:text-[12rem] font-extrabold leading-none select-none
                     bg-gradient-to-br from-indigo-400 via-blue-400 to-indigo-600
                     bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]
                     drop-shadow-[0_0_48px_rgba(99,102,241,0.25)]"
          aria-hidden="true"
        >
          404
        </p>

        {/* Decorative divider */}
        <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" aria-hidden="true" />

        {/* Headings */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          Page not found
        </h1>
        <p className="text-gray-400 text-base sm:text-lg mb-10 text-pretty leading-relaxed px-2">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved,
          deleted, or you might have followed a broken link.
        </p>

        {/* CTA button */}
        <Link
          href="/dashboard"
          aria-label="Go to Dashboard"
          className="
            inline-flex items-center gap-2 px-7 py-3.5 rounded-xl
            bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
            text-white font-semibold text-base
            shadow-lg shadow-indigo-900/40
            transition-all duration-200 ease-out
            hover:scale-105 active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950
            motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100
          "
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 flex-shrink-0"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Go to Dashboard
        </Link>

        {/* Subtle help text */}
        <p className="mt-8 text-sm text-gray-600">
          If you think this is a mistake,{' '}
          <a
            href="mailto:support@relevantsee.com"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950 rounded-sm"
          >
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}