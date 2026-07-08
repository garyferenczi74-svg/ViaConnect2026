// =============================================================================
// practitioner-waitlist-mailer: pure pre-arm decision logic
// =============================================================================
// Prompt 210f Task F4 (BUILD). Every send/claim/cap/kill-switch decision the
// edge function makes lives here as a pure function so vitest (node) can
// prove the Section 3.2 checklist without a Deno runtime.
//
// HARD CONSTRAINTS ON THIS FILE:
//   - NO imports. NO Deno globals. NO I/O. Pure functions and constants only.
//   - index.ts (Deno) imports it as './mailer-logic.ts';
//     tests/schema/mailer-prearm-logic.test.ts (vitest/node) imports it
//     extensionless. Both must keep working.
//
// Checklist mapping (docs/integrity/f4-prearm-checklist.md):
//   IDEMPOTENCY   claimTransition, claimConfirmed, stuckCutoffIso
//   CAPS          PER_RUN_CAP, DAILY_CAP, runBudget, utcDayStart
//   KILL SWITCH   MAILER_FLAG_ID, mailerEnabled
//   SCOPE CONTROL FLOOR_TIMESTAMP, CANDIDATE_STEP, isWithinCandidateWindow
//   RESILIENCE    MAX_ATTEMPTS, nextRetryStatus, RUN_SOFT_DEADLINE_MS,
//                 shouldStopForDeadline
// =============================================================================

// ---------------------------------------------------------------------------
// CAPS: module constants (Section 3.2 item b)
// ---------------------------------------------------------------------------

/** Maximum queue rows one cron tick may claim and attempt to send. */
export const PER_RUN_CAP = 25;

/** Maximum emails marked sent per UTC day across all ticks. */
export const DAILY_CAP = 200;

// ---------------------------------------------------------------------------
// SCOPE CONTROL: candidate window (Section 3.2 item d)
// ---------------------------------------------------------------------------

/**
 * Candidate floor = the F3 tranche apply date. The queue table itself was
 * created on this date, so no earlier rows can exist; the query filter is
 * defense in depth against any future backfill or import of historical
 * leads. No historical sweep is possible by construction.
 */
export const FLOOR_TIMESTAMP = '2026-07-08T00:00:00Z';

/**
 * Only the welcome step is armed. On practitioner_email_queue the column is
 * `step` (CHECK step BETWEEN 1 AND 6); the similarly named
 * practitioner_waitlist.email_sequence_step is the per-lead progress marker,
 * not the queue column. The ONLY writer of step = 1 rows is the F3
 * AFTER INSERT trigger tg_practitioner_waitlist_enqueue_welcome, which fires
 * once per voluntary public application form submission.
 */
export const CANDIDATE_STEP = 1;

// ---------------------------------------------------------------------------
// KILL SWITCH: features flag row (Section 3.2 item c)
// ---------------------------------------------------------------------------

/**
 * KILL SWITCH MECHANISM (read this before arming):
 * The mailer reads public.features (live table, text id primary key) for the
 * row id = MAILER_FLAG_ID and runs only when that row exists with
 * is_active = true AND kill_switch_engaged = false. Missing row, read error,
 * or engaged switch all FAIL CLOSED: the run exits before any candidate
 * query and queue rows stay pending, so a deployed-but-unarmed function is
 * inert. Single instant disable:
 *   UPDATE public.features
 *      SET kill_switch_engaged = true,
 *          kill_switch_engaged_at = now(),
 *          kill_switch_reason = '<why>'
 *    WHERE id = 'practitioner_waitlist_mailer';
 * Arming seeds the row with is_active = true (see the F4 arming steps in
 * docs/integrity/f4-prearm-checklist.md).
 */
export const MAILER_FLAG_ID = 'practitioner_waitlist_mailer';

export interface MailerFlagRow {
  is_active: boolean | null;
  kill_switch_engaged: boolean | null;
}

export interface FlagDecision {
  enabled: boolean;
  reason: 'enabled' | 'flag_row_missing' | 'kill_switch_engaged' | 'flag_inactive';
}

/**
 * Pure kill-switch decision. Fail-closed: only an existing row with
 * is_active strictly true and kill_switch_engaged not true enables the run.
 */
export function mailerEnabled(row: MailerFlagRow | null | undefined): FlagDecision {
  if (!row) return { enabled: false, reason: 'flag_row_missing' };
  if (row.kill_switch_engaged === true) return { enabled: false, reason: 'kill_switch_engaged' };
  if (row.is_active !== true) return { enabled: false, reason: 'flag_inactive' };
  return { enabled: true, reason: 'enabled' };
}

// ---------------------------------------------------------------------------
// IDEMPOTENCY: claim-before-send (Section 3.2 item a)
// ---------------------------------------------------------------------------

export type ClaimDecision = 'claim' | 'skip';

