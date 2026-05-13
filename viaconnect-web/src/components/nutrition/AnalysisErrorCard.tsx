'use client';

// Prompt #160 section 9: error UI for failed analysis. AlertCircle icon
// (Orange), title, body, two recovery actions.

import { AlertCircle, RotateCcw, PencilLine } from 'lucide-react';

interface AnalysisErrorCardProps {
  readonly message?: string;
  readonly onRetry: () => void;
  readonly onManual: () => void;
}

export function AnalysisErrorCard({ message, onRetry, onManual }: AnalysisErrorCardProps) {
  // #164 defense: types say message is string but runtime callers may pass
  // an object if a future route shape change slips through. Coerce so the
  // card can never trigger React error #31 from this surface.
  const displayMessage = typeof message === 'string' && message.length > 0
    ? message
    : 'Try again, or enter the values manually.';
  return (
    <div className="rounded-2xl border border-[#B75E18]/30 bg-[#B75E18]/10 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-none text-[#B75E18]" strokeWidth={1.5} />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">We couldn&apos;t analyze that meal</h3>
          <p className="mt-1 text-xs text-white/55">
            {displayMessage}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Try Again
            </button>
            <button
              type="button"
              onClick={onManual}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10"
            >
              <PencilLine className="h-3.5 w-3.5" strokeWidth={1.5} />
              Enter Manually
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
