// tests/schema/mailer-prearm-logic.test.ts
//
// Prompt 210f Task F4 (BUILD). Pure-module tests for the practitioner
// waitlist mailer pre-arm hardening logic. The module under test,
// supabase/functions/practitioner-waitlist-mailer/mailer-logic.ts, is a
// sibling of the Deno edge function entrypoint but contains NO Deno globals
// and NO imports, so vitest (node) exercises it directly. Deno CLI is not
// installed in this environment; the entrypoint itself is validated with a
// scoped parse-only tsc pass (see docs/integrity/f4-prearm-checklist.md).
//
// Written red-first: this file failed to resolve the module before
// mailer-logic.ts existed.

import { describe, expect, it } from 'vitest';
import {
  CANDIDATE_STEP,
  DAILY_CAP,
  FLOOR_TIMESTAMP,
  MAILER_FLAG_ID,
  MAX_ATTEMPTS,
  PER_RUN_CAP,
  RUN_SOFT_DEADLINE_MS,
  STUCK_CLAIM_MINUTES,
  claimConfirmed,
  claimTransition,
  isWithinCandidateWindow,
  mailerEnabled,
  nextRetryStatus,
  runBudget,
  shouldStopForDeadline,
  stuckCutoffIso,
  utcDayStart,
} from '../../supabase/functions/practitioner-waitlist-mailer/mailer-logic';

// ---------------------------------------------------------------------------
// Section 3.2 checklist item: IDEMPOTENCY (proven by test)
// ---------------------------------------------------------------------------

