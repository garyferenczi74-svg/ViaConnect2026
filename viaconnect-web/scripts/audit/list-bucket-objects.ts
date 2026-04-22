// Photo Sync prompt §3.2: read-only inventory of supplement-photos.
//
// Run:   npx tsx scripts/audit/list-bucket-objects.ts
// Output: /tmp/viaconnect/bucket-manifest-{ISO}.json
//
// Recursively lists every object in the supplement-photos bucket with
// 250ms backoff between subfolder calls. Filters 0-byte / oversize /
// disallowed-mime objects into a separate REJECTED_UPLOAD list for
// admin attention. Builds a normalized_key -> full_path lookup.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getServiceRoleClient, AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './_supabase-client';
import { isAcceptableObject, normalizePathToKey } from '../../src/lib/photoSync/normalizeFilename';
import type { BucketObject, BucketManifest } from '../../src/lib/photoSync/types';

interface RawObj {
  id: string | null;            // null when row represents a folder
  name: string;
  metadata: { size?: number; mimetype?: string; cacheControl?: string } | null;
  created_at: string | null;
  updated_at: string | null;
}

async function listAll(client: ReturnType<typeof getServiceRoleClient>, prefix: string, out: BucketObject[], rejected: BucketObject[]): Promise<void> {
  const { data, error } = await client.storage
    .from('supplement-photos')
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new Error(`bucket list failed for prefix "${prefix}": ${error.message}`);
  const rows = (data ?? []) as RawObj[];

  for (const r of rows) {
    const isFolder = r.id == null;
    const full = prefix ? `${prefix}/${r.name}` : r.name;
    if (isFolder) {
      await new Promise((res) => setTimeout(res, 250));
      await listAll(client, full, out, rejected);
      continue;
    }
    const obj: BucketObject = {
      full_path: full,
      name: r.name,
      size_bytes: r.metadata?.size ?? 0,
      mime_type: r.metadata?.mimetype ?? '',
      created_at: r.created_at ?? '',
      updated_at: r.updated_at ?? '',
    };
    if (isAcceptableObject(obj)) out.push(obj);
    else rejected.push(obj);
  }
}

async function main(): Promise<void> {
  const sb = getServiceRoleClient();
  const objects: BucketObject[] = [];
  const rejected: BucketObject[] = [];

  safeLog('bucket-inventory: starting recursive listing...');
  await listAll(sb, '', objects, rejected);
  safeLog(`bucket-inventory: ${objects.length} accepted; ${rejected.length} rejected`);

  const normalized_keys: Record<string, string> = {};
  for (const o of objects) {
    const k = normalizePathToKey(o.full_path);
    if (!normalized_keys[k]) normalized_keys[k] = o.full_path;
    // collisions are allowed and surfaced by match-products step (tie-break runs there)
  }

  const manifest: BucketManifest = {
    generated_at: new Date().toISOString(),
    total_objects: objects.length,
    rejected_uploads: rejected,
    objects,
    normalized_keys,
  };

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const out = join(AUDIT_OUT_DIR, `bucket-manifest-${nowIsoForFilename()}.json`);
  writeFileSync(out, JSON.stringify(manifest, null, 2));
  safeLog(`bucket-inventory: wrote ${out}`);

  // Brief stdout summary
  safeLog(`bucket-inventory: distinct normalized keys = ${Object.keys(normalized_keys).length}`);
  if (rejected.length > 0) {
    safeLog('bucket-inventory: REJECTED objects (need admin attention):');
    for (const r of rejected.slice(0, 20)) {
      safeLog(`  ${r.full_path}  size=${r.size_bytes}  mime=${r.mime_type || '(unknown)'}`);
    }
    if (rejected.length > 20) safeLog(`  ...and ${rejected.length - 20} more`);
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`bucket-inventory failed: ${(e as Error).message}\n`);
  process.exit(2);
});
