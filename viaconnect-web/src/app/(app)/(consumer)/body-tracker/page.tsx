'use client';

// Tab 1: Dashboard Overview — Body Score gauge + quick metrics + contributors

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Brain, Dumbbell, Heart, ArrowRight, FileText, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { HealthReportCard } from '@/components/body-tracker/HealthReportCard';
import { JourneyTimeline } from '@/components/body-tracker/JourneyTimeline';
import { CrossReferenceCard } from '@/components/body-tracker/CrossReferenceCard';
import { ArnoldCrossReferenceCard } from '@/components/body-tracker/ArnoldCrossReferenceCard';
import { QuickMetricCard } from '@/components/body-tracker/QuickMetricCard';
import { QuickLogCards, useCurrentUser } from '@/components/body-tracker/manual-input';
import { useUserJourney } from '@/hooks/body-tracker/useUserJourney';
import { useUserJourneyEvents } from '@/hooks/body-tracker/useUserJourneyEvents';
import { useUserCrossReferenceData } from '@/hooks/body-tracker/useUserCrossReferenceData';
import { useArnoldRecommendation } from '@/hooks/body-tracker/useArnoldRecommendation';
import { estimateBiologicalAge } from '@/lib/body-tracker/biological-age';
import type { BodyScoreTier, MetricStatus } from '@/lib/body-tracker/types';

// Placeholder data (populates UI immediately; replaced by Supabase when tables exist)
const DEFAULT_SCORE = { score: 0, previousScore: 0, confidencePct: 0, tier: 'Developing' as BodyScoreTier };
const DEFAULT_METRICS: Array<{ icon: any; label: string; value: string; unit: string; status: MetricStatus; trend: 'up' | 'down' | 'stable' }> = [
  { icon: Scale,    label: 'Weight',       value: '--',   unit: 'lbs', status: 'Standard', trend: 'stable' },
  { icon: Brain,    label: 'Metabolic Age', value: '--',  unit: 'yrs', status: 'Standard', trend: 'stable' },
  { icon: Dumbbell, label: 'Muscle Mass',   value: '--',  unit: 'lbs', status: 'Standard', trend: 'stable' },
  { icon: Heart,    label: 'Body Fat',      value: '--',  unit: '%',   status: 'Standard', trend: 'stable' },
];

interface ContributorRow {
  label: string;
  grade: string;
  trend: 'up' | 'down' | 'stable';
}

const DEFAULT_CONTRIBUTORS: ContributorRow[] = [
  { label: 'Body Composition',  grade: '--', trend: 'stable' },
  { label: 'Weight Management', grade: '--', trend: 'stable' },
  { label: 'Muscle Health',     grade: '--', trend: 'stable' },
  { label: 'Cardiovascular',    grade: '--', trend: 'stable' },
  { label: 'Metabolic',         grade: '--', trend: 'stable' },
];

interface AgeData {
  chronological?: number;
  biological?: number;
}

interface JourneySnapshot {
  starting?: number;
  current?: number;
  goal?: number;
  unit: string;
}

