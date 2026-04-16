'use client';

import { TrendingDown, TrendingUp, Minus, Target, Lightbulb, Check, Sparkles } from 'lucide-react';

interface ReportMetrics {
  weight_lbs: number | null;
  body_fat_pct: number | null;
  waist_in: number | null;
  hips_in: number | null;
  muscle_mass_lbs: number | null;
  smm_lbs: number | null;
}

export interface ProgressReportPayload {
  status: 'complete' | 'failed';
  report?: {
    periodSummary: string;
    visual: {
      fatLossAreas: string[];
      muscleGainAreas: string[];
      unchangedAreas: string[];
      overallTrajectory: string;
    };
    scenarioMatch: string;
    scenarioExplanation: string;
    recommendations: {
      continue: string[];
      adjust: string[];
      focus: string[];
      nextPhotoSession: string;
    };
    projections: {
      if_continue_current: { bodyFat4weeks: number; weight4weeks: number };
      if_increase_training: { bodyFat4weeks: number; weight4weeks: number };
      goalAchievementProjection: string;
    };
    confidence: number;
  };
  period?: { start: string; end: string; days: number };
  metricsBefore?: ReportMetrics;
  metricsAfter?: ReportMetrics;
  error?: string;
}

interface Props {
  payload: ProgressReportPayload;
}

export function ProgressReport({ payload }: Props) {
  if (payload.status === 'failed' || !payload.report) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-xs text-[#FCA5A5]">
        Report failed: {payload.error ?? 'Unknown error'}
      </div>
    );
  }

  const r = payload.report;
  const m = payload;
  const before = m.metricsBefore;
  const after  = m.metricsAfter;

  function d(a: number | null | undefined, b: number | null | undefined): number | null {
    if (a === null || a === undefined || b === null || b === undefined) return null;
    return Math.round((b - a) * 100) / 100;
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8803A]/20">
            <Sparkles className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-bold text-white">Arnold&apos;s progress report</h3>
        </div>
        {m.period && (
          <p className="text-xs text-white/55">
            {formatDate(m.period.start)} to {formatDate(m.period.end)}, {m.period.days} days
          </p>
        )}
        <p className="text-sm text-white/80 leading-relaxed">{r.periodSummary}</p>
      </header>

      {before && after && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">Data delta</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Delta label="Weight"     delta={d(before.weight_lbs, after.weight_lbs)}          unit="lbs" direction="decrease" />
            <Delta label="Body fat"   delta={d(before.body_fat_pct, after.body_fat_pct)}      unit="%"   direction="decrease" />
            <Delta label="Muscle"     delta={d(before.muscle_mass_lbs, after.muscle_mass_lbs)} unit="lbs" direction="increase" />
            <Delta label="Waist"      delta={d(before.waist_in, after.waist_in)}              unit="in"  direction="decrease" />
          </div>
        </section>
      )}

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">Visual changes</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <ChangeList title="Fat loss areas"    items={r.visual.fatLossAreas}    accent="#22C55E" />
          <ChangeList title="Muscle gain areas" items={r.visual.muscleGainAreas} accent="#2DA5A0" />
          <ChangeList title="Unchanged"         items={r.visual.unchangedAreas}  accent="#9CA3AF" />
        </div>
        <p className="text-xs text-white/70 mt-2 italic">{r.visual.overallTrajectory}</p>
      </section>

      {r.scenarioExplanation && (
        <section className="rounded-lg border border-[#2DA5A0]/20 bg-[#2DA5A0]/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0] mb-1">Pattern recognized</p>
          <p className="text-xs text-white/80 leading-relaxed">{r.scenarioExplanation}</p>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RecBox title="Continue" icon={Check}      items={r.recommendations.continue} accent="#22C55E" />
        <RecBox title="Adjust"   icon={Target}     items={r.recommendations.adjust}   accent="#E8803A" />
        <RecBox title="Focus"    icon={Lightbulb}  items={r.recommendations.focus}    accent="#2DA5A0" />
      </section>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">4 week projections</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <ProjectionCard
            title="If you continue current protocol"
            bodyFat={r.projections.if_continue_current.bodyFat4weeks}
            weight={r.projections.if_continue_current.weight4weeks}
          />
          <ProjectionCard
            title="If you increase training"
            bodyFat={r.projections.if_increase_training.bodyFat4weeks}
            weight={r.projections.if_increase_training.weight4weeks}
          />
        </div>
        {r.projections.goalAchievementProjection && (
          <p className="text-[11px] text-white/60 mt-2 italic">
            Goal projection: {r.projections.goalAchievementProjection}
          </p>
        )}
      </section>

      {r.recommendations.nextPhotoSession && (
        <footer className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-xs text-white/75">
          <span className="font-semibold text-white">Next session: </span>
          {r.recommendations.nextPhotoSession}
        </footer>
      )}
    </div>
  );
}

function Delta({ label, delta, unit, direction }: { label: string; delta: number | null; unit: string; direction: 'increase' | 'decrease' }) {
  const isGood = delta === null ? null : direction === 'increase' ? delta > 0 : delta < 0;
  const color = delta === 0 || delta === null ? '#9CA3AF' : isGood ? '#22C55E' : '#EF4444';
  const Icon = delta === 0 || delta === null ? Minus : delta! > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color }} />
        <p className="text-sm font-semibold" style={{ color }}>
          {delta === null ? 'no data' : `${delta > 0 ? '+' : ''}${delta} ${unit}`}
        </p>
      </div>
    </div>
  );
}

function ChangeList({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: accent }}>{title}</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-white/40 italic">None detected</p>
      ) : (
        <ul className="space-y-1">
          {items.map((x, i) => (
            <li key={i} className="text-[11px] text-white/75 leading-snug">• {x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecBox({ title, icon: Icon, items, accent }: { title: string; icon: React.ElementType; items: string[]; accent: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: accent }} />
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-white/40 italic">No specific items</p>
      ) : (
        <ul className="space-y-1">
          {items.map((x, i) => (
            <li key={i} className="text-[11px] text-white/75 leading-snug flex gap-1.5">
              <span className="text-white/40 flex-none">•</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectionCard({ title, bodyFat, weight }: { title: string; bodyFat: number; weight: number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] text-white/55 mb-1">{title}</p>
      <p className="text-sm font-semibold text-white">
        <span className="text-white/60 text-xs font-normal">Body fat </span>
        {bodyFat.toFixed(1)}%
        <span className="text-white/40 mx-2">|</span>
        <span className="text-white/60 text-xs font-normal">Weight </span>
        {weight.toFixed(1)} lbs
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
