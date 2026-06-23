'use client';

/**
 * src/components/journey/today/TodayStats.tsx
 *
 * Section 3.5 "Today" inner body (Prompt 208d Task D-T6).
 *
 * A responsive tile grid with five stat tiles:
 *   - Steps, Active calories, Exercise (min), Sleep: HONEST-EMPTY flag-off tiles
 *     (the wearable connector is OFF - these NEVER show a fabricated value).
 *   - Hydration: LIVE tile reading today's logged intake via useHydrationToday
 *     (user-logged data, not wearable). Honest "--" when null.
 *
 * SAFETY INVARIANT: Steps / Active calories / Exercise / Sleep are all
 * wearable-connector data. The connector is OFF. Each tile renders an honest
 * "Not connected" label and "--" value, never a fabricated number or delta.
 * Hydration is the ONLY tile with a real numeric value.
 *
 * SectionShell (eyebrow / title / icon) lives in YourJourneyPage.tsx; this
 * component renders only the inner body. `userId` is accepted for API symmetry
 * with the other section components even though useHydrationToday reads its own
 * session; it is intentionally unused (_userId prefix documents this).
 *
 * Style: glass sub-panels, DM Sans text, DM Mono for small uppercase labels,
 * Lucide strokeWidth 1.5, muted white/35-65. Responsive: grid-cols-2 on mobile,
 * sm:grid-cols-3 on tablet+. Minimum 44px touch targets. Fail-open (every read
 * degrades to honest-empty, never throws). No emojis, no em/en-dashes, no new
 * dependencies.
 *
 * Prompt 208d Task D-T6.
 */

import { Footprints, Flame, Dumbbell, Moon, Droplets, type LucideIcon } from 'lucide-react';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { formatVolumeLabel } from '@/components/hydration/HydrationRing';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// ---------------------------------------------------------------------------
// StatTile: a glass sub-panel with an icon, label, value, and optional sub-line.
// Used for both flag-off (muted) and live (teal) tiles.
// ---------------------------------------------------------------------------

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  /** Muted treatment for flag-off tiles (wearable not connected). */
  muted?: boolean;
}

function StatTile({ icon: Icon, label, value, sub, muted }: StatTileProps) {
  const iconColor = muted ? 'rgba(255,255,255,0.35)' : TEAL;
  const valueColor = muted ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.90)';

  return (
    <div
      className="flex min-h-[44px] flex-col gap-1 rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-3"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className="h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{ color: iconColor }}
          aria-hidden="true"
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ fontFamily: DM_MONO, color: iconColor }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-[15px] font-semibold tabular-nums leading-tight"
        style={{ fontFamily: DM_SANS, color: valueColor }}
      >
        {value}
      </span>
      {sub ? (
        <span
          className="text-[10px] leading-tight"
          style={{ fontFamily: DM_SANS, color: 'rgba(255,255,255,0.40)' }}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TodayStats
// ---------------------------------------------------------------------------

export function TodayStats({ userId: _userId }: { userId: string | null }) {
  // Hydration is the one LIVE stat. useHydrationToday fails open to null
  // (reads its own session, no userId needed). No data -> honest "--".
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

  // Honest "--" when no data; real formatted value when live data is present.
  const hydrationValue = totalMl !== null ? formatVolumeLabel(totalMl) : '--';
  const hydrationSub =
    targetMl !== null
      ? `${pct !== null ? `${pct}% of ` : ''}${formatVolumeLabel(targetMl)} target`
      : 'No target set yet';

  // Flag-off tiles: wearable connector is OFF. NEVER a fabricated value.
  const NOT_CONNECTED = 'Not connected';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {/* Flag-off: Steps (wearable - connector OFF) */}
      <StatTile
        icon={Footprints}
        label="Steps"
        value={NOT_CONNECTED}
        muted
      />

      {/* Flag-off: Active calories (wearable - connector OFF) */}
      <StatTile
        icon={Flame}
        label="Active calories"
        value={NOT_CONNECTED}
        muted
      />

      {/* Flag-off: Exercise minutes (wearable - connector OFF) */}
      <StatTile
        icon={Dumbbell}
        label="Exercise"
        value={NOT_CONNECTED}
        muted
      />

      {/* Flag-off: Sleep (wearable - connector OFF) */}
      <StatTile
        icon={Moon}
        label="Sleep"
        value={NOT_CONNECTED}
        muted
      />

      {/* LIVE: Hydration (user-logged intake - the only real value on this tile) */}
      <StatTile
        icon={Droplets}
        label="Hydration"
        value={hydrationValue}
        sub={hydrationSub}
      />
    </div>
  );
}

export default TodayStats;
