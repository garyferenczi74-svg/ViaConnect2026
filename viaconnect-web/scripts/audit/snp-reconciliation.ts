// Photo Sync prompt #110 §5.7: SNP reconciliation report.
//
// Run:   npx tsx scripts/audit/snp-reconciliation.ts
// Output: /tmp/viaconnect/snp-reconciliation-{ISO}.md
//
// Reads the post-remediation state of the 24 in-scope targets and
// produces the PR-ready reconciliation markdown described in §5.7:
//
//   - Per-SKU status: RESOLVED | STILL_BROKEN
//   - Source of resolution: EXISTING_REMAP | NEW_UPLOAD | STILL_MISSING
//   - products_image_audit row count for this run vs. expected
//   - Before/after screenshot placeholder (Playwright §5.6 fills this in)
//
// Read-only. Exits code 3 if any target is still STILL_BROKEN so the
// report blocks a merge when coverage is incomplete.

import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getServiceRoleClient, AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './_supabase-client';
import { PHOTO_BUCKET } from '../../src/lib/photoSync/types';
import { SNP_TARGETS, SERVICE_TARGETS } from '../../src/lib/photoSync/snpTargets';

interface RealityCheckRow {
  kind: 'snp' | 'service';
  short_code_or_slug: string;
  display_name: string;
  baseline_state: 'working' | 'broken' | null;
  expected_filename: string;
  exists_in_bucket: boolean;
  actual_filename_if_different: string | null;
  db_image_url: string | null;
  db_image_resolves: boolean | null;
  classification: 'A' | 'B' | 'C' | 'D' | 'SKIP';
}

interface RealityCheckFile {
  generated_at: string;
  bucket: string;
  total_targets: number;
  rows: RealityCheckRow[];
}

interface UploadLog {
  generated_at: string;
  counts: Record<string, number>;
  results: Array<{ bucket_key: string; outcome: string }>;
}

type ResolutionSource = 'EXISTING_REMAP' | 'NEW_UPLOAD' | 'STILL_MISSING';

interface Outcome {
  kind: 'snp' | 'service';
  short_code_or_slug: string;
  display_name: string;
  baseline_state: 'working' | 'broken' | null;
  currently_resolved: boolean;
  resolution_source: ResolutionSource;
  expected_filename: string;
  db_image_url: string | null;
  note: string;
}

function pickLatest(prefix: string, ext = '.json'): string | null {
  let entries: string[];
  try {
    entries = readdirSync(AUDIT_OUT_DIR);
  } catch {
    return null;
  }
  const matches = entries.filter((f) => f.startsWith(prefix) && f.endsWith(ext)).sort().reverse();
  return matches.length === 0 ? null : join(AUDIT_OUT_DIR, matches[0]);
}

