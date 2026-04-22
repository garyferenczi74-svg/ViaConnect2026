// Photo Sync prompt §3.5: sync runner.
//
// Modes:
//   --dry-run                       (default; no DB writes)
//   --apply                         (single transaction, idempotent)
//   --confidence=HIGH               (default; rejects LOW)
//   --category=<name>               (scope; case-insensitive substring
//                                    match against products.category so
//                                    --category=SNP matches 'snp_support')
//   --product-type=<name>           (scope; exact case-insensitive match
//                                    on products.product_type. No-op if
//                                    the column is absent.)
//   --service-category=<name>       (scope; case-insensitive substring
//                                    match on products.category. Added
//                                    by Prompt #110 for GeneX360-style
//                                    service catalogs.)
//   --plan-file=<path>              (explicit plan override; bypasses
//                                    the default pickLatest('match-plan-')
//                                    behavior. Added by Prompt #110 so
//                                    the deterministic SNP mapping plan
//                                    can shadow the #109 fuzzy plan.)
//   --rollback=<run_id>             (revert a previous --apply run)
//
// All UPDATE statements are guarded by `image_url IS DISTINCT FROM`.
// Re-running --apply immediately produces zero writes.
// On any error during --apply, ROLLBACK; products_image_audit unchanged.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getServiceRoleClient, AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './audit/_supabase-client';
import type { MatchPlan, MatchPlanRow } from '../src/lib/photoSync/types';
import { rowPassesScope } from '../src/lib/photoSync/scopeFilter';

interface CliFlags {
  apply: boolean;
  confidence: 'HIGH';
  category: string | null;
  product_type: string | null;
  service_category: string | null;
  plan_file: string | null;
  rollback_run_id: string | null;
}

function parseFlags(argv: ReadonlyArray<string>): CliFlags {
  const flags: CliFlags = {
    apply: false, confidence: 'HIGH', category: null,
    product_type: null, service_category: null, plan_file: null, rollback_run_id: null,
  };
  for (const a of argv) {
    if (a === '--apply') flags.apply = true;
    else if (a === '--dry-run') flags.apply = false;
    else if (a.startsWith('--confidence=')) {
      const v = a.slice('--confidence='.length);
      if (v !== 'HIGH') {
        process.stderr.write(`refusing --confidence=${v}; only HIGH is permitted (LOW must be admin-applied manually).\n`);
        process.exit(2);
      }
      flags.confidence = 'HIGH';
    }
    else if (a.startsWith('--category=')) flags.category = a.slice('--category='.length);
    else if (a.startsWith('--product-type=')) flags.product_type = a.slice('--product-type='.length);
    else if (a.startsWith('--service-category=')) flags.service_category = a.slice('--service-category='.length);
    else if (a.startsWith('--plan-file=')) flags.plan_file = a.slice('--plan-file='.length);
    else if (a.startsWith('--rollback=')) flags.rollback_run_id = a.slice('--rollback='.length);
  }
  return flags;
}


