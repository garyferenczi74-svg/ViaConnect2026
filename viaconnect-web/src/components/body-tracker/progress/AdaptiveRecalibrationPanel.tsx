'use client';

// Prompt 179 Section 7.4 Adaptive Recalibration (Gordon). Prompt 201 (2026-06-15):
// restyled into a Gordon-attributed ProgressCard. Every control and route is
// unchanged: Revert -> POST /revert, Switch to manual + Pin -> POST /override.
// The estimated-maintenance learning copy is rendered as-is (the payload carries
// estimated_tdee_kcal, not a learning string); the optional maintenance sparkline
// is deferred. The calibration "log N days" wording is the Section 8 flagged item
// and is left verbatim, not silently changed.

import { useState } from 'react';
import { Activity, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { RecalView, TargetView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';

export function AdaptiveRecalibrationPanel({
  goalId,
  latestTarget,
  recalibrations,
  onChange,
}: {
  goalId: string;
  latestTarget: TargetView | null;
  recalibrations: RecalView[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [overrideKcal, setOverrideKcal] = useState('');

  const post = async (path: string, body?: Record<string, unknown>) => {
    setBusy(true);
    try {
      await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const estTdee = latestTarget?.estimated_tdee_kcal;
  const newest = recalibrations[0];

  return (
    <ProgressCard icon={Activity} accent="teal" attributionSlug="gordon">
      <h2 className="text-sm font-semibold text-white">Adaptive Recalibration</h2>

      <div className="mb-4 mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
          <span className="text-[11px] text-white/60">Estimated maintenance</span>
        </div>
        <p className="mt-1 text-xl font-semibold text-white">
          {typeof estTdee === 'number' ? `${estTdee} kcal` : 'Learning, log 10 days to calibrate'}
        </p>
      </div>

      {newest ? (
        <p className="mb-4 text-xs leading-relaxed text-white/65">
          Last adjustment moved your target from {newest.prev_calorie_target ?? 'the initial plan'} to{' '}
          {newest.new_calorie_target} kcal, reconciling {newest.avg_logged_kcal} kcal average intake against
          your smoothed weight trend.
        </p>
      ) : null}

      {recalibrations.length > 0 ? (
        <ul className="mb-4 space-y-1.5">
          {recalibrations.slice(0, 5).map((r, i) => (
            <li
              key={`${r.window_end}-${i}`}
              className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] text-white/55"
            >
              <span>
                {r.window_start} to {r.window_end}
              </span>
              <span className="text-white/75">{r.new_calorie_target} kcal</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => post(`/api/body/goals/${goalId}/revert`)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/15 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} /> Revert
        </button>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/15 disabled:opacity-50"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} /> Switch to manual
        </button>
      </div>

      {showManual ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={overrideKcal}
            onChange={(e) => setOverrideKcal(e.target.value)}
            placeholder="Calories"
            className="w-32 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-base text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const k = Number(overrideKcal);
              if (k > 0) void post(`/api/body/goals/${goalId}/override`, { calorieTargetKcal: k });
            }}
            disabled={busy || !(Number(overrideKcal) > 0)}
            className="rounded-full border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-[#2DA5A0]/25 disabled:opacity-50"
          >
            Pin today&apos;s macros
          </button>
        </div>
      ) : null}
    </ProgressCard>
  );
}
