// Prompt #106 §4.1 — nightly inventory sync for supplement-photos bucket.
//
// Enumerates every object, downloads the bytes, computes SHA-256, upserts
// into supplement_photo_inventory. Objects no longer present in storage
// are marked deleted_at = NOW() (never hard-deleted — their hash history
// stays for forensic reconstruction).
//
// Scope: only the supplement-photos bucket. out_of_scope directories
// (genex360/, peptides/) are enumerated for completeness but tagged
// scope='out_of_scope' and never touched by downstream code paths.

// deno-lint-ignore-file no-explicit-any
import {
  adminClient, assertBucketIsCanonical, CANONICAL_BUCKET,
  corsPreflight, jsonResponse, sha256Hex,
} from '../_shop_refresh_shared/shared.ts';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const IN_SCOPE_PREFIXES = [
  'base-formulations/', 'advanced-formulations/', 'womens-health/',
  'sproutables-childrens/', 'snp-support-formulations/', 'functional-mushrooms/',
  'placeholders/', // placeholders are in-scope for tracking; never bind to SKUs
];

function isInScope(path: string): boolean {
  return IN_SCOPE_PREFIXES.some((p) => path.startsWith(p));
}

async function listAllObjects(admin: any, prefix: string): Promise<any[]> {
  const out: any[] = [];
  let offset = 0;
  const LIMIT = 1000;
  for (;;) {
    const { data, error } = await admin.storage.from(CANONICAL_BUCKET).list(prefix, {
      limit: LIMIT,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    const rows = (data ?? []) as any[];
    for (const r of rows) out.push({ ...r, _prefix: prefix });
    if (rows.length < LIMIT) break;
    offset += LIMIT;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  assertBucketIsCanonical(CANONICAL_BUCKET); // tautology — guards against future drift

  const admin = adminClient() as any;

  // Enumerate directories we know about, plus the root (which returns the
  // directory entries themselves). We do a recursive-ish scan by listing
  // each known prefix explicitly — storage.list does NOT recurse.
  const allObjects: Array<{ name: string; metadata?: any; last_modified?: string }> = [];
  const dirsToScan: string[] = [
    ...IN_SCOPE_PREFIXES.map((p) => p.replace(/\/$/, '')),
    // Include any out-of-scope directories we find at root so we can tag
    // them for transparency.
  ];
  // List root to discover any unexpected directories.
  const { data: rootData } = await admin.storage.from(CANONICAL_BUCKET).list('', { limit: 1000 });
  for (const r of (rootData ?? []) as any[]) {
    if (r.id === null) { // directory-like
      const path = r.name;
      if (!dirsToScan.includes(path)) dirsToScan.push(path);
    }
  }

  for (const dir of dirsToScan) {
    const rows = await listAllObjects(admin, dir);
    for (const r of rows) {
      if (!r.name) continue;
      // r.name is file name relative to the directory we listed
      const fullPath = r._prefix ? `${r._prefix.replace(/\/$/, '')}/${r.name}` : r.name;
      allObjects.push({
        name: fullPath,
        metadata: r.metadata,
        last_modified: r.updated_at ?? r.created_at,
      });
    }
  }

  // Upsert each object with computed SHA-256. For performance, skip
  // re-hashing when the known last_modified matches the row on file.
  const upserted: Array<{ object_path: string; sha256: string; scope: string }> = [];
  const errors: Array<{ object_path: string; error: string }> = [];

  for (const obj of allObjects) {
    const objectPath = obj.name;
    try {
      const scope = isInScope(objectPath) ? 'in_scope' : 'out_of_scope';
      const contentType = obj.metadata?.mimetype ?? 'image/png';
      if (contentType !== 'image/png' && contentType !== 'image/jpeg') {
        // Skip non-image files; inventory accepts only png+jpeg per the
        // CHECK constraint. Non-conforming files are recorded as an error
        // so an admin can clean them up.
        errors.push({ object_path: objectPath, error: `content_type ${contentType} not permitted` });
        continue;
      }
      const byteSize = obj.metadata?.size ?? 0;
      if (byteSize <= 0 || byteSize > 2 * 1024 * 1024) {
        errors.push({ object_path: objectPath, error: `byte_size ${byteSize} outside ]0, 2MB]` });
        continue;
      }

      // Download + hash. Use the public URL only if bucket is public; otherwise
      // use signed URL or download API.
      const { data: blob, error: dlErr } = await admin.storage
        .from(CANONICAL_BUCKET).download(objectPath);
      if (dlErr || !blob) {
        errors.push({ object_path: objectPath, error: `download: ${dlErr?.message ?? 'no blob'}` });
        continue;
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const sha = await sha256Hex(bytes);

      await admin.from('supplement_photo_inventory').upsert({
        bucket_name: CANONICAL_BUCKET,
        object_path: objectPath,
        content_type: contentType,
        byte_size: bytes.byteLength,
        sha256_hash: sha,
        last_modified_at: obj.last_modified ?? new Date().toISOString(),
        scope,
        deleted_at: null,
        last_verified_at: new Date().toISOString(),
      }, { onConflict: 'bucket_name,object_path' });

      upserted.push({ object_path: objectPath, sha256: sha, scope });
    } catch (err) {
      errors.push({ object_path: objectPath, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  // Mark objects previously in inventory but not seen this run as deleted.
  const seenPaths = new Set(allObjects.map((o) => o.name));
  const { data: existing } = await admin
    .from('supplement_photo_inventory')
    .select('inventory_id, object_path, deleted_at')
    .eq('bucket_name', CANONICAL_BUCKET)
    .is('deleted_at', null);
  let marked_deleted = 0;
  for (const row of (existing ?? []) as any[]) {
    if (!seenPaths.has(row.object_path)) {
      await admin
        .from('supplement_photo_inventory')
        .update({ deleted_at: new Date().toISOString() })
        .eq('inventory_id', row.inventory_id);
      marked_deleted += 1;
    }
  }

  return jsonResponse({
    objects_seen: allObjects.length,
    upserted_count: upserted.length,
    marked_deleted,
    errors,
  });
});
