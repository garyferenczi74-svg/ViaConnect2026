'use client';

// BodyScanFreeTeaserBanner.tsx  (Prompt #169a, spec section 3.1)
//
// Shown on the dashboard / entry guard point to a non-premium consumer who has
// NOT yet used their one free Body Scan. Invites them to try their first scan
// free; the actual scan still flows through the normal capture + server-gated
// finalize, which claims the one-time teaser atomically.
//
// Styling mirrors the body-tracker callout cards: teal accent, Lucide icon at
// strokeWidth 1.5. Copy uses commas/colons only (no dashes per standing rules).

import { Gift, ScanLine } from 'lucide-react';

interface BodyScanFreeTeaserBannerProps {
  // Invoked when the consumer accepts the free-scan invitation. The parent wires
  // this to the same action as the normal scan entry (e.g. start capture).
  onStart: () => void;
  className?: string;
}

export function BodyScanFreeTeaserBanner({ onStart, className = '' }: BodyScanFreeTeaserBannerProps) {
  return (
    <div
      data-testid="body-scan-free-teaser-banner"
      className={`rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DA5A0]/20 flex-none">
            <Gift className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white">Try your first Body Scan free</p>
            <p className="text-sm text-white/70 mt-1 leading-relaxed">
              Get an AI body composition analysis from your progress photos at no cost. Your first
              scan is on us; no membership required.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/20 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] flex-none"
        >
          <ScanLine className="h-4 w-4" strokeWidth={1.5} />
          Start free scan
        </button>
      </div>
    </div>
  );
}
