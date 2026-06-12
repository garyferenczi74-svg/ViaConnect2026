'use client';

import { Sparkles, Loader2, RefreshCw, Check, Activity, Pill, ClipboardList, Dna, Smartphone, Watch } from 'lucide-react';
import {
  CROSS_REFERENCE_SOURCE_LABELS,
  type CrossReferenceSourceId,
} from '@/lib/body-tracker/cross-reference';
import type { ArnoldCrossReferenceRecommendation } from '@/hooks/body-tracker/useArnoldRecommendation';

interface ArnoldCrossReferenceCardProps {
  recommendation: ArnoldCrossReferenceRecommendation | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  onGenerate: (regenerate: boolean) => void;
  onDismiss: () => void;
}

// Sweep 2026-06-12: app and wearable joined CrossReferenceSourceId; the map
// must stay total or the card crashes the first time those sources ship.
const SOURCE_ICONS: Record<CrossReferenceSourceId, typeof Activity> = {
  body_tracker: Activity,
  supplements:  Pill,
  caq:          ClipboardList,
  genetics:     Dna,
  app:          Smartphone,
  wearable:     Watch,
};

const TIER_COLOR: Record<1 | 2 | 3, string> = {
  1: '#5B8DEF',
  2: '#2DA5A0',
  3: '#22C55E',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

export function ArnoldCrossReferenceCard({
  recommendation,
  loading,
  generating,
  error,
  onGenerate,
  onDismiss,
}: ArnoldCrossReferenceCardProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBBF24]/15">
            <Sparkles size={16} strokeWidth={1.5} className="text-[#FBBF24]" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">Arnold&apos;s Recommendation</h3>
            <p className="text-xs text-white/50">Cross referenced from your connected sources</p>
          </div>
        </div>
        {recommendation && (
          <span
            className="rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap"
            style={{
              backgroundColor: `${TIER_COLOR[recommendation.confidenceTier]}1F`,
              color: TIER_COLOR[recommendation.confidenceTier],
              border: `1px solid ${TIER_COLOR[recommendation.confidenceTier]}4D`,
            }}
          >
            Tier {recommendation.confidenceTier}, {recommendation.confidencePct}%
          </span>
        )}
      </header>

      {loading ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-white/40">
          Loading
        </div>
      ) : !recommendation ? (
        <div className="space-y-3">
          <p className="text-sm text-white/65">
            Get a personalized recommendation from Arnold built from your connected data sources.
            Connect more sources for higher confidence.
          </p>
          <button
            type="button"
            onClick={() => onGenerate(false)}
            disabled={generating}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2DA5A0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              : <Sparkles size={14} strokeWidth={1.5} />}
            {generating ? 'Generating' : 'Generate Recommendation'}
          </button>
          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-white/85">
            {recommendation.text}
          </p>

          {recommendation.sources.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Informed by</p>
              <ul className="flex flex-wrap gap-2">
                {recommendation.sources.map((id) => {
                  const Icon = SOURCE_ICONS[id];
                  return (
                    <li
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-2.5 py-1 text-[11px] font-medium text-[#2DA5A0]"
                    >
                      <Icon size={11} strokeWidth={1.5} />
                      {CROSS_REFERENCE_SOURCE_LABELS[id]}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-white/35">
            <span>Generated {formatDate(recommendation.generatedAt)}</span>
          </div>

          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onDismiss()}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/55 transition-colors hover:text-white disabled:opacity-50"
            >
              <Check size={12} strokeWidth={1.5} /> Got it
            </button>
            <button
              type="button"
              onClick={() => onGenerate(true)}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating
                ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                : <RefreshCw size={12} strokeWidth={1.5} />}
              {generating ? 'Generating' : 'Generate New'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
