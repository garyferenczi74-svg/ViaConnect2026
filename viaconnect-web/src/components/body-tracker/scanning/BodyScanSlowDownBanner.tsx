'use client';

// BodyScanSlowDownBanner.tsx  (Prompt #169b, spec section 3.2.3)
//
// A persistent, dismissible "slow down" advisory shown when the user has made 3
// or more scan attempts within the trailing 7 days. Informational only; it never
// blocks a scan (the 24h frequency limiter is enforced server-side at finalize).
//
// Styling mirrors the body-tracker callout cards: a softer amber/info accent to
// read as guidance rather than an error. Lucide icon at strokeWidth 1.5. Copy
// uses commas/colons only (no dashes per standing rules).

import { useState } from 'react';
import { Hourglass, X } from 'lucide-react';

interface BodyScanSlowDownBannerProps {
  className?: string;
}

export function BodyScanSlowDownBanner({ className = '' }: BodyScanSlowDownBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      data-testid="body-scan-slow-down-banner"
      className={`flex items-start gap-3 rounded-2xl border border-[#E8A33A]/30 bg-[#E8A33A]/10 p-4 ${className}`}
    >
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#E8A33A]/20">
        <Hourglass className="h-4.5 w-4.5 text-[#E8A33A]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Scanning often? Give your body time to change</p>
        <p className="mt-1 text-xs leading-relaxed text-white/65">
          You have started several scans this week. Body composition shifts gradually, so a scan
          every week or two tells a clearer story than daily ones. We limit scans to one per day to
          keep your trend meaningful.
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="flex-none rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white/70 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
