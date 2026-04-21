// Prompt #105 Phase 2a — compute aggregation snapshot.
//
// Orchestrates the draft → computing → computed lifecycle. Callers supply
// pre-computed KPI values (the math runs in SQL / RPCs upstream of this
// function); this endpoint is responsible for:
//   1. Creating or fetching the draft aggregation_snapshot for a period.
//   2. Transitioning draft → computing (state-machine gated).
//   3. Inserting one row per KPI into board_pack_kpi_snapshots with
//      provenance JSON (source prompt, SQL hash, computation method).
//   4. Transitioning computing → computed.
//   5. Writing audit entries at each step.
//
// Contract:
//   POST { periodType, periodStart, periodEnd, asOfTimestamp, kpis: [...] }
//   Response { snapshot_id, state, kpis_written }
//
// EXCLUDES: any individual-user Helix data, legal privileged communications,
// practitioner tax document contents. Only aggregate KPIs referenced by
// kpi_library may be written — guardrail scan runs on every submitted KPI.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient,
  canWriteExec,
  corsPreflight,
  EXEC_ERRORS,
  jsonResponse,
  resolveActor,
} from '../_exec_reporting_shared/shared.ts';

interface KPIInput {
  kpiId: string;
  kpiVersion: number;
  unit: string;
  computedValueNumeric?: number | null;
  computedValueInteger?: number | null;
  computedValueJson?: Record<string, unknown> | null;
  priorPeriodValue?: number | null;
  comparisonDeltaPct?: number | null;
  sourceQuery: string;
  sourcePrompt: string;
  sourceTable: string;
  computationMethod: string;
}

interface ComputeRequest {
  periodType: 'monthly' | 'quarterly' | 'annual' | 'trailing_12_months' | 'ytd' | 'ad_hoc';
  periodStart: string;
  periodEnd: string;
  asOfTimestamp: string;
  kpis: KPIInput[];
}

