// Brief 17: allowlist /genetics/{slug} onto the live Blueprint catalog.
// Only PANEL_ROUTE_ALLOWLIST (the six GENEX360 slugs, plus product spellings
// that normalize onto those slugs) redirects to BLUEPRINT_ROUTE#slug.
// Unknown or fabricated slugs return null so the app-shell catch-all calls
// notFound(). Old fake panel ids (methylation, detoxification, hormone) are
// not on the allowlist.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import type { PanelSlug } from '@/data/genex360/types';
import { PANEL_SLUGS } from '@/data/genex360/panels';
import { BLUEPRINT_ROUTE, panelSlugForLabel } from '@/lib/genex360/variantReport.config';
import { isMthfrFolateTarget } from './mthfrFolate';

/** The only /genetics/{slug} values that redirect. Everything else 404s. */
export const PANEL_ROUTE_ALLOWLIST: readonly PanelSlug[] = PANEL_SLUGS;

const ALLOWLIST = new Set<string>(PANEL_ROUTE_ALLOWLIST);

/**
 * Resolve a URL slug onto a catalog PanelSlug.
 * Product spellings (genex_m, GeneXM) normalize onto the allowlist.
 * Fabricated or unknown input stays null so callers can notFound().
 */
export function canonicalPanelSlug(
  raw: string | null | undefined,
): PanelSlug | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const labelled = panelSlugForLabel(trimmed);
  return ALLOWLIST.has(labelled) ? (labelled as PanelSlug) : null;
}

export function isAllowlistedPanelSlug(
  raw: string | null | undefined,
): boolean {
  return canonicalPanelSlug(raw) !== null;
}

/**
 * Blueprint href for a /genetics/{...} path.
 * First segment must be allowlisted. Remaining segments become the hash
 * tail so /genetics/genex-m/mthfr lands on /genetics/blueprint#genex-m/mthfr.
 */
export function blueprintHrefForPanelPath(
  parts: readonly string[] | null | undefined,
): string | null {
  if (!parts || parts.length === 0) return null;
  const slug = canonicalPanelSlug(parts[0]);
  if (!slug) return null;
  const rest = parts.slice(1).map((part) => part.trim()).filter(Boolean);
  // MTHFR folate reports live on GeneXM only. A nutrigen-dx/mthfr URL must
  // not open a duplicate NutrigenDX MTHFR report as the folate chip.
  const gene = rest[0] ?? '';
  const rsid = rest[1] ?? '';
  const panelSlug =
    isMthfrFolateTarget(rsid, gene) && slug !== 'genex-m' ? 'genex-m' : slug;
  if (rest.length === 0) return `${BLUEPRINT_ROUTE}#${panelSlug}`;
  return `${BLUEPRINT_ROUTE}#${panelSlug}/${rest.join('/')}`;
}

export function blueprintHrefForPanelSlug(
  raw: string | null | undefined,
): string | null {
  return blueprintHrefForPanelPath(raw ? [raw] : []);
}
