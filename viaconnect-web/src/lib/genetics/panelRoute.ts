// Brief 17: map /genetics/{slug} onto the live Blueprint catalog.
// Known GENEX360 panels redirect to BLUEPRINT_ROUTE#slug. Unknown slugs
// return null so the app-shell catch-all can call notFound() instead of
// rendering a fabricated panel page.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import type { PanelSlug } from '@/data/genex360/types';
import { PANEL_SLUGS } from '@/data/genex360/panels';
import { BLUEPRINT_ROUTE, panelSlugForLabel } from '@/lib/genex360/variantReport.config';
import { normalizeObservedPanelKey } from './panelKeyAliases';
import { PANEL_LABELS } from './panelLabels';
import { isMthfrFolateTarget } from './mthfrFolate';

const CANONICAL_SLUGS = new Set<string>(PANEL_SLUGS);

/**
 * Resolve a URL slug or stored alias onto a catalog PanelSlug.
 * Unknown input stays null so callers can 404 instead of inventing a panel.
 */
export function canonicalPanelSlug(
  raw: string | null | undefined,
): PanelSlug | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const labelled = panelSlugForLabel(trimmed);
  if (CANONICAL_SLUGS.has(labelled)) return labelled as PanelSlug;

  const key = normalizeObservedPanelKey(trimmed);
  if (!key) return null;
  const slug = PANEL_LABELS[key].slug;
  return CANONICAL_SLUGS.has(slug) ? (slug as PanelSlug) : null;
}

/**
 * Blueprint href for a /genetics/{...} path.
 * First segment must resolve to a catalog panel. Remaining segments become
 * the hash tail (gene / rsid) so /genetics/genex-m/mthfr lands on
 * /genetics/blueprint#genex-m/mthfr.
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
