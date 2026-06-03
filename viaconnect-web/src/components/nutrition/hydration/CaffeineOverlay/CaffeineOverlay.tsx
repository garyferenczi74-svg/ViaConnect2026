// Prompt 172e Phase D Workstream 2: CaffeineOverlay component.
//
// Spec section 10: "Caffeine overlay (read only, from 171b): an optional
// timeline marker set showing caffeine relative to the user's sleep
// window, sourced from the existing model."
//
// Spec section 8: caffeine milligrams are suppressed in safety mode and
// the overlay (which surfaces caffeine_mg in a graphical way) is
// suppression worthy. Per 170c section 8.4 silent UX hard requirement,
// the absence is the same shape as "user has no caffeine data": the
// component returns null without a visible marker that the overlay
// would otherwise have appeared.
//
// Renders a small inline timeline of markers (one per caffeine intake
// event during the user's local day) plus a single "remaining at sleep
// onset" indicator. Uses the same 5 hour half life formula the 171b
// engine uses but does not recompute the 171b BOS scoring; this is a
// read only visual overlay per spec section 6.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSafetyMode } from '@/lib/safety-mode/useSafetyMode';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import {
  buildCaffeineOverlay,
  type CaffeineOverlayEvent,
} from './caffeine-overlay-math';

export interface CaffeineOverlayProps {
  /**
   * Caffeinated meal_items the parent reads from meal_items.caffeine_mg
   * for the user's local day. The page composes this from the already
   * loaded today events filtered to caffeine_mg > 0.
   */
  events: ReadonlyArray<CaffeineOverlayEvent>;
  /**
   * The user's sleep_start time in HH:MM 24h. The page reads it from
   * the existing profiles.sleep_start column (per 171b migration
   * 20260601000010); when null we pass the 23:00 default. The overlay
   * surfaces the next occurrence of this time as the "sleep onset"
   * indicator anchor.
   */
  sleepStartHHMM: string;
}

export function CaffeineOverlay({ events, sleepStartHHMM }: CaffeineOverlayProps): JSX.Element | null {
  // Kill switch: silent unmount. Same family as the catalog picker.
  const enabled = isKillSwitchEnabled('BEVERAGE_CATALOG_RENDERING_ENABLED');

  const safety = useSafetyMode();
  const variant: HydrationMicrocopyVariant = safety.enabled ? 'safety_mode' : 'normal';

  // Wall clock anchor. Set once on mount + refresh per minute so the
  // half life math reflects current time without jittery re renders.
  // useState lazy initializer so SSR + first client render align.
  const [nowIso, setNowIso] = useState<string>(() => new Date().toISOString());
  useEffect(() => {
    const interval = setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const overlay = useMemo(
    () => buildCaffeineOverlay(events, nowIso, sleepStartHHMM),
    [events, nowIso, sleepStartHHMM],
  );

  // Safety mode: silent unmount. Per spec section 8 + 170c section 8.4,
  // the absence is the same shape as "no caffeine data" so the surface
  // gives no visible cue that safety mode is suppressing the overlay.
  if (safety.enabled) return null;
  if (!enabled) return null;

  // Empty data: render nothing rather than an "no caffeine today" line.
  // The caffeine overlay is a graphical signal; absence is meaningful
  // (the user did not log caffeine) and no chrome is needed.
  if (overlay.markers.length === 0) return null;

  const label = getHydrationMicrocopy('hydration.caffeine_overlay.label', variant);
  const sleepLabel = getHydrationMicrocopy('hydration.caffeine_overlay.sleep_indicator_label', variant);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-white/55">
        <span>{label}</span>
        {overlay.sleep_indicator ? (
          <span>
            <span className="text-white/45">{sleepLabel}</span>{' '}
            <span className="text-white/85">{overlay.sleep_indicator.total_mg_remaining_at_sleep} mg</span>
          </span>
        ) : null}
      </div>

      {/* Timeline rail: each marker rendered as a small dot positioned
          by hour of day. The rail spans midnight to midnight; the
          markers' positions are derived from logged_at's UTC hour. */}
      <div
        role="img"
        aria-label="Caffeine intake markers across today"
        className="relative h-2 w-full rounded-full bg-white/[0.04]"
      >
        {overlay.markers.map((marker) => {
          const date = new Date(marker.logged_at);
          const hour = Number.isNaN(date.getTime())
            ? 0
            : date.getUTCHours() + date.getUTCMinutes() / 60;
          const leftPct = (hour / 24) * 100;
          return (
            <span
              key={marker.meal_id}
              aria-label={`${marker.caffeine_mg} mg caffeine`}
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B75E18]"
              style={{ left: `${leftPct}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
