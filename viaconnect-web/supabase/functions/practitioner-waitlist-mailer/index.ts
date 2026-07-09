// =============================================================================
// practitioner-waitlist-mailer Edge Function
// =============================================================================
// Consumes the practitioner_email_queue and sends nurture emails via Supabase
// built-in SMTP / Auth admin endpoints. No SendGrid. No third-party providers.
// Per the project standing rule, all transactional email goes through Supabase.
//
// Trigger: pg_cron POSTs every 5 minutes ONCE ARMED (Task F4 arming lifts the
// cron registration from 20260418000050_practitioner_mailer_cron.sql; see
// docs/integrity/f4-prearm-checklist.md). Until the arming step seeds the
// kill-switch flag row, every invocation exits disabled and sends nothing.
//
// Prompt 210f Task F4 hardening (Section 3.2 pre-arm checklist):
//   IDEMPOTENCY   claim-before-send: an atomic compare-and-swap
//                 (status pending -> sending, RETURNING id) claims each row
//                 before any SMTP traffic; only the claim winner sends, then
//                 marks sent. A crash between claim and send leaves the row
//                 at 'sending', which is NEVER auto-resent (candidate query
//                 selects pending only) and NEVER silently dropped (the
//                 stuck-claim scan surfaces it in the heartbeat).
//   CAPS          PER_RUN_CAP per tick + DAILY_CAP per UTC day, enforced via
//                 the candidate query limit and a sent-today count checked
//                 before any send. Unknown budget = no send (fail closed).
//   KILL SWITCH   public.features row id = 'practitioner_waitlist_mailer'.
//                 Missing row / read error / kill_switch_engaged all fail
//                 closed. Single instant disable: engage the kill switch on
//                 that row. Mechanism documented in mailer-logic.ts.
//   SCOPE         status='pending' AND step=1 (welcome only; the F3
//                 AFTER INSERT trigger on voluntary form submissions is the
//                 only step-1 writer) AND created_at >= FLOOR_TIMESTAMP
//                 (F3 apply date): no historical sweep by construction.
//                 Consent: the public application form submission is the
//                 consent event; waitlist.unsubscribed is the ongoing-consent
//                 filter, re-checked per lead at send time.
//   DRIFT         reportSupabaseError on every queue/waitlist/flag read-write
//                 error path; contexts carry table names only, never emails.
//                 F4-fix: EVERY DB read and write, pre-loop and in-loop
//                 (claim, waitlist-read, claim-release, mark-missing,
//                 mark-skipped, mark-sent, mark-failed), is bounded by
//                 withTimeout; an in-loop timeout takes that site's existing
//                 error path and never crashes the loop.
//   COMPLIANCE    F4b: every rendered email carries an unsubscribe link
//                 (HMAC token, verified by GET /api/waitlist/unsubscribe)
//                 and a physical postal address slot. ARMING IS BLOCKED
//                 while POSTAL_ADDRESS_LINE reads TODO-GARY-AT-ARMING
//                 (docs/integrity/f4-prearm-checklist.md, Kelsey row).
//   HEALTH        agent_heartbeats upsert (Prompt 208 pattern, live table) at
//                 run start and end with counts only, plus best-effort
//                 ultrathink_agent_heartbeat RPC so the F4-armed registry
//                 health check (ultrathink_agent_events, 20-minute window)
//                 stays green. No PII in any payload.
//
// All decision logic is pure and lives in ./mailer-logic.ts (tested by
// tests/schema/mailer-prearm-logic.test.ts under vitest, no Deno needed).
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { withTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';
import { reportSupabaseError } from '../_shared/schema-drift.ts';
import type { MailerFlagRow } from './mailer-logic.ts';
import {
  CANDIDATE_STEP,
  FLOOR_TIMESTAMP,
  MAILER_FLAG_ID,
  claimConfirmed,
  claimTransition,
  isWithinCandidateWindow,
  mailerEnabled,
  nextRetryStatus,
  runBudget,
  shouldStopForDeadline,
  stuckCutoffIso,
  utcDayStart,
} from './mailer-logic.ts';

const AGENT_NAME = 'practitioner-waitlist-mailer';
const DB_TIMEOUT_MS = 10000;
const SMTP_TIMEOUT_MS = 15000;

const smtpBreaker = getCircuitBreaker('smtp-email');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// SMTP configuration. These are the same env vars Supabase Auth uses for its
// transactional emails. Configure them in the Supabase dashboard under
// Authentication > Email > SMTP Settings, OR set them as Edge Function
// secrets via `supabase secrets set SMTP_HOST=...`. No third-party SaaS
// provider is involved.
const SMTP_HOST = Deno.env.get('SMTP_HOST') ?? '';
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? '587');
const SMTP_USER = Deno.env.get('SMTP_USER') ?? '';
const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? '';
const SMTP_FROM = Deno.env.get('SMTP_FROM') ?? 'no-reply@viacurawellness.com';
const SMTP_FROM_NAME = Deno.env.get('SMTP_FROM_NAME') ?? 'ViaCura';