async function main(): Promise<void> {
  const realityPath = pickLatest('snp-reality-check-');
  if (!realityPath) {
    process.stderr.write(
      'snp-reconciliation: no snp-reality-check-*.json in ' + AUDIT_OUT_DIR + '.\n' +
      'Run scripts/audit/snp-bucket-reality-check.ts after applying the sync, then re-run this.\n',
    );
    process.exit(2);
  }
  const reality = JSON.parse(readFileSync(realityPath, 'utf8')) as RealityCheckFile;
  safeLog(`snp-reconciliation: reality = ${realityPath}`);

  const uploadPath = pickLatest('snp-upload-log-');
  const upload = uploadPath ? (JSON.parse(readFileSync(uploadPath, 'utf8')) as UploadLog) : null;
  if (uploadPath) safeLog(`snp-reconciliation: upload  = ${uploadPath}`);
  else safeLog('snp-reconciliation: no upload log found (no new-upload events to credit)');

  const uploadedKeys = new Set<string>(
    (upload?.results ?? [])
      .filter((r) => r.outcome === 'uploaded' || r.outcome === 'overwritten')
      .map((r) => r.bucket_key.toLowerCase()),
  );

  // ----- Build outcome per target -----
  const outcomes: Outcome[] = [];
  for (const t of SNP_TARGETS) {
    const r = reality.rows.find((x) => x.kind === 'snp' && x.short_code_or_slug === t.short_code);
    if (!r) {
      outcomes.push({
        kind: 'snp', short_code_or_slug: t.short_code, display_name: t.display_name,
        baseline_state: t.baseline_state, currently_resolved: false,
        resolution_source: 'STILL_MISSING', expected_filename: `${t.short_code.toLowerCase()}-support.webp`,
        db_image_url: null, note: 'reality-check has no row for this target',
      });
      continue;
    }
    const resolved = r.classification === 'A' || (r.exists_in_bucket && r.db_image_resolves === true);
    const wasUpload = uploadedKeys.has(r.expected_filename.toLowerCase()) || (r.actual_filename_if_different && uploadedKeys.has(r.actual_filename_if_different.toLowerCase()));
    const source: ResolutionSource = !resolved ? 'STILL_MISSING' : wasUpload ? 'NEW_UPLOAD' : 'EXISTING_REMAP';
    outcomes.push({
      kind: 'snp', short_code_or_slug: t.short_code, display_name: t.display_name,
      baseline_state: t.baseline_state, currently_resolved: resolved,
      resolution_source: source, expected_filename: r.expected_filename,
      db_image_url: r.db_image_url,
      note: r.classification === 'SKIP' ? 'no matching products row (SKIP)' : r.classification,
    });
  }

  for (const s of SERVICE_TARGETS) {
    const r = reality.rows.find((x) => x.kind === 'service' && x.short_code_or_slug === s.slug);
    if (!r) {
      outcomes.push({
        kind: 'service', short_code_or_slug: s.slug, display_name: s.display_name,
        baseline_state: null, currently_resolved: false, resolution_source: 'STILL_MISSING',
        expected_filename: `services/${s.slug}.webp`, db_image_url: null, note: 'reality-check has no row',
      });
      continue;
    }
    const resolved = r.exists_in_bucket;
    const wasUpload = uploadedKeys.has(r.expected_filename.toLowerCase()) || (r.actual_filename_if_different && uploadedKeys.has(r.actual_filename_if_different.toLowerCase()));
    const source: ResolutionSource = !resolved ? 'STILL_MISSING' : wasUpload ? 'NEW_UPLOAD' : 'EXISTING_REMAP';
    outcomes.push({
      kind: 'service', short_code_or_slug: s.slug, display_name: s.display_name,
      baseline_state: null, currently_resolved: resolved,
      resolution_source: source, expected_filename: r.expected_filename,
      db_image_url: null,
      note: r.notes?.join(' | ') ?? '',
    });
  }

  // ----- Audit table row count -----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getServiceRoleClient() as any;
  let auditRowsThisRun = 0;
  try {
    const { data } = await sb
      .from('products_image_audit')
      .select('id', { count: 'exact', head: false })
      .gte('applied_at', reality.generated_at);
    auditRowsThisRun = Array.isArray(data) ? data.length : 0;
  } catch {
    // Non-fatal — some Supabase clients don't return count via this path; just report 0.
  }

  const resolvedCount = outcomes.filter((o) => o.currently_resolved).length;
  const stillBroken = outcomes.filter((o) => !o.currently_resolved);
  const bySource: Record<ResolutionSource, number> = { EXISTING_REMAP: 0, NEW_UPLOAD: 0, STILL_MISSING: 0 };
  for (const o of outcomes) bySource[o.resolution_source]++;

  // ----- Markdown -----
  const lines: string[] = [
    `# Prompt #110 — SNP & GeneX360 Reconciliation Report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Bucket: \`${PHOTO_BUCKET}\` (capital P)`,
    `Reality-check input: \`${realityPath}\``,
    uploadPath ? `Upload-log input: \`${uploadPath}\`` : `Upload-log input: (none; no NEW_UPLOAD events recorded)`,
    ``,
    `## Headline`,
    ``,
    `- In-scope targets: **${outcomes.length}** (${SNP_TARGETS.length} SNP SKUs + ${SERVICE_TARGETS.length} GeneX360 service cards)`,
    `- Resolved: **${resolvedCount}**`,
    `- Still broken: **${stillBroken.length}**`,
    `- products_image_audit rows attributed to this run (applied_at >= reality-check timestamp): **${auditRowsThisRun}**`,
    ``,
    `## Resolution source breakdown`,
    ``,
    `| Source | Count |`,
    `|---|---:|`,
    `| EXISTING_REMAP | ${bySource.EXISTING_REMAP} |`,
    `| NEW_UPLOAD | ${bySource.NEW_UPLOAD} |`,
    `| STILL_MISSING | ${bySource.STILL_MISSING} |`,
    ``,
  ];

  if (stillBroken.length > 0) {
    lines.push(
      `## Still broken (blocks merge)`,
      ``,
      `| Kind | Code/Slug | Display name | Expected filename | Note |`,
      `|---|---|---|---|---|`,
      ...stillBroken.map((o) => `| ${o.kind} | \`${o.short_code_or_slug}\` | ${o.display_name} | \`${o.expected_filename}\` | ${o.note} |`),
      ``,
    );
  }

  lines.push(
    `## Per-target outcome`,
    ``,
    `| Kind | Code/Slug | Display name | Status | Source | Expected filename | DB url |`,
    `|---|---|---|---|---|---|---|`,
    ...outcomes
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.short_code_or_slug.localeCompare(b.short_code_or_slug))
      .map((o) => {
        const status = o.currently_resolved ? 'RESOLVED' : 'STILL_BROKEN';
        return `| ${o.kind} | \`${o.short_code_or_slug}\` | ${o.display_name} | ${status} | ${o.resolution_source} | \`${o.expected_filename}\` | ${o.db_image_url ?? '(none)'} |`;
      }),
    ``,
    `## Playwright before/after`,
    ``,
    `- Before: \`tests/e2e/__screenshots__/snp-coverage/before/\``,
    `- After:  \`tests/e2e/__screenshots__/snp-coverage/after/\``,
    ``,
    `Attach these directories to the PR once the Playwright spec \`tests/e2e/snp-image-coverage.spec.ts\` runs in CI. If Playwright is still being configured, note the deferral and paste the admin /admin/catalog-health dashboard screenshot instead.`,
    ``,
    `## Next steps`,
    ``,
    stillBroken.length === 0
      ? `- All 24 targets render. Proceed with PR merge after Playwright CI passes.`
      : `- ${stillBroken.length} targets still broken. Upload the missing assets via \`npx tsx scripts/upload-snp-assets.ts --source <dir> --apply\` and re-run this reconciliation.`,
    ``,
  );

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const out = join(AUDIT_OUT_DIR, `snp-reconciliation-${nowIsoForFilename()}.md`);
  writeFileSync(out, lines.join('\n'));
  safeLog(`snp-reconciliation: wrote ${out}`);

  // Short stdout summary
  safeLog('---- reconciliation summary ----');
  safeLog(`  resolved:         ${resolvedCount}/${outcomes.length}`);
  safeLog(`  still_broken:     ${stillBroken.length}`);
  safeLog(`  by_source:        EXISTING_REMAP=${bySource.EXISTING_REMAP}, NEW_UPLOAD=${bySource.NEW_UPLOAD}, STILL_MISSING=${bySource.STILL_MISSING}`);
  safeLog(`  audit_rows:       ${auditRowsThisRun}`);

  if (stillBroken.length > 0) {
    safeLog('');
    safeLog(`ERROR: ${stillBroken.length} targets still broken. See ${out}.`);
    process.exit(3);
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`snp-reconciliation failed: ${(e as Error).message}\n`);
  process.exit(2);
});

// Silence lints on the existsSync import if the node path gets tree-shaken.
void existsSync;
