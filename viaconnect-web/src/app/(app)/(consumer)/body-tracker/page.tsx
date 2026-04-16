'use client';

// Tab 1: Dashboard Overview — Body Score gauge + quick metrics + contributors

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Brain, Dumbbell, Heart, Zap, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BodyScoreGauge } from '@/components/body-tracker/BodyScoreGauge';
import { QuickMetricCard } from '@/components/body-tracker/QuickMetricCard';
import { QuickLogCards } from '@/components/body-tracker/manual-input';
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

export default function BodyTrackerDashboard() {
  const [scoreData, setScoreData] = useState(DEFAULT_SCORE);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [contributors, setContributors] = useState(DEFAULT_CONTRIBUTORS);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch latest body score
        const { data: scoreRow } = await (supabase as any)
          .from('body_tracker_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('score_date', { ascending: false })
          .limit(1)
          .maybeSingle();

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
          .select('weight_lbs, body_fat_pct')
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
          .select('metabolic_age')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      {/* Body Score Gauge */}
      <BodyScoreGauge
        score={scoreData.score}
        previousScore={scoreData.previousScore}
        confidencePct={scoreData.confidencePct}
        tier={scoreData.tier}
      />

      {/* Quick Log */}
      <QuickLogCards onSaved={() => setRefreshKey((k) => k + 1)} />

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
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm">
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
        className="flex items-center justify-between rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-5 transition-all hover:bg-[#2DA5A0]/20"
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
