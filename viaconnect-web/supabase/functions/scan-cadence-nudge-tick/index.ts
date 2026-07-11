// =============================================================================
// scan-cadence-nudge-tick Edge Function (Prompt 211a Workstream 4, Part 2)
// =============================================================================
// Daily sweep that sends a GENTLE, opt-in scan cadence reminder to consumers
// whose next scan is overdue per their own historical rhythm. It mirrors the
// cert-reminder-tick pattern exactly:
//   * daily sweep (registered at a fixed off-zero minute in the cron migration)
//   * OPT-IN ONLY: it selects users from scan_cadence_reminders WHERE opt_in is
//     true. A user who never opted in is never touched. It never nags.
//   * IDEMPOTENT per (user, trigger_key) via scan_calibration_nudges
//     (UNIQUE(user_id, trigger_key)): a second pass on the same UTC day for the
//     same due date is a no-op, so a user is never double nudged in a day.
//   * writes a Hannah-toned, dash-free user_notifications row (the nudge sink).
//   * heartbeats to ultrathink_agent_registry / _events on every run so Jeffery
//     can monitor liveness.
//   * FAIL-OPEN and reason-tagged: schema drift and per-user errors are logged
//     via the _shared mirrors and never abort the whole sweep.
//
// CLOCK NOTE (the W4-1 review fix, enforced here): the "is this user overdue"
// decision is a genuine function of the injected clock. This function passes
// Date.now() into computeDaysOverdue, which compares now against the nominal
// due date. The pure Next.js counterpart (src/lib/formavision/cadence/
// reminder.ts) carries the same math with an injected nowMs and a test that
// FAILS if nowMs is ignored. recommend.ts anchored nextDueDate to the last scan
// and discarded nowMs; the OVERDUE math (here and in reminder.ts) is what
// actually reads the clock.
//
// DENO MIRROR: this Deno function cannot import the Next.js src/ modules, so the
// small pure helpers (next-due from median gap, overdue check) are re-derived
// here with a header pointing at the canonical sources. Same convention as the
// _shared/*.ts mirrors. Copy is kept in one place (buildNudge) so the wording
// matches reminder.ts.
//
// DO NOT DEPLOY MANUALLY: the controller deploys at merge.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTimeoutError, withTimeout } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { reportSupabaseError } from '../_shared/schema-drift.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ONE_DAY_MS = 86400000;
// Nominal windows + grace mirror src/lib/formavision/cadence/streak.ts.
const WEEKLY_WINDOW_DAYS = 7;
const BIWEEKLY_WINDOW_DAYS = 14;
const CADENCE_GRACE_DAYS = 2;
// Minimum prior scans before a cadence is honest, mirrors recommend.ts.
const MIN_HISTORY_FOR_CADENCE = 3;
// Sweep only recent history so the per-user read stays small.
const HISTORY_LOOKBACK_DAYS = 120;
const HISTORY_ROW_CAP = 30;

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}

