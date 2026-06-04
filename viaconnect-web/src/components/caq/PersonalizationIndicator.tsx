'use client';

// =============================================================================
// Prompt 173c Phase E (2026-06-04): personalization indicator.
//
// Rises as phases complete, framed as unlocking precision (NOT as a failed
// score per 173c 0.5). Mountable wherever the user sees their protocol or
// macros so the re-engagement loop has a positive nudge.
//
// Tone: motivating without urgency. No countdown, no dark patterns. Kelsey
// reviews the strings; this component imports the canonical copy from
// src/lib/caq/confidence.ts so a future revision lives in one place.
// =============================================================================

import { Sparkles } from 'lucide-react';
import { computePersonalization, getPersonalizationCopy } from '@/lib/caq/confidence';

export interface PersonalizationIndicatorProps {
  readonly completedPhaseIds: ReadonlySet<string>;
  // Optional CTA shown to Quick-only users so they can extend the
  // remaining phases when ready. The caller wires routing.
  readonly onAddPhases?: () => void;
}

export function PersonalizationIndicator({
  completedPhaseIds,
  onAddPhases,
}: PersonalizationIndicatorProps) {
  const indicator = computePersonalization(completedPhaseIds);
  const copy = getPersonalizationCopy(indicator.confidence);
  const pct = Math.round(indicator.fraction * 100);

  const ringHex =
    indicator.confidence === 'full' ? '#2DA5A0'
      : indicator.confidence === 'standard' ? '#5BC0BB'
      : '#C9A23A';

  return (
    <section
      aria-label="Protocol personalization"
      className="rounded-2xl border border-white/10 bg-[#1E3054]/35 p-4 text-white md:p-5"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" strokeWidth={1.5} style={{ color: ringHex }} aria-hidden="true" />
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.10em] text-white/80">
            Personalization
          </h3>
        </div>
        <span className="text-[11px] tabular-nums text-white/55">
          {indicator.completedCount} of {indicator.totalCount} phases
        </span>
      </header>

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: ringHex }}
        />
      </div>

      <p className="text-[12px] leading-relaxed text-white/70">{copy}</p>

      {indicator.confidence !== 'full' && onAddPhases ? (
        <button
          type="button"
          onClick={onAddPhases}
          className="mt-3 inline-flex items-center justify-center rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5 text-[11px] font-medium text-teal-light transition-colors hover:bg-teal/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-light/60"
        >
          {indicator.confidence === 'preliminary'
            ? 'Add the symptom phases'
            : 'Continue deepening your protocol'}
        </button>
      ) : null}
    </section>
  );
}

export default PersonalizationIndicator;