export default function BodyTrackerDashboard() {
  const [scoreData, setScoreData] = useState(DEFAULT_SCORE);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [contributors, setContributors] = useState(DEFAULT_CONTRIBUTORS);
  const [age, setAge] = useState<AgeData>({});
  const [journeyValues, setJourneyValues] = useState<JourneySnapshot>({ unit: 'lbs' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasOlderScore, setHasOlderScore] = useState(true);
  const [hasScoreThisWeek, setHasScoreThisWeek] = useState(true);
  const { id: userId } = useCurrentUser();
  const { activeJourney, startedAt, startingSnapshot, loading: journeyLoading } = useUserJourney(userId);
  const { events: journeyEvents } = useUserJourneyEvents(userId, 6);
  const { snapshot: crossRefSnapshot, tier: crossRefTier, loading: crossRefLoading } = useUserCrossReferenceData(userId);
  const {
    recommendation: arnoldRec,
    loading: recLoading,
    generating: recGenerating,
    error: recError,
    generate: recGenerate,
    dismiss: recDismiss,
  } = useArnoldRecommendation(userId);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile (for chronological age)
        const { data: profileRow } = await (supabase as any)
          .from('profiles')
          .select('date_of_birth')
          .eq('id', user.id)
          .maybeSingle();

        // Fetch body score for the selected week (offset 0 = current week, -1 = last week, etc.)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + weekOffset * 7);
        const endDateIso = endDate.toISOString().slice(0, 10);

        const { data: scoreRow } = await (supabase as any)
          .from('body_tracker_scores')
          .select('*')
          .eq('user_id', user.id)
          .lte('score_date', endDateIso)
          .order('score_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Did a score actually exist within the selected week's range?
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        const startDateIso = startDate.toISOString().slice(0, 10);
        const { count: thisWeekCount } = await (supabase as any)
          .from('body_tracker_scores')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('score_date', startDateIso)
          .lte('score_date', endDateIso);
        setHasScoreThisWeek((thisWeekCount ?? 0) > 0);

        // Detect if there are any score rows older than the current selection
        // (used to disable the prev-week button at the boundary)
        const earlierEnd = new Date(endDate);
        earlierEnd.setDate(earlierEnd.getDate() - 7);
        const earlierEndIso = earlierEnd.toISOString().slice(0, 10);
        const { count: olderCount } = await (supabase as any)
          .from('body_tracker_scores')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lte('score_date', earlierEndIso);
        setHasOlderScore((olderCount ?? 0) > 0);

        if (scoreRow) {
          setScoreData({
            score: scoreRow.body_score ?? 0,
            previousScore: (scoreRow.body_score ?? 0) - (scoreRow.score_delta ?? 0),
            confidencePct: scoreRow.confidence_pct ?? 0,
            tier: scoreRow.tier ?? 'Developing',
          });
          setContributors([
            { label: 'Body Composition',  grade: scoreRow.composition_grade ?? '--',    trend: 'stable' },
            { label: 'Weight Management', grade: scoreRow.weight_grade ?? '--',         trend: 'stable' },
            { label: 'Muscle Health',     grade: scoreRow.muscle_grade ?? '--',         trend: 'stable' },
            { label: 'Cardiovascular',    grade: scoreRow.cardiovascular_grade ?? '--', trend: 'stable' },
            { label: 'Metabolic',         grade: scoreRow.metabolic_grade ?? '--',      trend: 'stable' },
          ]);
        }

        // Fetch latest weight/body data
        const { data: weightRow } = await (supabase as any)
          .from('body_tracker_weight')
          .select('weight_lbs, body_fat_pct, goal_weight_lbs')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: muscleRow } = await (supabase as any)
          .from('body_tracker_segmental_muscle')
          .select('total_muscle_mass_lbs')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: metabRow } = await (supabase as any)
          .from('body_tracker_metabolic')
          .select('metabolic_age, resting_hr_bpm, hrv_ms')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Compute chronological + biological age
        const dob = profileRow?.date_of_birth;
        if (dob) {
          const birth = new Date(dob);
          const ageYrs = Math.max(
            0,
            Math.floor((Date.now() - birth.getTime()) / (365.25 * 86_400_000)),
          );
          const bio = estimateBiologicalAge(ageYrs, {
            metabolicAge: metabRow?.metabolic_age ?? undefined,
            restingHR: metabRow?.resting_hr_bpm ?? undefined,
            hrv: metabRow?.hrv_ms ?? undefined,
            bodyFatPct: weightRow?.body_fat_pct ?? undefined,
          });
          setAge({ chronological: ageYrs, biological: bio });
        }

        // Hydrate journey values for timeline (weight_loss only — Phase D will add muscle source)
        if (weightRow) {
          setJourneyValues((prev) => ({
            ...prev,
            current: weightRow.weight_lbs ?? undefined,
            goal: weightRow.goal_weight_lbs ?? undefined,
          }));
        }

        if (weightRow || muscleRow || metabRow) {
          setMetrics([
            { icon: Scale,    label: 'Weight',       value: weightRow?.weight_lbs?.toFixed(1) ?? '--',          unit: 'lbs', status: 'Good' as MetricStatus, trend: 'down' },
            { icon: Brain,    label: 'Metabolic Age', value: metabRow?.metabolic_age?.toString() ?? '--',       unit: 'yrs', status: 'Good' as MetricStatus, trend: 'stable' },
            { icon: Dumbbell, label: 'Muscle Mass',   value: muscleRow?.total_muscle_mass_lbs?.toFixed(1) ?? '--', unit: 'lbs', status: 'Good' as MetricStatus, trend: 'up' },
            { icon: Heart,    label: 'Body Fat',      value: weightRow?.body_fat_pct?.toFixed(1) ?? '--',       unit: '%',   status: 'Standard' as MetricStatus, trend: 'stable' },
          ]);
        }
      } catch { /* tables may not exist yet */ }
    })();
  }, [refreshKey, weekOffset]);

  // Sync journey starting value from snapshot when journey loads
  useEffect(() => {
    const start =
      activeJourney === 'muscle_building'
        ? startingSnapshot.muscle_mass_lbs
        : startingSnapshot.weight_lbs;
    if (typeof start === 'number') {
      setJourneyValues((prev) => ({ ...prev, starting: start }));
    }
  }, [activeJourney, startingSnapshot.weight_lbs, startingSnapshot.muscle_mass_lbs]);

  return (
    <div className="space-y-6">
      {/* Journey strip */}
      {!journeyLoading && (
        activeJourney ? (
          <Link
            href="/body-tracker/journey"
            className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-sm transition-all hover:bg-[#1E3054]/45"
          >
            <div className="flex items-center gap-3">
              {activeJourney === 'weight_loss' ? (
                <TrendingDown className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
              ) : (
                <Dumbbell className="h-5 w-5 text-[#B75E18]" strokeWidth={1.5} />
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Active journey</p>
                <p className="text-sm font-semibold text-white">
                  {activeJourney === 'weight_loss' ? 'Weight Loss' : 'Muscle Building'}
                </p>
              </div>
            </div>
            <span className="text-xs text-white/50">Switch</span>
          </Link>
        ) : (
          <Link
            href="/body-tracker/journey"
            className="flex items-center justify-between rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-4 backdrop-blur-sm transition-all hover:bg-[#2DA5A0]/15"
          >
            <div>
              <p className="text-sm font-semibold text-[#2DA5A0]">Set your journey</p>
              <p className="text-xs text-white/60">
                Pick Weight Loss or Muscle Building so Arnold can tailor everything to your goal.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          </Link>
        )
      )}

      {/* Health Report (gauge + Arnold summary + Biological Age) */}
      <HealthReportCard
        score={scoreData.score}
        previousScore={scoreData.previousScore}
        confidencePct={scoreData.confidencePct}
        tier={scoreData.tier}
        biologicalAge={age.biological}
        chronologicalAge={age.chronological}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
        canGoBack={hasOlderScore}
        hasScoreData={hasScoreThisWeek}
      />

      {/* Journey Timeline (only when all data is present) */}
      {activeJourney && startedAt &&
        typeof journeyValues.starting === 'number' &&
        typeof journeyValues.current === 'number' &&
        typeof journeyValues.goal === 'number' && (
          <JourneyTimeline
            journeyType={activeJourney}
            startedAt={startedAt}
            startingValue={journeyValues.starting}
            currentValue={journeyValues.current}
            goalValue={journeyValues.goal}
            unit={journeyValues.unit}
            events={journeyEvents.map((e) => ({
              id: e.id,
              title: e.title,
              occurredAt: e.occurredAt,
              detail: e.detail,
            }))}
          />
        )}

      {/* Quick Log */}
      <QuickLogCards onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* Cross-Reference Sources */}
      {!crossRefLoading && (
        <CrossReferenceCard snapshot={crossRefSnapshot} tier={crossRefTier} />
      )}

      {/* Arnold's Cross-Reference Recommendation (LLM) */}
      <ArnoldCrossReferenceCard
        recommendation={arnoldRec}
        loading={recLoading}
        generating={recGenerating}
        error={recError}
        onGenerate={recGenerate}
        onDismiss={recDismiss}
      />

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <QuickMetricCard
              icon={m.icon}
              label={m.label}
              value={m.value}
              unit={m.unit}
              status={m.status}
              trend={m.trend}
            />
          </motion.div>
        ))}
      </div>

      {/* Contributors Breakdown */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
          Score Contributors
        </h3>
        <div className="space-y-3">
          {contributors.map((c) => (
            <div key={c.label} className="flex items-center justify-between">
              <span className="text-sm text-white/70">{c.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{c.grade}</span>
                {c.trend === 'up' && <span className="text-xs text-[#22C55E]">↑</span>}
                {c.trend === 'down' && <span className="text-xs text-[#EF4444]">↓</span>}
                {c.trend === 'stable' && <span className="text-xs text-white/40">→</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Report CTA */}
      <Link
        href="/body-tracker"
        className="flex items-center justify-between rounded-2xl border border-[#2DA5A0]/30 bg-[#1E3054]/35 p-5 backdrop-blur-sm transition-all hover:bg-[#1E3054]/45"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-white">Generate Weekly Report</p>
            <p className="text-xs text-white/50">Want deeper insights? Generate a report now</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
      </Link>
    </div>
  );
}
