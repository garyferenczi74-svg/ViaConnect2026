// Photo Sync prompt #110 §2.1 / §2.2: the 24 in-scope targets.
//
// Canonical source-of-truth for the 18 SNP supplement SKUs and the 6
// GeneX360™ service cards the prompt targets. Keeping them in a
// separate module lets the reality-check, filename-mapping,
// generation-manifest, and reconciliation scripts all share one list
// and avoid drift.

export interface SnpTarget {
  // Canonical short gene code as it appears on the bottle wordmark.
  // Used to compute the expected filename per §3.3: {code}-support.webp.
  short_code: string;
  // Full marketing display name as rendered on /shop.
  display_name: string;
  // Baseline visual state at 2026-04-21 (per prompt §2.1).
  // 'working' → DAO / NAT reference renders. Others → 'broken'.
  baseline_state: 'working' | 'broken';
  // Category-like hint the reality-check uses when searching the
  // products table for a matching row. The live category is 'snp_support'
  // per migrations (Sherlock recon), but this stays forgiving so
  // different seed slugs still resolve.
  expected_category_hint: 'snp';
}

export interface ServiceTarget {
  // Stable identifier used for the bucket path and any internal lookup.
  // Lowercase, hyphen-free unless the name canonically uses one.
  slug: string;
  // Display name as rendered on /shop.
  display_name: string;
  // Short subtitle the service card shows beneath the wordmark.
  subtitle: string;
  // Motif direction that production uses when generating artwork.
  // See §6.3 for the full spec.
  motif: string;
}

// All 20 Methylation / GeneX360™ SNP SKUs from §2.1.
// 18 broken, 2 working (DAO, NAT) serve as reference renders.
export const SNP_TARGETS: ReadonlyArray<SnpTarget> = [
  { short_code: 'ACAT',  display_name: 'ACAT+ Mitochondrial Support',   baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'ACHY',  display_name: 'ACHY+ Acetylcholine Support',   baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'ADO',   display_name: 'ADO Support+ Purine Metabolism',baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'BHMT',  display_name: 'BHMT+ Methylation Support',     baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'CBS',   display_name: 'CBS Support+ Sulfur Pathway',   baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'COMT',  display_name: 'COMT+ Neurotransmitter Balance',baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'DAO',   display_name: 'DAO+ Histamine Balance',        baseline_state: 'working', expected_category_hint: 'snp' },
  { short_code: 'GST',   display_name: 'GST+ Cellular Detox',           baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'MAOA',  display_name: 'MAOA+ Neurochemical Balance',   baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'MTHFR', display_name: 'MTHFR+ Folate Metabolism',      baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'MTR',   display_name: 'MTR+ Methylation Matrix',       baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'MTRR',  display_name: 'MTRR+ Methylcobalamin Regen',   baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'NAT',   display_name: 'NAT Support+ Acetylation',      baseline_state: 'working', expected_category_hint: 'snp' },
  { short_code: 'NOS',   display_name: 'NOS+ Vascular Integrity',       baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'RFC1',  display_name: 'RFC1 Support+ Folate Transport',baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'SHMT',  display_name: 'SHMT+ Glycine-Folate Balance',  baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'SOD',   display_name: 'SOD+ Antioxidant Defense',      baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'SUOX',  display_name: 'SUOX+ Sulfite Clearance',       baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'TCN2',  display_name: 'TCN2+ B12 Transport',           baseline_state: 'broken',  expected_category_hint: 'snp' },
  { short_code: 'VDR',   display_name: 'VDR+ Receptor Activation',      baseline_state: 'broken',  expected_category_hint: 'snp' },
];