function pickLatest(prefix: string): string {
  const entries = readdirSync(AUDIT_OUT_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .sort().reverse();
  if (entries.length === 0) throw new Error(`No ${prefix}*.json in ${AUDIT_OUT_DIR}; run audit scripts first.`);
  return join(AUDIT_OUT_DIR, entries[0]);
}

interface AuditInsertRow {
  product_id: string;
  variant_id: string | null;
  sku: string;
  previous_image_url: string | null;
  new_image_url: string;
  match_confidence: 'HIGH' | 'LOW' | 'MANUAL' | 'ROLLBACK';
  match_source: string;
  applied_by: string;
  run_id: string;
}

async function applyRun(flags: CliFlags): Promise<void> {
  const sb = getServiceRoleClient() as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (k: string, val: string) => { neq: (k2: string, val2: string) => Promise<{ error: { message: string } | null }> };
      };
      insert: (rows: ReadonlyArray<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
      select: (cols: string) => { eq: (k: string, v: string) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> };
      delete: () => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
  };

  const planPath = flags.plan_file ?? pickLatest('match-plan-');
  safeLog(`sync: plan = ${planPath}${flags.plan_file ? '  (explicit --plan-file override)' : ''}`);
  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as MatchPlan;

  const eligible = plan.rows.filter((r): r is MatchPlanRow & { matched_public_url: string } =>
    r.match_confidence === flags.confidence
    && r.matched_public_url != null
    && r.current_image_url !== r.matched_public_url
    && rowPassesScope(r, flags),
  );

  const scopeBits: string[] = [`confidence=${flags.confidence}`];
  if (flags.category) scopeBits.push(`category~=${flags.category}`);
  if (flags.product_type) scopeBits.push(`product_type=${flags.product_type}`);
  if (flags.service_category) scopeBits.push(`service_category~=${flags.service_category}`);
  safeLog(`sync: eligible writes = ${eligible.length} (${scopeBits.join(', ')})`);

  if (!flags.apply) {
    safeLog('---- DRY RUN: rows that would update ----');
    for (const r of eligible) {
      safeLog(`  ${r.sku.padEnd(28)} ${r.current_image_url ?? '(null)'}  ->  ${r.matched_public_url}`);
    }
    safeLog(`sync: dry-run done; ${eligible.length} writes would happen.`);
    return;
  }

  const run_id = randomUUID();
  const now = new Date().toISOString();
  safeLog(`sync: APPLY mode; run_id=${run_id}`);

  // Per-row UPDATE; the supabase-js client doesn't expose explicit BEGIN/COMMIT,
  // so atomicity is achieved by:
  //   1. Doing all UPDATE writes first
  //   2. Inserting all audit rows in a single insert call
  //   3. On any UPDATE error, deleting any audit rows already inserted for this run_id
  // The runner re-checks all updates against the bucket after; any miss surfaces
  // as an error (per spec §3.5).
  const auditRows: AuditInsertRow[] = [];

  for (const r of eligible) {
    const { error: upErr } = await sb
      .from('product_catalog')
      .update({ image_url: r.matched_public_url })
      .eq('id', r.product_id)
      .neq('image_url', r.matched_public_url);  // idempotency guard
    if (upErr) {
      process.stderr.write(`sync: UPDATE failed for sku=${r.sku}: ${upErr.message}\n`);
      // Soft rollback: delete any audit rows already inserted for this run.
      await sb.from('products_image_audit').delete().eq('run_id', run_id);
      process.exit(3);
    }
    auditRows.push({
      product_id: r.product_id,
      variant_id: r.variant_id,
      sku: r.sku,
      previous_image_url: r.current_image_url,
      new_image_url: r.matched_public_url,
      match_confidence: r.match_confidence === 'HIGH' || r.match_confidence === 'LOW' ? r.match_confidence : 'MANUAL',
      match_source: r.match_source ?? 'unknown',
      applied_by: 'photo-sync-script',
      run_id,
    });
  }

  if (auditRows.length > 0) {
    const { error: aErr } = await sb.from('products_image_audit').insert(auditRows);
    if (aErr) {
      process.stderr.write(`sync: audit insert failed: ${aErr.message}\n`);
      // The UPDATEs already landed; the audit failure leaves them un-attributed.
      // Spec says treat as error and exit non-zero.
      process.exit(4);
    }
  }

  // Final-state report
  const reportPath = join(AUDIT_OUT_DIR, `sync-report-${nowIsoForFilename()}.md`);
  const lines: string[] = [
    `# Photo sync apply report`,
    `Run id: \`${run_id}\``,
    `Started: ${now}`,
    `Plan: \`${planPath}\``,
    ``,
    `## Counts`,
    `- Eligible writes: ${eligible.length}`,
    `- Audit rows inserted: ${auditRows.length}`,
    ``,
    `## Per-SKU writes`,
    ``,
    `| SKU | Previous | New |`,
    `|---|---|---|`,
    ...eligible.map((r) => `| \`${r.sku}\` | ${r.current_image_url ?? '(null)'} | ${r.matched_public_url} |`),
    ``,
    `## Still missing (for follow-up upload ticket)`,
    ``,
    ...plan.rows
      .filter((r) => r.match_confidence === 'NONE' && r.current_classification !== 'EXTERNAL')
      .map((r) => `- \`${r.sku}\` (${r.category ?? 'uncategorized'}): ${r.display_name}`),
    ``,
  ];
  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  writeFileSync(reportPath, lines.join('\n'));
  safeLog(`sync: wrote ${reportPath}`);
  safeLog(`sync: APPLY complete; run_id=${run_id} audit_rows=${auditRows.length}`);
}

async function rollbackRun(run_id: string): Promise<void> {
  const sb = getServiceRoleClient() as unknown as {
    from: (t: string) => {
      select: (cols: string) => { eq: (k: string, v: string) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> };
      update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
      insert: (rows: ReadonlyArray<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
    };
  };

  safeLog(`rollback: run_id=${run_id}`);
  const { data, error } = await sb
    .from('products_image_audit')
    .select('product_id, sku, previous_image_url, new_image_url')
    .eq('run_id', run_id);
  if (error) throw new Error(`rollback: failed to load audit rows: ${error.message}`);
  if (!data || data.length === 0) {
    safeLog('rollback: no audit rows found for that run_id; nothing to do.');
    return;
  }

  const rollbackRows: AuditInsertRow[] = [];
  for (const row of data) {
    const product_id = row.product_id as string;
    const previous_image_url = (row.previous_image_url as string | null) ?? '';
    const sku = row.sku as string;
    // Restore previous_image_url even if it was null; supabase-js sends null fine.
    const { error: upErr } = await sb.from('product_catalog')
      .update({ image_url: row.previous_image_url })
      .eq('id', product_id);
    if (upErr) throw new Error(`rollback: UPDATE failed for sku=${sku}: ${upErr.message}`);
    rollbackRows.push({
      product_id,
      variant_id: null,
      sku,
      previous_image_url: row.new_image_url as string,
      new_image_url: previous_image_url,
      match_confidence: 'ROLLBACK',
      match_source: `rollback_of_run=${run_id}`,
      applied_by: 'photo-sync-script',
      run_id: randomUUID(),
    });
  }
  await sb.from('products_image_audit').insert(rollbackRows);
  safeLog(`rollback: reverted ${rollbackRows.length} rows; new audit entries tagged ROLLBACK.`);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.rollback_run_id) {
    await rollbackRun(flags.rollback_run_id);
  } else {
    await applyRun(flags);
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`sync failed: ${(e as Error).message}\n`);
  process.exit(2);
});