function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.replace(/\s+/g, ' ').trim());
  return crypto.subtle.digest('SHA-256', data).then((buf) => {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

// Conservative guardrail: reject any KPI whose source_table or kpi_id
// references a forbidden upstream. Mirrors the library-side scanForForbiddenExecTokens
// but runs here so bad data can't be persisted.
// SOURCE OF TRUTH: src/lib/executiveReporting/guardrails.ts (FORBIDDEN_EXEC_TOKENS).
// Deno cannot import Node TS directly; keep this list in sync if the lib changes.
const FORBIDDEN_SUBSTRINGS = [
  'helix_challenges',
  'helix_redemptions.user_id',
  'helix_user_balances',
  'legal_privileged_communications',
  'practitioner_tax_documents.',
  'caq_submissions',
];

function guardrailReject(input: KPIInput): string | null {
  const haystack = [input.kpiId, input.sourceTable, input.sourceQuery].join(' ').toLowerCase();
  for (const tok of FORBIDDEN_SUBSTRINGS) {
    if (haystack.includes(tok)) return tok;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveActor(req);
  if (!actor) return jsonResponse({ error: EXEC_ERRORS.MISSING_JWT }, 401);
  if (!canWriteExec(actor.role)) {
    return jsonResponse({ error: EXEC_ERRORS.FORBIDDEN_ROLE, role: actor.role }, 403);
  }

  let body: ComputeRequest;
  try {
    body = (await req.json()) as ComputeRequest;
  } catch {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'invalid JSON' }, 400);
  }

  if (!body.periodType || !body.periodStart || !body.periodEnd || !body.asOfTimestamp) {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'period fields required' }, 400);
  }
  if (!Array.isArray(body.kpis) || body.kpis.length === 0) {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'kpis array required' }, 400);
  }

  for (const k of body.kpis) {
    const hit = guardrailReject(k);
    if (hit) {
      return jsonResponse({
        error: 'FORBIDDEN_KPI_SOURCE',
        detail: `KPI references forbidden upstream: ${hit}`,
        kpi: k.kpiId,
      }, 422);
    }
  }

  const admin = adminClient() as any;

  // 1. Upsert draft aggregation_snapshot for the period.
  const { data: existing, error: exErr } = await admin
    .from('aggregation_snapshots')
    .select('snapshot_id, state')
    .eq('period_type', body.periodType)
    .eq('period_start', body.periodStart)
    .eq('period_end', body.periodEnd)
    .maybeSingle();
  if (exErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: exErr.message }, 500);

  let snapshotId: string;
  let fromState = 'draft';
  if (existing) {
    if (!['draft', 'computing', 'failed'].includes(existing.state)) {
      return jsonResponse({
        error: EXEC_ERRORS.CONFLICT,
        detail: `snapshot in state ${existing.state} cannot accept new KPI writes`,
      }, 409);
    }
    snapshotId = existing.snapshot_id;
    fromState = existing.state;
  } else {
    const { data: created, error: cErr } = await admin
      .from('aggregation_snapshots')
      .insert({
        period_type: body.periodType,
        period_start: body.periodStart,
        period_end: body.periodEnd,
        as_of_timestamp: body.asOfTimestamp,
        state: 'draft',
      })
      .select('snapshot_id')
      .single();
    if (cErr || !created) {
      return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: cErr?.message ?? 'create failed' }, 500);
    }
    snapshotId = created.snapshot_id;

    await admin.from('executive_reporting_audit_log').insert({
      action_category: 'aggregation_snapshot',
      action_verb: 'aggregation_snapshot.created',
      target_table: 'aggregation_snapshots',
      target_id: snapshotId,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      context_json: { period_type: body.periodType, period_start: body.periodStart, period_end: body.periodEnd },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  // 2. Transition → computing.
  if (fromState !== 'computing') {
    const { error: tErr } = await admin
      .from('aggregation_snapshots')
      .update({ state: 'computing', computation_started_at: new Date().toISOString() })
      .eq('snapshot_id', snapshotId);
    if (tErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: tErr.message }, 500);

    await admin.from('executive_reporting_audit_log').insert({
      action_category: 'aggregation_snapshot',
      action_verb: 'aggregation_snapshot.computation_started',
      target_table: 'aggregation_snapshots',
      target_id: snapshotId,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      before_state_json: { state: fromState },
      after_state_json: { state: 'computing' },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  // 3. Insert KPI snapshots with provenance.
  let written = 0;
  const errors: Array<{ kpi: string; error: string }> = [];

  for (const k of body.kpis) {
    const hash = await sha256Hex(k.sourceQuery);
    const provenance = {
      sourcePrompt: k.sourcePrompt,
      sourceTable: k.sourceTable,
      sourceQueryHash: hash,
      computationMethod: k.computationMethod,
      asOfTimestamp: body.asOfTimestamp,
      kpiVersion: k.kpiVersion,
    };
    const { error: insErr } = await admin
      .from('board_pack_kpi_snapshots')
      .upsert({
        aggregation_snapshot_id: snapshotId,
        kpi_id: k.kpiId,
        kpi_version: k.kpiVersion,
        computed_value_numeric: k.computedValueNumeric ?? null,
        computed_value_integer: k.computedValueInteger ?? null,
        computed_value_json: k.computedValueJson ?? null,
        unit: k.unit,
        prior_period_value: k.priorPeriodValue ?? null,
        comparison_delta_pct: k.comparisonDeltaPct ?? null,
        provenance_json: provenance,
      }, { onConflict: 'aggregation_snapshot_id,kpi_id,kpi_version' });
    if (insErr) {
      errors.push({ kpi: k.kpiId, error: insErr.message });
      continue;
    }
    written += 1;
  }

  // 4. Finalize state.
  const finalState = errors.length > 0 && written === 0 ? 'failed' : 'computed';

  const { error: finErr } = await admin
    .from('aggregation_snapshots')
    .update({
      state: finalState,
      computation_ended_at: new Date().toISOString(),
      total_kpis_computed: written,
    })
    .eq('snapshot_id', snapshotId);
  if (finErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: finErr.message }, 500);

  await admin.from('executive_reporting_audit_log').insert({
    action_category: 'aggregation_snapshot',
    action_verb: finalState === 'computed'
      ? 'aggregation_snapshot.computed'
      : 'aggregation_snapshot.computation_started',
    target_table: 'aggregation_snapshots',
    target_id: snapshotId,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    before_state_json: { state: 'computing' },
    after_state_json: { state: finalState },
    context_json: { kpis_written: written, errors: errors.length },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({
    snapshot_id: snapshotId,
    state: finalState,
    kpis_written: written,
    errors,
  });
});