// -----------------------------------------------------------------------------
// COMPLIANCE (Prompt 210f Task F4b): CAN-SPAM / CASL slots.
// Every rendered email must carry a working unsubscribe link and a valid
// physical postal address line.
//
// Unsubscribe token contract (canonical module with pinned vitest tests:
// src/lib/waitlist/unsubscribe-token.ts):
//   token = <waitlistId>.<hex HMAC-SHA256(UNSUBSCRIBE_TOKEN_SECRET, waitlistId)>
// signUnsubscribeToken below is the Deno crypto.subtle mirror of that node
// module and MUST keep producing byte-identical tokens. The link lands on
// GET /api/waitlist/unsubscribe, which verifies the token and sets
// practitioner_waitlist.unsubscribed = true, exactly the flag this mailer
// re-checks per lead at send time.
//
// At arming Gary sets, with the SAME secret value on both sides:
//   - UNSUBSCRIBE_TOKEN_SECRET in the Vercel env (route verify side), and
//   - UNSUBSCRIBE_TOKEN_SECRET plus BASE_URL as Supabase function secrets
//     here (sign side; BASE_URL is the public site origin the route lives on).
// If either is missing, the slot renders a loud TODO literal: never a silent
// blank, never a link signed with an empty secret.
// -----------------------------------------------------------------------------
const BASE_URL = Deno.env.get('BASE_URL') ?? '';
const UNSUBSCRIBE_TOKEN_SECRET = Deno.env.get('UNSUBSCRIBE_TOKEN_SECRET') ?? '';

// !!! ARMING BLOCKER !!! Do NOT arm the cron or seed the kill-switch flag row
// while this constant reads TODO-GARY-AT-ARMING. CAN-SPAM/CASL require a
// valid physical postal address in every commercial email; Gary supplies the
// literal at the Kelsey gate (docs/integrity/f4-prearm-checklist.md). The
// placeholder is intentionally visible so the internal test send surfaces it
// by eye instead of looking silently compliant.
const POSTAL_ADDRESS_LINE = 'TODO-GARY-AT-ARMING';

async function signUnsubscribeToken(waitlistId: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(UNSUBSCRIBE_TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(waitlistId)),
  );
  let hex = '';
  for (const byte of signature) hex += byte.toString(16).padStart(2, '0');
  return `${waitlistId}.${hex}`;
}

async function buildUnsubscribeUrl(waitlistId: string): Promise<string> {
  if (!BASE_URL || !UNSUBSCRIBE_TOKEN_SECRET) {
    // Fail LOUD inside the rendered email rather than omitting the legally
    // required link. The arming checklist blocks until both secrets exist,
    // and the internal test send would surface this literal immediately.
    return 'TODO-AT-ARMING-SET-BASE_URL-AND-UNSUBSCRIBE_TOKEN_SECRET';
  }
  const token = await signUnsubscribeToken(waitlistId);
  return `${BASE_URL.replace(/\/+$/, '')}/api/waitlist/unsubscribe?token=${token}`;
}

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

