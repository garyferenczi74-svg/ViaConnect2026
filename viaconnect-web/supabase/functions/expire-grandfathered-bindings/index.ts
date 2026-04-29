// Prompt #95 Phase 5: daily grandfathering expiration job.
//
// Runs daily via pg_cron. Flips customer_price_bindings rows to status=expired
// when binding_expires_at <= NOW(). Notification emails (14 days before +
// 1 day after) are deferred to Phase 7; this job only handles the state
// transition.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Service credentials not configured' }, 500);
  }

  // Defense-in-depth bearer check.
  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_KEY}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowIso = new Date().toISOString();

  const { data: rows, error: fetchErr } = await db
    .from('customer_price_bindings')
    .select('id')
    .eq('status', 'active')
    .not('binding_expires_at', 'is', null)
    .lte('binding_expires_at', nowIso);

  if (fetchErr) return json({ error: fetchErr.message }, 500);

  const ids = ((rows ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ids.length === 0) {
    await db.from('ultrathink_agent_events').insert({
      agent_name: 'expire-grandfathered-bindings',
      event_type: 'heartbeat',
      payload: { expired: 0 },
    });
    return json({ expired: 0 });
  }

  const { error: updateErr } = await db
    .from('customer_price_bindings')
    .update({ status: 'expired', updated_at: nowIso })
    .in('id', ids);
  if (updateErr) return json({ error: updateErr.message }, 500);

  await db.from('ultrathink_agent_events').insert({
    agent_name: 'expire-grandfathered-bindings',
    event_type: 'complete',
    payload: { expired: ids.length, at: nowIso },
  });

  return json({ expired: ids.length });
});
