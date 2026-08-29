'use client';

// Prompt 187 Task 4 (2026-06-11): Tab 3, Nutrition Recommendations.
//
// Data shaping is owned entirely by the done lib: fetchActiveFindings (timeout
// wrapped, fail open to [] with one safeLog line) -> applySourcePrecedence
// (nutrigendx wins a slug, uploaded_test fills the rest; NOT reimplemented
// here) -> groupRecommendations (need / avoid split into category buckets).
// Mixed sources stay visible per card via the source badge; values are never
// merged or averaged.
//
// The needs / avoid segment reuses NutritionTabs on its own URL param
// (&sub=needs|avoid) so the primary ?tab= state is untouched. Needs cards
// accent Teal #2DA5A0 and Avoid cards accent Orange #B75E18, accents as
// borders and chips only; surfaces stay #1E3054 with no full bleed
// photography.

import { useEffect, useState } from 'react';
import { Apple, Gem, Pill } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  NutritionTabs,
  useNutritionActiveTab,
  useSetNutritionTab,
} from '@/components/nutrition/NutritionTabs';
import {
  applySourcePrecedence,
  fetchActiveFindings,
  groupRecommendations,
  type GroupedFindings,
  type SupabaseLike,
} from '@/lib/nutrition/genetics/recommendations';
import type {
  FindingConfidence,
  FindingStrength,
  NutritionGeneticFinding,
} from '@/lib/nutrition/genetics/types';

const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';

const SUB_TABS = [
  { id: 'needs', label: 'Feed Your Needs' },
  { id: 'avoid', label: 'Avoid' },
] as const;

const SECTIONS = [
  { key: 'food', title: 'Foods', icon: Apple },
  { key: 'vitamin', title: 'Vitamins', icon: Pill },
  { key: 'mineral', title: 'Minerals', icon: Gem },
] as const;

function countAll(groups: GroupedFindings): number {
  return (
    groups.food.length + groups.vitamin.length + groups.mineral.length + (groups.other?.length ?? 0)
  );
}

// Three small bars filled by strength: strong 3, moderate 2, weak 1.
function StrengthBars({ strength, color }: { strength: FindingStrength; color: string }) {
  const filled = strength === 'strong' ? 3 : strength === 'moderate' ? 2 : 1;
  return (
    <span
      role="img"
      aria-label={`Strength: ${strength}`}
      className="inline-flex items-center gap-1"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-5 rounded-full"
          style={{ backgroundColor: i < filled ? color : 'rgba(255,255,255,0.10)' }}
        />
      ))}
    </span>
  );
}

function SourceBadge({ source }: { source: NutritionGeneticFinding['source'] }) {
  if (source === 'nutrigendx') {
    return (
      <span className="inline-flex items-center rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#2DA5A0]">
        NutrigenDX
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-white/70">
      Uploaded Test
    </span>
  );
}

function ConfidenceChip({ confidence }: { confidence: FindingConfidence }) {
  const label =
    confidence === 'high'
      ? 'High confidence'
      : confidence === 'medium'
        ? 'Medium confidence'
        : 'Low confidence';
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/55">
      {label}
    </span>
  );
}

function RecommendationCard({
  finding,
  icon: Icon,
  accent,
}: {
  finding: NutritionGeneticFinding;
  icon: typeof Apple;
  accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-[#1E3054] p-4 ${
        accent === TEAL ? 'border-[#2DA5A0]/30' : 'border-[#B75E18]/35'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon
          className="mt-0.5 h-4 w-4 flex-shrink-0"
          strokeWidth={1.5}
          style={{ color: accent }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-white">
          {finding.itemName}
        </span>
        <SourceBadge source={finding.source} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StrengthBars strength={finding.strength} color={accent} />
        <ConfidenceChip confidence={finding.confidence} />
      </div>
      {finding.rationale ? (
        <p className="mt-2 text-[12px] leading-relaxed text-white/[0.62]">{finding.rationale}</p>
      ) : null}
    </div>
  );
}

export interface NutritionRecommendationsTabProps {
  readonly userId: string;
}

export function NutritionRecommendationsTab({ userId }: NutritionRecommendationsTabProps) {
  const sub = useNutritionActiveTab(SUB_TABS, 'needs', 'sub');
  // Primary ?tab= switcher for the empty state's upload CTA.
  const setPrimaryTab = useSetNutritionTab();

  const [grouped, setGrouped] = useState<{
    needs: GroupedFindings;
    avoid: GroupedFindings;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient() as unknown as SupabaseLike;
    void (async () => {
      // fetchActiveFindings is timeout wrapped and fails open to [] after one
      // safeLog.warn, so a read failure lands on the empty state below.
      const findings = await fetchActiveFindings(supabase, userId);
      if (cancelled) return;
      setGrouped(groupRecommendations(applySourcePrecedence(findings)));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (grouped === null) {
    return <p className="text-[12px] text-white/40">Loading your recommendations</p>;
  }

  const total = countAll(grouped.needs) + countAll(grouped.avoid);
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-6 text-center">
        <h2 className="text-xl font-semibold text-white">
          No recommendations yet
        </h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-white/[0.62]">
          Recommendations appear here once a NutrigenDX panel or an uploaded nutrition test has
          been analyzed.
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setPrimaryTab('upload')}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.18] px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md transition-all duration-200 hover:border-[#2DA5A0]/60 hover:bg-[#2DA5A0]/[0.28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            Upload Your Nutrition Testing
          </button>
          {/* PLACEHOLDER: Prompt 188 wires this CTA to the NutrigenDX flow.
              Intentionally non functional and aria-disabled until then. */}
          <button
            type="button"
            aria-disabled="true"
            className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-white/40"
          >
            Get NutrigenDX
          </button>
        </div>
      </div>
    );
  }

  const isAvoid = sub === 'avoid';
  const bucket = isAvoid ? grouped.avoid : grouped.needs;
  const accent = isAvoid ? ORANGE : TEAL;

  return (
    <div className="space-y-5">
      {/* Secondary segmented control on its own URL param. */}
      <NutritionTabs
        tabs={SUB_TABS}
        defaultTab="needs"
        paramKey="sub"
        ariaLabel="Recommendation type"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SECTIONS.map(({ key, title, icon: Icon }) => {
          const items = bucket[key];
          return (
            <section key={key} aria-labelledby={`nutrition-rec-heading-${key}`}>
              <h3
                id={`nutrition-rec-heading-${key}`}
                className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-white/55"
              >
                <Icon
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  style={{ color: accent }}
                  aria-hidden="true"
                />
                {title}
              </h3>
              <div className="mt-2 space-y-3">
                {items.length === 0 ? (
                  <p className="text-[12px] text-white/40">No items in this category yet</p>
                ) : (
                  items.map((f) => (
                    <RecommendationCard key={f.id} finding={f} icon={Icon} accent={accent} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default NutritionRecommendationsTab;
