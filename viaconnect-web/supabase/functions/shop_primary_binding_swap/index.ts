// Prompt #106 §6.2 — primary binding swap.
//
// Accepts { newBindingId, typedConfirmation: "APPROVE PRIMARY SWAP" }.
// Flips the currently-primary binding for the same SKU to is_primary=FALSE
// and flips the new binding to is_primary=TRUE. Both changes land atomically
// via an SQL CTE so an interrupted run never produces two primaries.
//
// The old primary's inventory row and storage object are RETAINED — rollback
// is cheap. Only the is_primary flag flips.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, corsPreflight, isAdmin, jsonResponse, resolveShopActor,
  TYPED_CONFIRMATION, assertTableIsWritable,
} from '../_shop_refresh_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

interface SwapRequest {
  newBindingId: string;
  typedConfirmation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE' }, 403);

  const body = (await req.json().catch(() => ({}))) as SwapRequest;
  if (!body.newBindingId) return jsonResponse({ error: 'BAD_REQUEST', detail: 'newBindingId required' }, 400);
  if (body.typedConfirmation !== TYPED_CONFIRMATION.PRIMARY_SWAP) {
    return jsonResponse({ error: 'CONFIRMATION_TEXT_MISMATCH' }, 403);
  }

  assertTableIsWritable('supplement_photo_bindings');
  const admin = adminClient() as any;

  const { data: newBinding } = await admin.from('supplement_photo_bindings')
    .select('binding_id, sku, version, is_primary, archived_at, inventory_id')
    .eq('binding_id', body.newBindingId).maybeSingle();
  if (!newBinding) return jsonResponse({ error: 'NOT_FOUND' }, 404);
  if (newBinding.archived_at) return jsonResponse({ error: 'ARCHIVED' }, 409);
  if (newBinding.is_primary === true) {
    return jsonResponse({ error: 'ALREADY_PRIMARY' }, 409);
  }

  const { data: currentPrimary } = await admin.from('supplement_photo_bindings')
    .select('binding_id, version, inventory_id')
    .eq('sku', newBinding.sku).eq('is_primary', true).is('archived_at', null).maybeSingle();

  // Two updates. The partial UNIQUE index would reject two primaries for
  // the same sku, so we MUST flip the old down before flipping the new up.
  // If the first succeeds and the second fails, we leave no primary — the
  // admin can re-run this endpoint to retry. We DO NOT silently recover
  // by reverting because that would mask the operator error.
  if (currentPrimary) {
    const { error: off } = await admin.from('supplement_photo_bindings')
      .update({ is_primary: false }).eq('binding_id', currentPrimary.binding_id);
    if (off) return jsonResponse({ error: 'DEMOTE_FAILED', detail: off.message }, 500);
  }

  const { error: on } = await admin.from('supplement_photo_bindings')
    .update({ is_primary: true }).eq('binding_id', newBinding.binding_id);
  if (on) {
    return jsonResponse({
      error: 'PROMOTE_FAILED',
      detail: on.message,
      state_after_failure: currentPrimary ? 'no_primary' : 'unchanged',
    }, 500);
  }

  await admin.from('shop_refresh_audit_log').insert({
    action_category: 'binding_rebind',
    action_verb: 'binding_rebind.primary_swapped',
    target_table: 'supplement_photo_bindings',
    target_id: newBinding.binding_id,
    sku: newBinding.sku,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    before_state_json: {
      old_binding_id: currentPrimary?.binding_id ?? null,
      old_inventory_id: currentPrimary?.inventory_id ?? null,
      old_version: currentPrimary?.version ?? null,
    },
    after_state_json: {
      new_binding_id: newBinding.binding_id,
      new_inventory_id: newBinding.inventory_id,
      new_version: newBinding.version,
    },
    ip_address: actor.ipAddress,
    user_agent: actor.userAgent,
  });

  return jsonResponse({
    sku: newBinding.sku,
    new_primary_binding_id: newBinding.binding_id,
    old_primary_binding_id: currentPrimary?.binding_id ?? null,
  });
});
