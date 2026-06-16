'use client';

// Prompt 179 Section 7.1 Trajectory Planner (Arnold). Current weight (prefilled
// from the latest Arnold log, editable), goal weight, driver toggle (weekly rate
// vs target date), the dependent field, optional goal body-fat percent. Shows a
// calm feasibility note when a date would breach the safe rate cap. POSTs a new
// goal (or PATCHes the active one), then refetches.

import { useState } from 'react';
import { Flag, Calendar, Gauge } from 'lucide-react';
import type { GoalView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';

const inputCls =
  'w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-base text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-medium text-white/60';

export function TrajectoryPlanner({
  existing,
  prefillWeightLb,
  onSaved,
}: {
  existing: GoalView | null;
  prefillWeightLb: number | null;
  onSaved: () => void;
}) {
  const [currentWeight, setCurrentWeight] = useState(String(prefillWeightLb ?? existing?.start_weight_lb ?? ''));
  const [goalWeight, setGoalWeight] = useState(existing ? String(existing.goal_weight_lb) : '');
  const [driver, setDriver] = useState<'rate' | 'date'>(existing?.driver ?? 'rate');
  const [rate, setRate] = useState(existing?.target_rate_lb_per_week != null ? String(existing.target_rate_lb_per_week) : '1');
  const [date, setDate] = useState(existing?.target_date ?? '');
  const [bodyFat, setBodyFat] = useState(existing?.goal_bodyfat_pct != null ? String(existing.goal_bodyfat_pct) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cw = Number(currentWeight);
  const gw = Number(goalWeight);

  // Client-side feasibility preview mirroring the engine cap (lesser of 2 lb/wk
  // or 1 percent of body weight). Purely advisory; the engine is authoritative.
  let feasibilityNote: string | null = null;
  if (driver === 'date' && cw > 0 && gw > 0 && date) {
    const weeks = Math.max(1 / 7, (new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / (7 * 86_400_000));
    const impliedRate = Math.abs(cw - gw) / weeks;
    const cap = Math.min(2, 0.01 * cw);
    if (impliedRate > cap) {
      feasibilityNote = `That date implies about ${impliedRate.toFixed(1)} lb per week, above the safe cap of ${cap.toFixed(1)} lb per week. Arnold keeps you at the safe rate and moves the projected date.`;
    }
  }

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        driver,
        goalWeightLb: gw,
        startWeightLb: cw > 0 ? cw : undefined,
        targetRateLbPerWeek: driver === 'rate' ? Number(rate) : undefined,
        targetDate: driver === 'date' ? date : undefined,
        goalBodyfatPct: bodyFat ? Number(bodyFat) : undefined,
      };
      const url = existing ? `/api/body/goals/${existing.id}` : '/api/body/goals';
      const method = existing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setErr(
          json.error === 'setup_required' || json.error === 'no_current_weight'
            ? 'Add your height, age, and a recent weight to your profile so Arnold can compute your targets.'
            : 'Could not save your goal. Please try again.',
        );
        return;
      }
      onSaved();
    } catch {
      setErr('Could not save your goal. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProgressCard icon={Flag} accent="orange" attributionSlug="arnold">
      <h2 className="text-sm font-semibold text-white">Trajectory Planner</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Current weight (lb)</label>
          <input type="number" inputMode="decimal" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} className={inputCls} placeholder="Latest log" />
        </div>
        <div>
          <label className={labelCls}>Goal weight (lb)</label>
          <input type="number" inputMode="decimal" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} className={inputCls} placeholder="Target" />
        </div>
      </div>

      <div className="mt-4">
        <span className={labelCls}>Plan by</span>
        {/* Glass segmented control. */}
        <div className="inline-flex rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setDriver('rate')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${driver === 'rate' ? 'bg-white/15 text-white' : 'text-white/55'}`}
          >
            <Gauge className="h-3.5 w-3.5" strokeWidth={1.5} /> Weekly rate
          </button>
          <button
            type="button"
            onClick={() => setDriver('date')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${driver === 'date' ? 'bg-white/15 text-white' : 'text-white/55'}`}
          >
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} /> Target date
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {driver === 'rate' ? (
          <div>
            <label className={labelCls}>Weekly rate (lb per week)</label>
            <input type="number" inputMode="decimal" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} />
          </div>
        ) : (
          <div>
            <label className={labelCls}>Target date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
        )}
        <div>
          <label className={labelCls}>Goal body fat percent (optional)</label>
          <input type="number" inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} className={inputCls} placeholder="Optional" />
        </div>
      </div>

      {feasibilityNote ? (
        <p className="mt-3 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/[0.08] px-3 py-2 text-xs text-[#e8b78c]">{feasibilityNote}</p>
      ) : null}
      {err ? <p className="mt-3 text-xs text-[#e8b78c]">{err}</p> : null}

      {/* Orange glass action button. */}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !(gw > 0) || !(cw > 0)}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#B75E18]/50 bg-[#B75E18]/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-[#B75E18]/30 disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {existing ? 'Update goal' : 'Set goal'}
      </button>
    </ProgressCard>
  );
}