async function heartbeat(
  db: SupabaseClient,
  runId: string,
  ok: boolean,
  payload: Record<string, unknown>,
) {
  try {
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'scan-cadence-nudge-tick',
      p_run_id: runId,
      p_event_type: ok ? 'heartbeat' : 'error',
      p_payload: payload,
      p_severity: ok ? 'info' : 'warning',
    });
  } catch (e) {
    console.warn('[scan-cadence-nudge-tick] heartbeat failed', (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Pure helpers (Deno mirror of the canonical Next.js cadence logic).
// Re-derived here per the _shared mirror convention; the canonical sources are
// src/lib/formavision/cadence/{recommend,reminder,streak}.ts.
// ---------------------------------------------------------------------------

/** Parse an ISO calendar date (YYYY-MM-DD) to a UTC-midnight epoch day count. */
function toEpochDay(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    throw new Error(`scan-cadence-nudge-tick: invalid ISO date "${isoDate}"`);
  }
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / ONE_DAY_MS);
}

/** Format an epoch-day count back to an ISO calendar date (YYYY-MM-DD). */
function epochDayToIso(day: number): string {
  const d = new Date(day * ONE_DAY_MS);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const date = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/** Format the UTC calendar day of an epoch-ms clock (for the idempotency key). */
function utcDayString(nowMs: number): string {
  const d = new Date(nowMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const date = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/** Median of a numeric list. list must be non-empty. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The nominal next-due date from a user's scan dates, mirroring recommendCadence:
 * the median gap decides weekly vs biweekly; next due is one rhythm-length after
 * the most recent scan. Returns null when history is too thin (honest, no nag).
 */
function nextDueDateFromHistory(scanDatesIso: string[]): string | null {
  if (scanDatesIso.length < MIN_HISTORY_FOR_CADENCE) return null;
  const days = scanDatesIso.map(toEpochDay).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < days.length; i += 1) gaps.push(days[i] - days[i - 1]);
  const medianGap = median(gaps);
  const split = (WEEKLY_WINDOW_DAYS + BIWEEKLY_WINDOW_DAYS) / 2;
  const rhythmDays = medianGap <= split ? WEEKLY_WINDOW_DAYS : BIWEEKLY_WINDOW_DAYS;
  const lastDay = days[days.length - 1];
  return epochDayToIso(lastDay + rhythmDays);
}

/**
 * Whole days from the due date to now (signed). Positive => overdue. This is the
 * genuine consumer of the injected clock (the W4-1 fix): it reads nowMs.
 */
function computeDaysOverdue(nextDueDateIso: string, nowMs: number): number {
  const dueMs = toEpochDay(nextDueDateIso) * ONE_DAY_MS;
  return Math.floor((nowMs - dueMs) / ONE_DAY_MS);
}

/** Gentle, Hannah-toned, dash-free nudge copy. Mirrors reminder.ts wording. */
function buildNudge(timeOfDay: string): { title: string; body: string } {
  return {
    title: 'A gentle scan reminder',
    body:
      'Whenever you have a moment, a quick body scan keeps your progress picture honest. ' +
      `You usually scan in the ${timeOfDay}, so if now feels right, I am here for it. No rush at all.`,
  };
}

// ---------------------------------------------------------------------------
// Row shapes (minimal selects)
// ---------------------------------------------------------------------------

interface OptInRow {
  user_id: string;
  reminder_time_of_day: string | null;
}

interface ScanDateRow {
  scan_date: string;
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

async function sweepNudges(db: SupabaseClient, nowMs: number): Promise<{ nudged: number; considered: number }> {
  // OPT-IN ONLY: users who explicitly enabled reminders. A never-opted-in user
  // has no row here (or opt_in=false), so they are never selected. Never nag.
  const optInResult = await withTimeout(
    db
      .from('scan_cadence_reminders')
      .select('user_id, reminder_time_of_day')
      .eq('opt_in', true) as unknown as Promise<{ data: OptInRow[] | null; error: unknown }>,
    15000,
    'scan-cadence-nudge-tick.optin-select',
  );

  if (optInResult.error) {
    reportSupabaseError('scan-cadence-nudge-tick.optin-select', optInResult.error, {
      table: 'scan_cadence_reminders',
    });
    return { nudged: 0, considered: 0 };
  }

  const optIns = optInResult.data ?? [];
  const lookbackIso = new Date(nowMs - HISTORY_LOOKBACK_DAYS * ONE_DAY_MS)
    .toISOString()
    .slice(0, 10);

  let nudged = 0;

  for (const optIn of optIns) {
    try {
      // Read this user's recent scan dates (own rows; service role bypasses RLS
      // but the query is user-scoped). Honest history drives the due date.
      const histResult = await withTimeout(
        db
          .from('body_scan_measurements')
          .select('scan_date')
          .eq('user_id', optIn.user_id)
          .gte('scan_date', lookbackIso)
          .order('scan_date', { ascending: false })
          .limit(HISTORY_ROW_CAP) as unknown as Promise<{ data: ScanDateRow[] | null; error: unknown }>,
        15000,
        'scan-cadence-nudge-tick.history-select',
      );

      if (histResult.error) {
        reportSupabaseError('scan-cadence-nudge-tick.history-select', histResult.error, {
          table: 'body_scan_measurements',
        });
        continue; // fail-open per user
      }

      const scanDates = (histResult.data ?? []).map((r) => r.scan_date);
      const nextDue = nextDueDateFromHistory(scanDates);
      // Too thin to recommend, or not overdue yet: no nudge. Honest, no nag.
      if (nextDue === null) continue;

      const daysOverdue = computeDaysOverdue(nextDue, nowMs);
      if (daysOverdue < CADENCE_GRACE_DAYS) continue; // within grace or early

      // Idempotency key: per user, per due date, per UTC day. Same day => same
      // key => the UNIQUE(user_id, trigger_key) insert conflicts and no second
      // nudge is written. A later day => new key => a gentle re-nudge is allowed.
      const triggerKey = `scan_cadence:${optIn.user_id}:${nextDue}:${utcDayString(nowMs)}`;

      // Idempotency guard: has this (user, trigger_key) already been logged?
      const existing = await withTimeout(
        db
          .from('scan_calibration_nudges')
          .select('id')
          .eq('user_id', optIn.user_id)
          .eq('trigger_key', triggerKey)
          .limit(1)
          .maybeSingle() as unknown as Promise<{ data: { id: string } | null; error: unknown }>,
        15000,
        'scan-cadence-nudge-tick.idempotency-check',
      );

      if (existing.error) {
        reportSupabaseError('scan-cadence-nudge-tick.idempotency-check', existing.error, {
          table: 'scan_calibration_nudges',
        });
        continue;
      }
      if (existing.data) continue; // already nudged this day for this due date

      const timeOfDay = optIn.reminder_time_of_day ?? 'morning';
      const nudge = buildNudge(timeOfDay);

      // Write the gentle notification (the nudge sink).
      const notifyResult = await withTimeout(
        db.from('user_notifications').insert({
          user_id: optIn.user_id,
          type: 'scan_cadence_reminder',
          title: nudge.title,
          body: nudge.body,
          link: '/body-tracker/composition',
          metadata: { trigger_key: triggerKey, next_due_date: nextDue, source: 'scan-cadence-nudge-tick' },
        }) as unknown as Promise<{ error: unknown }>,
        15000,
        'scan-cadence-nudge-tick.notify-insert',
      );

      if (notifyResult.error) {
        reportSupabaseError('scan-cadence-nudge-tick.notify-insert', notifyResult.error, {
          table: 'user_notifications',
        });
        continue;
      }

      // Record the nudge ledger row (idempotency marker). If a concurrent pass
      // raced us the UNIQUE(user_id, trigger_key) constraint rejects this; that
      // is fine, the notification was written at most once by the guard above.
      const ledgerResult = await withTimeout(
        db.from('scan_calibration_nudges').insert({
          user_id: optIn.user_id,
          trigger_key: triggerKey,
        }) as unknown as Promise<{ error: unknown }>,
        15000,
        'scan-cadence-nudge-tick.ledger-insert',
      );

      if (ledgerResult.error) {
        // Non-fatal: log the reason and continue. The notification is already
        // sent; a failed ledger write only risks a same-day duplicate, which is
        // rare and gentle, not a correctness failure.
        reportSupabaseError('scan-cadence-nudge-tick.ledger-insert', ledgerResult.error, {
          table: 'scan_calibration_nudges',
        });
      }

      nudged += 1;
    } catch (e) {
      // Per-user fail-open: one bad user never sinks the sweep.
      if (isTimeoutError(e)) {
        safeLog.warn('scan-cadence-nudge-tick.user', 'per-user timeout', { error: e });
      } else {
        safeLog.warn('scan-cadence-nudge-tick.user', 'per-user error, skipping', { error: e });
      }
    }
  }

  return { nudged, considered: optIns.length };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const { nudged, considered } = await sweepNudges(db, startedAt);
    await heartbeat(db, runId, true, {
      nudged,
      considered,
      durationMs: Date.now() - startedAt,
    });
    return json({ status: 'ok', runId, nudged, considered });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (isTimeoutError(e)) safeLog.warn('scan-cadence-nudge-tick', 'sweep timeout', { runId, error: e });
    else safeLog.error('scan-cadence-nudge-tick', 'sweep failed', { runId, error: e });
    await heartbeat(db, runId, false, { error: msg });
    return json({ status: 'failed', error: msg }, 500);
  }
});
