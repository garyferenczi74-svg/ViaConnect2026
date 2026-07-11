'use client';

/**
 * src/components/formavision/FingerprintFlag.tsx
 *
 * Prompt 211a Workstream 4 (Part 2): the outlier fingerprint FLAG.
 *
 * Shown BEFORE a sharply-different-condition scan enters the trend displays, so
 * a change caused by lighting or time of day is not mistaken for a real body
 * change. The decision comes from decideFingerprintFlag (pure, wrapping the W4-1
 * scoreConditionFingerprint). This component renders nothing unless showFlag is
 * true, so a matching or UNKNOWN scan adds no noise.
 *
 * The reason is the kind, honest copy straight from the score (dash-free). This
 * surface never recomputes the verdict and never upgrades confidence.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
 *   only, Instrument Sans. Desktop AND mobile responsive, w-full on mobile.
 */

import { Info } from 'lucide-react';
import type { FingerprintFlagDecision } from '@/lib/formavision/cadence/fingerprintFlag';

export interface FingerprintFlagProps {
  /** The decision from decideFingerprintFlag. */
  decision: FingerprintFlagDecision;
  className?: string;
}

export function FingerprintFlag({ decision, className }: FingerprintFlagProps) {
  // Only a genuine outlier is flagged. A match or UNKNOWN renders nothing.
  if (!decision.showFlag) return null;

  return (
    <div
      role="note"
      data-testid="fingerprint-flag"
      className={`flex w-full items-start gap-2.5 rounded-xl border border-[#B75E18]/40 bg-[#B75E18]/10 p-3 text-xs leading-relaxed text-white/80 ${
        className ?? ''
      }`}
    >
      <Info size={16} strokeWidth={1.5} className="mt-0.5 flex-none text-[#B75E18]" aria-hidden="true" />
      <p data-testid="fingerprint-flag-reason">{decision.reason}</p>
    </div>
  );
}
