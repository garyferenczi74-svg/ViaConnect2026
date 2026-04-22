// Photo Sync prompt #110 §5.1: SNP bucket reality check.
//
// Run:   npx tsx scripts/audit/snp-bucket-reality-check.ts
// Output: /tmp/viaconnect/snp-reality-check-{ISO}.json + stdout table
//
// Read-only. Classifies every in-scope target (20 SNP supplement SKUs +
// 6 GeneX360 service cards) into one of four classes:
//
//   A - Asset in bucket, DB image_url correct, frontend broken (escalate).
//   B - Asset in bucket, DB image_url wrong/NULL (remappable: phase 5.3).
//   C - Asset absent, no candidate file (generation needed: phase 5.4).
//   D - Asset present under a different filename (admin rename OR remap DB).
//
// The check is deterministic: exact-filename lookup only. Fuzzy matching
// from #109 is intentionally suppressed for this scope so a similarly
// named file (e.g., 'mthfr-folate.webp') can't accidentally shadow the
// canonical 'mthfr-support.webp'.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { request } from 'node:https';
import { getServiceRoleClient, AUDIT_OUT_DIR, nowIsoForFilename, safeLog } from './_supabase-client';
import { PHOTO_BUCKET, PUBLIC_PREFIX } from '../../src/lib/photoSync/types';
import {
  SNP_TARGETS, SERVICE_TARGETS,
  expectedSnpFilename, expectedServicePath, legacyServiceSubfolderPath,
  IN_SCOPE_CATEGORIES, IN_SCOPE_CATEGORY_SLUGS, isInScopeCategory,
  type SnpTarget, type ServiceTarget,
} from '../../src/lib/photoSync/snpTargets';

type Klass = 'A' | 'B' | 'C' | 'D';

interface BucketEntry {
  full_path: string;
  name: string;
  size_bytes: number;
  mime_type: string;
}

interface ResultRow {
  kind: 'snp' | 'service';
  short_code_or_slug: string;
  display_name: string;
  baseline_state: 'working' | 'broken' | null;  // services have no baseline
  expected_filename: string;
  exists_in_bucket: boolean;
  actual_filename_if_different: string | null;
  file_size: number | null;
  mime_type: string | null;
  db_row_found: boolean;
  db_product_id: string | null;
  db_sku: string | null;
  db_category: string | null;     // carries forward into mapping plan so sync runner's --category matches
  db_image_url: string | null;
  db_image_resolves: boolean | null;  // null if no URL to check
  classification: Klass | 'SKIP';
  notes: string[];
}

