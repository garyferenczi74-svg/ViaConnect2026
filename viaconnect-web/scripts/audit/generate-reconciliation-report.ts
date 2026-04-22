// Photo Sync prompt §6: reconciliation report generator.
//
// Run:   npx tsx scripts/audit/generate-reconciliation-report.ts
// Output: /tmp/viaconnect/reconciliation-report-{ISO}.md
//
// Compares the most recent post-apply audit (image-audit-current-*.json)
// against the pre-apply match plan (match-plan-*.json) and surfaces any
// HIGH-confidence row that failed to flip to VALID_SUPABASE as an error.
// Read-only: no DB writes, no bucket writes, no side effects beyond the
// markdown artifact. Safe to run repeatedly.
//
// The spec §3.5 says: "After apply: re-run the audit from 3.1 and diff
// against the match plan. Any row that didn't flip to VALID_SUPABASE must
// surface as an error, not a warning." That diff lives here so the sync
// runner stays focused on the apply path.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './_supabase-client';
import type {
  ImageUrlClassification,
  MatchConfidence,
  MatchPlan,
} from '../../src/lib/photoSync/types';
import { classifyOutcome, type ReconciliationOutcome } from '../../src/lib/photoSync/reconcileOutcome';

interface AuditRow {
  id: string;
  sku: string;
  slug: string | null;
  name: string;
  category: string | null;
  product_type: string | null;
  image_url: string | null;
  classification: ImageUrlClassification;
}

interface AuditFile {
  generated_at: string;
  total_rows: number;
  rows: AuditRow[];
}

function pickLatest(prefix: string): string | null {
  let entries: string[];
  try {
    entries = readdirSync(AUDIT_OUT_DIR);
  } catch {
    return null;
  }
  const matches = entries.filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort().reverse();
  return matches.length === 0 ? null : join(AUDIT_OUT_DIR, matches[0]);
}

function pickLatestMd(prefix: string): string | null {
  let entries: string[];
  try {
    entries = readdirSync(AUDIT_OUT_DIR);
  } catch {
    return null;
  }
  const matches = entries.filter((f) => f.startsWith(prefix) && f.endsWith('.md')).sort().reverse();
  return matches.length === 0 ? null : join(AUDIT_OUT_DIR, matches[0]);
}

interface RowOutcome {
  sku: string;
  name: string;
  category: string | null;
  pre_classification: ImageUrlClassification | null;
  post_classification: ImageUrlClassification;
  planned_confidence: MatchConfidence | null;
  matched_public_url: string | null;
  post_image_url: string | null;
  outcome: ReconciliationOutcome;
}

