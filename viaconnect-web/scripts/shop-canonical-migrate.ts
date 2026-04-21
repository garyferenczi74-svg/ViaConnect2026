/**
 * Prompt #106 one-shot — canonicalize existing bucket uploads.
 *
 * The supplement-photos bucket contains ~60 bottle renders uploaded at root
 * with ad-hoc filenames (e.g., "Creatine HCL+.png", "Sproutables Chidrens+ .png").
 * The shop reads product_catalog.image_url which still points at the legacy
 * "Products Update/" bucket. This script:
 *
 *   1. Matches each root-level bucket file to a master_skus row by name.
 *   2. Copies the bytes to the canonical path {category_slug}/{sku_slug}.png.
 *   3. Upserts supplement_photo_inventory with SHA-256.
 *   4. Creates a supplement_photo_bindings row (is_primary=TRUE).
 *   5. Updates product_catalog.image_url for the matching SKU.
 *   6. Logs every step to shop_refresh_audit_log.
 *
 * Non-bottle images (logos, SVGs) and any file that cannot be matched are
 * reported but left untouched — never silently overwritten.
 *
 * Requires typed confirmation per §3.5:
 *   npx tsx scripts/shop-canonical-migrate.ts "APPROVE IMAGE REFRESH"
 * Without the exact phrase, the script runs in dry-run mode and only
 * prints the match table.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Minimal .env.local loader — avoids adding dotenv to package.json.
function loadDotEnvLocal(): void {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, key, rawVal] = m as unknown as [string, string, string];
    if (process.env[key] !== undefined) continue;
    let val = rawVal;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadDotEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const BUCKET = 'supplement-photos';

const ACTOR = process.env.SHOP_MIGRATION_ACTOR_USER_ID ?? null;
const CONFIRM = process.argv[2] ?? '';
const LIVE = CONFIRM === 'APPROVE IMAGE REFRESH';

// Short master_skus.category → canonical slug (§5.2 mapping).
const CATEGORY_SLUG: Record<string, string> = {
  Advanced: 'advanced-formulations',
  Base: 'base-formulations',
  Women: 'womens-health',
  Children: 'sproutables-childrens',
  SNP: 'snp-support-formulations',
  Mushroom: 'functional-mushrooms',
};

// Deterministic bucket filename → master_skus.name alias table.
// Authored by reading every file in the bucket against master_skus.name and
// resolving typos + spacing variants by hand so the migration is auditable.
const FILENAME_TO_MASTER_NAME: Record<string, string> = {
  // Advanced
  'Balance+.png': 'Balance+ Gut Repair',
  'Blast+.png': 'BLAST+ Nitric Oxide Stack',
  'NeuroCalm+.png': 'NeuroCalm+ (Calm+)',
  'Catalyst + .png': 'CATALYST+ Energy Multivitamin',
  'Clean+.png': 'Clean+ Detox & Liver Health',
  'Creatine HCL+.png': 'Creatine HCL+',
  'DigestiZorb+.png': 'DigestiZorb+ Enzyme Complex',
  'FLEX+.png': 'FLEX+ Joint & Inflammation',
  'Focus+.png': 'FOCUS+ Nootropic Formula',
  'Histamine Relief Protocol+ .png': 'Histamine Relief Protocol',
  'Inferno+.png': 'GLP-1 Activator Complex',   // "Inferno+" is the creative name for GLP-1
  'Iron+.png': 'IRON+ Red Blood Cell Support',
  'NeuroAxis+.png': 'NeuroCalm+ (Calm+)',       // — Observed as an alternate skin; SNP-focused NeuroCalm
  'NeuroCalm BH4+.png': 'NeuroCalm BH4+ (Advanced)',
  'Relax+.png': 'RELAX+ Sleep Support',
  'Replenish NAD+.png': 'Replenish NAD+',
  'Rise+.png': 'RISE+ Male Testosterone',
  'Shred+.png': 'Clean+ Detox & Liver Health',  // "Shred+" maps to Clean+ per the creative naming
  'Teloprime+.png': 'Teloprime+ Telomere Support',
  'ThyroBalance+  .png': 'ThyroBalance+',       // womens catalog — master_skus does not have it

  // Base
  'BHB Ketone Salts+ .png': 'BHB Ketone Salts',
  'Electrolytes+.png': 'Electrolyte Blend',
  'MethylB+.png': 'MethylB Complete+ B Complex',
  'Magnesium Synergy Matrix+.png': 'Magnesium Synergy Matrix',
  'Omega-3  DHAEPA (Algal)+.png': 'Omega-3 DHA/EPA (Algal)',
  'Toxibind+ .png': 'ToxiBind Matrix',
  'Aptigen Complex+ .png': 'GLP-1 Activator Complex', // Aptigen is GLP-1 base
  'Thrive+.png': 'Thrive+ Post-Natal GLP-1',

  // Women
  'CycleSync + .png': 'CycleSync+',              // not in master_skus — catalog-only
  'Desire +.png': 'DESIRE+ Female Hormonal',
  'Grow+.png': 'Grow+ Pre-Natal Formula',
  'MenoBalance+.png': 'MenoBalance+',            // catalog-only
  'Radiance+   .png': 'Radiance+',               // catalog-only
  'RevitalizHer+.png': 'Revitalizher Postnatal+',

  // Children
  'Sproutables Chidrens+ .png': 'Sproutables Children Gummies',
  'Sproutables Infants+ .png': 'Sproutables Infant Tincture',
  'Sproutables Todlers+ .png': 'Sproutables Toddler Tablets',

  // SNP Support (20 SKUs; master_skus only — no product_catalog rows yet)
  'ACHY Support+.png': 'ACHY+ Acetylcholine Support',
  'ADO Support+.png': 'ADO Support+ Purine Metabolism',
  'BHMT Support+.png': 'BHMT+ Methylation Support',
  'CBS Support+.png': 'CBS Support+ Sulfur Pathway',
  'COMT Support + .png': 'COMT+ Neurotransmitter Balance',
  'DAO Support+.png': 'DAO+ Histamine Balance',
  'GST Support+.png': 'GST+ Cellular Detox',
  'MAOA Support+.png': 'MAOA+ Neurochemical Balance',
  'MTHFR Support+.png': 'MTHFR+ Folate Metabolism',
  'MTR Support+ .png': 'MTR+ Methylation Matrix',
  'MTRR Support+ .png': 'MTRR+ Methylcobalamin Regen',
  'NAT Support+.png': 'NAT Support+ Acetylation',
  'NOS Support+.png': 'NOS+ Vascular Integrity',
  'RFC1 Support+.png': 'RFC1 Support+ Folate Transport',
  'SHMT Support+.png': 'SHMT+ Glycine-Folate Balance',
  'SOD Support+.png': 'SOD+ Antioxidant Defense',
  'SUOX  Support+.png': 'SUOX+ Sulfite Clearance',
  'TCN2 Support+.png': 'TCN2+ B12 Transport',
  'VDR Support+.png': 'VDR+ Receptor Activation',

  // Mushroom
  'Chaga.png': 'Chaga Mushroom Capsules',
  'Cordyseps.png': 'Cordyceps Mushroom Capsules',  // typo "Cordyseps"
  'Lions Mane.png': 'Lions Mane Mushroom Capsules',
  'Reishi.png': 'Reishi Mushroom Capsules',
  'Turkey Tail.png': 'Turkey Tail Mushroom Capsules',
};

// Non-bottle files to ignore entirely.
const IGNORED_FILES = new Set<string>([
  'Orange Two Side Circle Logo.png',
  'Sproutables Logo.png',
  'ViaConnect Cura 1.png',
  'ViaCura Final.svg',
]);

// Extra catalog-side alias: for catalog rows whose name differs from
// master_skus.name but should still receive the image (e.g., "NeuroCalm+"
// catalog row vs. "NeuroCalm+ (Calm+)" master row).
const CATALOG_NAME_ALIASES: Record<string, string[]> = {
  'NeuroCalm+ (Calm+)': ['NeuroCalm+'],
  'NeuroCalm BH4+ (Advanced)': ['NeuroCalm BH4+ (Advanced)'],
};

function slugifyForPath(input: string): string {
  return input.trim().toLowerCase()
    .replace(/[\u2122\u00ae\u00a9]/g, '')
    .replace(/['"]/g, '')
    .replace(/\+/g, '-plus-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function publicUrl(objectPath: string): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Mode: ${LIVE ? 'LIVE' : 'DRY-RUN'}`);
  if (!LIVE) {
    console.log('(To execute, re-run with: npx tsx scripts/shop-canonical-migrate.ts "APPROVE IMAGE REFRESH")\n');
  }

  // Fetch canonical data.
  const { data: masters } = await admin.from('master_skus')
    .select('sku, name, category')
    .in('category', ['Advanced', 'Base', 'Women', 'Children', 'SNP', 'Mushroom']);
  const { data: catalogRows } = await admin.from('product_catalog')
    .select('id, sku, name, category, image_url')
    .in('category', ['advanced', 'base', 'womens', 'childrens', 'mushroom']);

  const masterByName = new Map<string, { sku: string; name: string; category: string }>();
  for (const m of (masters ?? []) as any[]) masterByName.set(m.name, m);

  const catalogByName = new Map<string, any>();
  for (const c of (catalogRows ?? []) as any[]) catalogByName.set(c.name, c);

  // List bucket root.
  const { data: rootFiles, error: listErr } = await admin.storage.from(BUCKET).list('', { limit: 1000 });
  if (listErr) { console.error('list error', listErr); process.exit(1); }

  const rows: Array<{
    file: string; masterName: string; masterSku: string; categorySlug: string;
    skuSlug: string; canonicalPath: string; catalogSku?: string;
    note?: string;
  }> = [];
  const unmatched: string[] = [];

  for (const f of (rootFiles ?? []) as any[]) {
    const name = f.name as string;
    if (!name || name.includes('/')) continue; // directory entry
    if (IGNORED_FILES.has(name)) continue;

    const masterName = FILENAME_TO_MASTER_NAME[name];
    if (!masterName) { unmatched.push(name); continue; }

    const master = masterByName.get(masterName);
    if (!master) {
      // Some filenames map to a catalog-only name (no master_skus row — e.g.,
      // CycleSync+, MenoBalance+, Radiance+, ThyroBalance+). For these we
      // derive the category from the catalog row directly.
      const cat = catalogByName.get(masterName);
      if (!cat) { unmatched.push(`${name} -> ${masterName} (no master + no catalog)`); continue; }
      const slug = CATEGORY_SLUG[
        ({ advanced: 'Advanced', base: 'Base', womens: 'Women', childrens: 'Children', mushroom: 'Mushroom' } as Record<string, string>)[cat.category] ?? ''
      ];
      if (!slug) { unmatched.push(`${name} -> ${masterName} (no category slug for catalog.${cat.category})`); continue; }
      rows.push({
        file: name,
        masterName,
        masterSku: cat.sku,
        categorySlug: slug,
        skuSlug: slugifyForPath(masterName),
        canonicalPath: `${slug}/${slugifyForPath(masterName)}.png`,
        catalogSku: cat.sku,
        note: 'catalog-only (no master_skus row)',
      });
      continue;
    }
    const slug = CATEGORY_SLUG[master.category];
    if (!slug) { unmatched.push(`${name} -> ${masterName} (unknown category ${master.category})`); continue; }
    const skuSlug = slugifyForPath(master.name);
    const canonicalPath = `${slug}/${skuSlug}.png`;

    // Attempt to match product_catalog for image_url update.
    let catalogSku: string | undefined;
    const directCatalog = catalogByName.get(master.name);
    if (directCatalog) catalogSku = directCatalog.sku;
    else {
      const aliases = CATALOG_NAME_ALIASES[master.name] ?? [];
      for (const alias of aliases) {
        const c = catalogByName.get(alias);
        if (c) { catalogSku = c.sku; break; }
      }
    }

    rows.push({
      file: name, masterName, masterSku: master.sku,
      categorySlug: slug, skuSlug, canonicalPath, catalogSku,
      note: catalogSku ? undefined : 'master match; no catalog row (SNP likely)',
    });
  }

  console.log('\nMATCHED:');
  for (const r of rows) {
    const star = r.catalogSku ? '*' : ' ';
    console.log(`  ${star} ${r.file.padEnd(40)} → ${r.canonicalPath}${r.catalogSku ? ` [catalog ${r.catalogSku}]` : ''}${r.note ? ` (${r.note})` : ''}`);
  }
  console.log(`\nTotal: ${rows.length} matched, ${unmatched.length} unmatched, ${IGNORED_FILES.size} ignored.`);
  if (unmatched.length > 0) {
    console.log('\nUNMATCHED (leaving as-is):');
    for (const u of unmatched) console.log(`  - ${u}`);
  }

  if (!LIVE) {
    console.log('\nDry-run complete. No changes made.');
    return;
  }

  console.log('\nExecuting migration ...\n');

  let uploaded = 0, alreadyCanonical = 0, inventoryWritten = 0, bindingsCreated = 0, catalogUpdated = 0, errors = 0;

  for (const r of rows) {
    try {
      // 1. Download bytes.
      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(r.file);
      if (dlErr || !blob) throw new Error(`download ${r.file}: ${dlErr?.message}`);
      const bytes = Buffer.from(await blob.arrayBuffer());

      // 2. Check if canonical already exists with same SHA.
      const sha = createHash('sha256').update(bytes).digest('hex');

      const { data: existingInv } = await admin.from('supplement_photo_inventory')
        .select('inventory_id, sha256_hash').eq('bucket_name', BUCKET)
        .eq('object_path', r.canonicalPath).maybeSingle();
      const needsUpload = !existingInv || (existingInv as { sha256_hash: string }).sha256_hash !== sha;

      // 3. Upload to canonical path (upsert so re-runs are idempotent).
      if (needsUpload) {
        const { error: upErr } = await admin.storage.from(BUCKET)
          .upload(r.canonicalPath, bytes, { contentType: 'image/png', upsert: true });
        if (upErr) throw new Error(`upload ${r.canonicalPath}: ${upErr.message}`);
        uploaded += 1;
      } else {
        alreadyCanonical += 1;
      }

      // 4. Upsert inventory.
      const { data: invRow, error: invErr } = await admin.from('supplement_photo_inventory')
        .upsert({
          bucket_name: BUCKET,
          object_path: r.canonicalPath,
          content_type: 'image/png',
          byte_size: bytes.byteLength,
          sha256_hash: sha,
          last_modified_at: new Date().toISOString(),
          scope: 'in_scope',
          deleted_at: null,
          last_verified_at: new Date().toISOString(),
        }, { onConflict: 'bucket_name,object_path' })
        .select('inventory_id').single();
      if (invErr || !invRow) throw new Error(`inventory: ${invErr?.message}`);
      inventoryWritten += 1;

      // 5. Ensure a primary binding exists for this master_sku.
      const bindSku = r.masterSku;
      const { data: existingBinding } = await admin.from('supplement_photo_bindings')
        .select('binding_id, is_primary').eq('sku', bindSku).eq('is_primary', true).is('archived_at', null).maybeSingle();
      if (!existingBinding) {
        const { error: bErr } = await admin.from('supplement_photo_bindings').insert({
          sku: bindSku,
          inventory_id: (invRow as { inventory_id: string }).inventory_id,
          version: 1,
          is_primary: true,
          bound_by_user_id: ACTOR,
        });
        if (bErr) throw new Error(`binding: ${bErr.message}`);
        bindingsCreated += 1;
      }

      // 6. Audit: storage_upload.
      await admin.from('shop_refresh_audit_log').insert({
        action_category: 'storage_upload',
        action_verb: 'storage_upload.canonical_migration',
        target_table: 'supplement_photo_inventory',
        target_id: (invRow as { inventory_id: string }).inventory_id,
        sku: bindSku,
        actor_user_id: ACTOR,
        actor_role: 'admin',
        after_state_json: {
          source_file: r.file,
          canonical_path: r.canonicalPath,
          sha256: sha,
          byte_size: bytes.byteLength,
        },
        context_json: { master_name: r.masterName, category_slug: r.categorySlug, note: r.note },
      });

      // 7. Update product_catalog.image_url if we have a catalog sku.
      if (r.catalogSku) {
        const newUrl = publicUrl(r.canonicalPath);
        const { data: beforeRow } = await admin.from('product_catalog')
          .select('image_url').eq('sku', r.catalogSku).maybeSingle();
        const oldUrl = (beforeRow as { image_url: string | null } | null)?.image_url ?? null;
        if (oldUrl !== newUrl) {
          const { error: uErr } = await admin.from('product_catalog')
            .update({ image_url: newUrl }).eq('sku', r.catalogSku);
          if (uErr) throw new Error(`catalog update ${r.catalogSku}: ${uErr.message}`);
          catalogUpdated += 1;

          await admin.from('shop_refresh_audit_log').insert({
            action_category: 'catalog_image_url_update',
            action_verb: 'catalog_image_url_update.canonical_migration',
            target_table: 'product_catalog',
            sku: r.catalogSku,
            actor_user_id: ACTOR,
            actor_role: 'admin',
            before_state_json: { image_url: oldUrl },
            after_state_json: { image_url: newUrl },
          });
        }
      }

      console.log(`  ✓ ${r.file} → ${r.canonicalPath}${r.catalogSku ? ` [updated ${r.catalogSku}]` : ''}`);
    } catch (err) {
      errors += 1;
      const msg = err instanceof Error ? err.message : 'unknown';
      console.error(`  ✗ ${r.file}: ${msg}`);
    }
  }

  // Top-level approval audit row.
  await admin.from('shop_refresh_audit_log').insert({
    action_category: 'approval_typed_confirmation',
    action_verb: 'approval_typed_confirmation.captured',
    target_table: 'product_catalog',
    actor_user_id: ACTOR,
    actor_role: 'admin',
    context_json: {
      phrase: 'APPROVE IMAGE REFRESH',
      script: 'shop-canonical-migrate.ts',
      matched_total: rows.length,
      uploaded,
      already_canonical: alreadyCanonical,
      inventory_written: inventoryWritten,
      bindings_created: bindingsCreated,
      catalog_updated: catalogUpdated,
      errors,
    },
  });

  console.log('\nMigration summary:');
  console.log(`  matched:             ${rows.length}`);
  console.log(`  uploaded canonical:  ${uploaded}`);
  console.log(`  already canonical:   ${alreadyCanonical}`);
  console.log(`  inventory rows:      ${inventoryWritten}`);
  console.log(`  bindings created:    ${bindingsCreated}`);
  console.log(`  catalog updates:     ${catalogUpdated}`);
  console.log(`  errors:              ${errors}`);
  console.log(`  unmatched (skipped): ${unmatched.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
