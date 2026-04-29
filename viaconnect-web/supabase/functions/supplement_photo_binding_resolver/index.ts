// Prompt #106 §6.1 — resolve an uploaded object to its canonical SKU and
// create the supplement_photo_bindings row (is_primary=TRUE on first bind;
// versioned on subsequent binds — caller uses exec-primary-swap separately
// to flip).
//
// Contract:
//   POST { inventoryId }
//   Response { binding_id, sku, is_primary, version }

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, corsPreflight, isAdmin, jsonResponse, resolveShopActor,
} from '../_shop_refresh_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

// SOURCE OF TRUTH: src/lib/shopRefresh/upload/canonicalNaming.ts
function slugifyForPath(input: string): string {
  return input.trim().toLowerCase()
    .replace(/[\u2122\u00ae\u00a9]/g, '')
    .replace(/['"]/g, '')
    .replace(/\+/g, '-plus-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
const IN_SCOPE_SLUGS = [
  'base-formulations', 'advanced-formulations', 'womens-health',
  'sproutables-childrens', 'snp-support-formulations', 'functional-mushrooms',
];
const SKU_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface Parsed {
  categorySlug: string; skuSlug: string; version: number;
}
function parse(path: string): Parsed | null {
  const parts = path.split('/');
  if (parts.length !== 2) return null;
  const [categorySlug, filename] = parts as [string, string];
  if (!IN_SCOPE_SLUGS.includes(categorySlug)) return null;
  const m = filename.match(/^(.+)\.(png|jpe?g)$/i);
  if (!m) return null;
  const baseName = m[1]!;
  const vm = baseName.match(/^(.+)-v(\d+)$/);
  let skuSlug = baseName;
  let version = 1;
  if (vm) {
    skuSlug = vm[1]!;
    version = parseInt(vm[2]!, 10);
    if (!Number.isFinite(version) || version < 2) return null;
  }
  if (!SKU_SLUG_RE.test(skuSlug) || skuSlug.length > 64) return null;
  return { categorySlug, skuSlug, version };
}

// Mirror of categoryNormalizer — short category → slug
const SHORT_TO_SLUG: Record<string, string> = {
  BASE: 'base-formulations',
  ADVANCED: 'advanced-formulations',
  WOMEN: 'womens-health',
  CHILDREN: 'sproutables-childrens',
  SNP: 'snp-support-formulations',
  MUSHROOM: 'functional-mushrooms',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE' }, 403);

  const { inventoryId } = (await req.json().catch(() => ({}))) as { inventoryId?: string };
  if (!inventoryId) return jsonResponse({ error: 'BAD_REQUEST', detail: 'inventoryId required' }, 400);

  const admin = adminClient() as any;
  const { data: inv } = await admin.from('supplement_photo_inventory')
    .select('inventory_id, object_path, scope, deleted_at')
    .eq('inventory_id', inventoryId).maybeSingle();
  if (!inv) return jsonResponse({ error: 'NOT_FOUND' }, 404);
  if (inv.deleted_at) return jsonResponse({ error: 'OBJECT_DELETED' }, 409);
  if (inv.scope !== 'in_scope') return jsonResponse({ error: 'OUT_OF_SCOPE_OBJECT' }, 409);

  const parsed = parse(inv.object_path);
  if (!parsed) return jsonResponse({ error: 'CANONICAL_NAMING_VIOLATED', detail: inv.object_path }, 422);

  // Match against master_skus filtered by category. master_skus is READ-ONLY.
  const { data: candidates } = await admin.from('master_skus')
    .select('sku, name, category');
  const inCategory = ((candidates ?? []) as any[]).filter((c) => {
    const slug = SHORT_TO_SLUG[(c.category as string).trim().toUpperCase()];
    return slug === parsed.categorySlug;
  });
  const matches = new Set<string>();
  for (const c of inCategory) {
    if (slugifyForPath(c.sku) === parsed.skuSlug) matches.add(c.sku);
    if (slugifyForPath(c.name) === parsed.skuSlug) matches.add(c.sku);
  }
  const skus = Array.from(matches);
  if (skus.length === 0) {
    return jsonResponse({ error: 'NO_SKU_MATCH', sku_slug: parsed.skuSlug, category: parsed.categorySlug }, 404);
  }
  if (skus.length > 1) {
    return jsonResponse({ error: 'AMBIGUOUS_MATCH', candidates: skus }, 409);
  }
  const sku = skus[0]!;

  // Check for existing primary binding.
  const { data: currentPrimary } = await admin.from('supplement_photo_bindings')
    .select('binding_id, version')
    .eq('sku', sku).eq('is_primary', true).is('archived_at', null).maybeSingle();

  // Insert the new binding. If there is no current primary, mark the new
  // binding primary. Otherwise create as non-primary and rely on a separate
  // "primary swap" admin action with typed confirmation.
  const newVersion = parsed.version;
  const isPrimary = !currentPrimary;

  const { data: inserted, error: insErr } = await admin.from('supplement_photo_bindings')
    .insert({
      sku,
      inventory_id: inv.inventory_id,
      version: newVersion,
      is_primary: isPrimary,
      bound_by_user_id: actor.userId,
    })
    .select('binding_id, version, is_primary')
    .single();
  if (insErr || !inserted) {
    safeLog.error('supplement-photo-binding-resolver', 'binding insert failed', { sku, inventoryId, error: insErr });
    return jsonResponse({ error: insErr?.message ?? 'insert failed' }, 500);
  }

  await admin.from('shop_refresh_audit_log').insert({
    action_category: 'binding_create',
    action_verb: isPrimary ? 'binding_create.primary_assigned' : 'binding_create.versioned_non_primary',
    target_table: 'supplement_photo_bindings',
    target_id: inserted.binding_id,
    sku,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    after_state_json: { inventory_id: inv.inventory_id, version: newVersion, is_primary: isPrimary },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({
    binding_id: inserted.binding_id,
    sku,
    is_primary: inserted.is_primary,
    version: inserted.version,
    pending_primary_swap: !isPrimary,
  });
});
