// Prompt #99 Phase 1 (Path A): Sherlock narrative insight card.
//
// Renders either a cached insight from sherlock_insights_cache or
// the deterministic stub returned by getSherlockStubInsight. Path B
// will add loading + error states once the Claude call is wired up.

import { Sparkles } from 'lucide-react';
import type { SherlockInsight } from '@/lib/practitioner-analytics/sherlock-stub';

const CONFIDENCE_STYLES: Record<SherlockInsight['confidence'], string> = {
  high: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  medium: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  low: 'bg-white/[0.06] text-white/60 border-white/10',
};

const CONFIDENCE_LABELS: Record<SherlockInsight['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export function SherlockInsightCard({ insight }: { insight: SherlockInsight }) {
  return (
    <section
      aria-label="Sherlock insight"
      className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-4 w-4 text-[#2DA5A0]"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
            Sherlock narrative
          </span>
        </div>
        <span
          className={`text-[10px] font-semibold rounded-lg px-2 py-0.5 border ${CONFIDENCE_STYLES[insight.confidence]}`}
        >
          {CONFIDENCE_LABELS[insight.confidence]}
        </span>
      </div>

      <h3 className="text-base font-semibold text-white leading-snug">
        {insight.headline}
      </h3>
      <p className="text-xs leading-relaxed text-white/70">{insight.body}</p>

      {insight.suggestedAction && (
        <p className="text-xs text-[#2DA5A0]">
          Suggested action: {insight.suggestedAction}
        </p>
      )}

      {insight.isPending && (
        <p className="text-[10px] italic text-white/40">
          Placeholder. The full narrative activates once the dependency data lands.
        </p>
      )}
    </section>
  );
}
