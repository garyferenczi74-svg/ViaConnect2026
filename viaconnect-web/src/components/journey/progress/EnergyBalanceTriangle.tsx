'use client';

/**
 * src/components/journey/progress/EnergyBalanceTriangle.tsx
 *
 * The energy-balance triangle for the Your Journey page (Prompt 208d, 3.4,
 * Task D-T3). It ties three inputs into one honest read:
 *
 *   - Intake   (Gordon): mean recent daily kcal from confirmed nutrition_logs,
 *                        read client-side, owner-scoped RLS. Best-effort -> null.
 *   - Activity (Connected): expenditure is FLAG-OFF / absent, so it is ALWAYS
 *                        null and is NEVER fabricated.
 *   - Body     (Arnold): the recent weight-series trend via computeTrend.
 *
 * The balance state comes from the PURE deriveBalanceState (208b) computed in
 * the browser. We deliberately do NOT call the server-only
 * computeAndPersistEnergyBalance (it uses the service-role admin client). With
 * expenditure null and only a body trend, deriveBalanceState reports the trend's
 * net direction; with neither, it honestly reports 'insufficient_data'.
 *
 * WEIGHT GUARDRAIL (208a): the read is supportive and neutral. It never sets a
 * target, never prescribes restriction, never shames. 'deficit'/'surplus' are
 * framed as neutral directional observations, not goals to chase.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans, Lucide
 * strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe. Never throws.
 */

import { useEffect, useMemo, useState } from 'react';
import { Flame, Activity, Scale, Triangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { computeTrend } from '@/lib/labs/trend';
import {
  deriveBalanceState,
  type BalanceState,
} from '@/lib/wellness/energyBalance';
import { useRecentBodySeries } from './useRecentBodySeries';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 30;

/**
 * Mean recent daily kcal from confirmed nutrition_logs, read client-side and
 * fail-open. Mirrors the server intake read (averaged across distinct logged
 * days). Returns null on any error or with no usable intake; never throws.
 */
function useIntakeEstimate(userId: string | null): number | null {
  const [intake, setIntake] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setIntake(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const sinceIso = new Date(Date.now() - RECENT_WINDOW_DAYS * DAY_MS).toISOString();

        type IntakeRow = { calories: number | null; logged_at: string | null };
        const { data } = await withTimeout(
          supabase
            .from('nutrition_logs')
            .select('calories, logged_at')
            .eq('user_id', userId)
            .eq('status', 'confirmed')
            .gte('logged_at', sinceIso) as unknown as Promise<{ data: IntakeRow[] | null; error: unknown }>,
          4000,
          'EnergyBalanceTriangle read',
        );

        if (!active) return;

        const rows = (Array.isArray(data) ? data : []) as Array<{
          calories: number | null;
          logged_at: string | null;
        }>;

        const perDay = new Map<string, number>();
        for (const r of rows) {
          const kcal = typeof r.calories === 'number' ? r.calories : Number(r.calories);
          if (!Number.isFinite(kcal)) continue;
          if (typeof r.logged_at !== 'string' || r.logged_at.length < 10) continue;
          const key = r.logged_at.slice(0, 10);
          perDay.set(key, (perDay.get(key) ?? 0) + kcal);
        }

        if (perDay.size === 0) {
          setIntake(null);
          return;
        }
        let sum = 0;
        for (const total of perDay.values()) sum += total;
        setIntake(sum / perDay.size);
      } catch (error) {
        if (active) setIntake(null);
        safeLog.warn('EnergyBalanceTriangle', 'read failed, failing open', { error });
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  return intake;
}

// Neutral, supportive labels and one-line reads per balance state. No targets,
// no restriction language, no shaming.
const STATE_COPY: Record<BalanceState, { label: string; read: string }> = {
  deficit: {
    label: 'Trending down',
    read: 'Your recent trend points gently downward. This is a neutral observation of direction, not a target.',
  },
  surplus: {
    label: 'Trending up',
    read: 'Your recent trend points gently upward. This is a neutral observation of direction, not a target.',
  },
  maintenance: {
    label: 'Holding steady',
    read: 'Your inputs are reading as balanced over this window. Steady is a perfectly good place to be.',
  },
  insufficient_data: {
    label: 'Not enough data yet',
    read: 'Connect activity data and keep logging meals to complete this read. We will not estimate what we cannot measure.',
  },
};

function Vertex({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-white/[0.06] bg-[rgba(11,17,32,0.45)] px-2 py-2.5 text-center">
      <Icon
        className="h-4 w-4 shrink-0"
        strokeWidth={1.5}
        style={{ color: muted ? 'rgba(255,255,255,0.40)' : TEAL }}
      />
      <span className="text-[10px] uppercase tracking-wide text-white/45" style={{ fontFamily: DM_MONO }}>
        {label}
      </span>
      <span
        className="text-[13px] font-bold tabular-nums text-white/90"
        style={{ fontFamily: DM_SANS }}
      >
        {value}
      </span>
    </div>
  );
}

export function EnergyBalanceTriangle({ userId }: { userId: string | null }) {
  const intakeEstimate = useIntakeEstimate(userId);
  const { weightPoints } = useRecentBodySeries(userId);

  // Connected activity is flag-off / absent: expenditure is always null and is
  // never fabricated.
  const expenditureEstimate: number | null = null;

  const compositionTrend = useMemo<'rising' | 'falling' | 'flat' | null>(() => {
    if (weightPoints.length < 2) return null;
    return computeTrend(weightPoints).direction;
  }, [weightPoints]);

  const balanceState = useMemo(
    () =>
      deriveBalanceState({
        intakeEstimate,
        expenditureEstimate,
        compositionTrend,
      }),
    [intakeEstimate, expenditureEstimate, compositionTrend],
  );

  const copy = STATE_COPY[balanceState];

  const intakeText =
    typeof intakeEstimate === 'number' && Number.isFinite(intakeEstimate)
      ? `${Math.round(intakeEstimate)} kcal`
      : '--';
  const trendText =
    compositionTrend === 'rising'
      ? 'Up'
      : compositionTrend === 'falling'
        ? 'Down'
        : compositionTrend === 'flat'
          ? 'Flat'
          : '--';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <div className="flex items-center gap-2">
        <Triangle className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: TEAL }} />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: TEAL }}
          >
            Energy balance
          </span>
          <p className="text-[13px] text-white/65" style={{ fontFamily: DM_SANS }}>
            Intake, activity, and your body, read together.
          </p>
        </div>
      </div>

      {/* The three vertices. Activity is intentionally muted (not connected). */}
      <div className="flex items-stretch gap-2">
        <Vertex icon={Flame} label="Intake" value={intakeText} />
        <Vertex icon={Activity} label="Activity" value="--" muted />
        <Vertex icon={Scale} label="Body" value={trendText} />
      </div>

      {/* Balance state pill + supportive one-line read. */}
      <div className="flex flex-col gap-2">
        <span
          className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/85"
          style={{
            fontFamily: DM_SANS,
            background: 'rgba(45,165,160,0.12)',
            border: '1px solid rgba(45,165,160,0.24)',
          }}
        >
          {copy.label}
        </span>
        <p className="text-[12.5px] leading-relaxed text-white/65" style={{ fontFamily: DM_SANS }}>
          {copy.read}
        </p>
      </div>
    </div>
  );
}

export default EnergyBalanceTriangle;
