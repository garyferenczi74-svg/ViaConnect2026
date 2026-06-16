'use client';

// Prompt 179 Section 7.1 Trajectory Planner (Arnold). Prompt 201 restyled it into
// the orange ProgressCard. Prompt 201d (Gary's "Prompt 200a"): the freeform Weekly
// rate field is replaced by a three-pill goal-mode control (Maintain, Gain Muscle,
// Weight loss) plus a contextual intensity dropdown; Current and Goal weight prefill
// from the CAQ-seeded goal; goal mode, intensity, target date, and goal body fat all
// recompute the calorie and macro targets LIVE through the existing engine, with the
// existing safety clamps. Targets are computed SERVER-SIDE only: this card sends the
// inputs (POST for a new goal, debounced PATCH for an active one) and triggers a
// refetch; it never computes a target locally. Direction is derived by the engine
// from the weight delta, so the pills resolve to a signed/magnitude rate (Maintain =
// rate 0) with no schema change.

import { useEffect, useRef, useState } from 'react';
import { Flag, Calendar, Dumbbell, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import type { GoalView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';
import {
  defaultModeForWeights,
  tierForStoredRate,
  defaultTierForMode,
  tiersForMode,
  resolvePayload,
  cappedRate,
  type GoalMode,
} from './goalModes';
import { safeLog } from '@/lib/utils/safe-log';

const inputCls =
  'w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-base text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-medium text-white/60';

function deriveMode(existing: GoalView | null, cw: number, gw: number): GoalMode {
  if (existing) {
    if (existing.target_rate_lb_per_week === 0) return 'maintain';
    return defaultModeForWeights(existing.start_weight_lb, existing.goal_weight_lb);
  }
  return defaultModeForWeights(cw, gw);
}

function ModePill({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition ${
        active
          ? 'border-[#B75E18]/50 bg-[#B75E18]/20 text-white'
          : 'border-white/15 bg-white/[0.06] text-white/55 hover:bg-white/10'
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {label}
    </button>
  );
}

export function TrajectoryPlanner({
  existing,
  prefillWeightLb,
  caqGoalWeightLb,
  onSaved,
}: {
  existing: GoalView | null;
  prefillWeightLb: number | null;
  caqGoalWeightLb?: number | null;
  onSaved: () => void;
}) {
  const initialCurrent = prefillWeightLb ?? existing?.start_weight_lb ?? null;
  const initialGoal = existing?.goal_weight_lb ?? caqGoalWeightLb ?? null;

  const [currentWeight, setCurrentWeight] = useState(initialCurrent != null ? String(initialCurrent) : '');
  const [goalWeight, setGoalWeight] = useState(initialGoal != null ? String(initialGoal) : '');
  const [mode, setMode] = useState<GoalMode>(() =>
    deriveMode(existing, Number(initialCurrent ?? 0), Number(initialGoal ?? 0)),
  );
  const [tierId, setTierId] = useState<string | null>(() => {
    const m = deriveMode(existing, Number(initialCurrent ?? 0), Number(initialGoal ?? 0));
    if (existing && existing.target_rate_lb_per_week != null && existing.target_rate_lb_per_week !== 0) {
      return tierForStoredRate(m, existing.target_rate_lb_per_week);
    }
    return defaultTierForMode(m);
  });
  const [driver, setDriver] = useState<'rate' | 'date'>(existing?.driver ?? 'rate');
  const [date, setDate] = useState(existing?.target_date ?? '');
  const [bodyFat, setBodyFat] = useState(existing?.goal_bodyfat_pct != null ? String(existing.goal_bodyfat_pct) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cw = Number(currentWeight);
  const gw = Number(goalWeight);

  // Keep the active direction consistent with the weights. The member picks
  // Maintain explicitly; loss and gain follow the goal-vs-current relationship.
  function syncModeToWeights(nextCw: number, nextGw: number) {
    if (mode === 'maintain' || !(nextCw > 0) || !(nextGw > 0)) return;
    const m = defaultModeForWeights(nextCw, nextGw);
    if (m !== mode) {
      setMode(m);
      setTierId((prev) => (tiersForMode(m).some((t) => t.id === prev) ? prev : defaultTierForMode(m)));
    }
  }

  function selectMode(m: GoalMode) {
    setMode(m);
    if (m !== 'maintain') {
      setTierId((prev) => (tiersForMode(m).some((t) => t.id === prev) ? prev : defaultTierForMode(m)));
    }
  }

  // Client-side feasibility preview only; the server clamp is authoritative.
  let feasibilityNote: string | null = null;
  if (mode !== 'maintain' && cw > 0 && gw > 0) {
    if (driver === 'rate' && tierId) {
      const tier = tiersForMode(mode).find((t) => t.id === tierId);
      if (tier) {
        const capped = cappedRate(tier.rate, cw);
        if (capped < tier.rate - 0.001) {
          feasibilityNote = `Your safe cap is about ${capped.toFixed(1)} lb per week, the lesser of 2 lb per week and 1 percent of your body weight. Arnold holds the safe rate and moves the projected date.`;
        }
      }
    } else if (driver === 'date' && date) {
      const weeks = Math.max(1 / 7, (new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / (7 * 86_400_000));
      const implied = Math.abs(cw - gw) / weeks;
      const cap = Math.min(2, 0.01 * cw);
      if (implied > cap) {
        feasibilityNote = `That date implies about ${implied.toFixed(1)} lb per week, above the safe cap of ${cap.toFixed(1)} lb per week. Arnold keeps you at the safe rate and moves the projected date.`;
      }
    }
  }

  function buildPayload(): Record<string, unknown> {
    const resolved = resolvePayload({ mode, tierId, driver: mode === 'maintain' ? 'rate' : driver, targetDate: date });
    return {
      driver: resolved.driver,
      goalWeightLb: gw,
      startWeightLb: cw > 0 ? cw : undefined,
      targetRateLbPerWeek: resolved.targetRateLbPerWeek ?? undefined,
      targetDate: resolved.targetDate ?? undefined,
      goalBodyfatPct: bodyFat ? Number(bodyFat) : undefined,
    };
  }

  // Live recompute for an ACTIVE goal: a debounced PATCH on any input change.
  // The engine recomputes server-side; onSaved refetches so the Daily Targets
  // band, the Progress to Goal gauge, the trajectory, and the projected date all
  // update. New goals use the explicit Set goal button instead (no auto-create).
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!existing) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!(cw > 0) || !(gw > 0)) return;
    const payload = buildPayload();
    const t = setTimeout(() => {
      void (async () => {
        setBusy(true);
        setErr(null);
        try {
          const res = await Promise.race([
            fetch(`/api/body/goals/${existing.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }),
            new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ]);
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
          if (!res.ok || json.ok === false) {
            safeLog.warn('TrajectoryPlanner.autoSave', 'recompute rejected', { status: res.status });
            setErr('Could not update your plan just now. Showing your last saved targets.');
            return;
          }
          onSaved();
        } catch (e) {
          safeLog.warn('TrajectoryPlanner.autoSave', 'recompute failed, failing open', { error: e });
          setErr('Could not update your plan just now. Showing your last saved targets.');
        } finally {
          setBusy(false);
        }
      })();
    }, 700);
    return () => clearTimeout(t);
    // Recompute when any engine input settles. buildPayload/onSaved are stable
    // closures over these same values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeight, goalWeight, mode, tierId, driver, date, bodyFat]);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const payload = buildPayload();
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
          <input
            type="number"
            inputMode="decimal"
            value={currentWeight}
            onChange={(e) => {
              setCurrentWeight(e.target.value);
              syncModeToWeights(Number(e.target.value), gw);
            }}
            className={inputCls}
            placeholder="Latest log"
          />
        </div>
        <div>
          <label className={labelCls}>Goal weight (lb)</label>
          <input
            type="number"
            inputMode="decimal"
            value={goalWeight}
            onChange={(e) => {
              setGoalWeight(e.target.value);
              syncModeToWeights(cw, Number(e.target.value));
            }}
            className={inputCls}
            placeholder="Target"
          />
        </div>
      </div>

      {/* Goal mode pills (orange action accent). */}
      <div className="mt-4">
        <span className={labelCls}>Goal</span>
        <div className="flex flex-wrap gap-2">
          <ModePill active={mode === 'loss'} onClick={() => selectMode('loss')} icon={TrendingDown} label="Weight loss" />
          <ModePill active={mode === 'maintain'} onClick={() => selectMode('maintain')} icon={Minus} label="Maintain" />
          <ModePill active={mode === 'gain'} onClick={() => selectMode('gain')} icon={Dumbbell} label="Gain Muscle" />
        </div>
      </div>

      {/* Contextual intensity or target date, then goal body fat. */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mode !== 'maintain' ? (
          driver === 'rate' ? (
            <div>
              <label className={labelCls}>Intensity</label>
              <select
                value={tierId ?? ''}
                onChange={(e) => setTierId(e.target.value)}
                className={inputCls}
              >
                {tiersForMode(mode).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}, {t.hint}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Target date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          )
        ) : null}
        <div>
          <label className={labelCls}>Goal body fat percent (optional)</label>
          <input
            type="number"
            inputMode="decimal"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </div>
      </div>

      {/* DD-4: target date is a secondary pace driver within loss and gain. */}
      {mode !== 'maintain' ? (
        <button
          type="button"
          onClick={() => setDriver((d) => (d === 'rate' ? 'date' : 'rate'))}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2DA5A0] hover:underline"
        >
          <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
          {driver === 'rate' ? 'or set a target date instead' : 'or pick an intensity instead'}
        </button>
      ) : null}

      {feasibilityNote ? (
        <p className="mt-3 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/[0.08] px-3 py-2 text-xs text-[#e8b78c]">{feasibilityNote}</p>
      ) : null}
      {err ? <p className="mt-3 text-xs text-[#e8b78c]">{err}</p> : null}

      <div className="mt-4 flex items-center gap-3">
        {/* Orange glass action button. */}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !(gw > 0) || !(cw > 0)}
          className="inline-flex w-full items-center justify-center rounded-full border border-[#B75E18]/50 bg-[#B75E18]/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-[#B75E18]/30 disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {existing ? 'Update goal' : 'Set goal'}
        </button>
        {busy ? <span className="text-xs text-white/45">Updating your targets...</span> : null}
      </div>
    </ProgressCard>
  );
}
