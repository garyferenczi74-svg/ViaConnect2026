// Prompt #106 §3.3 — SHA-256 re-verifier.
//
// Re-downloads the object referenced by a supplement_photo_inventory row
// and re-hashes. Mismatch is a critical alert: write shop_refresh_audit_log
// with action_category='sha256_verification_failure' and surface the
// mismatch to the caller so the shop render path can block the affected
// SKU.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, CANONICAL_BUCKET, corsPreflight, isAdmin, jsonResponse,
  resolveShopActor, sha256Hex,
} from '../_shop_refresh_shared/shared.ts';
import { withTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

interface VerifyRequest {
  inventoryId?: string;
  objectPath?: string;  // one of these two is required
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const actor = await resolveShopActor(req);
  if (!actor) return jsonResponse({ error: 'MISSING_JWT' }, 401);
  if (!isAdmin(actor.role)) return jsonResponse({ error: 'FORBIDDEN_ROLE', role: actor.role }, 403);

  const body = (await req.json().catch(() => ({}))) as VerifyRequest;
  if (!body.inventoryId && !body.objectPath) {
    return jsonResponse({ error: 'BAD_REQUEST', detail: 'inventoryId or objectPath required' }, 400);
  }

  const admin = adminClient() as any;
  const q = admin.from('supplement_photo_inventory')
    .select('inventory_id, object_path, sha256_hash, byte_size');
  const { data: row } = body.inventoryId
    ? await q.eq('inventory_id', body.inventoryId).maybeSingle()
    : await q.eq('bucket_name', CANONICAL_BUCKET).eq('object_path', body.objectPath!).maybeSingle();
  if (!row) return jsonResponse({ error: 'NOT_FOUND' }, 404);

  let blob;
  try {
    const dlRes = await withTimeout(
      admin.storage.from(CANONICAL_BUCKET).download(row.object_path),
      15000,
      'sha256-verifier.storage-download',
    );
    if (dlRes.error || !dlRes.data) {
      safeLog.error('supplement-photo-sha256-verifier', 'download failed', { objectPath: row.object_path, error: dlRes.error });
      return jsonResponse({ error: 'DOWNLOAD_FAILED', detail: dlRes.error?.message }, 502);
    }
    blob = dlRes.data;
  } catch (dlErr) {
    if (isTimeoutError(dlErr)) safeLog.warn('supplement-photo-sha256-verifier', 'download timeout', { objectPath: row.object_path });
    else safeLog.error('supplement-photo-sha256-verifier', 'download error', { objectPath: row.object_path, error: dlErr });
    return jsonResponse({ error: 'DOWNLOAD_FAILED', detail: (dlErr as Error)?.message }, 502);
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const actual = await sha256Hex(bytes);
  const matches = actual === row.sha256_hash;

  if (matches) {
    await admin.from('supplement_photo_inventory')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('inventory_id', row.inventory_id);
  } else {
    // Log the tamper signal — append-only.
    await admin.from('shop_refresh_audit_log').insert({
      action_category: 'sha256_verification_failure',
      action_verb: 'sha256_verification_failure.mismatch',
      target_table: 'supplement_photo_inventory',
      target_id: row.inventory_id,
      actor_user_id: actor.userId,
      actor_role: actor.role,
      before_state_json: { stored_sha256: row.sha256_hash, stored_byte_size: row.byte_size },
      after_state_json: { observed_sha256: actual, observed_byte_size: bytes.byteLength },
      context_json: { object_path: row.object_path },
      ip_address: actor.ipAddress,
      user_agent: actor.userAgent,
    });
  }

  return jsonResponse({
    inventory_id: row.inventory_id,
    object_path: row.object_path,
    stored_sha256: row.sha256_hash,
    observed_sha256: actual,
    matches,
    byte_size_stored: row.byte_size,
    byte_size_observed: bytes.byteLength,
  });
});
