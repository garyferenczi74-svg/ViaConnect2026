// Photo Sync prompt #110 §5.2: SNP filename mapping.
//
// Run:   npx tsx scripts/audit/snp-filename-mapping.ts
// Inputs: most-recent /tmp/viaconnect/snp-reality-check-*.json
// Outputs:
//   /tmp/viaconnect/snp-mapping-plan-{ISO}.json   (human-readable audit)
//   /tmp/viaconnect/snp-plan-{ISO}.json           (MatchPlan-compatible,
//                                                  consumable by
//                                                  scripts/sync-supplement-photos.ts
//                                                  via --plan-file=<path>)
//
// Deterministic exact-filename mapping. No fuzzy matching — spec §5.2
// explicitly suppresses #109's Levenshtein fallback for SNP scope so a
// near-miss filename can't accidentally shadow the canonical one.

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './_supabase-client';
import { PHOTO_BUCKET, PUBLIC_PREFIX, type ImageUrlClassification, type MatchPlan, type MatchPlanRow } from '../../src/lib/photoSync/types';
import { isInScopeCategory } from '../../src/lib/photoSync/snpTargets';

interface RealityCheckRow {
  kind: 'snp' | 'service';
  short_code_or_slug: string;
  display_name: string;
  baseline_state: 'working' | 'broken' | null;
  expected_filename: string;
  exists_in_bucket: boolean;
  actual_filename_if_different: string | null;
  file_size: number | null;
  mime_type: string | null;
  db_row_found: boolean;
  db_product_id: string | null;
  db_sku: string | null;
  db_category: string | null;
  db_image_url: string | null;
  db_image_resolves: boolean | null;
  classification: 'A' | 'B' | 'C' | 'D' | 'SKIP';
  notes: string[];
}

interface RealityCheckFile {
  generated_at: string;
  bucket: string;
  total_targets: number;
  by_classification: Record<string, number>;
  rows: RealityCheckRow[];
}

interface HumanPlanRow {
  kind: 'snp' | 'service';
  sku: string | null;
  short_code_or_slug: string;
  display_name: string;
  classification: RealityCheckRow['classification'];
  current_image_url: string | null;
  target_image_url: string | null;
  target_bucket_path: string | null;
  action: 'REMAP_EXACT' | 'REMAP_EXISTING_RENAMED' | 'GENERATE' | 'SKIP' | 'NO_CHANGE';
  match_source: 'EXACT_FILENAME' | 'EXISTING_RENAMED' | null;
  notes: string[];
}

