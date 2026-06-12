// =============================================================================
// nutrition-insights-weekly Edge Function (Prompt 192 Task 3)
// =============================================================================
// Thin cron relay. pg_cron (nutrition_insights_weekly_cron) invokes this
// function with no auth header (deployed verify_jwt=false, brand-enricher
// pattern); the relay forwards the shared INSIGHTS_CRON_SECRET as the
// Bearer token to the Next.js cron route, which is the real gate (timing
// safe CRON_SECRET check). Blast radius is contained: this function only
// POSTs { trigger: 'weekly' } to our own API.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.viaconnectapp.com';
const CRON_SECRET = Deno.env.get('INSIGHTS_CRON_SECRET') ?? Deno.env.get('CRON_SECRET') ?? '';
const TRIGGER = 'weekly';
const RELAY_TIMEOUT_MS = 110000; // under the pg_cron 120s http timeout

function logEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  fields: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({ scope: 'insights.cron-relay.weekly', level, message, ...fields }),
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const startedAt = Date.now();
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  if (!CRON_SECRET) {
    logEvent('error', 'INSIGHTS_CRON_SECRET not configured', { duration_ms: 0 });
    return json({ error: 'relay secret not configured' }, 500);
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);
  try {
    const res = await fetch(`${SITE_URL}/api/nutrition/insights/cron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({ trigger: TRIGGER }),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    logEvent(res.ok ? 'info' : 'warn', 'relay completed', {
      status: res.status,
      duration_ms: Date.now() - startedAt,
      body: text.slice(0, 300),
    });
    return new Response(text || JSON.stringify({ ok: res.ok }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logEvent('error', 'relay failed', {
      duration_ms: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    return json({ error: 'relay failed' }, 502);
  } finally {
    clearTimeout(timeoutHandle);
  }
});
