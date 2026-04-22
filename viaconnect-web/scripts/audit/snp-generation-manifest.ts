// Photo Sync prompt #110 §5.4: asset generation manifest emitter.
//
// Run:   npx tsx scripts/audit/snp-generation-manifest.ts
// Inputs: most-recent /tmp/viaconnect/snp-mapping-plan-*.json
// Outputs (fixed filenames per spec, no timestamp, overwrite on re-run):
//   /tmp/viaconnect/snp-asset-generation-manifest.md
//   /tmp/viaconnect/snp-asset-generation-manifest.csv
//
// For every Class C target (asset missing, generation required), emits a
// spec card matching the template in §5.4 plus a CSV row for batch-image
// pipelines. For service cards, switches to the §6.3 service-card spec
// (Deep Navy + Teal palette instead of gold-on-black).

import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIT_OUT_DIR, safeLog } from './_supabase-client';
import { PHOTO_BUCKET } from '../../src/lib/photoSync/types';
import { SERVICE_TARGETS, type ServiceTarget } from '../../src/lib/photoSync/snpTargets';

interface MappingRow {
  kind: 'snp' | 'service';
  sku: string | null;
  short_code_or_slug: string;
  display_name: string;
  classification: 'A' | 'B' | 'C' | 'D' | 'SKIP';
  current_image_url: string | null;
  target_image_url: string | null;
  target_bucket_path: string | null;
  action: 'REMAP_EXACT' | 'REMAP_EXISTING_RENAMED' | 'GENERATE' | 'SKIP' | 'NO_CHANGE';
  match_source: string | null;
  notes: string[];
}

interface MappingFile {
  generated_at: string;
  reality_check: string;
  bucket: string;
  by_action: Record<string, number>;
  rows: MappingRow[];
}