/**
 * Pure mirror of the SQL compare-and-swap WHERE clause:
 *   UPDATE practitioner_email_queue
 *      SET status = 'sending', attempts = attempts + 1, updated_at = now()
 *    WHERE id = <row> AND status = 'pending'
 *   RETURNING id
 * Only 'pending' is claimable. 'sending' means a prior run claimed the row
 * and may or may not have sent the email; re-claiming would risk a duplicate
 * send, so it is never claimed again (it surfaces via the stuck-claim scan
 * instead). All terminal and unknown states fail closed.
 */
export function claimTransition(status: string): ClaimDecision {
  return status === 'pending' ? 'claim' : 'skip';
}

/**
 * Interprets the compare-and-swap result. Exactly one returned row proves
 * this run owns the claim. Zero rows means the race was lost (another tick
 * claimed it, or the status changed): do not send. Anything else is
 * impossible (id is the primary key) and fails closed.
 */
export function claimConfirmed(returnedRowCount: number): boolean {
  return returnedRowCount === 1;
}

/**
 * Minutes after which a row still at status 'sending' counts as a stuck
 * claim (crash between claim and send). Stuck claims are NEVER auto-resent
 * and NEVER silently dropped: the run start health scan counts them into
 * the heartbeat (claimed_stuck) for operator triage.
 */
export const STUCK_CLAIM_MINUTES = 30;

/**
 * ISO cutoff for the stuck-claim scan: 'sending' rows with
 * updated_at < cutoff are counted as stuck. Throws RangeError on an
 * unparseable input rather than producing a silent wrong cutoff (callers
 * pass a fresh new Date().toISOString()).
 */
export function stuckCutoffIso(nowIso: string, thresholdMinutes: number = STUCK_CLAIM_MINUTES): string {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) {
    throw new RangeError(`stuckCutoffIso: unparseable timestamp "${nowIso}"`);
  }
  return new Date(now - thresholdMinutes * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// CAPS: budget math (Section 3.2 item b)
// ---------------------------------------------------------------------------

export interface RunBudget {
  allowed: number;
  reason: 'ok' | 'daily_cap_reached';
}

/**
 * How many rows this tick may claim: the smaller of the per-run cap and the
 * remaining daily allowance (daily cap minus rows already marked sent since
 * midnight UTC). At or beyond the daily cap the run stops with a stated
 * reason. A negative sent-today count (impossible, but fail-safe) is
 * treated as zero rather than inflating the budget.
 */
export function runBudget(
  sentToday: number,
  dailyCap: number = DAILY_CAP,
  perRunCap: number = PER_RUN_CAP,
): RunBudget {
  const spent = Math.max(0, sentToday);
  const remaining = dailyCap - spent;
  if (remaining <= 0) return { allowed: 0, reason: 'daily_cap_reached' };
  return { allowed: Math.min(perRunCap, remaining), reason: 'ok' };
}

/**
 * Midnight UTC of the given ISO instant, for the sent-today count filter
 * (sent_at >= utcDayStart(now)). String-sliced, not Date-parsed, so the
 * result is exact; throws RangeError on a non-ISO input.
 */
export function utcDayStart(nowIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(nowIso)) {
    throw new RangeError(`utcDayStart: expected an ISO timestamp, got "${nowIso}"`);
  }
  return `${nowIso.slice(0, 10)}T00:00:00.000Z`;
}

// ---------------------------------------------------------------------------
// SCOPE CONTROL: window check (Section 3.2 item d)
// ---------------------------------------------------------------------------

/**
 * Belt-and-suspenders re-check of the candidate query's created_at floor.
 * Unparseable timestamps fail closed (excluded, never sent).
 */
export function isWithinCandidateWindow(
  createdAtIso: string,
  floorIso: string = FLOOR_TIMESTAMP,
): boolean {
  const created = Date.parse(createdAtIso);
  const floor = Date.parse(floorIso);
  if (Number.isNaN(created) || Number.isNaN(floor)) return false;
  return created >= floor;
}

// ---------------------------------------------------------------------------
// RESILIENCE: retry accounting and run soft deadline (Section 3.2 item e)
// ---------------------------------------------------------------------------

/** Attempt ceiling after which a queue row is marked failed permanently. */
export const MAX_ATTEMPTS = 5;

/**
 * Status a failed send transitions to, given the attempt count AFTER the
 * claim increment: retryable until MAX_ATTEMPTS, then failed permanently.
 */
export function nextRetryStatus(attemptsAfterClaim: number): 'pending' | 'failed' {
  return attemptsAfterClaim >= MAX_ATTEMPTS ? 'failed' : 'pending';
}

/**
 * Soft wall-clock budget for one run. With PER_RUN_CAP sends of up to 15s
 * SMTP timeout each, the worst case would exceed the platform limit; the
 * loop checks this deadline between rows and stops early, leaving the
 * remaining rows pending for the next tick.
 */
export const RUN_SOFT_DEADLINE_MS = 120000;

export function shouldStopForDeadline(
  startedAtMs: number,
  nowMs: number,
  budgetMs: number = RUN_SOFT_DEADLINE_MS,
): boolean {
  return nowMs - startedAtMs >= budgetMs;
}
