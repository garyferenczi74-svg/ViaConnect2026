'use client';

// BOSCardError: calm error treatment with a single retry button.
// Rendered when the /api/bos/current query lands in an error state.
// Calls back into the parent (which owns refetch) rather than holding
// the query reference itself; this keeps the file presentational.

import { AlertCircle, RefreshCw } from 'lucide-react';

export interface BOSCardErrorProps {
  message?: string;
  onRetry: () => void;
}

export function BOSCardError({ message, onRetry }: BOSCardErrorProps) {
  return (
    <section
      role="alert"
      aria-label="Bio Optimization Score failed to load"
      className="rounded-3xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-5 sm:p-6 md:p-8"
    >
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#B75E18]/15 border border-[#B75E18]/30">
          <AlertCircle className="h-5 w-5 text-[#B75E18]" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-white">
            Bio Optimization Score is unavailable right now
          </h2>
          <p className="mt-1 text-xs text-white/60">
            {message || 'We could not reach the score service. Please try again in a moment.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#2DA5A0] bg-[#2DA5A0]/12 px-4 py-2 text-sm font-medium text-[#2DA5A0] transition-all duration-200 hover:bg-[#2DA5A0]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Try again
        </button>
      </div>
    </section>
  );
}