// -----------------------------------------------------------------------------
// HEALTH: heartbeat writes. Counts only, never lead data. Both sinks are
// best-effort and can never break the run.
//   1. agent_heartbeats upsert (Prompt 208 pattern; table exists live) is the
//      primary liveness row: one row per agent, watch it in the internal
//      health panel or via
//        select * from agent_heartbeats where agent = 'practitioner-waitlist-mailer';
//   2. ultrathink_agent_heartbeat RPC feeds ultrathink_agent_events, which the
//      F4-armed ultrathink_agent_registry health_check_query polls with a
//      20-minute window; without this the registry would false-alarm.
// -----------------------------------------------------------------------------
async function beat(
  db: SupabaseClient,
  runId: string,
  phase: 'start' | 'end',
  status: 'ok' | 'degraded' | 'error',
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await withTimeout(
      db.from('agent_heartbeats').upsert(
        {
          agent: AGENT_NAME,
          status,
          detail: { phase, run_id: runId, ...detail },
          last_beat_at: new Date().toISOString(),
        },
        { onConflict: 'agent' },
      ),
      DB_TIMEOUT_MS,
      `${AGENT_NAME}.heartbeat-upsert`,
    );
    if (error) reportSupabaseError(`${AGENT_NAME}.heartbeat-upsert`, error, { table: 'agent_heartbeats' });
  } catch (e) {
    safeLog.warn(AGENT_NAME, 'heartbeat upsert threw', { error: e });
  }

  try {
    const { error } = await withTimeout(
      db.rpc('ultrathink_agent_heartbeat', {
        p_agent_name: AGENT_NAME,
        p_run_id: runId,
        p_event_type: status === 'error' ? 'error' : phase === 'end' ? 'complete' : 'heartbeat',
        p_payload: { phase, ...detail },
        p_severity: status === 'ok' ? 'info' : 'warning',
      }),
      DB_TIMEOUT_MS,
      `${AGENT_NAME}.heartbeat-rpc`,
    );
    if (error) reportSupabaseError(`${AGENT_NAME}.heartbeat-rpc`, error, { rpc: 'ultrathink_agent_heartbeat' });
  } catch (e) {
    safeLog.warn(AGENT_NAME, 'heartbeat rpc threw', { error: e });
  }
}

interface QueueRow {
  id: string;
  waitlist_id: string;
  step: number;
  attempts: number;
  status: string;
  created_at: string;
}

interface WaitlistRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  practice_name: string;
  credential_type: string;
  unsubscribed: boolean | null;
}

const STEP_SUBJECTS: Record<number, string> = {
  1: 'Welcome to the ViaCura practitioner waitlist',
  2: 'A look at the precision wellness platform we are building',
  3: 'This week at ViaCura',
  4: 'Cohort 1 selection coming soon',
  5: 'Cohort 1 selection closing in 9 days',
  6: 'Your Cohort 1 status',
};

