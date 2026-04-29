// Prompt #106 §7.3 + §3.5 — flip product_catalog.active=FALSE → TRUE.
//
// Requires typed confirmation "PUBLISH N SKUS" matching the exact count.
// Refuses to activate any SKU whose image_url points at the placeholder
// bucket path (§3.7 HARD STOP: never ship a placeholder to customers).
//
// Emits emitDataEvent-style context via the audit log; downstream consumers
// (MAP monitoring #100, Admin Command Center #60c) read the log to react.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, corsPreflight, isAdmin, jsonResponse, resolveShopActor,
  publishBatchPhrase, assertTableIsWritable,
} from '../_shop_refresh_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

interface ActivateRequest {
  skus: string[];
  typedConfirmation: string;
}

function isPlaceholderImageUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes('/supplement-photos/placeholders/');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE' }, 403);

  const body = (await req.json().catch(() => ({}))) as ActivateRequest;
  if (!Array.isArray(body.skus) || body.skus.length === 0) {
    return jsonResponse({ error: 'BAD_REQUEST', detail: 'skus array required' }, 400);
  }
  const unique = Array.from(new Set(body.skus));
  const expected = publishBatchPhrase(unique.length);
  if (body.typedConfirmation !== expected) {
    return jsonResponse({
      error: 'CONFIRMATION_TEXT_MISMATCH',
      detail: `typedConfirmation must exactly equal "${expected}"`,
    }, 403);
  }

  assertTableIsWritable('product_catalog');
  const admin = adminClient() as any;

  // Fetch all target rows up-front.
  const { data: rows } = await admin.from('product_catalog')
    .select('id, sku, active, image_url, category')
    .in('sku', unique);
  const rowMap = new Map<string, any>();
  for (const r of (rows ?? []) as any[]) rowMap.set(r.sku, r);

  // Pre-flight check: every SKU must be present, inactive, with non-placeholder
  // image_url. A single violation aborts the WHOLE batch so we never partially
  // publish a Gary-approved set.
  const violations: Array<{ sku: string; reason: string }> = [];
  for (const sku of unique) {
    const r = rowMap.get(sku);
    if (!r) { violations.push({ sku, reason: 'not_in_catalog' }); continue; }
    if (r.active === true) { violations.push({ sku, reason: 'already_active' }); continue; }
    if (isPlaceholderImageUrl(r.image_url)) { violations.push({ sku, reason: 'placeholder_image_url' }); continue; }
    if (!r.image_url) { violations.push({ sku, reason: 'null_image_url' }); continue; }
  }
  if (violations.length > 0) {
    return jsonResponse({ error: 'PREFLIGHT_FAILED', violations }, 422);
  }

  // All clear — flip active=TRUE one by one so we capture an audit row each.
  const activated: string[] = [];
  for (const sku of unique) {
    const r = rowMap.get(sku);
    const { error: uErr } = await admin.from('product_catalog')
      .update({ active: true }).eq('sku', sku);
    if (uErr) {
      return jsonResponse({
        error: 'PARTIAL_FAILURE',
        activated_before_failure: activated,
        failed_sku: sku,
        detail: uErr.message,
      }, 500);
    }
    activated.push(sku);
    await admin.from('shop_refresh_audit_log').insert({
      action_category: 'catalog_active_toggle',
      action_verb: 'catalog_active_toggle.true',
      target_table: 'product_catalog',
      target_id: r.id,
      sku,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      before_state_json: { active: false },
      after_state_json: { active: true },
      context_json: { event: 'shop_sku_published', category: r.category, image_url: r.image_url },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  await admin.from('shop_refresh_audit_log').insert({
    action_category: 'approval_typed_confirmation',
    action_verb: 'approval_typed_confirmation.captured',
    target_table: 'product_catalog',
    actor_user_id: actor.userId,
    actor_role: actor.role,
    context_json: { phrase: expected, sku_count: unique.length },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({ activated_count: activated.length, activated });
});
