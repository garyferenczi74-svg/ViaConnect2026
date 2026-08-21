'use client';

/**
 * Prompt 226d Wave B: evidence-matched peptide suggestions UI.
 * Replaces PersonalizedPeptideStack recommender framing (G28).
 */

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, FlaskConical, Activity, ShieldAlert, BookOpen } from 'lucide-react';
import {
  SUGGESTION_COPY_226D,
} from '@/lib/peptides/suggestionCopy226d';
import {
  SUGGESTION_GOAL_CHIPS,
  mostDiscussedCompounds,
  type GradeBand,
  type MatchedCompound,
} from '@/lib/peptides/suggestionMatch226d';

type Chip = (typeof SUGGESTION_GOAL_CHIPS)[number];

/** Screening Yes/No pills: label is a real block so it never collides with the control. */
function ScreenYesNo({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: boolean | null;
  onChange: (next: boolean | null) => void;
  testId: string;
}) {
  const options: { key: 'no' | 'yes'; text: string; next: boolean }[] = [
    { key: 'no', text: 'No', next: false },
    { key: 'yes', text: 'Yes', next: true },
  ];

  return (
    <div className="flex flex-col gap-2.5" data-testid={testId}>
      <p className="block text-xs leading-relaxed text-white/70 pr-1">{label}</p>
      <div
        className="inline-flex w-fit items-center gap-2"
        role="group"
        aria-label={label}
      >
        {options.map((opt) => {
          const on = value === opt.next;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(opt.next)}
              className={`min-w-[3.25rem] rounded-full px-3.5 py-1.5 text-xs border transition-colors ${
                on
                  ? 'border-[var(--teal)] bg-[var(--teal)]/20 text-white font-semibold'
                  : 'border-white/15 bg-[var(--card)]/60 text-white/60 hover:text-white hover:border-white/25'
              }`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IndicationNote({ match }: { match: MatchedCompound['indicationMatch'] }) {
  if (match === 'studied_for_this_goal') return null;
  if (match === 'studied_adjacent_indication') {
    return (
      <p className="text-[11px] text-amber-200/90 mt-1">
        Human evidence for this compound is in a different indication than your stated goal.
      </p>
    );
  }
  if (match === 'mechanistic_only') {
    return (
      <p className="text-[11px] text-amber-200/90 mt-1">
        Link is mechanistic or preclinical for this goal. Human evidence is limited or absent.
      </p>
    );
  }
  return (
    <p className="text-[11px] text-amber-200/90 mt-1">
      Association for this goal is community-claim level and is excluded from briefings when grade E.
    </p>
  );
}

function CompoundCard({ compound }: { compound: MatchedCompound }) {
  const preferred = compound.routes.find((r) => r.isPreferredByEvidence);
  const honesty = compound.honesty;
  return (
    <article
      className="rounded-xl border border-[var(--glass-border-226)] bg-[var(--card)] p-3 space-y-2"
      data-testid={`suggestion-card-${compound.slug}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">
            {compound.displayName}
          </h4>
          <p className="text-[10px] text-white/45 truncate">{compound.slug}</p>
        </div>
        <span
          className="shrink-0 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal)]/15 px-2.5 py-1 text-sm font-bold text-white"
          data-testid="suggestion-grade"
        >
          {compound.evidenceGradeForGoal}
        </span>
      </div>
      <p className="text-[10px] text-[var(--teal)]">{compound.goalDisplayName}</p>
      <p className="text-xs text-white/70 leading-relaxed">
        {compound.mechanismRationale}
      </p>
      <IndicationNote match={compound.indicationMatch} />
      <div className="flex flex-wrap gap-1.5 text-[10px] text-white/55">
        <span className="rounded-full border border-white/10 px-2 py-0.5">
          Trials registered: {honesty.trials_registered ?? 'UNKNOWN'}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5">
          Completed: {honesty.trials_completed ?? 'UNKNOWN'}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5">
          Results posted: {honesty.trials_with_results_posted ?? 'UNKNOWN'}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5">
          Human pubs: {honesty.publications_human ?? 'UNKNOWN'}
        </span>
      </div>
      {preferred ? (
        <p className="text-[11px] text-white/60 leading-relaxed border-t border-white/10 pt-2">
          Route layer (studied, not an instruction): {preferred.route} for{' '}
          {preferred.targetSiteClass}. {preferred.preferenceRationale}
          {preferred.bioavailabilityValue == null
            ? ' Bioavailability for this route is UNKNOWN in sources we hold.'
            : null}
        </p>
      ) : (
        <p className="text-[11px] text-white/50 border-t border-white/10 pt-2">
          Preferred route is UNKNOWN for this goal in sources we hold.
        </p>
      )}
    </article>
  );
}

function SuggestionResults({
  bands,
  goals,
}: {
  bands: GradeBand[];
  goals: Array<{ slug: string; displayName: string }>;
}) {
  const flat = bands.flatMap((b) => b.compounds);
  const discussed = mostDiscussedCompounds(flat, 3);

  return (
    <div className="space-y-4" data-testid="suggestion-bands">
      {goals.length > 0 ? (
        <p className="text-xs text-white/55">
          Goals reflected: {goals.map((g) => g.displayName).join(', ')}
        </p>
      ) : null}

      {discussed.length > 0 ? (
        <section
          className="space-y-2 rounded-xl border border-[var(--teal)]/25 bg-[var(--teal)]/5 p-3"
          data-testid="suggestion-most-discussed"
        >
          <div>
            <h3 className="text-sm font-semibold text-white">
              {SUGGESTION_COPY_226D.mostDiscussedTitle}
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">
              {SUGGESTION_COPY_226D.mostDiscussedBody}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {discussed.map((c) => (
              <CompoundCard
                key={`discussed-${c.goalSlug}-${c.peptideId}`}
                compound={c}
              />
            ))}
          </div>
        </section>
      ) : null}

      {bands.map((band) => (
        <section key={band.grade} className="space-y-2">
          <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-1">
            {band.header}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {band.compounds.map((c) => (
              <CompoundCard key={`${c.goalSlug}-${c.peptideId}`} compound={c} />
            ))}
          </div>
        </section>
      ))}
      <p className="text-[11px] text-white/50 leading-relaxed">
        {SUGGESTION_COPY_226D.disclaimerLayer}
      </p>
      <p className="text-[11px] text-white/50">
        {SUGGESTION_COPY_226D.clinicianPathway}
      </p>
    </div>
  );
}

export function PeptideSuggestionsClient() {
  const [selected, setSelected] = useState<string[]>([]);
  const [bands, setBands] = useState<GradeBand[]>([]);
  const [goals, setGoals] = useState<Array<{ slug: string; displayName: string }>>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [thin, setThin] = useState(false);
  const [screeningBlocked, setScreeningBlocked] = useState(false);
  const [screeningReason, setScreeningReason] = useState<string | null>(null);
  const [pregnant, setPregnant] = useState<boolean | null>(null);
  const [under18, setUnder18] = useState<boolean | null>(false);
  const [hasResult, setHasResult] = useState(false);

  const toggleGoal = useCallback((slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  async function runMatch() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/peptides/suggestions/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalSlugs: selected,
          screening: {
            pregnantOrBreastfeedingOrTrying: pregnant,
            under18,
            missingCriticalScreen: pregnant === null || under18 === null,
          },
        }),
      });
      if (res.status === 401) {
        setError('Sign in to build an evidence briefing.');
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Match failed');
        return;
      }
      setBands(data.bands ?? []);
      setGoals(data.goals ?? []);
      setThin(Boolean(data.thin));
      setScreeningBlocked(Boolean(data.screeningBlocked));
      setScreeningReason(data.screeningReason ?? null);
      setHasResult(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Match failed');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Warm copy/chips endpoint (auth check).
    void fetch('/api/peptides/suggestions/match');
  }, []);

  return (
    <div
      className="relative z-0 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 space-y-4"
      data-testid="peptide-suggestions"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-[var(--teal)]/40 bg-[var(--teal)]/15">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            Hannah
          </div>
          <span className="text-xs text-white/50">Evidence-matched education</span>
        </div>
        <button
          type="button"
          onClick={() => void runMatch()}
          disabled={busy || selected.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-[var(--deep-navy)] to-[var(--teal)] text-white
            border border-[var(--teal)]/40 disabled:opacity-50"
          data-testid="suggestion-build"
        >
          {busy ? (
            <>
              <Activity className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
              Matching evidence...
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4" strokeWidth={1.5} />
              {hasResult
                ? SUGGESTION_COPY_226D.ctaRegenerate
                : SUGGESTION_COPY_226D.ctaGenerate}
            </>
          )}
        </button>
      </div>

      <div>
        <h2 className="text-base font-semibold text-white">
          {SUGGESTION_COPY_226D.heading}
        </h2>
        <p className="text-sm text-white/50 mt-1">{SUGGESTION_COPY_226D.subtitle}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-white/60">Goals (select one or more)</p>
        <div className="flex flex-wrap gap-2" data-testid="suggestion-goal-chips">
          {SUGGESTION_GOAL_CHIPS.map((chip: Chip) => {
            const on = selected.includes(chip.slug);
            return (
              <button
                key={chip.slug}
                type="button"
                onClick={() => toggleGoal(chip.slug)}
                className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
                  on
                    ? 'border-[var(--teal)] bg-[var(--teal)]/20 text-white font-semibold'
                    : 'border-white/15 text-white/60'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs text-white/70">
        <ScreenYesNo
          label="Pregnant, breastfeeding, or trying to conceive?"
          value={pregnant}
          onChange={setPregnant}
          testId="suggestion-screen-pregnant"
        />
        <ScreenYesNo
          label="Under 18?"
          value={under18}
          onChange={setUnder18}
          testId="suggestion-screen-under18"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-300" data-testid="suggestion-error">
          {error}
        </p>
      ) : null}

      {!hasResult && !busy ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <FlaskConical className="w-8 h-8 text-[var(--teal)]" strokeWidth={1.5} />
          <p className="text-sm text-white/55 max-w-md">
            {SUGGESTION_COPY_226D.emptyPrompt}
          </p>
        </div>
      ) : null}

      {hasResult && screeningBlocked ? (
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2"
          data-testid="suggestion-screening-block"
        >
          <div className="flex items-start gap-2 text-amber-100">
            <ShieldAlert className="w-4 h-4 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm font-semibold">Screening block</p>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">{screeningReason}</p>
          <p className="text-xs text-white/60">{SUGGESTION_COPY_226D.clinicianPathway}</p>
        </div>
      ) : null}

      {hasResult && !screeningBlocked && thin ? (
        <div
          className="rounded-xl border border-[var(--glass-border-226)] bg-[var(--card)] p-4 space-y-2"
          data-testid="suggestion-thin"
        >
          <h3 className="text-sm font-semibold text-white">
            {SUGGESTION_COPY_226D.thinResultTitle}
          </h3>
          <p className="text-xs text-white/65 leading-relaxed">
            {SUGGESTION_COPY_226D.thinResultBody}
          </p>
          {goals.length > 0 ? (
            <p className="text-[11px] text-white/50">
              Goals reflected: {goals.map((g) => g.displayName).join(', ')}
            </p>
          ) : null}
          <p className="text-xs text-white/60">{SUGGESTION_COPY_226D.clinicianPathway}</p>
        </div>
      ) : null}

      {hasResult && !screeningBlocked && bands.length > 0 ? (
        <SuggestionResults bands={bands} goals={goals} />
      ) : null}
    </div>
  );
}
