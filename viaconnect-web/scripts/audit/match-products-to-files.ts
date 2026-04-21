// Photo Sync prompt §3.3: match each product to a bucket file.
//
// Run:   npx tsx scripts/audit/match-products-to-files.ts
// Inputs: most-recent /tmp/viaconnect/image-audit-current-*.json + bucket-manifest-*.json
// Output: /tmp/viaconnect/match-plan-{ISO}.json + stdout three-part summary

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './_supabase-client';
import { matchProductToFile } from '../../src/lib/photoSync/matchProductToFile';
import { normalizePathToKey } from '../../src/lib/photoSync/normalizeFilename';
import type {
  BucketManifest,
  BucketObject,
  ImageUrlClassification,
  MatchConfidence,
  MatchPlan,
  MatchPlanRow,
} from '../../src/lib/photoSync/types';
import { PUBLIC_PREFIX } from '../../src/lib/photoSync/types';

interface AuditRow {
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

interface AuditFile {
  generated_at: string;
  total_rows: number;
  rows: AuditRow[];
}

function pickLatest(prefix: string): string {
  const entries = readdirSync(AUDIT_OUT_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
    .reverse();
  if (entries.length === 0) {
    throw new Error(`No file matching ${prefix}*.json found in ${AUDIT_OUT_DIR}. Run the audit + bucket-inventory scripts first.`);
  }
  return join(AUDIT_OUT_DIR, entries[0]);
}

function buildIndex(objects: BucketObject[]): Map<string, BucketObject[]> {
  const m = new Map<string, BucketObject[]>();
  for (const o of objects) {
    const k = normalizePathToKey(o.full_path);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(o);
  }
  return m;
}

async function main(): Promise<void> {
  const auditPath = pickLatest('image-audit-current-');
  const manifestPath = pickLatest('bucket-manifest-');
  safeLog(`match-plan: audit  = ${auditPath}`);
  safeLog(`match-plan: bucket = ${manifestPath}`);

  const audit = JSON.parse(readFileSync(auditPath, 'utf8')) as AuditFile;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BucketManifest;
  const index = buildIndex(manifest.objects);

  const planRows: MatchPlanRow[] = [];
  let already_valid = 0;
  let will_update = 0;
  let still_missing = 0;
  let external_skipped = 0;

  for (const r of audit.rows) {
    if (r.classification === 'EXTERNAL') {
      // Skip auto-rewrite per spec; flag and move on.
      external_skipped++;
      planRows.push({
        product_id: r.id,
        variant_id: null,
        sku: r.sku,
        display_name: r.name,
        category: r.category,
        current_image_url: r.image_url,
        current_classification: r.classification,
        matched_full_path: null,
        matched_public_url: null,
        match_confidence: 'NONE',
        match_priority: null,
        match_source: 'external_skipped',
        runners_up: [],
      });
      continue;
    }

    const result = matchProductToFile({
      product: { sku: r.sku, slug: r.slug, category: r.category },
      variant: r.is_variant ? { sku: r.sku, delivery_form: null } : null,
      parent_sku: null,
      bucket_objects: manifest.objects,
      bucket_keys_index: index,
    });

    const matched_full_path = result.chosen?.full_path ?? null;
    const matched_public_url = matched_full_path ? `${PUBLIC_PREFIX}${matched_full_path}` : null;
    const isAlreadyValid = r.classification === 'VALID_SUPABASE'
      && matched_public_url != null
      && r.image_url === matched_public_url;

    if (isAlreadyValid) already_valid++;
    else if (result.chosen != null && result.confidence === 'HIGH') will_update++;
    else still_missing++;

    planRows.push({
      product_id: r.id,
      variant_id: null,
      sku: r.sku,
      display_name: r.name,
      category: r.category,
      current_image_url: r.image_url,
      current_classification: r.classification,
      matched_full_path,
      matched_public_url,
      match_confidence: result.confidence as MatchConfidence,
      match_priority: result.chosen?.priority ?? null,
      match_source: result.chosen?.source ?? null,
      runners_up: result.candidates.slice(1).map((c) => ({
        full_path: c.full_path,
        priority: c.priority,
        source: c.source,
        distance: c.distance,
      })),
    });
  }

  const plan: MatchPlan = {
    generated_at: new Date().toISOString(),
    total_products: audit.total_rows,
    already_valid,
    will_update,
    still_missing,
    external_skipped,
    rows: planRows,
  };

  // ----- summary stdout -----
  safeLog('---- match-plan totals ----');
  safeLog(`  total                  ${plan.total_products}`);
  safeLog(`  already_valid          ${plan.already_valid}`);
  safeLog(`  will_update (HIGH)     ${plan.will_update}`);
  safeLog(`  still_missing          ${plan.still_missing}`);
  safeLog(`  external_skipped       ${plan.external_skipped}`);

  safeLog('---- by category ----');
  const byCat: Record<string, Record<string, number>> = {};
  for (const r of planRows) {
    const cat = r.category ?? '(uncategorized)';
    if (!byCat[cat]) byCat[cat] = {};
    const bucket = r.match_confidence === 'HIGH' ? 'HIGH' : r.match_confidence === 'LOW' ? 'LOW' : 'NONE';
    byCat[cat][bucket] = (byCat[cat][bucket] ?? 0) + 1;
  }
  for (const [cat, counts] of Object.entries(byCat).sort()) {
    safeLog(`  ${cat.padEnd(28)} HIGH=${counts.HIGH ?? 0}  LOW=${counts.LOW ?? 0}  NONE=${counts.NONE ?? 0}`);
  }

  safeLog('---- by confidence ----');
  const byConf: Record<string, number> = {};
  for (const r of planRows) byConf[r.match_confidence] = (byConf[r.match_confidence] ?? 0) + 1;
  for (const [c, n] of Object.entries(byConf).sort()) safeLog(`  ${c.padEnd(8)} ${n}`);

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const out = join(AUDIT_OUT_DIR, `match-plan-${nowIsoForFilename()}.json`);
  writeFileSync(out, JSON.stringify(plan, null, 2));
  safeLog(`match-plan: wrote ${out}`);
}

main().catch((e: unknown) => {
  process.stderr.write(`match-plan failed: ${(e as Error).message}\n`);
  process.exit(2);
});
