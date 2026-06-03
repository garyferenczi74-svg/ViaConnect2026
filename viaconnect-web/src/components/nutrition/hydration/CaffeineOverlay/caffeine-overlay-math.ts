// Prompt 172e Phase D Workstream 2: pure caffeine overlay math.
//
// Spec section 10: "Caffeine overlay (read only, from 171b): an optional
// timeline marker set showing caffeine relative to the user's sleep
// window, sourced from the existing model."
//
// Spec section 6: there is no second caffeine path and no recomputation
// of the 171b model here; this overlay supplies a graphical read of the
// same half life formula the 171b engine uses (caffeine_mg * 0.5^
// (hours_since / half_life_hours), half_life_hours = 5) to render the
// remaining caffeine at the user's sleep onset.
//
// This module is the pure math layer the CaffeineOverlay component
// renders over. Pure function: no Supabase reads, no clock reads, no
// env reads. The caller passes in nowIso so tests + UI render
// deterministically.
//
// 170c section 8 contract: this entire overlay is HIDDEN in safety mode.
// The math layer runs identically in both modes; the suppression
// happens at the CaffeineOverlay component layer which returns null
// when safetyMode is true.

const CAFFEINE_HALF_LIFE_HOURS = 5;

export interface CaffeineOverlayEvent {
  meal_id: string;
  caffeine_mg: number;
  logged_at: string;
}

export interface CaffeineMarker {
  meal_id: string;
  logged_at: string;
  caffeine_mg: number;
  /**
   * Hours from logged_at to nowIso. Positive when in the past. Useful
   * for the overlay component to position the marker on the timeline
   * relative to the current time and the day window.
   */
  hours_since_logged: number;
  /**
   * Estimated caffeine mg still present in the bloodstream at nowIso
   * given the 5 hour half life. Rounded to nearest whole mg.
   */
  mg_remaining_now: number;
}

export interface CaffeineSleepIndicator {
  sleep_start_iso: string;
  total_mg_remaining_at_sleep: number;
}

export interface CaffeineOverlayData {
  markers: ReadonlyArray<CaffeineMarker>;
  sleep_indicator: CaffeineSleepIndicator | null;
  total_caffeine_logged_today_mg: number;
}

/**
 * Compute the next occurrence of sleepStartHHMM (24h "HH:MM") at or
 * after nowIso. Returns the ISO string in UTC. Used so the indicator
 * always points to the upcoming sleep onset, even if the user has
 * logged caffeine after their stated sleep start time (in which case
 * the next sleep window is tomorrow).
 */
export function nextSleepOnsetIso(nowIso: string, sleepStartHHMM: string): string {
  const now = new Date(nowIso);
  if (Number.isNaN(now.getTime())) return nowIso;
  const match = sleepStartHHMM.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return nowIso;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return nowIso;
  const sleep = new Date(now);
  sleep.setUTCHours(hh, mm, 0, 0);
  if (sleep.getTime() <= now.getTime()) {
    sleep.setUTCDate(sleep.getUTCDate() + 1);
  }
  return sleep.toISOString();
}

function hoursBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function pctRemaining(hours: number): number {
  if (!Number.isFinite(hours) || hours < 0) return 1;
  return Math.pow(0.5, hours / CAFFEINE_HALF_LIFE_HOURS);
}

/**
 * Build the caffeine overlay markers + sleep indicator. Pure function;
 * caller threads the wall clock + sleep window in so tests render
 * deterministically.
 *
 * Inputs:
 *   - events: caffeinated meal_items with caffeine_mg > 0, logged_at ISO
 *   - nowIso: the wall clock anchor (typically new Date().toISOString())
 *   - sleepStartHHMM: the user's sleep_start time, "HH:MM" 24h
 *
 * Output:
 *   - markers: one entry per event with hours_since_logged + mg_remaining_now
 *   - sleep_indicator: total mg remaining at the next sleep onset (single
 *     "carryover at sleep" indicator the overlay surfaces alongside the
 *     marker dots per spec section 10). Null when sleep window is invalid.
 *   - total_caffeine_logged_today_mg: simple sum across events
 *
 * 170c contract: this function runs identically in both modes; the
 * overlay component returns null when safetyMode is true so neither
 * the markers nor the indicator render.
 */
export function buildCaffeineOverlay(
  events: ReadonlyArray<CaffeineOverlayEvent>,
  nowIso: string,
  sleepStartHHMM: string,
): CaffeineOverlayData {
  const sleepOnsetIso = nextSleepOnsetIso(nowIso, sleepStartHHMM);
  const sleepWindowOk = sleepOnsetIso !== nowIso || /\d{2}:\d{2}/.test(sleepStartHHMM);

  const markers: CaffeineMarker[] = [];
  let totalLogged = 0;
  let totalRemainingAtSleep = 0;

  for (const event of events) {
    const mg = Number(event.caffeine_mg);
    if (!Number.isFinite(mg) || mg <= 0) continue;
    if (typeof event.logged_at !== 'string' || event.logged_at.length === 0) continue;
    const hoursSince = hoursBetween(event.logged_at, nowIso);
    const remainingNow = mg * pctRemaining(hoursSince);
    markers.push({
      meal_id: event.meal_id,
      logged_at: event.logged_at,
      caffeine_mg: Math.round(mg),
      hours_since_logged: Math.round(hoursSince * 100) / 100,
      mg_remaining_now: Math.round(remainingNow),
    });
    totalLogged += mg;

    if (sleepWindowOk) {
      const hoursToSleep = hoursBetween(event.logged_at, sleepOnsetIso);
      const remainingAtSleep = mg * pctRemaining(hoursToSleep);
      totalRemainingAtSleep += remainingAtSleep;
    }
  }

  markers.sort((a, b) => a.logged_at.localeCompare(b.logged_at));

  return {
    markers,
    sleep_indicator: sleepWindowOk
      ? {
          sleep_start_iso: sleepOnsetIso,
          total_mg_remaining_at_sleep: Math.round(totalRemainingAtSleep),
        }
      : null,
    total_caffeine_logged_today_mg: Math.round(totalLogged),
  };
}
