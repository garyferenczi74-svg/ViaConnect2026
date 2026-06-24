'use client';

/**
 * src/components/journey/today/TodayStats.tsx
 *
 * Section 3.3 "Today" stats tile grid (Prompt 208g Task G-T5).
 * Upgraded from 208d D-T6: each tile now renders value + target + slim
 * progress bar. SeverityToken wires the fill color for out-of-range stats.
 *
 * SAFETY INVARIANT (HARD LOCK):
 *   Steps / Active calories / Exercise / Sleep are wearable-connector data.
 *   The connector is OFF. These tiles NEVER show a fabricated value, target,
 *   or progress bar fill. Their track is an HONEST EMPTY TRACK (muted, no
 *   fill). Only Hydration (user-logged) gets a real value + target + filled
 *   bar. A fabricated stat value, target, or fill is a Critical failure.
 *
 * progressFraction: pure helper, exported for TDD.
 *   Returns value / target clamped to 0..1.
 *   Returns null when value is null, target is null, target <= 0, or either
 *   argument is non-finite.
 *
 * severityToken is wired to the fill path but is LATENT for this baseline
 * user (no real stat is outside a real healthy range). Do NOT invent ranges
 * for flag-off stats. Do NOT color hydration progress as out-of-range.
 *
 * SectionShell (eyebrow / title / icon) lives in YourJourneyPage.tsx; this
 * component renders only the inner tile grid. userId is accepted for API
 * symmetry; it is intentionally unused (_userId prefix documents this).
 *
 * Style: glass sub-panels, DM Sans text, DM Mono for small uppercase labels,
 * Lucide strokeWidth 1.5, muted white/35-65. Responsive: grid-cols-2 mobile,
 * sm:grid-cols-3 tablet+. Minimum 44px touch targets. Fail-open. No emojis,
 * no em/en-dashes, no new dependencies.
 */

import { Footprints, Flame, Dumbbell, Moon, Droplets, type LucideIcon } from 'lucide-react';
import { useHydrationToday } from '@/components/hydration/useHydrationToday';
import { formatVolumeLabel } from '@/components/hydration/HydrationRing';
import { severityToken, type SeverityTier } from '@/lib/genetics/severity';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// ---------------------------------------------------------------------------
// progressFraction
//
// Pure helper: value / target clamped to 0..1.
// Returns null for any invalid input (null, non-finite, target <= 0).
// Never throws. Exported for TDD (progressFraction.test.ts).
// ---------------------------------------------------------------------------

export function progressFraction(
  value: number | null,
  target: number | null,
): number | null {
  if (value === null || target === null) return null;
  if (!Number.isFinite(value) || !Number.isFinite(target)) return null;
  if (target <= 0) return null;
  return Math.min(1, Math.max(0, value / target));
}

// ---------------------------------------------------------------------------
// clamp01: internal clamp helper used by the bar width calculation.
// ---------------------------------------------------------------------------

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// ---------------------------------------------------------------------------
// StatTile
//
// Glass sub-panel: icon / label / value / optional sub-line / slim progress
// bar. Muted treatment for flag-off tiles (wearable not connected). When
// fraction is null (flag-off), the bar track renders with no fill (honest
// empty). When severityTier is set, the fill uses the severityToken accent
// color instead of teal (latent for this baseline user).
// ---------------------------------------------------------------------------

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  /** Muted treatment for flag-off tiles (wearable not connected). */
  muted?: boolean;
  /**
   * 0..1 progress fill. null (or absent) renders an honest empty track with
   * no fill. For flag-off tiles this must always be null / absent.
   */
  fraction?: number | null;
  /**
   * When set and fraction is non-null, the bar fill uses severityToken(tier)
   * accent classes instead of the default teal. ONLY pass when there is a real
   * value outside a real healthy range. Latent for this baseline user.
   */
  severityTier?: SeverityTier;
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  muted,
  fraction,
  severityTier,
}: StatTileProps) {
  const iconColor = muted ? 'rgba(255,255,255,0.35)' : TEAL;
  const valueColor = muted ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.90)';

  // Compute fill width only when fraction is a valid number.
  const hasFill = typeof fraction === 'number' && fraction !== null;
  const fillPct = hasFill ? `${clamp01(fraction as number) * 100}%` : '0%';

  // Severity fill class: use the accent border class as a background-color proxy.
  // severityToken returns Tailwind class strings; for the fill div we derive the
  // border-l color token and reuse it via inline style to avoid dynamic class issues.
  // The fill div uses a simple inline teal background by default; severity is latent.
  const severityFillStyle =
    hasFill && severityTier
      ? severityToken(severityTier).accent
      : '';

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

      {/* Slim progress track: always rendered (honest empty for flag-off). */}
      <div
        className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"
        role="progressbar"
        aria-valuenow={hasFill ? Math.round(clamp01(fraction as number) * 100) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={hasFill ? `${label} progress` : undefined}
        aria-hidden={!hasFill}
      >
        {hasFill ? (
          <div
            className={severityFillStyle || ''}
            style={{
              width: fillPct,
              height: '100%',
              borderRadius: 'inherit',
              backgroundColor: severityTier ? undefined : TEAL,
              transition: 'width 0.4s ease',
            }}
          />
        ) : null}
      </div>
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

  // progressFraction for hydration: real fill when both values are present.
  // severityTier is NOT passed for hydration (progress toward a target is not
  // out-of-range; do not force severity coloring here).
  const hydrationFraction = progressFraction(totalMl, targetMl);

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

      {/* LIVE: Hydration (user-logged intake - the only real value on this tile).
          fraction from progressFraction; no severityTier (progress is not out-of-range). */}
      <StatTile
        icon={Droplets}
        label="Hydration"
        value={hydrationValue}
        sub={hydrationSub}
        fraction={hydrationFraction}
      />
    </div>
  );
}

export default TodayStats;