async function listBucketFolder(
  client: ReturnType<typeof getServiceRoleClient>,
  prefix: string,
): Promise<BucketEntry[]> {
  const { data, error } = await client.storage
    .from(PHOTO_BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new Error(`list('${prefix}') failed: ${error.message}`);
  const out: BucketEntry[] = [];
  for (const obj of (data ?? []) as Array<{ id: string | null; name: string; metadata: { size?: number; mimetype?: string } | null }>) {
    if (obj.id == null) continue;  // folder marker
    out.push({
      full_path: prefix ? `${prefix}/${obj.name}` : obj.name,
      name: obj.name,
      size_bytes: obj.metadata?.size ?? 0,
      mime_type: obj.metadata?.mimetype ?? '',
    });
  }
  return out;
}

function headResolves(url: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const req = request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        const status = res.statusCode ?? 0;
        resolve(status >= 200 && status < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function findByBasename(objects: BucketEntry[], basename: string): BucketEntry | null {
  const k = basename.toLowerCase();
  return objects.find((o) => o.name.toLowerCase() === k) ?? null;
}

function findByGeneCodePrefix(objects: BucketEntry[], code: string): BucketEntry[] {
  const prefix = `${code.toLowerCase()}-`;
  return objects.filter((o) => o.name.toLowerCase().startsWith(prefix));
}

function classifyRow(args: {
  exists: boolean;
  actual_differs: boolean;
  db_image_resolves: boolean | null;
  db_image_url: string | null;
  expected_public_url: string;
}): Klass {
  const { exists, actual_differs, db_image_resolves, db_image_url, expected_public_url } = args;
  if (!exists) return 'C';                                              // no asset at all
  if (actual_differs) return 'D';                                        // exists under wrong name
  // Asset present with canonical name. Check DB state.
  if (db_image_url === expected_public_url && db_image_resolves === true) return 'A';  // all correct, frontend bug
  return 'B';                                                           // remappable
}

async function main(): Promise<void> {
  const sb = getServiceRoleClient();

  // ----- 1. Bucket inventory (root + services/) -----
  safeLog(`reality-check: listing bucket '${PHOTO_BUCKET}' root + services/...`);
  const root = await listBucketFolder(sb, '');
  await new Promise((r) => setTimeout(r, 250));
  const services = await listBucketFolder(sb, 'services');
  safeLog(`reality-check: bucket root ${root.length} objects; services/ ${services.length} objects`);

  // ----- 2. Products row load for SNP targets -----
  //
  // Scope Addendum guard: every SELECT filters on category so an
  // accidentally-matching SKU outside the two in-scope categories can
  // never land in the plan and therefore never reach the sync runner.
  // Acceptance criterion §8 requires zero out-of-scope mutations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbq = sb as any;
  const snpRows: Array<{ id: string; sku: string; name: string; category: string | null; image_url: string | null }> = [];
  const categoryFilter = [...IN_SCOPE_CATEGORIES, ...IN_SCOPE_CATEGORY_SLUGS];

  for (const t of SNP_TARGETS) {
    // Try SKU starts-with first, then fall back to name match. Both
    // queries gate on category via `in.(...)` so the SELECT can never
    // return rows outside the permitted categories.
    const { data: bySku } = await sbq
      .from('product_catalog')
      .select('id, sku, name, category, image_url')
      .ilike('sku', `${t.short_code}%`)
      .in('category', categoryFilter)
      .limit(5);
    let row = (bySku ?? []).find((r: { name: string }) => r.name?.includes(t.short_code) || r.name?.includes(t.display_name));
    if (!row && (bySku ?? []).length === 1) row = bySku[0];
    if (!row) {
      const { data: byName } = await sbq
        .from('product_catalog')
        .select('id, sku, name, category, image_url')
        .ilike('name', `${t.short_code}%`)
        .in('category', categoryFilter)
        .limit(5);
      row = (byName ?? [])[0];
    }
    // Defense in depth: if somehow an out-of-scope row slipped through,
    // drop it rather than let it into the plan.
    if (row && !isInScopeCategory(row.category)) {
      safeLog(`reality-check: dropping ${row.sku ?? row.name} (category='${row.category}' is out of scope)`);
      row = undefined;
    }
    if (row) snpRows.push(row);
  }
  safeLog(`reality-check: matched ${snpRows.length}/${SNP_TARGETS.length} SNP targets to products rows (category-scoped)`);

  // ----- 3. Compose SNP result rows -----
  const rows: ResultRow[] = [];

  for (const t of SNP_TARGETS) {
    const notes: string[] = [];
    const expected = expectedSnpFilename(t);
    const exact = findByBasename(root, expected);
    const codeMatches = findByGeneCodePrefix(root, t.short_code);
    const actualDiffer = exact == null && codeMatches.length > 0 ? codeMatches[0] : null;
    if (actualDiffer) notes.push(`bucket has '${actualDiffer.name}' (non-canonical; expected '${expected}')`);

    const dbRow = snpRows.find((r) => r.name?.includes(t.short_code) || r.sku?.toUpperCase().startsWith(t.short_code));
    const db_image_url = dbRow?.image_url ?? null;
    const db_image_resolves = db_image_url ? await headResolves(db_image_url) : null;
    if (db_image_url && db_image_resolves === false) notes.push('db image_url does not resolve (HEAD non-2xx)');

    const expected_public_url = `${PUBLIC_PREFIX}${expected}`;

    const hit = exact ?? actualDiffer ?? null;
    const classification = dbRow
      ? classifyRow({
          exists: hit != null,
          actual_differs: actualDiffer != null && exact == null,
          db_image_resolves,
          db_image_url,
          expected_public_url,
        })
      : 'SKIP';
    if (!dbRow) notes.push('no matching products row found; SKIP until the SKU is seeded');

    rows.push({
      kind: 'snp',
      short_code_or_slug: t.short_code,
      display_name: t.display_name,
      baseline_state: t.baseline_state,
      expected_filename: expected,
      exists_in_bucket: hit != null,
      actual_filename_if_different: actualDiffer && exact == null ? actualDiffer.name : null,
      file_size: hit?.size_bytes ?? null,
      mime_type: hit?.mime_type ?? null,
      db_row_found: dbRow != null,
      db_product_id: dbRow?.id ?? null,
      db_sku: dbRow?.sku ?? null,
      db_category: dbRow?.category ?? null,
      db_image_url,
      db_image_resolves,
      classification,
      notes,
    });
  }

  // ----- 4. Service rows: product_catalog under alias names -----
  //
  // Hotfix 2026-04-21: services DO live in product_catalog, but their
  // `name` column uses short aliases (GeneXM, NutragenHQ, etc.) rather
  // than the MASTER_SKUS marketing names. The /shop page bridges via a
  // NAME_ALIASES map; we mirror that mapping on SERVICE_TARGETS.catalog_name
  // so the sync runner can target the real row.
  //
  // Prompt #110 Scope Addendum (2026-04-21) locked services at bucket
  // ROOT: Products/{slug}.webp. Legacy services/ subfolder is inspected
  // to flag any stale uploads for admin cleanup.
  //
  // Also queries product_catalog.image_url so the mapping script can
  // build a proper DB-update plan for service cards (which previously
  // was skipped entirely).
  for (const s of SERVICE_TARGETS) {
    const notes: string[] = [];
    const expected_root_path = expectedServicePath(s);                   // {slug}.webp (canonical)
    const legacy_subfolder_path = legacyServiceSubfolderPath(s);         // services/{slug}.webp (deprecated)
    const expected_basename = expected_root_path;

    const exact_at_root = findByBasename(root, expected_basename);
    const exact_in_subfolder = findByBasename(services, expected_basename);

    let exact: BucketEntry | null = null;
    if (exact_at_root) {
      exact = exact_at_root;
    } else if (exact_in_subfolder) {
      // File exists but in the legacy location. Treat as Class D so admin
      // moves it to root — Gary's addendum explicitly forbids subfolders.
      exact = exact_in_subfolder;
      notes.push(`file is in legacy services/ subfolder (${exact_in_subfolder.full_path}); move to root ${expected_root_path} per scope addendum 2026-04-21`);
    }
    if (exact_at_root && exact_in_subfolder) {
      notes.push(`duplicate: file exists at BOTH Products/${expected_basename} and ${legacy_subfolder_path}. Delete the subfolder copy; root is canonical.`);
    }

    // Fallback: prefix match for non-canonical filenames in either location.
    let prefixHit: BucketEntry | null = null;
    if (!exact) {
      const prefixAtRoot = root.filter((o) => o.name.toLowerCase().startsWith(s.slug.toLowerCase()) && o.name.toLowerCase() !== expected_basename);
      const prefixInServices = services.filter((o) => o.name.toLowerCase().startsWith(s.slug.toLowerCase()));
      prefixHit = prefixAtRoot[0] ?? prefixInServices[0] ?? null;
      if (prefixHit) notes.push(`bucket has '${prefixHit.full_path}' (non-canonical; expected '${expected_basename}' at root)`);
    }

    // DB lookup: try catalog_name first (canonical in product_catalog),
    // then display_name, then master_sku_name. All are case-insensitive
    // so the query survives mixed-case seeds.
    const candidates = [s.catalog_name, s.display_name, s.master_sku_name].filter(Boolean);
    let svcRow: { id: string; sku: string | null; name: string; category: string | null; image_url: string | null } | null = null;
    for (const candidate of candidates) {
      const { data } = await sbq
        .from('product_catalog')
        .select('id, sku, name, category, image_url')
        .ilike('name', candidate)
        .limit(2);
      const match = (data ?? [])[0];
      if (match) { svcRow = match; break; }
    }

    const svc_image_url: string | null = svcRow?.image_url ?? null;
    const svc_resolves: boolean | null = svc_image_url ? await headResolves(svc_image_url) : null;
    if (svc_image_url && svc_resolves === false) notes.push('db image_url does not resolve (HEAD non-2xx)');
    if (!svcRow) notes.push(`no product_catalog row found for any of: ${candidates.join(', ')} — consult NAME_ALIASES on /shop`);

    const hit = exact ?? prefixHit ?? null;
    const inLegacyLocation = exact_in_subfolder != null && exact_at_root == null;
    const nonCanonicalName = prefixHit != null && exact == null;
    const hitExpectedUrl = `${PUBLIC_PREFIX}${expected_root_path}`;
    const classification: Klass | 'SKIP' = (() => {
      if (!svcRow) return 'SKIP';
      if (hit == null) return 'C';
      if (nonCanonicalName || inLegacyLocation) return 'D';
      if (svc_image_url === hitExpectedUrl && svc_resolves === true) return 'A';
      return 'B';
    })();

    rows.push({
      kind: 'service',
      short_code_or_slug: s.slug,
      display_name: s.display_name,
      baseline_state: null,
      expected_filename: expected_root_path,
      exists_in_bucket: hit != null,
      actual_filename_if_different: (nonCanonicalName || inLegacyLocation) && hit ? hit.full_path : null,
      file_size: hit?.size_bytes ?? null,
      mime_type: hit?.mime_type ?? null,
      db_row_found: svcRow != null,
      db_product_id: svcRow?.id ?? null,
      db_sku: svcRow?.sku ?? null,
      db_category: svcRow?.category ?? 'Testing & Diagnostics',
      db_image_url: svc_image_url,
      db_image_resolves: svc_resolves,
      classification,
      notes,
    });
  }

  // ----- 5. Summarize + emit -----
  const byClass: Record<Klass | 'SKIP', number> = { A: 0, B: 0, C: 0, D: 0, SKIP: 0 };
  for (const r of rows) byClass[r.classification] = (byClass[r.classification] ?? 0) + 1;

  safeLog('---- reality-check classification ----');
  safeLog(`  A (asset+db correct, frontend bug):   ${byClass.A}`);
  safeLog(`  B (asset present, db wrong/null):     ${byClass.B}`);
  safeLog(`  C (asset missing, generate artwork):  ${byClass.C}`);
  safeLog(`  D (asset present under wrong name):   ${byClass.D}`);
  safeLog(`  SKIP (no matching products row):      ${byClass.SKIP}`);

  safeLog('---- per-target detail ----');
  for (const r of rows) {
    const sizePretty = r.file_size ? `${Math.round(r.file_size / 1024)}KB` : '---';
    safeLog(`  [${r.classification}] ${r.kind.padEnd(7)} ${r.short_code_or_slug.padEnd(12)} ${r.display_name.padEnd(44)} expect=${r.expected_filename.padEnd(28)} bucket=${r.exists_in_bucket ? 'yes' : 'no'}  size=${sizePretty}`);
  }

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const out = join(AUDIT_OUT_DIR, `snp-reality-check-${nowIsoForFilename()}.json`);
  writeFileSync(out, JSON.stringify({
    generated_at: new Date().toISOString(),
    bucket: PHOTO_BUCKET,
    total_targets: rows.length,
    by_classification: byClass,
    rows,
  }, null, 2));
  safeLog(`reality-check: wrote ${out}`);
}

main().catch((e: unknown) => {
  process.stderr.write(`reality-check failed: ${(e as Error).message}\n`);
  process.exit(2);
});
