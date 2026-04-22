'use client';

// Next.js 14 App Router error boundary for every route under
// src/app/(app)/(consumer)/. Triggered when a React render fails or a
// server component throws. Individual routes can override this by
// adding a nested error.tsx in their own segment.
//
// UX intent: never show a stack trace to a Consumer user. Render a
// calm, branded card with a single retry action. The full error is
// still logged to the browser console for devs.

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ConsumerError({ error, reset }: ErrorBoundaryProps): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[consumer error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0E1A30] px-4 py-12">
      <div className="glass-panel w-full max-w-lg p-6 md:p-8 text-center">
        <div className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-5"
          style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <AlertTriangle className="w-7 h-7" strokeWidth={1.5} style={{ color: '#F87171' }} aria-hidden="true" />
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-white">Something went wrong</h2>
        <p className="mt-2 text-sm md:text-base text-white/60 leading-relaxed">
          We hit a snag loading this section. Try again; if the problem sticks around, the dashboard is your safe landing spot.
        </p>

        {error.digest && (
          <p className="mt-3 text-[11px] font-mono text-white/30">reference: {error.digest}</p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: 'rgba(45, 165, 160, 0.15)',
              border: '1px solid rgba(45, 165, 160, 0.35)',
              color: '#2DA5A0',
            }}
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white/70 hover:text-white transition-colors border border-white/10 hover:border-white/20"
          >
            <Home className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
