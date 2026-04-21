// Photo Sync prompt §3.1: read-only audit of current image_url state.
//
// Run:   npx tsx scripts/audit/current-image-state.ts
// Output: /tmp/viaconnect/image-audit-current-{ISO}.json
//
// Live products schema (verified at time of writing):
//   id uuid, sku text, name text, short_name text, description text,
//   category text, price numeric, image_url text, active boolean,
//   created_at timestamptz, pricing_tier text
// Spec asks for slug + product_type + updated_at; those don't exist on
// this DB, so we emit them as null. The match builder copes.
//
// Variant table does not exist; treat all peptide delivery-form rows as
// flat products. The script will skip the variants pass with a note.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getServiceRoleClient, AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './_supabase-client';
import { classifyImageUrl } from '../../src/lib/photoSync/classifyImageUrl';
import type { ImageUrlClassification, ProductRow, BucketObject } from '../../src/lib/photoSync/types';

interface ClassifiedRow {
  id: string;
  sku: string;
  slug: string | null;
  name: string;
  category: string | null;
  product_type: string | null;
  image_url: string | null;
  classification: ImageUrlClassification;
  is_variant: boolean;
  parent_product_id: string | null;
}

async function loadBucketPathSet(client: ReturnType<typeof getServiceRoleClient>): Promise<Set<string>> {
  const set = new Set<string>();
  async function recurse(prefix: string): Promise<void> {
    const { data, error } = await client.storage.from('supplement-photos').list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`bucket list failed for prefix "${prefix}": ${error.message}`);
    for (const obj of data ?? []) {
      const isFolder = obj.id == null;
      const full = prefix ? `${prefix}/${obj.name}` : obj.name;
      if (isFolder) {
        await new Promise((r) => setTimeout(r, 250));
        await recurse(full);
      } else {
        set.add(full);
      }
    }
  }
  await recurse('');
  return set;
}

async function main(): Promise<void> {
  const sb = getServiceRoleClient();

  safeLog('audit: loading bucket object set...');
  const bucketSet = await loadBucketPathSet(sb);
  safeLog(`audit: bucket has ${bucketSet.size} objects`);

  safeLog('audit: loading products...');
  const { data: products, error } = await sb
    .from('products')
    .select('id, sku, name, category, image_url, pricing_tier')
    .order('category', { nullsFirst: false })
    .order('sku');
  if (error) throw new Error(`products select failed: ${error.message}`);

  const rows: ClassifiedRow[] = [];
  const products_typed = (products ?? []) as Array<Pick<ProductRow, 'id' | 'sku' | 'name' | 'category' | 'image_url'> & { pricing_tier: string | null }>;

  for (const p of products_typed) {
    rows.push({
      id: p.id,
      sku: p.sku,
      slug: null,
      name: p.name,
      category: p.category ?? null,
      product_type: p.pricing_tier ?? null,
      image_url: p.image_url ?? null,
      classification: classifyImageUrl({ image_url: p.image_url, bucket_object_paths_set: bucketSet }),
      is_variant: false,
      parent_product_id: null,
    });
  }

  // Tally
  const byClass: Record<string, number> = {};
  const byCategory: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    byClass[r.classification] = (byClass[r.classification] ?? 0) + 1;
    const cat = r.category ?? '(uncategorized)';
    if (!byCategory[cat]) byCategory[cat] = {};
    byCategory[cat][r.classification] = (byCategory[cat][r.classification] ?? 0) + 1;
  }

  safeLog('---- summary by classification ----');
  for (const [cls, n] of Object.entries(byClass).sort()) {
    safeLog(`  ${cls.padEnd(18)} ${n}`);
  }
  safeLog('---- summary by category x classification ----');
  for (const [cat, sub] of Object.entries(byCategory).sort()) {
    const parts = Object.entries(sub).map(([k, v]) => `${k}=${v}`).join('  ');
    safeLog(`  ${cat.padEnd(28)} ${parts}`);
  }
  safeLog(`audit: total rows = ${rows.length}`);

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const outPath = join(AUDIT_OUT_DIR, `image-audit-current-${nowIsoForFilename()}.json`);
  writeFileSync(outPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_rows: rows.length,
    by_classification: byClass,
    by_category_classification: byCategory,
    rows,
  }, null, 2));
  safeLog(`audit: wrote ${outPath}`);

  // Emit a small fixture file the bucket inventory script can reuse.
  const bucketSetPath = join(AUDIT_OUT_DIR, 'image-audit-bucket-set.json');
  writeFileSync(bucketSetPath, JSON.stringify([...bucketSet], null, 2));
}

main().catch((e: unknown) => {
  process.stderr.write(`audit failed: ${(e as Error).message}\n`);
  process.exit(2);
});

// Suppress "imported but unused" on BucketObject (kept for future variants pass).
void (null as unknown as BucketObject);