function renderEmail(
  step: number,
  w: WaitlistRow,
  unsubscribeUrl: string,
): { subject: string; text: string; html: string } {
  const greeting = `Dear ${w.first_name},`;
  const subject = STEP_SUBJECTS[step] ?? 'ViaCura update';
  // Entity string per Gary decision 2026-07-08: FarmCeutica Wellness LLC
  // (never Ltd) on customer-facing email text.
  const closing =
    'Sincerely,\nThe ViaCura founding team\nFarmCeutica Wellness LLC';

  let body = '';
  switch (step) {
    case 1:
      body = `Thank you for joining the ViaCura practitioner waitlist. We received your application for ${w.practice_name}.\n\nHere is what to expect over the next 30 days:\n  Day 3: a closer look at the platform\n  Day 14: Cohort 1 selection notice\n  Day 28: founding cohort invitations\n\nWe will be in touch.`;
      break;
    case 2:
      body = `As promised, here is a closer look at the ViaCura precision wellness platform: pharmaceutical-grade infrastructure, GeneX360 genetic integration, and a dispensary built on FarmCeutica Wellness products at wholesale to your practice.`;
      break;
    case 3:
      body = `A short note on what we shipped at ViaCura this week, and how it shapes the practitioner experience for ${w.practice_name}.`;
      break;
    case 4:
      body = `Cohort 1 selection opens soon. Twenty-five founding practitioners will be invited to onboard with concierge support and direct founder engagement.`;
      break;
    case 5:
      body = `Final call: Cohort 1 selection closes in 9 days. If your application is among the strongest fits, you will receive an invitation by the end of next week.`;
      break;
    case 6:
      body = `A status update on your Cohort 1 application. Please open the linked page in your account to view the details.`;
      break;
    default:
      body = `Thank you for your interest in ViaCura.`;
  }

  // COMPLIANCE FOOTER (F4b): unsubscribe link + physical postal address in
  // every email, both text and html parts. POSTAL_ADDRESS_LINE is the
  // TODO-GARY-AT-ARMING slot; arming is BLOCKED until Gary supplies it.
  const complianceFooter =
    `You may unsubscribe at any time: ${unsubscribeUrl}\n` +
    'FarmCeutica Wellness LLC\n' +
    POSTAL_ADDRESS_LINE;

  const text = `${greeting}\n\n${body}\n\n${closing}\n\n${complianceFooter}\n`;
  const html =
    `<p>${greeting.replace(/\n/g, '<br/>')}</p>` +
    `<p>${body.replace(/\n/g, '<br/>')}</p>` +
    `<p>${closing.replace(/\n/g, '<br/>')}</p>` +
    '<p style="font-size:12px;color:#6b7280;">' +
    `You may <a href="${unsubscribeUrl}">unsubscribe</a> at any time.<br/>` +
    'FarmCeutica Wellness LLC<br/>' +
    `${POSTAL_ADDRESS_LINE}</p>`;
  return { subject, text, html };
}