describe('idempotency: claim-before-send state machine', () => {
  it('claim-before-send: only a pending row is claimable; claimed, sent, failed, and skipped rows can never be claimed again (no double-send across restarts or retries)', () => {
    // The claim is executed in SQL as a compare-and-swap:
    //   UPDATE ... SET status = 'sending' WHERE id = X AND status = 'pending'
    //   RETURNING id
    // claimTransition is the pure mirror of that WHERE clause.
    expect(claimTransition('pending')).toBe('claim');

    // Every non-pending state is unclaimable. In particular 'sending' means
    // a prior run claimed the row and may or may not have sent the email:
    // re-sending would risk a duplicate, so the row is never claimed again.
    expect(claimTransition('sending')).toBe('skip');
    expect(claimTransition('sent')).toBe('skip');
    expect(claimTransition('failed')).toBe('skip');
    expect(claimTransition('skipped')).toBe('skip');

    // Unknown or corrupt states fail closed: never claim.
    expect(claimTransition('')).toBe('skip');
    expect(claimTransition('PENDING')).toBe('skip');
    expect(claimTransition('resend')).toBe('skip');
  });

  it('claimConfirmed accepts exactly one returned row: zero means the compare-and-swap lost the race and the send must not proceed', () => {
    expect(claimConfirmed(1)).toBe(true);
    // 0 rows returned: another worker claimed it first, or the status
    // changed between candidate select and claim. Do not send.
    expect(claimConfirmed(0)).toBe(false);
    // More than one row is impossible (id is the primary key) but if it
    // ever happened something is deeply wrong: fail closed, do not send.
    expect(claimConfirmed(2)).toBe(false);
    expect(claimConfirmed(-1)).toBe(false);
  });

  it('crash between claim and send: the sending row is not re-claimable, and the stuck-claim cutoff surfaces it in the health report instead of silently resending or dropping it', () => {
    // A crash after the claim write but before the SMTP send leaves the row
    // at status 'sending'. The candidate query selects only 'pending', and
    // claimTransition refuses 'sending', so the row is NEVER auto-resent.
    expect(claimTransition('sending')).toBe('skip');

    // It is also never silently dropped: the run start health scan counts
    // rows with status = 'sending' AND updated_at < stuckCutoffIso(now).
    const cutoff = stuckCutoffIso('2026-07-08T12:00:00.000Z');
    expect(cutoff).toBe('2026-07-08T11:30:00.000Z');

    // A row claimed 31 minutes ago sorts before the cutoff (stuck, counted);
    // a row claimed 5 minutes ago does not (still in flight).
    expect('2026-07-08T11:29:00.000Z' < cutoff).toBe(true);
    expect('2026-07-08T11:55:00.000Z' < cutoff).toBe(false);
  });

  it('stuckCutoffIso rejects an unparseable timestamp instead of producing a silent wrong cutoff', () => {
    expect(() => stuckCutoffIso('not-a-timestamp')).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Section 3.2 checklist item: CAPS
// ---------------------------------------------------------------------------

describe('caps: per-run and daily budget math', () => {
  it('pins the cap constants the checklist promises', () => {
    expect(PER_RUN_CAP).toBe(25);
    expect(DAILY_CAP).toBe(200);
    expect(MAX_ATTEMPTS).toBe(5);
    expect(STUCK_CLAIM_MINUTES).toBe(30);
  });

  it('allows a full run while the daily budget is untouched', () => {
    expect(runBudget(0)).toEqual({ allowed: 25, reason: 'ok' });
  });

  it('shrinks the run to the remaining daily allowance near the cap', () => {
    expect(runBudget(190)).toEqual({ allowed: 10, reason: 'ok' });
    expect(runBudget(199)).toEqual({ allowed: 1, reason: 'ok' });
  });

  it('stops entirely at or beyond the daily cap with a stated reason', () => {
    expect(runBudget(200)).toEqual({ allowed: 0, reason: 'daily_cap_reached' });
    expect(runBudget(250)).toEqual({ allowed: 0, reason: 'daily_cap_reached' });
  });

  it('never allows more than the per-run cap even with a huge daily remainder', () => {
    expect(runBudget(0, 1000000, 25)).toEqual({ allowed: 25, reason: 'ok' });
  });

  it('treats a negative sent-today count as zero rather than inflating the budget', () => {
    expect(runBudget(-5)).toEqual({ allowed: 25, reason: 'ok' });
  });

  it('utcDayStart floors an ISO instant to midnight UTC for the sent-today count', () => {
    expect(utcDayStart('2026-07-08T15:42:11.123Z')).toBe('2026-07-08T00:00:00.000Z');
    expect(utcDayStart('2026-07-08T00:00:00.000Z')).toBe('2026-07-08T00:00:00.000Z');
    expect(() => utcDayStart('yesterday')).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Section 3.2 checklist item: SCOPE CONTROL (candidate-window floor)
// ---------------------------------------------------------------------------

describe('scope control: candidate-window floor', () => {
  it('pins the floor to the F3 apply date so no historical sweep is possible', () => {
    expect(FLOOR_TIMESTAMP).toBe('2026-07-08T00:00:00Z');
    expect(CANDIDATE_STEP).toBe(1);
  });

  it('admits only rows created at or after the floor', () => {
    expect(isWithinCandidateWindow('2026-07-08T00:00:00Z')).toBe(true);
    expect(isWithinCandidateWindow('2026-07-09T08:30:00.000Z')).toBe(true);
    expect(isWithinCandidateWindow('2026-07-07T23:59:59.999Z')).toBe(false);
    expect(isWithinCandidateWindow('2020-01-01T00:00:00Z')).toBe(false);
  });

  it('fails closed on unparseable timestamps: excluded, never sent', () => {
    expect(isWithinCandidateWindow('')).toBe(false);
    expect(isWithinCandidateWindow('not-a-date')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Section 3.2 checklist item: KILL SWITCH
// ---------------------------------------------------------------------------

describe('kill switch: features flag row decision', () => {
  it('pins the flag id the arming step seeds', () => {
    expect(MAILER_FLAG_ID).toBe('practitioner_waitlist_mailer');
  });

  it('is disabled (fail-closed) when the flag row is missing: the function is inert even if deployed before arming', () => {
    expect(mailerEnabled(null)).toEqual({ enabled: false, reason: 'flag_row_missing' });
    expect(mailerEnabled(undefined)).toEqual({ enabled: false, reason: 'flag_row_missing' });
  });

  it('is disabled the instant kill_switch_engaged is set, regardless of is_active', () => {
    expect(mailerEnabled({ is_active: true, kill_switch_engaged: true })).toEqual({
      enabled: false,
      reason: 'kill_switch_engaged',
    });
    expect(mailerEnabled({ is_active: false, kill_switch_engaged: true })).toEqual({
      enabled: false,
      reason: 'kill_switch_engaged',
    });
  });

  it('is disabled when is_active is anything but true (null and false both fail closed)', () => {
    expect(mailerEnabled({ is_active: false, kill_switch_engaged: false })).toEqual({
      enabled: false,
      reason: 'flag_inactive',
    });
    expect(mailerEnabled({ is_active: null, kill_switch_engaged: false })).toEqual({
      enabled: false,
      reason: 'flag_inactive',
    });
  });

  it('is enabled only for an active row with the kill switch disengaged', () => {
    expect(mailerEnabled({ is_active: true, kill_switch_engaged: false })).toEqual({
      enabled: true,
      reason: 'enabled',
    });
    expect(mailerEnabled({ is_active: true, kill_switch_engaged: null })).toEqual({
      enabled: true,
      reason: 'enabled',
    });
  });
});

// ---------------------------------------------------------------------------
// Resilience: retry accounting and the run soft deadline
// ---------------------------------------------------------------------------

describe('resilience: retry status and soft deadline', () => {
  it('returns pending for retryable attempts and failed at the attempt ceiling', () => {
    expect(nextRetryStatus(1)).toBe('pending');
    expect(nextRetryStatus(4)).toBe('pending');
    expect(nextRetryStatus(5)).toBe('failed');
    expect(nextRetryStatus(6)).toBe('failed');
  });

  it('stops the loop once the soft deadline elapses so remaining rows stay pending for the next tick', () => {
    expect(RUN_SOFT_DEADLINE_MS).toBe(120000);
    const start = 1000000;
    expect(shouldStopForDeadline(start, start + 119999)).toBe(false);
    expect(shouldStopForDeadline(start, start + 120000)).toBe(true);
    expect(shouldStopForDeadline(start, start + 500000)).toBe(true);
  });
});