// All 6 GeneX360™ service cards from §2.2.
// /shop matches MASTER_SKUS marketing names (e.g. "GeneX-M™ Methylation Panel")
// to product_catalog rows whose canonical `name` column is shorter/different
// (e.g. "GeneXM"). The shop's NAME_ALIASES map (src/app/(app)/(consumer)/
// shop/page.tsx line 298) is the source of truth — we mirror it here so
// the reality-check script can resolve the same DB row /shop resolves.
export interface ServiceTargetWithAliases extends ServiceTarget {
  master_sku_name: string;        // name in MASTER_SKUS / MASTER_SKUS JSON
  catalog_name: string;           // canonical name in product_catalog
}
export const SERVICE_TARGETS: ReadonlyArray<ServiceTargetWithAliases> = [
  { slug: 'genex-m',    display_name: 'GeneX-M',    subtitle: 'Master Methylation Panel',    motif: 'DNA-helix vertical with methyl-group annotation',
    master_sku_name: 'GeneX-M™ Methylation Panel',            catalog_name: 'GeneXM' },
  { slug: 'nutrigendx', display_name: 'NutrigenDX', subtitle: 'Nutrigenomic Response',       motif: 'Plate + DNA cross-section',
    master_sku_name: 'NutrigenDX™ Genetic Nutrition Panel',    catalog_name: 'NutragenHQ' },
  { slug: 'hormoneiq',  display_name: 'HormoneIQ',  subtitle: 'Hormonal Pathway Panel',      motif: 'Endocrine glands diagram with soft glow',
    master_sku_name: 'HormoneIQ™ Genetic Hormone Panel',       catalog_name: 'HormoneIQ' },
  { slug: 'epigenhq',   display_name: 'EpigenHQ',   subtitle: 'Epigenetic Methylation Map',  motif: 'Chromatin spool with methyl tags',
    master_sku_name: 'EpigenHQ™ Epigenetic Aging Panel',       catalog_name: 'EpiGenDX' },
  { slug: 'peptideiq',  display_name: 'PeptideIQ',  subtitle: 'Peptide Response Profile',    motif: 'Amino-acid chain folding into protein',
    master_sku_name: 'PeptideIQ™ Genetic Peptide Response Panel', catalog_name: 'PeptidesIQ' },
  { slug: 'cannabisiq', display_name: 'CannabisIQ', subtitle: 'Cannabinoid Response Panel',  motif: 'Cannabis leaf silhouette with DNA helix overlay',
    master_sku_name: 'CannabisIQ™ Genetic Cannabinoid Panel',  catalog_name: 'CannabisIQ' },
];

// The DB table the /shop page actually reads from to populate image_url.
// NOT `products` — that table exists but /shop doesn't use it for images.
// See src/app/(app)/(consumer)/shop/page.tsx line 239.
export const PRODUCTS_TABLE_FOR_SHOP = 'product_catalog';

// §3.3: {short-gene-code-lowercase}-support.webp at bucket root.
export function expectedSnpFilename(target: Pick<SnpTarget, 'short_code'>): string {
  return `${target.short_code.toLowerCase()}-support.webp`;
}

// Prompt #110 Scope Addendum (2026-04-21): services live at bucket ROOT,
// NOT under a services/ subfolder. Gary locked this decision after
// confirming only two categories pull from the Products bucket.
export function expectedServicePath(target: Pick<ServiceTarget, 'slug'>): string {
  return `${target.slug}.webp`;
}

// Legacy path used by the reality-check when probing for files that may
// have been uploaded under the original #110 §3.3 assumption. Treated
// as non-canonical; any hit gets flagged so admin can move it to root.
export function legacyServiceSubfolderPath(target: Pick<ServiceTarget, 'slug'>): string {
  return `services/${target.slug}.webp`;
}

export const TOTAL_IN_SCOPE = SNP_TARGETS.length + SERVICE_TARGETS.length;  // 26 (20 SNP + 6 services)

// Prompt #110 Scope Addendum (2026-04-21): exact DB category strings that
// are permitted to be modified by any script under this prompt's scope.
// Every script MUST filter products by this list before touching image_url.
// The reality-check script verifies the live category values match; if a
// migration ever renames these, this constant is the single edit point.
export const IN_SCOPE_CATEGORIES: ReadonlyArray<string> = [
  'Methylation / GeneX360',
  'Testing & Diagnostics',
];

// Fallback slug variants we also accept if the live DB stores slugs in
// place of display names. Checked case-insensitively.
// Covers three source schemas:
//  - supplement_brand_categories seed (snp_support, genex360_testing)
//  - MASTER_SKUS enum values (SNP, Testing) — see shop/page.tsx
//  - product_catalog.category variants observed in prior prompts
export const IN_SCOPE_CATEGORY_SLUGS: ReadonlyArray<string> = [
  'methylation-genex360',
  'methylation/genex360',
  'methylation_genex360',
  'methylation',
  'testing-diagnostics',
  'testing_diagnostics',
  'testing',                  // MASTER_SKUS CategoryKey value
  'diagnostics',
  'snp',                      // MASTER_SKUS CategoryKey value
  'snp_support',              // seed value from 20260422000060
  'genex360',                 // display family
  'genex360_testing',         // seed value for Testing & Diagnostics
];

export function isInScopeCategory(category: string | null | undefined): boolean {
  if (category == null) return false;
  const c = category.toLowerCase().trim();
  if (IN_SCOPE_CATEGORIES.some((v) => v.toLowerCase() === c)) return true;
  if (IN_SCOPE_CATEGORY_SLUGS.some((v) => v.toLowerCase() === c)) return true;
  return false;
}
