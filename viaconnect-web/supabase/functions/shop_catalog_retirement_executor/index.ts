// Prompt #106 §5.3 + §3.5 — retire a product_catalog row (active=FALSE).
//
// Requires typed confirmation "APPROVE RETIREMENT" AND a reason string
// ≥ 20 chars. Refuses to retire rows linked to GeneX360 or peptide_registry
// (out-of-scope catalogs that must not be retired through this flow).
//
// NEVER deletes a row; only flips active=FALSE.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, corsPreflight, isAdmin, jsonResponse, resolveShopActor,
  TYPED_CONFIRMATION, assertTableIsWritable,
} from '../_shop_refresh_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

interface RetireRequest {
  findingId: string;
  typedConfirmation: string;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE' }, 403);

  const body = (await req.json().catch(() => ({}))) as RetireRequest;
  if (!body.findingId) return jsonResponse({ error: 'BAD_REQUEST', detail: 'findingId required' }, 400);
  if (body.typedConfirmation !== TYPED_CONFIRMATION.RETIREMENT) {
    return jsonResponse({ error: 'CONFIRMATION_TEXT_MISMATCH' }, 403);
  }
  if (!body.reason || body.reason.trim().length < 20) {
    return jsonResponse({ error: 'REASON_TOO_SHORT', detail: 'reason must be ≥ 20 chars after trim' }, 400);
  }

  assertTableIsWritable('product_catalog');
  const admin = adminClient() as any;

  const { data: finding } = await admin
    .from('shop_refresh_reconciliation_findings')
    .select('finding_id, finding_type, sku, catalog_payload_json, resolution_status')
    .eq('finding_id', body.findingId).maybeSingle();
  if (!finding) return jsonResponse({ error: 'NOT_FOUND' }, 404);
  if (finding.finding_type !== 'catalog_not_in_canonical') {
    return jsonResponse({ error: 'WRONG_FINDING_TYPE', detail: finding.finding_type }, 409);
  }
  if (finding.resolution_status === 'approved_to_retire') {
    return jsonResponse({ error: 'ALREADY_RESOLVED' }, 409);
  }

  const sku = finding.sku as string;

  // Defense-in-depth: refuse to retire GeneX360 / peptide SKUs even if they
  // somehow landed in a reconciliation finding.
  const [{ data: gx }, { data: pep }] = await Promise.all([
    admin.from('genex360_products').select('genex360_sku').eq('genex360_sku', sku).maybeSingle(),
    admin.from('peptide_registry').select('peptide_sku').eq('peptide_sku', sku).maybeSingle(),
  ]);
  if (gx) return jsonResponse({ error: 'SCOPE_BREACH', detail: 'sku belongs to GeneX360 — retire via GeneX360 flow' }, 409);
  if (pep) return jsonResponse({ error: 'SCOPE_BREACH', detail: 'sku belongs to peptide_registry — retire via peptide flow' }, 409);

  const { data: catBefore } = await admin.from('product_catalog')
    .select('id, sku, active, category').eq('sku', sku).maybeSingle();
  if (!catBefore) return jsonResponse({ error: 'CATALOG_ROW_NOT_FOUND' }, 404);

  // Category label defense — reject if catalog says the row is out-of-scope.
  const k = (catBefore.category as string).trim().toUpperCase();
  if (k === 'TESTING' || k === 'GENETIC' || k === 'TEST_KIT' || k === 'TEST KIT') {
    return jsonResponse({ error: 'SCOPE_BREACH', detail: `category "${catBefore.category}" is out-of-scope` }, 409);
  }

  // Already inactive? No-op but still audit the intent.
  if (catBefore.active === false) {
    await admin.from('shop_refresh_audit_log').insert({
      action_category: 'retirement_revert',
      action_verb: 'retirement_approve.already_inactive',
      target_table: 'product_catalog',
      target_id: catBefore.id,
      sku,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      context_json: { reason: body.reason, finding_id: body.findingId },
    });
    return jsonResponse({ sku, already_inactive: true });
  }

  const { error: uErr } = await admin.from('product_catalog')
    .update({ active: false }).eq('sku', sku);
  if (uErr) return jsonResponse({ error: uErr.message }, 500);

  await admin.from('shop_refresh_reconciliation_findings')
    .update({
      resolution_status: 'approved_to_retire',
      resolution_reason: body.reason,
      resolved_by_user_id: actor.userId,
      resolved_at: new Date().toISOString(),
    }).eq('finding_id', body.findingId);

  await admin.from('shop_refresh_audit_log').insert({
    action_category: 'retirement_approve',
    action_verb: 'retirement_approve.executed',
    target_table: 'product_catalog',
    target_id: catBefore.id,
    sku,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    before_state_json: { active: true },
    after_state_json: { active: false },
    context_json: { reason: body.reason, finding_id: body.findingId },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({ sku, retired: true });
});
