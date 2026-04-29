// Prompt #106 §7 — gap-fill INSERT for product_catalog.
//
// Given a reconciliation finding_id of type 'missing_in_catalog', inserts
// a new product_catalog row with active=FALSE, canonical category slug
// from the normalizer, price = pricing_tiers.msrp, and a placeholder
// image_url (or a real one if a primary binding already exists for this
// SKU — uncommon but possible if the image was uploaded before the row).
//
// NEVER inserts active=TRUE. NEVER modifies master_skus or pricing_tiers.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, CANONICAL_BUCKET, corsPreflight, isAdmin, jsonResponse,
  resolveShopActor, assertTableIsWritable,
} from '../_shop_refresh_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

// SOURCE OF TRUTH: src/lib/shopRefresh/reconciliation/categoryNormalizer.ts
const SHORT_TO_SLUG: Record<string, string> = {
  BASE: 'base-formulations',
  ADVANCED: 'advanced-formulations',
  WOMEN: 'womens-health',
  CHILDREN: 'sproutables-childrens',
  SNP: 'snp-support-formulations',
  MUSHROOM: 'functional-mushrooms',
};

function placeholderUrl(slug: string): string {
  const base = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${CANONICAL_BUCKET}/placeholders/${slug}-placeholder.png`;
}

function bindingUrl(objectPath: string): string {
  const base = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${CANONICAL_BUCKET}/${objectPath}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE' }, 403);

  const { findingIds } = (await req.json().catch(() => ({}))) as { findingIds?: string[] };
  if (!Array.isArray(findingIds) || findingIds.length === 0) {
    return jsonResponse({ error: 'BAD_REQUEST', detail: 'findingIds array required' }, 400);
  }

  assertTableIsWritable('product_catalog');
  const admin = adminClient() as any;

  const { data: findings } = await admin
    .from('shop_refresh_reconciliation_findings')
    .select('finding_id, finding_type, sku, canonical_payload_json, resolution_status')
    .in('finding_id', findingIds);

  const inserted: string[] = [];
  const skipped: Array<{ sku: string; reason: string }> = [];

  for (const f of (findings ?? []) as any[]) {
    if (f.finding_type !== 'missing_in_catalog') {
      skipped.push({ sku: f.sku, reason: `wrong_finding_type: ${f.finding_type}` });
      continue;
    }
    if (f.resolution_status !== 'pending_review' && f.resolution_status !== 'approved_to_insert') {
      skipped.push({ sku: f.sku, reason: `already_resolved: ${f.resolution_status}` });
      continue;
    }

    const canon = f.canonical_payload_json as {
      sku: string; name: string; category: string; msrp: number;
    } | null;
    if (!canon) { skipped.push({ sku: f.sku, reason: 'no_canonical_payload' }); continue; }

    const slug = SHORT_TO_SLUG[(canon.category).trim().toUpperCase()];
    if (!slug) { skipped.push({ sku: f.sku, reason: `cannot_normalize_category: ${canon.category}` }); continue; }

    // pricing_tiers is the source of truth for price. Read-only.
    const { data: pt } = await admin.from('pricing_tiers')
      .select('msrp').eq('sku', canon.sku).maybeSingle();
    const price = pt ? Number((pt as { msrp: number }).msrp) : Number(canon.msrp);

    // Prefer an existing primary binding image_url; otherwise placeholder.
    let imageUrl = placeholderUrl(slug);
    const { data: binding } = await admin.from('supplement_photo_bindings')
      .select('supplement_photo_inventory!inner(object_path, scope, deleted_at)')
      .eq('sku', canon.sku).eq('is_primary', true).is('archived_at', null).maybeSingle();
    if (binding) {
      const inv = (binding as any).supplement_photo_inventory as { object_path: string; scope: string; deleted_at: string | null };
      if (inv && !inv.deleted_at && inv.scope === 'in_scope') {
        imageUrl = bindingUrl(inv.object_path);
      }
    }

    // Check for existing catalog row — refuse to duplicate.
    const { data: existing } = await admin.from('product_catalog')
      .select('id').eq('sku', canon.sku).maybeSingle();
    if (existing) { skipped.push({ sku: canon.sku, reason: 'already_in_catalog' }); continue; }

    const { data: row, error: insErr } = await admin.from('product_catalog').insert({
      sku: canon.sku,
      name: canon.name,
      category: slug,        // canonical slug, not workbook text
      price,
      image_url: imageUrl,
      active: false,         // NEVER auto-activate
      master_sku: canon.sku,
      formulation_json: {},
      symptom_tags: [],
      genetic_tags: [],
      lifestyle_tags: [],
      goal_tags: [],
      contraindication_tags: [],
      priority_weight: 0,
    }).select('id').single();

    if (insErr || !row) { skipped.push({ sku: canon.sku, reason: `insert_failed: ${insErr?.message}` }); continue; }
    inserted.push(canon.sku);

    // Update finding resolution status.
    await admin.from('shop_refresh_reconciliation_findings')
      .update({
        resolution_status: 'approved_to_insert',
        resolved_by_user_id: actor.userId,
        resolved_at: new Date().toISOString(),
      }).eq('finding_id', f.finding_id);

    await admin.from('shop_refresh_audit_log').insert({
      action_category: 'catalog_row_insert',
      action_verb: 'catalog_row_insert.gap_fill',
      target_table: 'product_catalog',
      target_id: row.id,
      sku: canon.sku,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      after_state_json: {
        sku: canon.sku, name: canon.name, category: slug, price,
        image_url: imageUrl, active: false, placeholder_used: imageUrl.includes('/placeholders/'),
      },
      context_json: { finding_id: f.finding_id },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  return jsonResponse({
    inserted_count: inserted.length,
    inserted_skus: inserted,
    skipped,
  });
});
