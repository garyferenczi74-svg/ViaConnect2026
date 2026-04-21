// Prompt #106 §3.5 + §6.3 — bulk image_url UPDATE on product_catalog.
//
// Reads every primary binding for in-scope SKUs and constructs the canonical
// public URL. Refuses to run without the typed-confirmation phrase
// "APPROVE IMAGE REFRESH". Each UPDATE captures the prior image_url in the
// audit log so rollback is possible.
//
// Scope: only writes to product_catalog (writable). NEVER writes master_skus,
// pricing_tiers, genex360_products, peptide_*, helix_*, Stripe.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, CANONICAL_BUCKET, corsPreflight, isAdmin, jsonResponse,
  resolveShopActor, TYPED_CONFIRMATION, assertTableIsWritable,
} from '../_shop_refresh_shared/shared.ts';

interface BulkUpdateRequest {
  typedConfirmation: string;
}

function publicUrlFor(objectPath: string): string {
  const base = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${CANONICAL_BUCKET}/${objectPath}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE' }, 403);

  const body = (await req.json().catch(() => ({}))) as BulkUpdateRequest;
  if (body.typedConfirmation !== TYPED_CONFIRMATION.BULK_IMAGE_REFRESH) {
    return jsonResponse({
      error: 'CONFIRMATION_TEXT_MISMATCH',
      detail: `typedConfirmation must exactly equal "${TYPED_CONFIRMATION.BULK_IMAGE_REFRESH}"`,
    }, 403);
  }

  assertTableIsWritable('product_catalog');
  const admin = adminClient() as any;

  // Fetch all primary (non-archived) bindings joined to inventory object_path.
  const { data: bindings } = await admin.from('supplement_photo_bindings')
    .select('sku, inventory_id, supplement_photo_inventory!inner(object_path, scope, deleted_at)')
    .eq('is_primary', true).is('archived_at', null);

  const updates: Array<{ sku: string; new_url: string; old_url: string | null }> = [];
  const skipped: Array<{ sku: string; reason: string }> = [];

  for (const b of (bindings ?? []) as any[]) {
    const inv = b.supplement_photo_inventory as { object_path: string; scope: string; deleted_at: string | null };
    if (inv.deleted_at) { skipped.push({ sku: b.sku, reason: 'inventory_deleted' }); continue; }
    if (inv.scope !== 'in_scope') { skipped.push({ sku: b.sku, reason: 'out_of_scope' }); continue; }
    const newUrl = publicUrlFor(inv.object_path);

    const { data: cat } = await admin.from('product_catalog')
      .select('image_url').eq('sku', b.sku).maybeSingle();
    if (!cat) { skipped.push({ sku: b.sku, reason: 'no_catalog_row' }); continue; }

    const oldUrl = (cat as { image_url: string | null }).image_url;
    if (oldUrl === newUrl) { skipped.push({ sku: b.sku, reason: 'unchanged' }); continue; }

    const { error: uErr } = await admin.from('product_catalog')
      .update({ image_url: newUrl }).eq('sku', b.sku);
    if (uErr) { skipped.push({ sku: b.sku, reason: `update_failed: ${uErr.message}` }); continue; }

    updates.push({ sku: b.sku, new_url: newUrl, old_url: oldUrl });

    await admin.from('shop_refresh_audit_log').insert({
      action_category: 'catalog_image_url_update',
      action_verb: 'catalog_image_url_update.bulk',
      target_table: 'product_catalog',
      sku: b.sku,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      before_state_json: { image_url: oldUrl },
      after_state_json: { image_url: newUrl },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  // Top-level confirmation audit row.
  await admin.from('shop_refresh_audit_log').insert({
    action_category: 'approval_typed_confirmation',
    action_verb: 'approval_typed_confirmation.captured',
    target_table: 'product_catalog',
    actor_user_id: actor.userId,
    actor_role: actor.role,
    context_json: {
      phrase: TYPED_CONFIRMATION.BULK_IMAGE_REFRESH,
      updates_applied: updates.length,
      skipped_count: skipped.length,
    },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({
    updates_applied: updates.length,
    updates,
    skipped,
  });
});
