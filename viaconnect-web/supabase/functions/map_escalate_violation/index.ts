// Prompt #100 map_escalate_violation
// Reads violations the DB promoted to 'escalated' (via
// process_expired_map_grace_periods) and emits the commission
// clawback event. Respects fair-enforcement §3.4 by skipping
// anonymous violations (they're in the investigation queue).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Keep in sync with src/lib/map/clawback-events.ts CLAWBACK_PCT.
// Mirrored here because the Deno edge runtime cannot import the
// Node/Next lib module.
const CLAWBACK_PCT = { yellow: 0, orange: 25, red: 50, black: 100 } as const;

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Pull escalated violations that have a practitioner + haven't
  // already emitted a clawback event (event_type='map_violation_escalated').
  const { data } = await (supabase as any)
    .from('map_violations')
    .select('violation_id, practitioner_id, product_id, severity, escalated_at')
    .eq('status', 'escalated')
    .not('practitioner_id', 'is', null);
  const escalated = (data ?? []) as Array<{
    violation_id: string;
    practitioner_id: string;
    product_id: string;
    severity: keyof typeof CLAWBACK_PCT;
    escalated_at: string;
  }>;

  let emitted = 0;
  for (const v of escalated) {
    const pct = CLAWBACK_PCT[v.severity];
    if (pct === 0) continue;
    // Check if an event already exists for this violation.
    const { data: existing } = await (supabase as any)
      .from('data_events')
      .select('id')
      .eq('event_type', 'map_violation_escalated')
      .contains('event_data', { violationId: v.violation_id })
      .maybeSingle();
    if (existing) continue;

    await (supabase as any).from('data_events').insert({
      user_id: v.practitioner_id,
      event_type: 'map_violation_escalated',
      event_data: {
        violationId: v.violation_id,
        practitionerId: v.practitioner_id,
        productId: v.product_id,
        severity: v.severity,
        clawbackPct: pct,
        allSkuHold: v.severity === 'black',
        holdDays: v.severity === 'black' ? 30 : 0,
        emittedAt: new Date().toISOString(),
      },
      cascade_actions: ['commission_clawback_apply'],
    });
    emitted += 1;
  }

  return jsonResponse({ escalated_count: escalated.length, events_emitted: emitted });
});
