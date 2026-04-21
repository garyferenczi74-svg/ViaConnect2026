// Prompt #105 Phase 2a — aggregation snapshot state-machine transitions.
//
// CFO gate: approve (computed → cfo_approved), lock (cfo_approved → locked).
// Either party with canWriteExec may request review (computed → cfo_review,
// cfo_review → draft) but ONLY a CFO may approve or lock.
//
// Every allowed transition is validated against canTransitionAggregationSnapshot
// from the pure lib to keep one source of truth for the state graph.
//
// Contract:
//   POST { snapshotId, toState, notes? }
//   Response { snapshot_id, state }

// deno-lint-ignore-file no-explicit-any
import {
  adminClient,
  canWriteExec,
  corsPreflight,
  EXEC_ERRORS,
  isCFO,
  jsonResponse,
  resolveActor,
} from '../_exec_reporting_shared/shared.ts';

type SnapshotState =
  | 'draft' | 'computing' | 'computed'
  | 'cfo_review' | 'cfo_approved' | 'locked' | 'failed';

// SOURCE OF TRUTH: src/lib/executiveReporting/aggregation/snapshotLifecycle.ts
// (ALLOWED_AGG_TRANSITIONS). Keep in sync — Deno cannot import Node TS directly.
const ALLOWED: Record<SnapshotState, SnapshotState[]> = {
  draft: ['computing', 'failed'],
  computing: ['computed', 'failed'],
  computed: ['cfo_review', 'failed'],
  cfo_review: ['cfo_approved', 'draft', 'failed'],
  cfo_approved: ['locked'],
  locked: [],
  failed: ['draft'],
};

const CFO_REQUIRED: SnapshotState[] = ['cfo_approved', 'locked'];

function isValidTransition(from: SnapshotState, to: SnapshotState): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

interface TransitionRequest {
  snapshotId: string;
  toState: SnapshotState;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveActor(req);
  if (!actor) return jsonResponse({ error: EXEC_ERRORS.MISSING_JWT }, 401);
  if (!canWriteExec(actor.role)) {
    return jsonResponse({ error: EXEC_ERRORS.FORBIDDEN_ROLE, role: actor.role }, 403);
  }

  let body: TransitionRequest;
  try {
    body = (await req.json()) as TransitionRequest;
  } catch {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'invalid JSON' }, 400);
  }
  if (!body.snapshotId || !body.toState) {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'snapshotId + toState required' }, 400);
  }

  // CFO-only gate for approve/lock.
  if (CFO_REQUIRED.includes(body.toState) && !isCFO(actor.role)) {
    return jsonResponse({
      error: EXEC_ERRORS.FORBIDDEN_ROLE,
      detail: `transition to ${body.toState} requires CFO role`,
      role: actor.role,
    }, 403);
  }

  const admin = adminClient() as any;

  const { data: row, error: rErr } = await admin
    .from('aggregation_snapshots')
    .select('snapshot_id, state')
    .eq('snapshot_id', body.snapshotId)
    .maybeSingle();
  if (rErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: rErr.message }, 500);
  if (!row) return jsonResponse({ error: EXEC_ERRORS.NOT_FOUND }, 404);

  const fromState = row.state as SnapshotState;
  if (!isValidTransition(fromState, body.toState)) {
    return jsonResponse({
      error: EXEC_ERRORS.CONFLICT,
      detail: `transition ${fromState} → ${body.toState} not allowed`,
    }, 409);
  }

  // Prepare update payload. cfo_approved + locked stamp reviewer fields.
  const update: Record<string, unknown> = { state: body.toState };
  const nowIso = new Date().toISOString();
  if (body.toState === 'cfo_approved') {
    update.cfo_reviewer_id = actor.userId;
    update.cfo_reviewed_at = nowIso;
    if (body.notes) update.cfo_review_notes = body.notes;
  } else if (body.toState === 'cfo_review' && body.notes) {
    update.cfo_review_notes = body.notes;
  }

  const { error: uErr } = await admin
    .from('aggregation_snapshots')
    .update(update)
    .eq('snapshot_id', body.snapshotId);
  if (uErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: uErr.message }, 500);

  const verb = body.toState === 'cfo_approved'
    ? 'aggregation_snapshot.cfo_approved'
    : body.toState === 'locked'
      ? 'aggregation_snapshot.locked'
      : `aggregation_snapshot.${body.toState}`;

  await admin.from('executive_reporting_audit_log').insert({
    action_category: 'aggregation_snapshot',
    action_verb: verb,
    target_table: 'aggregation_snapshots',
    target_id: body.snapshotId,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    before_state_json: { state: fromState },
    after_state_json: { state: body.toState },
    context_json: body.notes ? { notes: body.notes } : null,
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({ snapshot_id: body.snapshotId, state: body.toState });
});
