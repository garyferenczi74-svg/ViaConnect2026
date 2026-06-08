'use client';

import { useEffect, useState } from 'react';
import { Plus, Scale, Target, TrendingDown } from 'lucide-react';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import { WeightChart } from '@/components/body-tracker/WeightChart';
import { TimeRangeToggle } from '@/components/body-tracker/TimeRangeToggle';
import { WeightMeasurementsForm } from '@/components/body-tracker/manual-input/forms/WeightMeasurementsForm';
import { EntryHistoryTimeline } from '@/components/body-tracker/manual-input';
import { GoalWeightTimelineCard } from '@/components/body-tracker/GoalWeightTimelineCard';
import { useWeightGoalKg } from '@/hooks/useWeightGoalKg';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import { createClient } from '@/lib/supabase/client';
import { LBS_PER_KG } from '@/lib/weight-goals/guardrails';

const SAMPLE_DATA = [
  { date: '2026-03-01', value: 192, label: 'Mar 1' },
  { date: '2026-03-08', value: 190, label: 'Mar 8' },
  { date: '2026-03-15', value: 188, label: 'Mar 15' },
  { date: '2026-03-22', value: 186, label: 'Mar 22' },
  { date: '2026-03-29', value: 184, label: 'Mar 29' },
  { date: '2026-04-05', value: 182, label: 'Apr 5' },
  { date: '2026-04-12', value: 181, label: 'Apr 12' },
];

export default function WeightPage() {
  const [timeRange, setTimeRange] = useState<'D' | 'W' | 'M'>('W');
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);
      // Latest body_tracker_weight log -> resolved live current weight in kg.
      // body_tracker_weight stores pounds; convert via the canonical factor
      // so the timeline card's projection math agrees with the engine.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: weightRow } = await (supabase as any)
        .from('body_tracker_weight')
        .select('weight_lbs')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const lbs = typeof weightRow?.weight_lbs === 'number' ? weightRow.weight_lbs : null;
      if (!cancelled) setLatestWeightKg(lbs !== null ? lbs / LBS_PER_KG : null);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Prompt 173 Phase 7: canonical goal weight + macro basis for the timeline
  // card. Both hooks no-op when userId is null.
  const { goalWeightKg } = useWeightGoalKg(userId);
  const { targets } = useNutritionTargets(userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weeklyRateKg = (targets?.macroBasis as any)?.weeklyRateKg ?? null;

  return (
    <div className="space-y-6" key={refreshKey}>
      <BackToHubLink />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Weight & Measurements</h2>
        <div className="flex items-center gap-3">
          <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/25 min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Log Weight
          </button>
        </div>
      </div>
      <WeightMeasurementsForm open={open} onOpenChange={setOpen} onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* Weight + Goal cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md">
          <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
            <Scale className="h-3.5 w-3.5" strokeWidth={1.5} />
            Weight
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">181.4</span>
            <span className="text-sm text-white/40">lbs</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-[#22C55E]">
            <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
            Updated Apr 12
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md">
          <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
            <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
            Goal Weight
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">176</span>
            <span className="text-sm text-white/40">lbs</span>
          </div>
          <p className="mt-1 text-xs text-[#B75E18]">5.4 lbs to go</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm">
        <WeightChart data={SAMPLE_DATA} goalWeight={176} unit="lbs" />
      </div>

      {/* Prompt 173 Phase 7: projected timeline to goal via the canonical
          user_weight_goals + the active nutrition_targets basis. Hides
          itself when any input is missing or the direction is Maintain so
          the page stays clean for users without targets yet. */}
      <GoalWeightTimelineCard
        currentWeightKg={latestWeightKg}
        goalWeightKg={goalWeightKg}
        weeklyRateKg={weeklyRateKg}
        weightUnit="lbs"
      />

      {/* Measurements grid */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">Additional Measurements</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Waist', value: '34"' }, { label: 'Hips', value: '38"' },
            { label: 'Chest', value: '42"' }, { label: 'Neck', value: '16"' },
            { label: 'Right Arm', value: '14"' }, { label: 'Left Arm', value: '13.8"' },
            { label: 'Right Thigh', value: '23"' }, { label: 'Left Thigh', value: '22.8"' },
          ].map((m) => (
            <div key={m.label}>
              <p className="text-[11px] text-white/50">{m.label}</p>
              <p className="text-sm font-bold text-white">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <EntryHistoryTimeline category="weight" onChanged={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