async function sendViaSupabaseSmtp(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM via supabase secrets set, mirroring the project SMTP credentials used by Supabase Auth.',
    );
  }

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  });

  try {
    await client.send({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM}>`,
      to: params.to,
      subject: params.subject,
      content: params.text,
      html: params.html,
    });
  } finally {
    try { await client.close(); } catch { /* ignore close errors */ }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const startedAt = Date.now();
  const nowIso = new Date().toISOString();
  const runId = crypto.randomUUID();

  // ---------------------------------------------------------------------------
  // KILL SWITCH (fail closed). See mailer-logic.ts MAILER_FLAG_ID docs.
  // A missing flag row, a read error, or an engaged switch all end the run
  // before any candidate query; queue rows simply stay pending.
  // ---------------------------------------------------------------------------
  let flagRow: MailerFlagRow | null = null;
  try {
    const { data, error } = await withTimeout(
      db.from('features')
        .select('is_active, kill_switch_engaged')
        .eq('id', MAILER_FLAG_ID)
        .maybeSingle(),
      DB_TIMEOUT_MS,
      `${AGENT_NAME}.flag-read`,
    );
    if (error) {
      reportSupabaseError(`${AGENT_NAME}.flag-read`, error, { table: 'features' });
      await beat(db, runId, 'end', 'error', { reason: 'flag_read_failed' });
      return json({ status: 'disabled', reason: 'flag_read_failed' }, 503);
    }
    flagRow = (data ?? null) as MailerFlagRow | null;
  } catch (e) {
    safeLog.error(AGENT_NAME, 'flag read threw; failing closed', { error: e });
    await beat(db, runId, 'end', 'error', { reason: 'flag_read_failed' });
    return json({ status: 'disabled', reason: 'flag_read_failed' }, 503);
  }

  const flag = mailerEnabled(flagRow);
  if (!flag.enabled) {
    safeLog.warn(AGENT_NAME, 'run disabled by kill switch', { reason: flag.reason });
    await beat(db, runId, 'end', 'ok', { reason: flag.reason, sent: 0, failed: 0, skipped: 0 });
    return json({ status: 'disabled', reason: flag.reason });
  }

  // ---------------------------------------------------------------------------
  // HEALTH: stuck-claim scan. Rows at 'sending' older than the cutoff are
  // crash leftovers from a claim-then-die run. They are surfaced (counted
  // into the heartbeat and logs) but NEVER auto-resent and never dropped;
  // reconciliation is a manual operator decision.
  // ---------------------------------------------------------------------------
  let claimedStuck = 0;
  try {
    const { count, error } = await withTimeout(
      db.from('practitioner_email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sending')
        .lt('updated_at', stuckCutoffIso(nowIso)),
      DB_TIMEOUT_MS,
      `${AGENT_NAME}.stuck-scan`,
    );
    if (error) reportSupabaseError(`${AGENT_NAME}.stuck-scan`, error, { table: 'practitioner_email_queue' });
    else claimedStuck = count ?? 0;
  } catch (e) {
    safeLog.warn(AGENT_NAME, 'stuck-claim scan threw', { error: e });
  }
  if (claimedStuck > 0) {
    safeLog.warn(AGENT_NAME, 'stuck claims detected (claimed but never marked sent/failed); manual triage required', {
      claimedStuck,
    });
  }
  await beat(db, runId, 'start', claimedStuck > 0 ? 'degraded' : 'ok', { claimed_stuck: claimedStuck });

  // ---------------------------------------------------------------------------
  // CAPS: daily budget. If the sent-today count cannot be read, the budget is
  // unknown and nothing sends this tick (fail closed).
  // ---------------------------------------------------------------------------
  let sentToday = 0;
  try {
    const { count, error } = await withTimeout(
      db.from('practitioner_email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', utcDayStart(nowIso)),
      DB_TIMEOUT_MS,
      `${AGENT_NAME}.daily-count`,
    );
    if (error) {
      reportSupabaseError(`${AGENT_NAME}.daily-count`, error, { table: 'practitioner_email_queue' });
      await beat(db, runId, 'end', 'error', { reason: 'daily_count_unavailable', claimed_stuck: claimedStuck });
      return json({ status: 'skipped_run', reason: 'daily_count_unavailable' }, 503);
    }
    sentToday = count ?? 0;
  } catch (e) {
    safeLog.error(AGENT_NAME, 'daily-count read threw; failing closed', { error: e });
    await beat(db, runId, 'end', 'error', { reason: 'daily_count_unavailable', claimed_stuck: claimedStuck });
    return json({ status: 'skipped_run', reason: 'daily_count_unavailable' }, 503);
  }

  const budget = runBudget(sentToday);
  if (budget.allowed === 0) {
    safeLog.warn(AGENT_NAME, 'daily cap reached; no sends this tick', { sentToday });
    await beat(db, runId, 'end', 'ok', {
      reason: budget.reason,
      sent_today: sentToday,
      claimed_stuck: claimedStuck,
    });
    return json({ status: 'capped', reason: budget.reason, sentToday });
  }

  // ---------------------------------------------------------------------------
  // SCOPE CONTROL: candidate set = pending welcome-step rows enqueued by the
  // F3 form trigger on/after the floor date, due now. dueCount (uncapped) is
  // read first so the heartbeat can report how many rows the caps deferred.
  // ---------------------------------------------------------------------------
  let dueCount = 0;
  try {
    const { count, error } = await withTimeout(
      db.from('practitioner_email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('step', CANDIDATE_STEP)
        .gte('created_at', FLOOR_TIMESTAMP)
        .lte('scheduled_for', nowIso),
      DB_TIMEOUT_MS,
      `${AGENT_NAME}.due-count`,
    );
    if (error) reportSupabaseError(`${AGENT_NAME}.due-count`, error, { table: 'practitioner_email_queue' });
    else dueCount = count ?? 0;
  } catch (e) {
    safeLog.warn(AGENT_NAME, 'due-count read threw', { error: e });
  }

  let rows: QueueRow[] = [];
  try {
    const { data: due, error } = await withTimeout(
      db.from('practitioner_email_queue')
        .select('id, waitlist_id, step, attempts, status, created_at')
        .eq('status', 'pending')
        .eq('step', CANDIDATE_STEP)
        .gte('created_at', FLOOR_TIMESTAMP)
        .lte('scheduled_for', nowIso)
        .order('scheduled_for', { ascending: true })
        .limit(budget.allowed),
      DB_TIMEOUT_MS,
      `${AGENT_NAME}.candidate-query`,
    );
    if (error) {
      reportSupabaseError(`${AGENT_NAME}.candidate-query`, error, { table: 'practitioner_email_queue' });
      await beat(db, runId, 'end', 'error', { reason: 'candidate_query_failed', claimed_stuck: claimedStuck });
      return json({ status: 'failed', error: error.message }, 500);
    }
    rows = (due ?? []) as QueueRow[];
  } catch (e) {
    safeLog.error(AGENT_NAME, 'candidate query threw', { error: e });
    await beat(db, runId, 'end', 'error', { reason: 'candidate_query_failed', claimed_stuck: claimedStuck });
    return json({ status: 'failed', reason: 'candidate_query_failed' }, 500);
  }
  const capped = Math.max(0, dueCount - rows.length);

  let claimed = 0;
  let claimLost = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let deadlineStopped = false;

  for (const row of rows) {
    // RESILIENCE: bounded run. Remaining rows stay pending for the next tick.
    if (shouldStopForDeadline(startedAt, Date.now())) {
      deadlineStopped = true;
      safeLog.warn(AGENT_NAME, 'run soft deadline reached; leaving remaining rows pending', { sent, claimed });
      break;
    }

    // SCOPE: pure re-check of the query filters (fail closed on anomalies).
    if (!isWithinCandidateWindow(row.created_at) || claimTransition(row.status) !== 'claim') {
      skipped++;
      continue;
    }

    // IDEMPOTENCY: atomic claim-before-send. The compare-and-swap only
    // matches a row still 'pending'; RETURNING proves ownership. Losing the
    // race means another tick owns the row: do not send.
    const attemptsAfterClaim = row.attempts + 1;
    let ownsClaim = false;
    try {
      const { data: claimedRows, error: claimError } = await withTimeout(
        db.from('practitioner_email_queue')
          .update({ status: 'sending', attempts: attemptsAfterClaim, updated_at: new Date().toISOString() })
          .eq('id', row.id)
          .eq('status', 'pending')
          .select('id'),
        DB_TIMEOUT_MS,
        `${AGENT_NAME}.claim`,
      );
      if (claimError) {
        reportSupabaseError(`${AGENT_NAME}.claim`, claimError, { table: 'practitioner_email_queue' });
      } else {
        ownsClaim = claimConfirmed((claimedRows ?? []).length);
      }
    } catch (e) {
      // F4-fix: a claim timeout lands here too. Ownership is unproven, so
      // this run does NOT send (claim-lost path below). If the UPDATE in
      // fact landed, the row sits at 'sending' and the stuck-claim scan
      // surfaces it: never a double send, never a crashed loop.
      safeLog.warn(AGENT_NAME, 'claim write threw', { error: e });
    }
    if (!ownsClaim) {
      claimLost++;
      continue;
    }
    claimed++;

    // F4-fix: the waitlist read is bounded and throw-contained. A timeout
    // or throw takes the same claim-release error path an error result
    // takes; the loop itself never crashes.
    let w: WaitlistRow | null = null;
    let waitlistReadFailed = false;
    try {
      const { data: waitlist, error: waitlistError } = await withTimeout(
        db.from('practitioner_waitlist')
          .select('id, email, first_name, last_name, practice_name, credential_type, unsubscribed')
          .eq('id', row.waitlist_id)
          .maybeSingle(),
        DB_TIMEOUT_MS,
        `${AGENT_NAME}.waitlist-read`,
      );
      if (waitlistError) {
        reportSupabaseError(`${AGENT_NAME}.waitlist-read`, waitlistError, { table: 'practitioner_waitlist' });
        waitlistReadFailed = true;
      } else {
        w = (waitlist ?? null) as WaitlistRow | null;
      }
    } catch (e) {
      safeLog.warn(AGENT_NAME, 'waitlist read threw', { error: e });
      waitlistReadFailed = true;
    }

    if (waitlistReadFailed) {
      // Nothing was sent, so the claim is released with retry accounting.
      // If this release write also fails or times out, the row stays
      // 'sending' and the stuck-claim scan surfaces it: no silent resend,
      // no silent drop.
      try {
        const { error: releaseError } = await withTimeout(
          db.from('practitioner_email_queue')
            .update({ status: nextRetryStatus(attemptsAfterClaim), last_error: 'waitlist read failed', updated_at: new Date().toISOString() })
            .eq('id', row.id),
          DB_TIMEOUT_MS,
          `${AGENT_NAME}.claim-release`,
        );
        if (releaseError) reportSupabaseError(`${AGENT_NAME}.claim-release`, releaseError, { table: 'practitioner_email_queue' });
      } catch (e) {
        safeLog.warn(AGENT_NAME, 'claim-release write threw; row left in sending for stuck-claim triage', { error: e });
      }
      failed++;
      continue;
    }

    if (!w) {
      try {
        const { error: markError } = await withTimeout(
          db.from('practitioner_email_queue')
            .update({ status: 'failed', last_error: 'waitlist row missing', updated_at: new Date().toISOString() })
            .eq('id', row.id),
          DB_TIMEOUT_MS,
          `${AGENT_NAME}.mark-missing`,
        );
        if (markError) reportSupabaseError(`${AGENT_NAME}.mark-missing`, markError, { table: 'practitioner_email_queue' });
      } catch (e) {
        safeLog.warn(AGENT_NAME, 'mark-missing write threw; row left in sending for stuck-claim triage', { error: e });
      }
      failed++;
      continue;
    }

    // CONSENT: the voluntary application form submission is the consent
    // event (the F3 AFTER INSERT trigger is the only enqueue path);
    // unsubscribed is the ongoing-consent filter, re-checked at send time.
    if (w.unsubscribed) {
      try {
        const { error: skipError } = await withTimeout(
          db.from('practitioner_email_queue')
            .update({ status: 'skipped', updated_at: new Date().toISOString() })
            .eq('id', row.id),
          DB_TIMEOUT_MS,
          `${AGENT_NAME}.mark-skipped`,
        );
        if (skipError) reportSupabaseError(`${AGENT_NAME}.mark-skipped`, skipError, { table: 'practitioner_email_queue' });
      } catch (e) {
        safeLog.warn(AGENT_NAME, 'mark-skipped write threw; row left in sending for stuck-claim triage', { error: e });
      }
      skipped++;
      continue;
    }

    try {
      // COMPLIANCE (F4b): the unsubscribe link is signed per lead from the
      // waitlist row id; renderEmail appends it plus the postal address
      // slot. Built inside this try so an unexpected crypto failure takes
      // the retryable send-failure path instead of crashing the loop.
      const rendered = renderEmail(row.step, w, await buildUnsubscribeUrl(w.id));
      await smtpBreaker.execute(() =>
        withTimeout(
          sendViaSupabaseSmtp({
            to: w.email,
            subject: rendered.subject,
            text: rendered.text,
            html: rendered.html,
          }),
          SMTP_TIMEOUT_MS,
          `${AGENT_NAME}.send.step-${row.step}`,
        )
      );
      sent++;
      // IDEMPOTENCY: the email is out. If the sent-mark write fails the row
      // must stay 'sending' (never back to pending): the pending-only
      // candidate query guarantees no resend, and the stuck-claim scan
      // surfaces the row for manual reconciliation.
      // F4-fix: the nested try/catch is load-bearing. A mark-sent timeout
      // must take THIS error path (row left at 'sending'), never the outer
      // send-failure catch, which would set the row back to pending after
      // the email already went out (double-send hazard).
      let sentMarkError: unknown = null;
      try {
        const { error: sentError } = await withTimeout(
          db.from('practitioner_email_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', row.id),
          DB_TIMEOUT_MS,
          `${AGENT_NAME}.mark-sent`,
        );
        sentMarkError = sentError ?? null;
      } catch (markSentThrew) {
        sentMarkError = markSentThrew;
      }
      if (sentMarkError) {
        reportSupabaseError(`${AGENT_NAME}.mark-sent`, sentMarkError, { table: 'practitioner_email_queue' });
        safeLog.error(AGENT_NAME, 'email sent but sent-mark failed; row left in sending for stuck-claim triage', { step: row.step });
      }
      const { error: progressError } = await db.from('practitioner_waitlist')
        .update({ last_email_sent_at: new Date().toISOString(), email_sequence_step: row.step, updated_at: new Date().toISOString() })
        .eq('id', w.id);
      if (progressError) reportSupabaseError(`${AGENT_NAME}.waitlist-progress`, progressError, { table: 'practitioner_waitlist' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'send failed';
      if (isCircuitBreakerError(e)) safeLog.warn(AGENT_NAME, 'smtp circuit open', { queueId: row.id, step: row.step, error: e });
      else if (isTimeoutError(e)) safeLog.warn(AGENT_NAME, 'smtp timeout', { queueId: row.id, step: row.step, error: e });
      else safeLog.error(AGENT_NAME, 'smtp send failed', { queueId: row.id, step: row.step, error: e });
      const retryStatus = nextRetryStatus(attemptsAfterClaim);
      // F4-fix: bounded and throw-contained. A mark-failed timeout inside
      // this catch block must not escape (it would crash the loop); the row
      // stays 'sending' and the stuck-claim scan surfaces it.
      try {
        const { error: failError } = await withTimeout(
          db.from('practitioner_email_queue')
            .update({
              status: retryStatus,
              last_error: msg,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id),
          DB_TIMEOUT_MS,
          `${AGENT_NAME}.mark-failed`,
        );
        if (failError) reportSupabaseError(`${AGENT_NAME}.mark-failed`, failError, { table: 'practitioner_email_queue' });
      } catch (markFailedThrew) {
        safeLog.warn(AGENT_NAME, 'mark-failed write threw; row left in sending for stuck-claim triage', { error: markFailedThrew });
      }

      // On permanent fail, surface to Jeffery's admin LiveFeed so the
      // burndown is visible. Best-effort; do not block the loop.
      if (retryStatus === 'failed') {
        try {
          const { error: msgError } = await db.from('agent_messages').insert({
            from_agent: AGENT_NAME,
            to_agent: 'jeffery',
            message_type: 'mailer_permanent_fail',
            user_id: null,
            payload: {
              queue_id: row.id,
              waitlist_id: w.id,
              step: row.step,
              attempts: attemptsAfterClaim,
              last_error: msg,
            },
            status: 'pending',
          });
          if (msgError) reportSupabaseError(`${AGENT_NAME}.agent-message`, msgError, { table: 'agent_messages' });
        } catch {
          // ignore secondary failure; primary status is already failed
        }
      }
      failed++;
    }
  }

  // HEALTH: end-of-run heartbeat. Counts only, no PII.
  const runStatus: 'ok' | 'degraded' = failed > 0 || claimedStuck > 0 ? 'degraded' : 'ok';
  const counts = {
    due: dueCount,
    fetched: rows.length,
    claimed,
    claim_lost: claimLost,
    sent,
    failed,
    skipped,
    capped,
    claimed_stuck: claimedStuck,
    sent_today_before: sentToday,
    deadline_stopped: deadlineStopped,
    duration_ms: Date.now() - startedAt,
  };
  await beat(db, runId, 'end', runStatus, counts);

  return json({ status: 'ok', ...counts });
});
