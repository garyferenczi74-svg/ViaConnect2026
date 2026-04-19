// Prompt #93 Phase 5: scheduled flag activation execution job.
//
// Runs every five minutes via pg_cron. Finds rows in
// scheduled_flag_activations where scheduled_for <= NOW() AND
// executed_at IS NULL AND canceled_at IS NULL and applies them.
//
// Dispatch logic is pure (buildUpdateForAction) so it can be unit-tested
// without Deno / Supabase. This file wires the pure function to a serve()
// loop and writes audit + execution_result rows.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

interface ActivationRow {
  id: string;
  feature_id: string;
  target_action: string;
  target_value: Record<string, unknown>;
  scheduled_for: string;
  scheduled_by: string;
}

interface ExecutionPlan {
  target: 'features' | 'launch_phases';
  id: string;
  updates: Record<string, unknown>;
  auditChangeType: string | null;
}

/** Pure: translate a scheduled activation row into the database updates
 *  that should be applied. Returns null if the action is unknown. */
export function buildExecutionPlan(row: ActivationRow): ExecutionPlan | null {
  const nowIso = new Date().toISOString();

  switch (row.target_action) {
    case 'activate':
      return {
        target: 'features',
        id: row.feature_id,
        updates: { is_active: true },
        auditChangeType: 'activated',
      };
    case 'deactivate':
      return {
        target: 'features',
        id: row.feature_id,
        updates: { is_active: false },
        auditChangeType: 'deactivated',
      };
    case 'kill_switch_engage': {
      const reason = typeof row.target_value?.reason === 'string'
        ? row.target_value.reason
        : 'Scheduled activation';
      return {
        target: 'features',
        id: row.feature_id,
        updates: {
          kill_switch_engaged: true,
          kill_switch_engaged_at: nowIso,
          kill_switch_engaged_by: row.scheduled_by,
          kill_switch_reason: reason,
        },
        auditChangeType: 'kill_switch_engaged',
      };
    }
    case 'kill_switch_release':
      return {
        target: 'features',
        id: row.feature_id,
        updates: {
          kill_switch_engaged: false,
          kill_switch_engaged_at: null,
          kill_switch_engaged_by: null,
          kill_switch_reason: null,
        },
        auditChangeType: 'kill_switch_released',
      };
    case 'rollout_percentage_change': {
      const percentage = typeof row.target_value?.percentage === 'number'
        ? row.target_value.percentage
        : null;
      if (percentage === null || percentage < 0 || percentage > 100) return null;
      return {
        target: 'features',
        id: row.feature_id,
        updates: { rollout_percentage: percentage },
        auditChangeType: 'rollout_percentage_changed',
      };
    }
    case 'phase_advance': {
      const phaseId = typeof row.target_value?.phase_id === 'string'
        ? row.target_value.phase_id
        : null;
      const newStatus = typeof row.target_value?.new_status === 'string'
        ? row.target_value.new_status
        : 'active';
      if (!phaseId) return null;
      const updates: Record<string, unknown> = {
        activation_status: newStatus,
        updated_at: nowIso,
      };
      if (newStatus === 'active') {
        updates.actual_activation_date = nowIso.slice(0, 10);
      }
      return {
        target: 'launch_phases',
        id: phaseId,
        updates,
        auditChangeType: null, // phase changes are not written to feature_flag_audit
      };
    }
    default:
      return null;
  }
}

async function executePlan(db: SupabaseClient, plan: ExecutionPlan, row: ActivationRow) {
  const { error } = await db.from(plan.target).update(plan.updates).eq('id', plan.id);
  if (error) throw new Error(`Update ${plan.target} failed: ${error.message}`);

  if (plan.auditChangeType && plan.target === 'features') {
    await db.from('feature_flag_audit').insert({
      feature_id: plan.id,
      change_type: plan.auditChangeType,
      new_state: plan.updates,
      change_reason: `Scheduled activation executed (id=${row.id})`,
      changed_by: row.scheduled_by,
    });
  }
}

async function writeHeartbeat(db: SupabaseClient, eventType: string, payload: Record<string, unknown>) {
  // Agent registry heartbeat so Jeffery supervisor can track liveness.
  try {
    await db.from('ultrathink_agent_events').insert({
      agent_name: 'execute-scheduled-flags',
      event_type: eventType,
      payload,
    });
  } catch (_) {
    // Heartbeat is best-effort; do not fail the batch if the registry table
    // is unavailable.
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Service credentials not configured' }, 500);
  }

  // Defense-in-depth auth: verify_jwt=true is set at deploy, but we also
  // require the caller present the service-role bearer so even a mis-deploy
  // does not expose the scheduled-flag sweep to anonymous callers.
  const authHeader = req.headers.get('authorization') ?? '';
  const expectedBearer = `Bearer ${SERVICE_KEY}`;
  if (authHeader !== expectedBearer) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Atomic claim. FOR UPDATE SKIP LOCKED inside the RPC guarantees no two
  // concurrent workers ever pick the same row.
  const { data: claimed, error: fetchErr } = await db.rpc(
    'claim_pending_flag_activations',
    { p_limit: 100 },
  );

  if (fetchErr) {
    return json({ error: `Claim failed: ${fetchErr.message}` }, 500);
  }

  const rows = (claimed ?? []) as ActivationRow[];
  let ok = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const row of rows) {
    const plan = buildExecutionPlan(row);
    if (!plan) {
      failed += 1;
      errors.push({ id: row.id, error: `Unsupported target_action: ${row.target_action}` });
      await db
        .from('scheduled_flag_activations')
        .update({
          executed_at: new Date().toISOString(),
          execution_result: 'failed',
          execution_error: `Unsupported target_action: ${row.target_action}`,
        })
        .eq('id', row.id);
      continue;
    }
    try {
      await executePlan(db, plan, row);
      await db
        .from('scheduled_flag_activations')
        .update({
          executed_at: new Date().toISOString(),
          execution_result: 'success',
        })
        .eq('id', row.id);
      ok += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ id: row.id, error: message });
      await db
        .from('scheduled_flag_activations')
        .update({
          executed_at: new Date().toISOString(),
          execution_result: 'failed',
          execution_error: message,
        })
        .eq('id', row.id);
    }
  }

  await writeHeartbeat(db, rows.length === 0 ? 'heartbeat' : 'complete', {
    processed: rows.length,
    ok,
    failed,
    errors: errors.slice(0, 5),
  });

  return json({ processed: rows.length, ok, failed, errors: errors.slice(0, 10) });
});
