// Prompt 211a W4-2 - Tests for nudgePlan.ts (the cron's pure decision core).
// TDD: written RED first (the module did not exist), then made GREEN.
//
// These cover the two cron guarantees the prompt names:
//   1. IDEMPOTENCY: same user + same day => no double nudge. We run the planner
//      once, feed its emitted trigger key back as "already sent", and assert the
//      second pass on the same day plans nothing.
//   2. OPT-IN ONLY selection: a candidate with optIn=false is never nudged.
// Plus the clock-driven property (a different nowMs yields a different plan),
// the honest thin-history skip, and dash-free copy.
//
// Supabase is not touched: the planner is pure and takes plain data, exactly as
// the Deno cron feeds it after its selects. No live scan_streak table needed.

import { describe, it, expect } from 'vitest';
import { planCadenceNudges, type CadenceNudgeCandidate } from '../nudgePlan';
import type { ScanHistoryEntry } from '../recommend';

const NO_DASHES = /^[^–—]*$/;

// A weekly-morning scanner whose last scan was 2026-06-26 -> next due 2026-07-03.
const WEEKLY_MORNING: ScanHistoryEntry[] = [
  { scanDate: '2026-06-05', timeOfDay: 'morning' },
  { scanDate: '2026-06-12', timeOfDay: 'morning' },
  { scanDate: '2026-06-19', timeOfDay: 'morning' },
  { scanDate: '2026-06-26', timeOfDay: 'morning' },
];

// A clock well past the due date + grace, so the user is overdue.
const NOW_OVERDUE = Date.UTC(2026, 6, 20);
// A clock before the due date, so the user is not yet due.
const NOW_EARLY = Date.UTC(2026, 6, 1);

const OPTED_IN: CadenceNudgeCandidate = {
  userId: 'user-1',
  optIn: true,
  scanHistory: WEEKLY_MORNING,
};

describe('planCadenceNudges: opt-in-only selection', () => {
  it('nudges an opted-in, overdue user', () => {
    const plan = planCadenceNudges([OPTED_IN], NOW_OVERDUE, new Set());
    expect(plan.nudges).toHaveLength(1);
    expect(plan.nudges[0].userId).toBe('user-1');
  });

  it('NEVER nudges a user who did not opt in (opt-in only, never nag)', () => {
    const notOptedIn: CadenceNudgeCandidate = { ...OPTED_IN, userId: 'user-2', optIn: false };
    const plan = planCadenceNudges([OPTED_IN, notOptedIn], NOW_OVERDUE, new Set());
    // Only the opted-in user is nudged; the opted-out user is skipped for that reason.
    expect(plan.nudges.map((n) => n.userId)).toEqual(['user-1']);
    expect(plan.skipped.not_opted_in).toBe(1);
  });
});

describe('planCadenceNudges: idempotency (same user + same day => no double nudge)', () => {
  it('a second pass on the same day with the first pass key already sent plans nothing', () => {
    // First sweep of the day: one nudge planned.
    const first = planCadenceNudges([OPTED_IN], NOW_OVERDUE, new Set());
    expect(first.nudges).toHaveLength(1);
    const sentKey = first.nudges[0].triggerKey;

    // Second sweep, SAME UTC day, with the first pass's key recorded in the
    // ledger. No double nudge.
    const laterSameDay = Date.UTC(2026, 6, 20, 18, 30);
    const second = planCadenceNudges([OPTED_IN], laterSameDay, new Set([sentKey]));
    expect(second.nudges).toHaveLength(0);
    expect(second.skipped.already_sent).toBe(1);
  });

  it('a later day (new key) can gently re-nudge a still-overdue user', () => {
    const first = planCadenceNudges([OPTED_IN], NOW_OVERDUE, new Set());
    const sentKey = first.nudges[0].triggerKey;
    // Next day, still overdue, prior day key already sent: a NEW key is planned.
    const nextDay = Date.UTC(2026, 6, 21);
    const second = planCadenceNudges([OPTED_IN], nextDay, new Set([sentKey]));
    expect(second.nudges).toHaveLength(1);
    expect(second.nudges[0].triggerKey).not.toBe(sentKey);
  });
});

describe('planCadenceNudges: clock-driven and honest', () => {
  it('is a function of nowMs: an early clock nudges nobody, an overdue clock nudges', () => {
    const early = planCadenceNudges([OPTED_IN], NOW_EARLY, new Set());
    const overdue = planCadenceNudges([OPTED_IN], NOW_OVERDUE, new Set());
    expect(early.nudges).toHaveLength(0);
    expect(early.skipped.not_overdue).toBe(1);
    expect(overdue.nudges).toHaveLength(1);
  });

  it('skips a user with too little history rather than nudging on a fabricated cadence', () => {
    const thin: CadenceNudgeCandidate = {
      userId: 'user-thin',
      optIn: true,
      scanHistory: WEEKLY_MORNING.slice(0, 2), // below MIN_HISTORY_FOR_CADENCE
    };
    const plan = planCadenceNudges([thin], NOW_OVERDUE, new Set());
    expect(plan.nudges).toHaveLength(0);
    expect(plan.skipped.thin_history).toBe(1);
  });

  it('the planned nudge copy is dash-free and reflects the user historical scan time', () => {
    const plan = planCadenceNudges([OPTED_IN], NOW_OVERDUE, new Set());
    const nudge = plan.nudges[0];
    expect(nudge.title).toMatch(NO_DASHES);
    expect(nudge.body).toMatch(NO_DASHES);
    expect(nudge.body).toContain('morning'); // their dominant historical time
  });
});
