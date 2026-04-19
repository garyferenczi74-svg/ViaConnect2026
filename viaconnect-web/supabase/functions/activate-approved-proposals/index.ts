// Prompt #95 Phase 6: hourly activation of approved proposals.
//
// Scans pricing_proposals for rows where:
//   status = 'approved_pending_activation'
//   proposed_effective_date <= today
// and calls the same activation RPC (inlined here since Deno can't import
// from src/). For each, updates target table, snapshots grandfathering,
// writes price_change_history, and transitions the proposal status.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Service credentials not configured' }, 500);

  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_KEY}`) return json({ error: 'Unauthorized' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: candidates, error } = await db
    .from('pricing_proposals')
    .select('id, initiated_by')
    .eq('status', 'approved_pending_activation')
    .lte('proposed_effective_date', todayIso);
  if (error) return json({ error: error.message }, 500);

  const rows = (candidates ?? []) as Array<{ id: string; initiated_by: string }>;
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const row of rows) {
    try {
      const result = await activate(db, row.id, row.initiated_by);
      results.push({ id: row.id, ok: result.ok, error: result.error });
    } catch (err) {
      results.push({
        id: row.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await db.from('ultrathink_agent_events').insert({
    agent_name: 'activate-approved-proposals',
    event_type: rows.length === 0 ? 'heartbeat' : 'complete',
    payload: { processed: rows.length, results: results.slice(0, 10) },
  });

  return json({ processed: rows.length, results });
});

interface ActivationOutcome {
  ok: boolean;
  error?: string;
}

async function activate(
  db: SupabaseClient,
  proposalId: string,
  actorUserId: string,
): Promise<ActivationOutcome> {
  const { data: proposalData } = await db
    .from('pricing_proposals')
    .select('*')
    .eq('id', proposalId)
    .maybeSingle();
  const proposal = proposalData as Record<string, unknown> | null;
  if (!proposal) return { ok: false, error: 'Proposal not found' };

  const { data: domainData } = await db
    .from('pricing_domains')
    .select('id, category, target_table, target_column, is_active')
    .eq('id', proposal.pricing_domain_id as string)
    .maybeSingle();
  const domain = domainData as
    | { id: string; category: string; target_table: string; target_column: string; is_active: boolean }
    | null;
  if (!domain) return { ok: false, error: 'Domain not found' };
  if (!domain.is_active) return { ok: false, error: 'Domain pending dependency' };

  const grandfathering = proposal.grandfathering_policy as string;

  // Snapshot customers if grandfathering applies. Only consumer_subscription
  // is implemented live; others return 0 or throw.
  let bindingsCreated = 0;
  if (grandfathering !== 'no_grandfathering' && domain.category === 'consumer_subscription') {
    const billingCycle = (proposal.pricing_domain_id as string).endsWith('monthly')
      ? 'monthly'
      : 'annual';
    const tierId = ((proposal.target_object_ids as string[]) ?? [])[0];
    if (tierId) {
      const { data: members } = await db
        .from('memberships')
        .select('user_id')
        .eq('tier_id', tierId)
        .eq('billing_cycle', billingCycle)
        .eq('status', 'active');
      const rowsToInsert = ((members ?? []) as Array<{ user_id: string }>).map((m) => ({
        user_id: m.user_id,
        pricing_domain_id: proposal.pricing_domain_id as string,
        target_object_id: tierId,
        bound_value_cents: proposal.current_value_cents as number | null,
        bound_value_percent: proposal.current_value_percent as number | null,
        authorized_by_proposal_id: proposalId,
        grandfathering_policy: grandfathering,
        binding_expires_at: computeExpiresIso(grandfathering),
      }));
      if (rowsToInsert.length > 0) {
        const { error: bErr } = await db.from('customer_price_bindings').insert(rowsToInsert);
        if (bErr) return { ok: false, error: `Binding snapshot failed: ${bErr.message}` };
        bindingsCreated = rowsToInsert.length;
      }
    }
  }

  // Update target table.
  const updatePayload: Record<string, unknown> = {};
  if (proposal.change_type === 'price_amount') {
    updatePayload[domain.target_column] = proposal.proposed_value_cents;
  } else {
    updatePayload[domain.target_column] = proposal.proposed_value_percent;
  }
  const targetIds = (proposal.target_object_ids as string[]) ?? [];
  if (targetIds.length === 0) return { ok: false, error: 'No target_object_ids' };

  const { error: tErr } = await db
    .from(domain.target_table)
    .update(updatePayload)
    .in('id', targetIds);
  if (tErr) return { ok: false, error: `Target update failed: ${tErr.message}` };

  // Price history.
  await db.from('price_change_history').insert({
    proposal_id: proposalId,
    pricing_domain_id: domain.id,
    target_object_id: targetIds[0],
    previous_value_cents: proposal.current_value_cents as number | null,
    new_value_cents: proposal.proposed_value_cents as number | null,
    previous_value_percent: proposal.current_value_percent as number | null,
    new_value_percent: proposal.proposed_value_percent as number | null,
    change_action: 'activation',
    applied_by_user_id: actorUserId,
  });

  // Proposal transition.
  await db
    .from('pricing_proposals')
    .update({
      status: 'activated',
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  return { ok: true };
}

function computeExpiresIso(policy: string): string | null {
  if (policy === 'indefinite') return null;
  const now = new Date();
  switch (policy) {
    case 'twelve_months':
      now.setUTCMonth(now.getUTCMonth() + 12);
      return now.toISOString();
    case 'six_months':
      now.setUTCMonth(now.getUTCMonth() + 6);
      return now.toISOString();
    case 'thirty_days':
      now.setUTCDate(now.getUTCDate() + 30);
      return now.toISOString();
    default:
      return null;
  }
}
