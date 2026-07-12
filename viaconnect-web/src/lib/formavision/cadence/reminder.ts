// Prompt 211a Workstream 4 (Part 2) - Scan reminder overdue math (pure logic).
//
// This is the Part 2 counterpart to recommend.ts. Where recommendCadence
// computes WHAT rhythm to suggest and WHEN the next scan is nominally due
// (anchored to the last scan, deliberately not to the clock), this module
// computes WHETHER a scan is overdue RIGHT NOW by comparing the injected clock
// (nowMs) against that nextDueDate. It is the genuine consumer of the injected
// clock: the result is a function of nowMs, so a different nowMs yields a
// different verdict.
//
// W4-1 REVIEW FIX (documented, load-bearing): recommend.ts accepted nowMs and
// then discarded it (void nowMs), so its "determinism" test compared two
// identical calls and could not have caught nowMs being ignored. The cadence
// nudge cron cannot decide who to nudge from recommend.ts alone, because
// "is this user due today" is a clock question. That clock math lives HERE and
// ACTUALLY reads nowMs. The accompanying test feeds two different nowMs values
// (one before the due date, one after) and asserts the overdue verdict differs,
// so it FAILS if nowMs is ever ignored again.
//
// Properties, matching the W4 contract:
//   * Pure and deterministic. The clock is injected as nowMs; there is no
//     Date.now() inside any function here. Same inputs => same output.
//   * Honest. It never invents urgency. A scan is overdue only when the clock
//     has actually passed the due date (plus an optional grace window). Before
//     that it is simply not due, and that is said plainly.
//   * Opt-in only in spirit: this module decides due-ness; it never nags. The
//     caller (the cron) surfaces a gentle nudge ONLY for users who opted in.

import type { CadenceRecommendation } from './recommend';
import { CADENCE_GRACE_DAYS } from './streak';

/** One calendar day in milliseconds. */
const ONE_DAY_MS = 86400000;

/**
 * Parses an ISO calendar date (YYYY-MM-DD) into the UTC-midnight epoch in ms.
 * Mirrors the parsing in streak.ts / recommend.ts (UTC midnight so a pure date
 * comparison is exact and timezone-free). Throws on a malformed date so a bad
 * caller fails loudly rather than silently producing a wrong nudge.
 */
