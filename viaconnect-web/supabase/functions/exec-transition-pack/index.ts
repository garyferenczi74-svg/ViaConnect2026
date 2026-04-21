// Prompt #105 Phase 2a — general pack state-machine transitions.
//
// Handles every non-terminal pack transition EXCEPT pending_ceo_approval →
// issued, which lives in exec-issue-pack because it demands the bright-line
// 'ISSUE PACK' typed confirmation.
//
// CFO gate: cfo_approved target requires isCFO(actor.role).
// CEO gate for issuing: lives in exec-issue-pack.
// Everyone else with canWriteExec can drive draft ↔ mdna_pending ↔
// mdna_drafted ↔ cfo_review transitions.
//
// Contract:
//   POST { packId, toState, notes? }

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

type PackState =
  | 'draft' | 'mdna_pending' | 'mdna_drafted' | 'cfo_review'
  | 'cfo_approved' | 'pending_ceo_approval' | 'issued'
  | 'erratum_issued' | 'archived';

// Mirrors ALLOWED_PACK_TRANSITIONS in src/lib/executiveReporting/packs/stateMachine.ts.
// `issued` target is intentionally REMOVED from pending_ceo_approval here —
// only exec-issue-pack may perform that transition.
const ALLOWED: Record<PackState, PackState[]> = {
  draft: ['mdna_pending', 'archived'],
  mdna_pending: ['mdna_drafted', 'draft'],
  mdna_drafted: ['cfo_review', 'mdna_pending'],
  cfo_review: ['cfo_approved', 'mdna_drafted', 'mdna_pending'],
  cfo_approved: ['pending_ceo_approval', 'cfo_review'],
  pending_ceo_approval: ['cfo_review'], // no 'issued' here — see exec-issue-pack
  issued: ['erratum_issued', 'archived'],
  erratum_issued: ['archived'],
  archived: [],
};

const CFO_REQUIRED: PackState[] = ['cfo_approved'];

function isValidTransition(from: PackState, to: PackState): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

interface TransitionRequest {
  packId: string;
  toState: PackState;
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
  if (!body.packId || !body.toState) {
    return jsonResponse({ error: EXEC_ERRORS.BAD_REQUEST, detail: 'packId + toState required' }, 400);
  }

  // Prevent `issued` via this endpoint — exec-issue-pack only.
  if (body.toState === 'issued') {
    return jsonResponse({
      error: EXEC_ERRORS.FORBIDDEN_ROLE,
      detail: 'issued transition requires exec-issue-pack',
    }, 403);
  }

  if (CFO_REQUIRED.includes(body.toState) && !isCFO(actor.role)) {
    return jsonResponse({
      error: EXEC_ERRORS.FORBIDDEN_ROLE,
      detail: `transition to ${body.toState} requires CFO role`,
      role: actor.role,
    }, 403);
  }

  const admin = adminClient() as any;
  const { data: pack, error: pErr } = await admin
    .from('board_packs')
    .select('pack_id, state')
    .eq('pack_id', body.packId)
    .maybeSingle();
  if (pErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: pErr.message }, 500);
  if (!pack) return jsonResponse({ error: EXEC_ERRORS.NOT_FOUND }, 404);

  const fromState = pack.state as PackState;
  if (!isValidTransition(fromState, body.toState)) {
    return jsonResponse({
      error: EXEC_ERRORS.CONFLICT,
      detail: `transition ${fromState} → ${body.toState} not allowed`,
    }, 409);
  }

  const update: Record<string, unknown> = { state: body.toState };
  const nowIso = new Date().toISOString();
  if (body.toState === 'cfo_approved') {
    update.cfo_approved_by = actor.userId;
    update.cfo_approved_at = nowIso;
  }

  const { error: uErr } = await admin
    .from('board_packs')
    .update(update)
    .eq('pack_id', body.packId);
  if (uErr) return jsonResponse({ error: EXEC_ERRORS.INTERNAL, detail: uErr.message }, 500);

  const verb = body.toState === 'cfo_approved'
    ? 'pack.cfo_approved'
    : body.toState === 'archived'
      ? 'pack.archived'
      : `pack.${body.toState}`;

  await admin.from('executive_reporting_audit_log').insert({
    action_category: 'pack',
    action_verb: verb,
    target_table: 'board_packs',
    target_id: body.packId,
    pack_id: body.packId,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    before_state_json: { state: fromState },
    after_state_json: { state: body.toState },
    context_json: body.notes ? { notes: body.notes } : null,
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({ pack_id: body.packId, state: body.toState });
});
