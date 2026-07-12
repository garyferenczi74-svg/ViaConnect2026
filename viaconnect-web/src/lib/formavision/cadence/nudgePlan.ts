// Prompt 211a Workstream 4 (Part 2) - Cadence nudge PLANNER (pure logic).
//
// This is the node-safe, testable heart of the scan-cadence-nudge-tick cron.
// The Deno edge function (supabase/functions/scan-cadence-nudge-tick/index.ts)
// does the IO (select opt-in rows, read scan history, insert notifications) and
// this module makes the DECISIONS from plain data. Extracting the decisions
// keeps them:
//   * OPT-IN ONLY: the caller passes only opted-in users; the planner also
//     defends the invariant by skipping any row whose optIn is not true.
//   * IDEMPOTENT: given the set of trigger keys already sent, the planner emits
//     a nudge only for a NEW (user, day, due-date) key. Feed the same day twice
//     with the first pass's keys and the second pass plans nothing.
//   * CLOCK-DRIVEN (the W4-1 fix): overdue-ness is computed from the injected
//     nowMs via reminder.ts, so a different nowMs yields a different plan.
//   * HONEST: a user with too little history (no recommendation) is skipped, not
//     nudged on a fabricated cadence.

import { recommendCadence, type ScanHistoryEntry } from './recommend';
import { buildReminderDecision, buildNudgeBody, NUDGE_TITLE } from './reminder';

/** One opted-in user's inputs to the planner. */
export interface CadenceNudgeCandidate {
  userId: string;
  /** Must be true to be eligible. The planner double checks this invariant. */
  optIn: boolean;
  /** The user's own recent scan history (any order). */
  scanHistory: ScanHistoryEntry[];
}

/** A single planned nudge. The cron turns this into a user_notifications row. */
export interface PlannedNudge {
  userId: string;
  /** Idempotency key: per user, per due date, per UTC day of nowMs. */
  triggerKey: string;
  title: string;
  body: string;
  /** The nominal next-due date the nudge is for (metadata / audit). */
  nextDueDate: string;
  /** Whole days overdue at nowMs (positive). Coarse, for telemetry only. */
  daysOverdue: number;
}

/** Why a candidate was skipped (reason-tagged, for coarse telemetry / logs). */
export type NudgeSkipReason = 'not_opted_in' | 'thin_history' | 'not_overdue' | 'already_sent';

export interface CadenceNudgePlan {
  nudges: PlannedNudge[];
  /** Coarse per-reason skip counts. No user ids, no PII. */
  skipped: Record<NudgeSkipReason, number>;
}

/**
 * Plans the gentle nudges for one daily sweep. Pure and deterministic: the same
 * candidates, nowMs, and alreadySentKeys always produce the same plan.
 *
 * @param candidates Opted-in users with their scan history.
 * @param nowMs Injected clock (epoch ms). Drives overdue-ness and the per-day
 *   idempotency key, so a different nowMs yields a different plan.
 * @param alreadySentKeys The trigger keys already recorded in the nudge ledger
 *   (scan_calibration_nudges). A candidate whose computed key is in this set is
 *   skipped: this is the no-double-nudge guarantee.
 * @returns The plan: the nudges to send, plus coarse per-reason skip counts.
 */
export function planCadenceNudges(
  candidates: CadenceNudgeCandidate[],
  nowMs: number,
  alreadySentKeys: ReadonlySet<string>,
): CadenceNudgePlan {
  const nudges: PlannedNudge[] = [];
  const skipped: Record<NudgeSkipReason, number> = {
    not_opted_in: 0,
    thin_history: 0,
    not_overdue: 0,
    already_sent: 0,
  };

  for (const candidate of candidates) {
    // Defend the opt-in invariant even though the caller should pre-filter.
    if (candidate.optIn !== true) {
      skipped.not_opted_in += 1;
      continue;
    }

    // Honest cadence from the user's own history; null when too thin.
    const recommendation = recommendCadence(candidate.scanHistory, nowMs);
    if (recommendation === null) {
      skipped.thin_history += 1;
      continue;
    }

    // Overdue decision + idempotency key, both a function of nowMs.
    const decision = buildReminderDecision(candidate.userId, recommendation, nowMs);
    if (!decision.shouldNudge) {
      skipped.not_overdue += 1;
      continue;
    }

    // No-double-nudge: skip if this exact key was already sent (same day, same
    // user, same due date). A second pass on the same day plans nothing new.
    if (alreadySentKeys.has(decision.triggerKey)) {
      skipped.already_sent += 1;
      continue;
    }

    nudges.push({
      userId: candidate.userId,
      triggerKey: decision.triggerKey,
      title: NUDGE_TITLE,
      body: buildNudgeBody(recommendation),
      nextDueDate: recommendation.nextDueDate,
      daysOverdue: decision.overdue.daysOverdue,
    });
  }

  return { nudges, skipped };
}