function pickLatest(prefix: string): string {
  const entries = readdirSync(AUDIT_OUT_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .sort().reverse();
  if (entries.length === 0) {
    throw new Error(`No ${prefix}*.json in ${AUDIT_OUT_DIR}. Run scripts/audit/snp-filename-mapping.ts first.`);
  }
  return join(AUDIT_OUT_DIR, entries[0]);
}

function snpSpecCard(r: MappingRow): string {
  const code = r.short_code_or_slug;
  const filename = `${code.toLowerCase()}-support.webp`;
  return [
    `### ${code} SUPPORT+`,
    ``,
    `- **Display name:** ${r.display_name}`,
    `- **SKU:** ${r.sku ?? '(none recorded; seed before upload)'}`,
    `- **Target filename:** ${filename}`,
    `- **Bucket path:** ${PHOTO_BUCKET}/${filename}`,
    `- **Bottle wordmark text:** ${code} SUPPORT+`,
    `- **Bottle template:** VIACURA-SNP-Black-v1 (matches DAO/NAT reference)`,
    `- **Required dimensions:** 1200 × 1500 px (4:5 aspect; sufficient for ProductImage hero variant)`,
    `- **Color tokens:**`,
    `  - Bottle background: Deep Black #0A0A0A`,
    `  - VIACURA wordmark: Yellow #F5C518`,
    `  - Gene-code wordmark: Yellow #F5C518`,
    `  - Dual circle graphic: Yellow #F5C518 with 70% opacity overlap`,
    `  - Capsule count text: Off-White #E8E8E8 at 12pt`,
    `- **Sub-line under wordmark:** "Your Genetics | Your Protocol" (white, 8pt, italic; matches DAO reference)`,
    `- **Bottom text:** "60 CAPSULES" (uppercase, off-white, 9pt, letter-spacing 0.1em)`,
    `- **Typography:** Instrument Sans Bold for wordmarks, Instrument Sans Regular for capsule text`,
    ``,
  ].join('\n');
}

function serviceSpecCard(r: MappingRow): string {
  const slug = r.short_code_or_slug;
  const service = SERVICE_TARGETS.find((s: ServiceTarget) => s.slug === slug);
  const filename = `services/${slug}.webp`;
  return [
    `### ${r.display_name}`,
    ``,
    `- **Panel identifier:** ${slug}`,
    `- **Subtitle:** ${service?.subtitle ?? '(see genex360_products.panels_included)'}`,
    `- **Target filename:** ${filename}`,
    `- **Bucket path:** ${PHOTO_BUCKET}/${filename}`,
    `- **Card template:** VIACURA-SERVICE-Navy-v1 (distinct from supplement bottles)`,
    `- **Motif:** ${service?.motif ?? '(see §6.3 of Prompt #110)'}`,
    `- **Required dimensions:** 1200 × 1500 px (4:5 aspect)`,
    `- **Color tokens (service palette, NOT the bottle gold-on-black):**`,
    `  - Card background: Deep Navy #1A2744`,
    `  - Wordmark + subtitle: Off-White #E8E8E8`,
    `  - Accent glyph: Teal #2DA5A0 (DNA, plate, glands, chromatin, chain, leaf motif)`,
    `  - Secondary accent (rare): Orange #B75E18 for highlight, ≤ 5% of composition`,
    `- **Typography:** Instrument Sans Bold for wordmark, Instrument Sans Regular Italic for subtitle`,
    `- **Compliance gate:** Artwork requires sign-off from Steve Rica (label claims) and Dr. Fadi Dagher (pathway accuracy) before upload.`,
    ``,
  ].join('\n');
}

function csvEscape(v: string | null | undefined): string {
  if (v == null) return '';
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

async function main(): Promise<void> {
  const mapPath = pickLatest('snp-mapping-plan-');
  safeLog(`generation-manifest: mapping plan = ${mapPath}`);
  const mapping = JSON.parse(readFileSync(mapPath, 'utf8')) as MappingFile;

  const classC = mapping.rows.filter((r) => r.action === 'GENERATE');
  if (classC.length === 0) {
    safeLog('generation-manifest: nothing to generate (no Class C targets).');
  }

  const mdLines: string[] = [
    `# SNP & GeneX360 Asset Generation Manifest`,
    ``,
    `Generated from: \`${mapPath}\``,
    `Bucket target: \`${PHOTO_BUCKET}\` (capital P; corrected in Prompt #110)`,
    `Class C (missing asset) count: **${classC.length}**`,
    ``,
    `Hand this manifest to the production pipeline. Each section below is a self-contained brief; nothing outside this doc is required to generate the asset. Reference renders: DAO+ Histamine Balance and NAT Support+ Acetylation currently live in the Products bucket.`,
    ``,
    `---`,
    ``,
  ];

  const snpC = classC.filter((r) => r.kind === 'snp');
  const serviceC = classC.filter((r) => r.kind === 'service');

  if (snpC.length > 0) {
    mdLines.push(`## SNP supplement bottles (${snpC.length})`);
    mdLines.push('');
    mdLines.push(`Template: VIACURA-SNP-Black-v1 (gold-on-black per §6.1)`);
    mdLines.push('');
    for (const r of snpC) mdLines.push(snpSpecCard(r));
  }

  if (serviceC.length > 0) {
    mdLines.push(`---`);
    mdLines.push('');
    mdLines.push(`## GeneX360™ service cards (${serviceC.length})`);
    mdLines.push('');
    mdLines.push(`Template: VIACURA-SERVICE-Navy-v1 (Deep Navy + Teal per §6.3). Do NOT use the gold-on-black bottle palette.`);
    mdLines.push('');
    for (const r of serviceC) mdLines.push(serviceSpecCard(r));
  }

  // CSV: one row per Class C target, columns a batch-image pipeline can ingest.
  const csvLines: string[] = [
    [
      'kind', 'slug_or_code', 'display_name', 'target_bucket_path',
      'wordmark_line_1', 'wordmark_line_2', 'template', 'canvas_px',
      'background_hex', 'accent_hex', 'typography',
    ].join(','),
  ];
  for (const r of snpC) {
    csvLines.push([
      'snp',
      r.short_code_or_slug,
      csvEscape(r.display_name),
      `${PHOTO_BUCKET}/${r.short_code_or_slug.toLowerCase()}-support.webp`,
      'VIACURA',
      `${r.short_code_or_slug} SUPPORT+`,
      'VIACURA-SNP-Black-v1',
      '1200x1500',
      '#0A0A0A',
      '#F5C518',
      'Instrument Sans Bold',
    ].map(csvEscape).join(','));
  }
  for (const r of serviceC) {
    const svc = SERVICE_TARGETS.find((s) => s.slug === r.short_code_or_slug);
    csvLines.push([
      'service',
      r.short_code_or_slug,
      csvEscape(r.display_name),
      `${PHOTO_BUCKET}/services/${r.short_code_or_slug}.webp`,
      r.display_name,
      svc?.subtitle ?? '',
      'VIACURA-SERVICE-Navy-v1',
      '1200x1500',
      '#1A2744',
      '#2DA5A0',
      'Instrument Sans Bold + Italic subtitle',
    ].map(csvEscape).join(','));
  }

  mkdirSync(AUDIT_OUT_DIR, { recursive: true });
  const mdOut = join(AUDIT_OUT_DIR, 'snp-asset-generation-manifest.md');
  const csvOut = join(AUDIT_OUT_DIR, 'snp-asset-generation-manifest.csv');
  writeFileSync(mdOut, mdLines.join('\n'));
  writeFileSync(csvOut, csvLines.join('\n') + '\n');
  safeLog(`generation-manifest: wrote ${mdOut} (${classC.length} sections)`);
  safeLog(`generation-manifest: wrote ${csvOut}`);
}

main().catch((e: unknown) => {
  process.stderr.write(`snp-generation-manifest failed: ${(e as Error).message}\n`);
  process.exit(2);
});