async function main(): Promise<void> {
  const auditPath = pickLatest('image-audit-current-');
  const planPath = pickLatest('match-plan-');
  const syncReportPath = pickLatestMd('sync-report-');

  if (!planPath) {
    process.stderr.write(
      'reconciliation: no match-plan-*.json found in ' + AUDIT_OUT_DIR + '.\n' +
      'Run `npx tsx scripts/audit/match-products-to-files.ts` first.\n',
    );
    process.exit(2);
  }
  if (!auditPath) {
    process.stderr.write(
      'reconciliation: no image-audit-current-*.json found in ' + AUDIT_OUT_DIR + '.\n' +
      'Run `npx tsx scripts/audit/current-image-state.ts` first (ideally after --apply).\n',
    );
    process.exit(2);
  }

  safeLog(`reconciliation: plan       = ${planPath}`);
  safeLog(`reconciliation: audit      = ${auditPath}`);
  if (syncReportPath) safeLog(`reconciliation: last sync  = ${syncReportPath}`);

  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as MatchPlan;
  const audit = JSON.parse(readFileSync(auditPath, 'utf8')) as AuditFile;

  // Index the audit rows by product_id for O(1) lookup.
  const auditByProductId = new Map<string, AuditRow>();
  for (const r of audit.rows) auditByProductId.set(r.id, r);

  // Index plan rows by product_id too so we can flag audit rows without plan entries.
  const planByProductId = new Map<string, (typeof plan.rows)[number]>();
  for (const r of plan.rows) planByProductId.set(r.product_id, r);

  const outcomes: RowOutcome[] = [];

  for (const p of plan.rows) {
    const a = auditByProductId.get(p.product_id);
    const post_classification: ImageUrlClassification = a ? a.classification : 'NULL';
    const post_image_url = a?.image_url ?? null;

    const outcome = classifyOutcome({
      pre: p.current_classification,
      post: post_classification,
      confidence: p.match_confidence,
    });

    outcomes.push({
      sku: p.sku,
      name: p.display_name,
      category: p.category,
      pre_classification: p.current_classification,
      post_classification,
      planned_confidence: p.match_confidence,
      matched_public_url: p.matched_public_url,
      post_image_url,
      outcome,
    });
  }

  // Any audit row without a plan entry — surface it too.
  for (const a of audit.rows) {
    if (!planByProductId.has(a.id)) {
      outcomes.push({
        sku: a.sku,
        name: a.name,
        category: a.category,
        pre_classification: null,
        post_classification: a.classification,
        planned_confidence: null,
        matched_public_url: null,
        post_image_url: a.image_url,
        outcome: 'no_plan_entry',
      });
    }
  }

  const failedToFlip = outcomes.filter((o) => o.outcome === 'failed_to_flip');
  const regressed = outcomes.filter((o) => o.outcome === 'unexpected_regress');

  const counts: Record<ReconciliationOutcome, number> = {
    flipped_to_valid: 0,
    already_valid: 0,
    unchanged_external: 0,
    unchanged_placeholder: 0,
    unchanged_null: 0,
    unchanged_stale: 0,
    failed_to_flip: 0,
    unexpected_regress: 0,
    no_plan_entry: 0,
  };
  for (const o of outcomes) counts[o.outcome]++;

  // Still-missing list (same shape the sync runner emits) for the follow-up ticket.
  const stillMissing = outcomes.filter((o) =>
    (o.post_classification === 'NULL' || o.post_classification === 'STALE_SUPABASE' || o.post_classification === 'PLACEHOLDER')
    && o.outcome !== 'unchanged_external',
  );

  // Build markdown.
  const lines: string[] = [
    `# Photo sync reconciliation report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `- Plan snapshot: \`${planPath}\` (${plan.total_products} products)`,
    `- Current audit: \`${auditPath}\` (${audit.total_rows} products)`,
    syncReportPath ? `- Last sync report: \`${syncReportPath}\`` : `- No sync-report-*.md found (apply may not have run yet).`,
    ``,
    `## Outcome counts`,
    ``,
    `| Outcome | Count |`,
    `|---|---:|`,
    `| Flipped to VALID_SUPABASE | ${counts.flipped_to_valid} |`,
    `| Already VALID (unchanged) | ${counts.already_valid} |`,
    `| EXTERNAL (skipped by design) | ${counts.unchanged_external} |`,
    `| Still PLACEHOLDER (no plan match) | ${counts.unchanged_placeholder} |`,
    `| Still NULL (no plan match) | ${counts.unchanged_null} |`,
    `| Still STALE (no plan match) | ${counts.unchanged_stale} |`,
    `| **Failed to flip (ERROR)** | **${counts.failed_to_flip}** |`,
    `| **Unexpected regression (ERROR)** | **${counts.unexpected_regress}** |`,
    `| No plan entry (audit-only row) | ${counts.no_plan_entry} |`,
    ``,
  ];

  if (failedToFlip.length > 0) {
    lines.push(
      `## Errors: HIGH-confidence rows that did not flip`,
      ``,
      `These products had a HIGH-confidence match in the plan but \`image_url\` is still not VALID_SUPABASE after the apply. Investigate each one before merging.`,
      ``,
      `| SKU | Category | Planned URL | Post-apply URL | Post classification |`,
      `|---|---|---|---|---|`,
      ...failedToFlip.map((o) => (
        `| \`${o.sku}\` | ${o.category ?? '(uncategorized)'} | ${o.matched_public_url ?? '(none)'} | ${o.post_image_url ?? '(null)'} | ${o.post_classification} |`
      )),
      ``,
    );
  }

  if (regressed.length > 0) {
    lines.push(
      `## Errors: unexpected regressions`,
      ``,
      `These products were VALID_SUPABASE before the run but are not VALID now. The apply should never regress a valid row; investigate the bucket and DB state.`,
      ``,
      `| SKU | Category | Pre | Post | Post URL |`,
      `|---|---|---|---|---|`,
      ...regressed.map((o) => (
        `| \`${o.sku}\` | ${o.category ?? '(uncategorized)'} | ${o.pre_classification ?? '(none)'} | ${o.post_classification} | ${o.post_image_url ?? '(null)'} |`
      )),
      ``,
    );
  }

  if (stillMissing.length > 0) {
    lines.push(
      `## Still missing (for upload ticket #109a)`,
      ``,
      `Grouped by category. Upload the matching image to \`supplement-photos\` with the SKU as the filename, then re-run audit + sync.`,
      ``,
    );
    const byCat: Record<string, RowOutcome[]> = {};
    for (const o of stillMissing) {
      const c = o.category ?? '(uncategorized)';
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(o);
    }
    for (const [cat, rows] of Object.entries(byCat).sort()) {
      lines.push(`### ${cat} (${rows.length})`);
      lines.push('');
      for (const o of rows.sort((a, b) => a.sku.localeCompare(b.sku))) {
        lines.push(`- \`${o.sku}\`: ${o.name} (current: ${o.post_classification})`);
      }
      lines.push('');
    }
  }

  lines.push(
    `## Per-SKU table`,
    ``,
    `| SKU | Category | Plan confidence | Pre | Post | Outcome |`,
    `|---|---|---|---|---|---|`,
    ...outcomes
      .sort((a, b) => (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz') || a.sku.localeCompare(b.sku))
      .map((o) => (
        `| \`${o.sku}\` | ${o.category ?? '(uncategorized)'} | ${o.planned_confidence ?? '(n/a)'} | ${o.pre_classification ?? '(n/a)'} | ${o.post_classification} | ${o.outcome} |`
      )),
    ``,
  );

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const out = join(AUDIT_OUT_DIR, `reconciliation-report-${nowIsoForFilename()}.md`);
  writeFileSync(out, lines.join('\n'));
  safeLog(`reconciliation: wrote ${out}`);

  // Stdout summary
  safeLog('---- reconciliation summary ----');
  for (const [k, v] of Object.entries(counts).sort()) safeLog(`  ${k.padEnd(24)} ${v}`);
  if (failedToFlip.length > 0) {
    safeLog('');
    safeLog(`ERROR: ${failedToFlip.length} HIGH-confidence rows failed to flip. See ${out}.`);
    process.exit(3);
  }
  if (regressed.length > 0) {
    safeLog('');
    safeLog(`ERROR: ${regressed.length} rows regressed from VALID. See ${out}.`);
    process.exit(3);
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`reconciliation failed: ${(e as Error).message}\n`);
  process.exit(2);
});