function pickLatest(prefix: string): string {
  const entries = readdirSync(AUDIT_OUT_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .sort().reverse();
  if (entries.length === 0) {
    throw new Error(`No ${prefix}*.json in ${AUDIT_OUT_DIR}. Run scripts/audit/snp-bucket-reality-check.ts first.`);
  }
  return join(AUDIT_OUT_DIR, entries[0]);
}

function buildHumanRow(r: RealityCheckRow): HumanPlanRow {
  const target_bucket_path = (
    r.classification === 'D' && r.actual_filename_if_different
      ? (r.kind === 'service' ? r.actual_filename_if_different : r.actual_filename_if_different)
      : r.exists_in_bucket ? r.expected_filename : null
  );
  const target_image_url = target_bucket_path ? `${PUBLIC_PREFIX}${target_bucket_path}` : null;

  let action: HumanPlanRow['action'];
  let match_source: HumanPlanRow['match_source'];
  switch (r.classification) {
    case 'A':
      action = 'NO_CHANGE';
      match_source = null;
      break;
    case 'B':
      action = 'REMAP_EXACT';
      match_source = 'EXACT_FILENAME';
      break;
    case 'C':
      action = 'GENERATE';
      match_source = null;
      break;
    case 'D':
      action = 'REMAP_EXISTING_RENAMED';
      match_source = 'EXISTING_RENAMED';
      break;
    default:
      action = 'SKIP';
      match_source = null;
  }

  return {
    kind: r.kind,
    sku: r.db_sku,
    short_code_or_slug: r.short_code_or_slug,
    display_name: r.display_name,
    classification: r.classification,
    current_image_url: r.db_image_url,
    target_image_url,
    target_bucket_path,
    action,
    match_source,
    notes: r.notes,
  };
}

function buildMatchPlanRow(r: RealityCheckRow, human: HumanPlanRow): MatchPlanRow | null {
  // Only B and D SKUs with a DB row are feedable into the sync runner.
  // C (generate) and SKIP (no DB row) are surfaced elsewhere.
  if (human.action !== 'REMAP_EXACT' && human.action !== 'REMAP_EXISTING_RENAMED') return null;
  if (!r.db_product_id || !human.target_image_url || !human.target_bucket_path) return null;

  // Scope-lock guard (Prompt #110 addendum 2026-04-21): refuse to emit a
  // plan row for any product outside the two in-scope categories. The
  // reality-check already filters, but defense in depth prevents a future
  // schema change from quietly widening the blast radius.
  if (!isInScopeCategory(r.db_category)) return null;

  const pre: ImageUrlClassification = (() => {
    if (r.db_image_url == null) return 'NULL';
    if (r.db_image_url.startsWith(PUBLIC_PREFIX)) {
      return r.db_image_resolves ? 'VALID_SUPABASE' : 'STALE_SUPABASE';
    }
    return 'EXTERNAL';
  })();

  return {
    product_id: r.db_product_id,
    variant_id: null,
    sku: r.db_sku ?? r.short_code_or_slug,
    display_name: r.display_name,
    category: r.db_category,         // carried from reality-check so sync runner's --category filter matches
    current_image_url: r.db_image_url,
    current_classification: pre,
    matched_full_path: human.target_bucket_path,
    matched_public_url: human.target_image_url,
    match_confidence: 'HIGH',
    match_priority: 1,
    match_source: human.match_source ?? 'unknown',
    runners_up: [],
  };
}

async function main(): Promise<void> {
  const realityPath = pickLatest('snp-reality-check-');
  safeLog(`mapping: reality-check = ${realityPath}`);
  const reality = JSON.parse(readFileSync(realityPath, 'utf8')) as RealityCheckFile;

  const humanRows = reality.rows.map(buildHumanRow);
  const matchPlanRows = reality.rows
    .map((r, i) => buildMatchPlanRow(r, humanRows[i]))
    .filter((r): r is MatchPlanRow => r !== null);

  // ----- Summary -----
  const byAction: Record<HumanPlanRow['action'], number> = {
    REMAP_EXACT: 0, REMAP_EXISTING_RENAMED: 0, GENERATE: 0, SKIP: 0, NO_CHANGE: 0,
  };
  for (const h of humanRows) byAction[h.action]++;

  safeLog('---- mapping plan by action ----');
  for (const [a, n] of Object.entries(byAction).sort()) safeLog(`  ${a.padEnd(26)} ${n}`);

  safeLog('---- generation queue (Class C) ----');
  const genQueue = humanRows.filter((h) => h.action === 'GENERATE');
  if (genQueue.length === 0) safeLog('  (none)');
  for (const g of genQueue) {
    safeLog(`  [C] ${g.kind.padEnd(7)} ${g.short_code_or_slug.padEnd(12)} ${g.display_name}`);
  }

  safeLog('---- remappable queue (Class B+D) ----');
  const remapQueue = humanRows.filter((h) => h.action === 'REMAP_EXACT' || h.action === 'REMAP_EXISTING_RENAMED');
  if (remapQueue.length === 0) safeLog('  (none)');
  for (const r of remapQueue) {
    safeLog(`  [${r.classification}] ${r.sku ?? '(no-sku)'.padEnd(16)} -> ${r.target_bucket_path}`);
  }

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });

  const humanOut = join(AUDIT_OUT_DIR, `snp-mapping-plan-${nowIsoForFilename()}.json`);
  writeFileSync(humanOut, JSON.stringify({
    generated_at: new Date().toISOString(),
    reality_check: realityPath,
    bucket: PHOTO_BUCKET,
    by_action: byAction,
    rows: humanRows,
  }, null, 2));
  safeLog(`mapping: wrote ${humanOut}`);

  const matchPlan: MatchPlan = {
    generated_at: new Date().toISOString(),
    total_products: matchPlanRows.length,
    already_valid: 0,
    will_update: matchPlanRows.length,
    still_missing: humanRows.filter((h) => h.action === 'GENERATE').length,
    external_skipped: 0,
    rows: matchPlanRows,
  };
  const matchOut = join(AUDIT_OUT_DIR, `snp-plan-${nowIsoForFilename()}.json`);
  writeFileSync(matchOut, JSON.stringify(matchPlan, null, 2));
  safeLog(`mapping: wrote ${matchOut}  (feed this into sync via --plan-file)`);
  safeLog('');
  safeLog(`next step: npx tsx scripts/sync-supplement-photos.ts --plan-file=${matchOut} --dry-run`);
}

main().catch((e: unknown) => {
  process.stderr.write(`snp-filename-mapping failed: ${(e as Error).message}\n`);
  process.exit(2);
});
