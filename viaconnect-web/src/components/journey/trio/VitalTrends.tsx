'use client';

/**
 * src/components/journey/trio/VitalTrends.tsx
 *
 * The vital-trends column for the Your Journey page (Prompt 208d, 3.6, Task
 * D-T4). A stack of vital rows:
 *
 *   - Hydration   LIVE: today's total vs target from useHydrationToday (the same
 *                 read the dashboard and nutrition surfaces use). A real value +
 *                 percentage. No fabricated series.
 *   - HRV / Resting HR / Respiratory / Blood Oxygen  Connected FLAG-OFF: the
 *                 wearable connector is off, so each row shows the metric name, an
 *                 honest "Not connected" value, and a muted FLAT sparkline. It
 *                 NEVER shows a fabricated value or delta.
 *
 * The sparklines reuse the D-T3 Sparkline (a flat / empty series renders a calm
 * muted baseline by construction, never a fake slope). severityToken is used
 * ONLY where a real value sits against a real range; the flag-off rows have no
 * value and no range, so they are never colored as in/out of range.
 *
 * Style: glass surface over Deep Navy, Teal #2DA5A0 accent, DM Sans, Lucide
 * strokeWidth 1.5, no emojis, no em/en-dashes, reduced-motion safe (Sparkline is
 * motionless). Fail-open, never throws.
 */

import {
  Droplets,
  HeartPulse,
  Heart,
  Wind,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { formatVolumeLabel } from '@/components/hydration/HydrationRing';
import { Sparkline } from '@/components/journey/progress/Sparkline';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';
const MUTED = 'rgba(255,255,255,0.40)';

interface VitalRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Optional secondary line (e.g. "of 1.9 L target" or "Not connected"). */
  sub?: string;
  /** Sparkline series. Empty -> calm muted flat baseline (no fabricated slope). */
  points: number[];
  /** Muted treatment for flag-off rows: greyed icon + faint sparkline. */
  muted?: boolean;
  ariaLabel: string;
}

function VitalRow({
  icon: Icon,
  label,
  value,
  sub,
  points,
  muted,
  ariaLabel,
}: VitalRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[rgba(11,17,32,0.45)] px-3 py-2.5">
      <Icon
        className="h-4 w-4 shrink-0"
        strokeWidth={1.5}
        style={{ color: muted ? MUTED : TEAL }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="text-[10px] uppercase tracking-wide text-white/45"
          style={{ fontFamily: DM_MONO }}
        >
          {label}
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums text-white/90"
          style={{ fontFamily: DM_SANS }}
        >
          {value}
        </span>
        {sub ? (
          <span
            className="text-[10.5px] leading-tight text-white/45"
            style={{ fontFamily: DM_SANS }}
          >
            {sub}
          </span>
        ) : null}
      </div>
      <div className="w-16 shrink-0">
        <Sparkline
          points={points}
          height={22}
          stroke={muted ? MUTED : TEAL}
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
  );
}

export function VitalTrends({ userId: _userId }: { userId: string | null }) {
  // Hydration is the one LIVE vital. useHydrationToday fails open to null (it
  // reads its own session, so it does not need userId). No data -> honest "--".
  const { data } = useHydrationToday();

  const totalMl =
    typeof data?.total_ml === 'number' && Number.isFinite(data.total_ml)
      ? data.total_ml
      : null;
  const targetMl =
    typeof data?.target_ml === 'number' && data.target_ml > 0
      ? data.target_ml
      : null;
  const pct =
    typeof data?.percentage_of_target === 'number' &&
    Number.isFinite(data.percentage_of_target)
      ? Math.round(data.percentage_of_target)
      : null;

  const hydrationValue = totalMl !== null ? formatVolumeLabel(totalMl) : '--';
  const hydrationSub =
    targetMl !== null
      ? `${pct !== null ? `${pct}% of ` : ''}${formatVolumeLabel(targetMl)} target`
      : 'No target set yet';

  // The four flag-off vitals: honest "Not connected", muted flat sparkline, and
  // NEVER a fabricated value or delta. An empty points array renders a calm
  // baseline.
  const NOT_CONNECTED = 'Not connected';
  const flagOff: Array<{ icon: LucideIcon; label: string; aria: string }> = [
    { icon: HeartPulse, label: 'HRV', aria: 'Heart rate variability, not connected' },
    { icon: Heart, label: 'Resting HR', aria: 'Resting heart rate, not connected' },
    { icon: Wind, label: 'Respiratory', aria: 'Respiratory rate, not connected' },
    { icon: Activity, label: 'Blood Oxygen', aria: 'Blood oxygen, not connected' },
  ];

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-4">
      <div className="flex items-center gap-2">
        <HeartPulse
          className="h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{ color: TEAL }}
        />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: DM_MONO, color: TEAL }}
          >
            Vital trends
          </span>
          <p
            className="text-[12px] text-white/65"
            style={{ fontFamily: DM_SANS }}
          >
            Hydration is live; vitals fill in with a wearable.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* LIVE: hydration. Real value + percentage, no fabricated series. */}
        <VitalRow
          icon={Droplets}
          label="Hydration"
          value={hydrationValue}
          sub={hydrationSub}
          points={[]}
          ariaLabel="Hydration today"
        />

        {/* Flag-off vitals: honest empty, muted, never fabricated. */}
        {flagOff.map((v) => (
          <VitalRow
            key={v.label}
            icon={v.icon}
            label={v.label}
            value={NOT_CONNECTED}
            points={[]}
            muted
            ariaLabel={v.aria}
          />
        ))}
      </div>
    </div>
  );
}

export default VitalTrends;