function isoDateToUtcMidnightMs(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    throw new Error(`reminder: invalid ISO date "${isoDate}", expected YYYY-MM-DD`);
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * The verdict of the overdue check. All fields are a function of nowMs relative
 * to the due date, so a different nowMs produces a different result.
 */
export interface ReminderOverdue {
  /**
   * True when the injected clock has reached or passed the due date plus the
   * grace window. This is the value the cron gates the nudge on.
   */
  isOverdue: boolean;
  /**
   * Whole days between the due date and now. Positive when overdue (now is
   * after due), negative when the scan is not due yet, 0 on the due day. This
   * is derived directly from nowMs, so it is the honest "how late / how early".
   */
  daysOverdue: number;
}

/**
 * Computes whether a scan is overdue by comparing the injected clock (nowMs)
 * against the nominal due date. This function READS nowMs: the same nextDueDate
 * with a nowMs before the due date returns isOverdue=false, and with a nowMs
 * after it returns isOverdue=true. That difference is what the W4-1 review
 * required and what the test asserts.
 *
 * A small grace window (CADENCE_GRACE_DAYS, shared with the streak logic) is
 * allowed before a scan is considered overdue, so a user is never nudged the
 * very minute a due date ticks over. Life happens.
 *
 * @param nextDueDate ISO date (YYYY-MM-DD) the next scan is nominally due,
 *   typically CadenceRecommendation.nextDueDate.
 * @param nowMs Injected clock (epoch ms). The overdue verdict is a function of
 *   this value; there is no Date.now() inside.
 * @param graceDays Extra tolerance days before overdue trips. Defaults to the
 *   shared CADENCE_GRACE_DAYS so the reminder and the streak agree on grace.
 * @returns A ReminderOverdue verdict. Inputs are not mutated.
 */
export function isScanOverdue(
  nextDueDate: string,
  nowMs: number,
  graceDays: number = CADENCE_GRACE_DAYS,
): ReminderOverdue {
  const dueMs = isoDateToUtcMidnightMs(nextDueDate);
  // daysOverdue is driven ENTIRELY by nowMs: it is the signed day-distance from
  // the due date to the injected clock. This is the line that makes the whole
  // module a real function of nowMs (the W4-1 fix).
  const daysOverdue = Math.floor((nowMs - dueMs) / ONE_DAY_MS);
  const isOverdue = daysOverdue >= graceDays;
  return { isOverdue, daysOverdue };
}

/**
 * The decision the cron makes for a single opted-in user: given their cadence
 * recommendation and the injected clock, should a gentle nudge be sent, and
 * what stable key makes it idempotent for the day.
 */
export interface ReminderDecision {
  /** Whether to send a nudge now (true only when the scan is overdue per nowMs). */
  shouldNudge: boolean;
  /** The overdue verdict this decision is based on (carries daysOverdue). */
  overdue: ReminderOverdue;
  /**
   * Stable idempotency key for the nudge, namespaced by user, due date, and the
   * UTC day of nowMs. The same user on the same day for the same due date yields
   * the SAME key, so a second cron pass that day never double nudges. A later
   * day (a different nowMs) yields a different key, so a still-overdue user can
   * be gently reminded again on a later sweep, not spammed within a day.
   */
  triggerKey: string;
}

/**
 * Formats the UTC calendar day (YYYY-MM-DD) of an epoch-ms clock. Used only to
 * build the per-day idempotency key; it does not affect the overdue math.
 */
function utcDayString(nowMs: number): string {
  const d = new Date(nowMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds the reminder decision for one opted-in user from their cadence
 * recommendation and the injected clock. shouldNudge is true only when the scan
 * is overdue relative to nowMs, so this too is a genuine function of the clock.
 *
 * The triggerKey embeds the UTC day of nowMs so the cron is idempotent per
 * (user, day): calling twice on the same day produces the same key (no double
 * nudge), while a later day produces a new key (a gentle re-nudge is possible on
 * a subsequent sweep, never a same-day repeat).
 *
 * @param userId The user's id (namespaces the idempotency key).
 * @param recommendation The user's cadence recommendation (carries nextDueDate).
 * @param nowMs Injected clock (epoch ms).
 * @returns A ReminderDecision. Inputs are not mutated.
 */
export function buildReminderDecision(
  userId: string,
  recommendation: CadenceRecommendation,
  nowMs: number,
): ReminderDecision {
  const overdue = isScanOverdue(recommendation.nextDueDate, nowMs);
  const triggerKey = `scan_cadence:${userId}:${recommendation.nextDueDate}:${utcDayString(nowMs)}`;
  return {
    shouldNudge: overdue.isOverdue,
    overdue,
    triggerKey,
  };
}

/**
 * The gentle, Hannah-toned nudge copy for an overdue scan. Warm, never nagging,
 * zero dashes, no emojis. The reminder time bucket is the user's own historical
 * scan time (from the recommendation), so the copy reflects their real rhythm.
 *
 * Exported so the cron and any UI preview render the SAME words, and so a test
 * can assert the copy is dash-free without reaching into the cron.
 *
 * @param recommendation The user's cadence recommendation.
 * @returns A short, dash-free nudge body string.
 */
export function buildNudgeBody(recommendation: CadenceRecommendation): string {
  const when = recommendation.defaultReminderTimeOfDay;
  return (
    `Whenever you have a moment, a quick body scan keeps your progress picture honest. ` +
    `You usually scan in the ${when}, so if now feels right, I am here for it. No rush at all.`
  );
}

/** The gentle nudge title. Warm, dash-free, no emojis. */
export const NUDGE_TITLE = 'A gentle scan reminder';
