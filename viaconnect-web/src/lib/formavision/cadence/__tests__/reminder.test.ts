// Prompt 211a W4-2 - Tests for reminder.ts (scan reminder overdue math).
// TDD: written RED first (the module did not exist), then made GREEN.
//
// THE LOAD-BEARING TEST (W4-1 review fix): recommend.ts accepted nowMs and
// discarded it (void nowMs), so its determinism test compared two IDENTICAL
// calls and could never have failed if nowMs were ignored. The overdue math
// here ACTUALLY consumes nowMs. The first test below feeds two DIFFERENT nowMs
// values against the SAME due date and asserts the overdue verdict differs. If
// a future refactor were to drop nowMs from the math, that test fails loudly.
//
// The remaining tests cover the per-day idempotency key (same user + same day
// => same key => no double nudge; a later day => a new key) and the dash-free
// Hannah-toned copy.

import { describe, it, expect } from 'vitest';
import {
  isScanOverdue,
  buildReminderDecision,
  buildNudgeBody,
  NUDGE_TITLE,
} from '../reminder';
import { CADENCE_GRACE_DAYS } from '../streak';
import type { CadenceRecommendation } from '../recommend';

const NO_DASHES = /^[^–—]*$/;

// A fixed recommendation whose next scan is nominally due 2026-07-10.
const REC: CadenceRecommendation = {
  rhythm: 'weekly',
  nextDueDate: '2026-07-10',
  defaultReminderTimeOfDay: 'morning',
  isSuggestion: true,
  reason: 'You tend to scan about once a week in the morning.',
};

describe('isScanOverdue (the nowMs-consuming math, W4-1 fix)', () => {
  it('returns DIFFERENT overdue verdicts for two different nowMs values against the same due date (FAILS if nowMs is ignored)', () => {
    // Well before the due date + grace: not overdue.
    const before = isScanOverdue('2026-07-10', Date.UTC(2026, 6, 1));
    // Well after the due date + grace: overdue.
    const after = isScanOverdue('2026-07-10', Date.UTC(2026, 6, 20));

    // The whole point: the verdict is a function of nowMs. If nowMs were
    // discarded (as recommend.ts did with void nowMs), these two would be equal
    // and this assertion would fail.
    expect(before.isOverdue).toBe(false);
    expect(after.isOverdue).toBe(true);
    expect(before.isOverdue).not.toBe(after.isOverdue);
    // daysOverdue is signed and driven by nowMs: negative before, positive after.
    expect(before.daysOverdue).toBeLessThan(0);
    expect(after.daysOverdue).toBeGreaterThan(0);
    expect(after.daysOverdue).not.toBe(before.daysOverdue);
  });

  it('is not overdue during the grace window just after the due date', () => {
    // One day past due, grace is CADENCE_GRACE_DAYS (2): still within grace.
    const within = isScanOverdue('2026-07-10', Date.UTC(2026, 6, 11));
    expect(within.daysOverdue).toBe(1);
    expect(within.isOverdue).toBe(false);
    // Exactly at the grace boundary flips to overdue.
    const atBoundary = isScanOverdue('2026-07-10', Date.UTC(2026, 6, 10 + CADENCE_GRACE_DAYS));
    expect(atBoundary.daysOverdue).toBe(CADENCE_GRACE_DAYS);
    expect(atBoundary.isOverdue).toBe(true);
  });

  it('is deterministic: same due date and same nowMs always give the same verdict', () => {
    const a = isScanOverdue('2026-07-10', Date.UTC(2026, 6, 20));
    const b = isScanOverdue('2026-07-10', Date.UTC(2026, 6, 20));
    expect(a).toEqual(b);
  });

  it('throws loudly on a malformed due date rather than nudging on garbage', () => {
    expect(() => isScanOverdue('2026/07/10', Date.UTC(2026, 6, 20))).toThrow();
  });
});

describe('buildReminderDecision (per-user, per-day idempotency)', () => {
  it('shouldNudge is a function of nowMs: false before due, true after', () => {
    const before = buildReminderDecision('user-1', REC, Date.UTC(2026, 6, 1));
    const after = buildReminderDecision('user-1', REC, Date.UTC(2026, 6, 20));
    expect(before.shouldNudge).toBe(false);
    expect(after.shouldNudge).toBe(true);
  });

  it('produces the SAME trigger key for the same user on the same UTC day (no double nudge)', () => {
    // Two different clock instants on the same UTC day (09:00 and 18:00).
    const morning = buildReminderDecision('user-1', REC, Date.UTC(2026, 6, 20, 9, 0));
    const evening = buildReminderDecision('user-1', REC, Date.UTC(2026, 6, 20, 18, 0));
    expect(morning.triggerKey).toBe(evening.triggerKey);
  });

  it('produces a DIFFERENT trigger key on a later day (a gentle re-nudge is possible, never same-day)', () => {
    const day20 = buildReminderDecision('user-1', REC, Date.UTC(2026, 6, 20));
    const day21 = buildReminderDecision('user-1', REC, Date.UTC(2026, 6, 21));
    expect(day20.triggerKey).not.toBe(day21.triggerKey);
  });

  it('namespaces the trigger key by user so two users never collide', () => {
    const u1 = buildReminderDecision('user-1', REC, Date.UTC(2026, 6, 20));
    const u2 = buildReminderDecision('user-2', REC, Date.UTC(2026, 6, 20));
    expect(u1.triggerKey).not.toBe(u2.triggerKey);
  });
});

describe('nudge copy (Hannah tone, dash-free, no emojis)', () => {
  it('the nudge body and title are dash-free', () => {
    expect(buildNudgeBody(REC)).toMatch(NO_DASHES);
    expect(NUDGE_TITLE).toMatch(NO_DASHES);
  });

  it('the nudge body reflects the user own historical scan time, not a generic', () => {
    const eveningRec: CadenceRecommendation = { ...REC, defaultReminderTimeOfDay: 'evening' };
    expect(buildNudgeBody(eveningRec)).toContain('evening');
  });

  it('the nudge body carries no emoji', () => {
    // Coarse emoji sweep: no code points in the common emoji planes.
    const body = buildNudgeBody(REC);
    expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(body)).toBe(false);
  });
});
