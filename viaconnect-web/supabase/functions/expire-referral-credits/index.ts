// =============================================================================
// expire-referral-credits Edge Function
// =============================================================================
// Monthly tick. Two passes:
//   1. For each practitioner with ledger activity, walk their ledger
//      FIFO and emit `expired` rows for any earned amount past the
//      24-month window still unused.
//   2. Dispatch warning notifications for earned entries entering the
//      90/60/30/7 day window. Phase 4's dispatcher pattern: log
//      structured payloads; Phase 7 wires the mailer.
//
// Inlines the pure numerics (kept in lockstep with
// src/lib/practitioner-referral/credit-expiration.ts).
//
// Heartbeats to ultrathink_agent_registry.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EXPIRATION_MONTHS = 24;
const WARNING_WINDOWS_DAYS = [90, 60, 30, 7];
const DAYS_PER_MONTH = 30;    // advisory math only

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
async function heartbeat(db: SupabaseClient, runId: string, ok: boolean, payload: Record<string, unknown>) {
  try {
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'expire-referral-credits',
      p_run_id: runId,
      p_event_type: ok ? 'heartbeat' : 'error',
      p_payload: payload,
      p_severity: ok ? 'info' : 'warning',
    });
  } catch (e) {
    console.warn('[expire-referral-credits] heartbeat failed', (e as Error).message);
  }
}

interface LedgerRow {
  id: string;
  practitioner_id: string;
  entry_type: string;
  amount_cents: number;
  created_at: string;
}

// FIFO: find earned_from_milestone rows whose unconsumed residual is
// past the expiration window.
function computeExpirations(rows: LedgerRow[], now: Date): Array<{ source_entry_id: string; amount_cents: number; practitioner_id: string }> {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  interface Bucket { id: string; practitioner_id: string; earned_at: string; remaining_cents: number }
  const buckets: Bucket[] = [];

  for (const e of sorted) {
    if (e.entry_type === 'earned_from_milestone' && e.amount_cents > 0) {
      buckets.push({ id: e.id, practitioner_id: e.practitioner_id, earned_at: e.created_at, remaining_cents: e.amount_cents });
      continue;
    }
    if (e.amount_cents < 0) {
      let toConsume = Math.abs(e.amount_cents);
      for (const b of buckets) {
        if (b.practitioner_id !== e.practitioner_id) continue;
        if (toConsume <= 0) break;
        if (b.remaining_cents <= 0) continue;
        const take = Math.min(b.remaining_cents, toConsume);
        b.remaining_cents -= take;
        toConsume -= take;
      }
      continue;
    }
    if (e.entry_type === 'admin_adjustment' && e.amount_cents > 0) {
      buckets.push({ id: e.id, practitioner_id: e.practitioner_id, earned_at: e.created_at, remaining_cents: e.amount_cents });
    }
  }

  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - EXPIRATION_MONTHS);

  return buckets
    .filter((b) => b.remaining_cents > 0 && new Date(b.earned_at).getTime() <= cutoff.getTime())
    .map((b) => ({ source_entry_id: b.id, amount_cents: b.remaining_cents, practitioner_id: b.practitioner_id }));
}

function warningWindowForEntry(earnedAtIso: string, now: Date): number | null {
  const expMs = new Date(earnedAtIso).getTime() + EXPIRATION_MONTHS * DAYS_PER_MONTH * 86_400_000;
  const daysLeft = Math.floor((expMs - now.getTime()) / 86_400_000);
  if (daysLeft < 0 || daysLeft > WARNING_WINDOWS_DAYS[0]) return null;
  let best = WARNING_WINDOWS_DAYS[0];
  for (const w of WARNING_WINDOWS_DAYS) {
    if (daysLeft <= w && w < best) best = w;
  }
  return best;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const now = new Date();

  try {
    // Pass 1: load all relevant ledger rows in one query and group in memory.
    // Filter to the last 30 months so we see old earns + their consumers.
    const since = new Date(now);
    since.setUTCMonth(since.getUTCMonth() - (EXPIRATION_MONTHS + 6));

    const { data: rows, error } = await db
      .from('practitioner_referral_credit_ledger')
      .select('id, practitioner_id, entry_type, amount_cents, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .limit(100_000);
    if (error) {
      console.warn('[expire-referral-credits] ledger scan failed', error.message);
      await heartbeat(db, runId, false, { error: error.message });
      return json({ status: 'failed', error: error.message }, 500);
    }

    const expirations = computeExpirations((rows ?? []) as LedgerRow[], now);

    let expiredCount = 0;
    let expiredTotalCents = 0;
    for (const e of expirations) {
      // Idempotency: skip if an expiration entry already exists for
      // this source (we match by milestone_event_id tie-back would
      // be cleaner, but source_entry_id is unique per ledger row so
      // we can check notes text).
      const { data: already } = await db
        .from('practitioner_referral_credit_ledger')
        .select('id')
        .eq('practitioner_id', e.practitioner_id)
        .eq('entry_type', 'expired')
        .like('notes', `%${e.source_entry_id}%`)
        .maybeSingle();
      if (already) continue;

      const { data: balance } = await db
        .from('practitioner_referral_credit_balances')
        .select('current_balance_cents')
        .eq('practitioner_id', e.practitioner_id)
        .maybeSingle();
      const runningBalance = (balance?.current_balance_cents ?? 0) - e.amount_cents;

      const { error: insertErr } = await db
        .from('practitioner_referral_credit_ledger')
        .insert({
          practitioner_id: e.practitioner_id,
          entry_type: 'expired',
          amount_cents: -e.amount_cents,
          running_balance_cents: runningBalance,
          notes: `Expired unused residual from source ${e.source_entry_id} (24mo window)`,
        });
      if (!insertErr) {
        expiredCount++;
        expiredTotalCents += e.amount_cents;
      } else {
        console.warn('[expire-referral-credits] expiration insert failed', insertErr.message);
      }
    }

    // Pass 2: warning notifications for entries entering the 90/60/30/7 window.
    let warningsDispatched = 0;
    const byPrac = new Map<string, LedgerRow[]>();
    for (const r of (rows ?? []) as LedgerRow[]) {
      if (r.entry_type !== 'earned_from_milestone') continue;
      const arr = byPrac.get(r.practitioner_id) ?? [];
      arr.push(r);
      byPrac.set(r.practitioner_id, arr);
    }
    for (const [practitionerId, earned] of byPrac.entries()) {
      // Only warn when the practitioner still has positive balance;
      // otherwise the residual is already zero (all consumed).
      const { data: bal } = await db
        .from('practitioner_referral_credit_balances')
        .select('current_balance_cents')
        .eq('practitioner_id', practitionerId)
        .maybeSingle();
      if ((bal?.current_balance_cents ?? 0) <= 0) continue;

      for (const e of earned) {
        const window = warningWindowForEntry(e.created_at, now);
        if (window === null) continue;
        console.log('[expire-referral-credits] warning', {
          practitioner_id: practitionerId,
          source_entry_id: e.id,
          window_days: window,
          earned_at: e.created_at,
          amount_cents: e.amount_cents,
        });
        warningsDispatched++;
      }
    }

    await heartbeat(db, runId, true, {
      expired_entries: expiredCount,
      expired_total_cents: expiredTotalCents,
      warnings_dispatched: warningsDispatched,
      durationMs: Date.now() - startedAt,
    });
    return json({ status: 'ok', runId, expired_entries: expiredCount, expired_total_cents: expiredTotalCents, warnings_dispatched: warningsDispatched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await heartbeat(db, runId, false, { error: msg });
    return json({ status: 'failed', error: msg }, 500);
  }
});
