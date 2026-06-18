// Prompt 204b (2026-06-17): the single source of truth for GENEX360 panel
// identity and labeling. The six panel buttons and the label resolver both read
// from this constant; labels are NEVER hardcoded in button markup.
//
// Each panel has a branded label (the Farmceutica Wellness Ltd product the
// member purchased, for example GeneXM) and a generic capability label shown in
// every other case, including competitor DNA uploads. The `slug` ties each panel
// to the existing GENEX360 registry in src/data/genex360/panels.ts so the two
// stay aligned.

export type PanelKey =
  | 'methylation'
  | 'nutrition'
  | 'hormone'
  | 'epigenetic'
  | 'peptide'
  | 'cannabis';

export interface PanelLabelEntry {
  panel_key: PanelKey;
  /** Slug in src/data/genex360/panels.ts (PANEL_BY_SLUG). */
  slug: string;
  /** Branded product code stored on a Farmceutica branded upload. */
  branded_product_code: string;
  /** Shown when a Farmceutica branded test backs this panel. */
  branded_label: string;
  /** Shown for competitor uploads or panels with no branded test. */
  generic_label: string;
}

export const PANEL_LABELS: Record<PanelKey, PanelLabelEntry> = {
  methylation: {
    panel_key: 'methylation',
    slug: 'genex-m',
    branded_product_code: 'GENEXM',
    branded_label: 'GeneXM',
    generic_label: 'Genetic Methylation',
  },
  nutrition: {
    panel_key: 'nutrition',
    slug: 'nutrigen-dx',
    branded_product_code: 'NUTRIGENDX',
    branded_label: 'NutrigenDX',
    generic_label: 'Nutrition Genetics',
  },
  hormone: {
    panel_key: 'hormone',
    slug: 'hormone-iq',
    branded_product_code: 'HORMONEIQ',
    branded_label: 'HormoneIQ',
    generic_label: 'Hormone Testing',
  },
  epigenetic: {
    panel_key: 'epigenetic',
    slug: 'epigen-hq',
    branded_product_code: 'EPIGENHQ',
    branded_label: 'EpigenHQ',
    generic_label: 'Epigenetics',
  },
  peptide: {
    panel_key: 'peptide',
    slug: 'peptide-iq',
    branded_product_code: 'PEPTIDEIQ',
    branded_label: 'PeptideIQ',
    generic_label: 'Peptide Genetics',
  },
  cannabis: {
    panel_key: 'cannabis',
    slug: 'cannabis-iq',
    branded_product_code: 'CANNABISIQ',
    branded_label: 'CannabisIQ',
    generic_label: 'Cannabis Genetics',
  },
};

export const PANEL_KEYS: PanelKey[] = Object.keys(PANEL_LABELS) as PanelKey[];

/** Ordered list, methylation first, matching the GENEX360 hub button order. */
export const PANEL_ORDER: PanelKey[] = [
  'methylation',
  'nutrition',
  'hormone',
  'epigenetic',
  'peptide',
  'cannabis',
];

/**
 * Resolve the label a panel button shows.
 *
 * A panel is branded only when the member has a Farmceutica branded test
 * (is_farmceutica true) whose branded_product_code maps to that panel. A
 * competitor upload never flips a label to branded. When branded, the branded
 * label is returned; otherwise the generic capability label.
 */
export function resolvePanelLabel(
  panelKey: PanelKey,
  hasBrandedTestForPanel: boolean,
  brandedProductCode?: string | null,
): string {
  const entry = PANEL_LABELS[panelKey];
  const codeMatches =
    !brandedProductCode || brandedProductCode === entry.branded_product_code;
  return hasBrandedTestForPanel && codeMatches ? entry.branded_label : entry.generic_label;
}

/** Map a branded product code back to its panel_key, or null if unknown. */
export function panelKeyForProductCode(code: string | null | undefined): PanelKey | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  for (const key of PANEL_KEYS) {
    if (PANEL_LABELS[key].branded_product_code === normalized) return key;
  }
  return null;
}

/** Map a GENEX360 panel slug to its panel_key, or null if unknown. */
export function panelKeyForSlug(slug: string | null | undefined): PanelKey | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  for (const key of PANEL_KEYS) {
    if (PANEL_LABELS[key].slug === normalized) return key;
  }
  return null;
}
