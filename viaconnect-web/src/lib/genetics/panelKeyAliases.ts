// Observed-key aliases for the My Genetics hub pills.
//
// Live user_variants.panel_key values are not a single enum. DNA upload writes
// PanelKey (methylation), remaps write product slugs (genex_m), and Genemetrics
// PANEL_MAP writes catalog codes (GENEX-M). The hub pills group on PanelKey, so
// every stored spelling must resolve onto the matching GENEX360 test.
//
// This module is read-side only. It does not write user_variants.
// Unknown keys stay unknown (null). They are never coerced to a panel or to 0.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import { PANEL_KEYS, PANEL_LABELS, type PanelKey } from './panelLabels';

/** Extra stored spellings that are not the slug, product code, or PanelKey. */
const EXTRA_ALIASES: Record<PanelKey, readonly string[]> = {
  methylation: ['genex_m', 'genexm', 'genex-m', 'METH', 'GENEX-M', 'reference'],
  nutrition: ['nutrigen_dx', 'nutrigendx', 'nutrigen-dx'],
  hormone: ['hormone_iq', 'hormoneiq', 'hormone-iq', 'HORMONE', 'GENEX-H'],
  epigenetic: ['epigen_hq', 'epigenhq', 'epigen-hq', 'epigen'],
  peptide: ['peptide_iq', 'peptideiq', 'peptide-iq'],
  cannabis: ['cannabis_iq', 'cannabisiq', 'cannabis-iq'],
};

function compactKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function buildAliasIndex(): Map<string, PanelKey> {
  const index = new Map<string, PanelKey>();
  const add = (raw: string, key: PanelKey) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    index.set(trimmed.toLowerCase(), key);
    index.set(compactKey(trimmed), key);
  };

  for (const key of PANEL_KEYS) {
    const entry = PANEL_LABELS[key];
    add(key, key);
    add(entry.slug, key);
    add(entry.branded_product_code, key);
    add(entry.branded_label, key);
    for (const alias of EXTRA_ALIASES[key]) add(alias, key);
  }
  return index;
}

const ALIAS_INDEX = buildAliasIndex();

/**
 * Map a stored panel_key (or product / slug / Genemetrics code) onto a hub
 * PanelKey. Returns null for unknown input so callers can leave it ungrouped
 * instead of inventing a pill or a count.
 */
export function normalizeObservedPanelKey(
  raw: string | null | undefined,
): PanelKey | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return (
    ALIAS_INDEX.get(trimmed.toLowerCase()) ??
    ALIAS_INDEX.get(compactKey(trimmed)) ??
    null
  );
}

/** Every known stored spelling for one hub panel, for SQL .in() reads. */
export function panelKeyAliasesFor(panelKey: PanelKey): string[] {
  const seen = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) seen.add(trimmed);
  };
  const entry = PANEL_LABELS[panelKey];
  add(panelKey);
  add(entry.slug);
  add(entry.branded_product_code);
  add(entry.branded_label);
  for (const alias of EXTRA_ALIASES[panelKey]) add(alias);
  // Common underscore / hyphen remaps of the slug.
  add(entry.slug.replace(/-/g, '_'));
  add(entry.slug.replace(/-/g, ''));
  return [...seen];
}
