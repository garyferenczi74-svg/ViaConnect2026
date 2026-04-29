// =============================================================================
// soc2_packet_generator Edge Function (Prompt #122 P5)
// =============================================================================
// Thin shim that lets pg_cron trigger SOC 2 packet generation without pulling
// the Node-side assembly code (orchestrator, signer, fflate) into Deno. The
// heavy lifting runs on the Next.js serverless runtime at
// POST /api/admin/soc2/packets/generate, which this function invokes.
//
// Responsibilities here:
//   1. Resolve the period. `mode: 'monthly'` → the previous full calendar month.
//                          `mode: 'adhoc'`   → period provided in the body.
//   2. Emit a heartbeat to ultrathink_agent_events so Jeffery sees it ran.
//   3. Call the Next.js orchestrator endpoint with a shared-secret token.
//   4. Record the outcome as a second ultrathink_agent_events row.
//
// Triggered by pg_cron at 04:07 UTC on the 2nd of each month (see
// 20260424001200_prompt_122_p5_scheduler.sql). Can also be invoked on-demand
// from the admin UI by POSTing to this function directly.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY         = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NEXTJS_ORIGIN       = Deno.env.get('NEXTJS_ORIGIN') ?? 'https://viaconnectapp.com';
const INTERNAL_TOKEN      = Deno.env.get('SOC2_INTERNAL_TOKEN') ?? '';
const AGENT_NAME          = 'soc2_packet_generator';
const INVOCATION_TIMEOUT  = 290_000; // 5 min minus buffer; orchestrator should finish in ≤ 2 min

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface InvokeBody {
  mode?: 'monthly' | 'adhoc';
  periodStart?: string; // ISO-8601 UTC; required if mode=adhoc
  periodEnd?: string;   // ISO-8601 UTC; required if mode=adhoc
  attestationType?: 'Type I' | 'Type II';
}

interface Period {
  start: string;
  end: string;
}

function previousCalendarMonthUtc(now = new Date()): Period {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-based current month
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  // End = start of current month - 1 ms to stay within the prior month.
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function emitAgentEvent(
  supabase: SupabaseClient,
  eventType: 'heartbeat' | 'start' | 'complete' | 'failure',
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('ultrathink_agent_events').insert({
    agent_name: AGENT_NAME,
    event_type: eventType,
    payload,
  });
  if (error) {
    console.error(`agent_event insert failed (${eventType})`, error);
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const body: InvokeBody = await req.json().catch(() => ({} as InvokeBody));
  const supabase = admin();

  await emitAgentEvent(supabase, 'heartbeat', { mode: body.mode ?? 'monthly' });

  let period: Period;
  if (body.mode === 'adhoc' && body.periodStart && body.periodEnd) {
    period = { start: body.periodStart, end: body.periodEnd };
  } else {
    period = previousCalendarMonthUtc();
  }

  await emitAgentEvent(supabase, 'start', {
    period_start: period.start,
    period_end: period.end,
    attestation_type: body.attestationType ?? 'Type II',
  });

  const url = `${NEXTJS_ORIGIN}/api/admin/soc2/packets/generate`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INVOCATION_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-soc2-internal-token': INTERNAL_TOKEN,
      },
      body: JSON.stringify({
        period,
        attestationType: body.attestationType ?? 'Type II',
        generatedBy: 'cron:monthly',
      }),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => '');
    const parsed = safeJson(text);

    if (res.ok) {
      await emitAgentEvent(supabase, 'complete', {
        http_status: res.status,
        packet_id: parsed?.packetId ?? null,
        packet_uuid: parsed?.packetUuid ?? null,
        storage_key: parsed?.storageKey ?? null,
      });
      return json({ ok: true, ...parsed }, 200);
    }

    await emitAgentEvent(supabase, 'failure', {
      http_status: res.status,
      body_excerpt: text.slice(0, 1000),
    });
    return json({ ok: false, httpStatus: res.status, body: text.slice(0, 1000) }, 500);
  } catch (err) {
    const msg = (err as Error).message;
    await emitAgentEvent(supabase, 'failure', { error: msg });
    return json({ ok: false, error: msg }, 500);
  } finally {
    clearTimeout(timer);
  }
});

function safeJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}
