// Prompt 193c (2026-06-12): the single source of truth that joins a Your Variants
// card (My Genetics) to its full report on the Your DNA, Decoded / Your Genetic
// Blueprint page. The join key is the rsID, which both sides already carry: the
// Your Variants sample data exposes SampleVariant.rsId and each Blueprint deep
// report carries keyVariants[].rsid. No component hardcodes a report URL; they
// all call resolveVariantReport and read its href.
//
// Naming note: the Your Variants tab slugs are not hyphenated (genexm) while the
// Blueprint panel slugs are (genex-m). TAB_SLUG_TO_PANEL_SLUG bridges them. The
// resolver never depends on label spelling; it joins by rsID and slug.
//
// Standing rules honored: no em or en dashes; Via Cura is the only consumer
// brand; TypeScript strict (no any).

import { GENEX360_PANELS, PANEL_BY_SLUG } from "@/data/genex360/panels";
import type { PanelSlug } from "@/data/genex360/types";

// The Your DNA, Decoded / Your Genetic Blueprint page route, centralized here so
// no component hardcodes it. The Report pill and the Blueprint deep link handler
// both build from this single constant.
export const BLUEPRINT_ROUTE = "/genetics/blueprint";

// Your Variants tab slug (from geneticsVariantSamples, not hyphenated) to the
// canonical Blueprint panel slug (from panels.ts, hyphenated). An unknown tab
// slug passes through unchanged, so a future tab whose slug already matches a
// panel still resolves.
const TAB_SLUG_TO_PANEL_SLUG: Record<string, PanelSlug> = {
  genexm: "genex-m",
  nutrigendx: "nutrigen-dx",
  hormoneiq: "hormone-iq",
  epigenhq: "epigen-hq",
  peptideiq: "peptide-iq",
  cannabisiq: "cannabis-iq",
};

export interface VariantReportTarget {
  href: string; // full href into the Blueprint page, including hash and the rsID join
  exists: boolean; // true only when a matching report is found
  panelSlug: string; // for example "genex-m"
  geneSlug: string; // for example "mthfr"
  rsid: string; // the join key, for example "rs1801133"
}

// Scheme A href: the gene report hash plus the rsID as a v param inside the
// fragment. The Blueprint page opens the named gene report, then scrolls to and
// highlights the variant whose rsID equals v.
function buildHref(panelSlug: string, geneSlug: string, rsid: string): string {
  return `${BLUEPRINT_ROUTE}#${panelSlug}/${geneSlug}?v=${rsid}`;
}

// Find the gene (marker) within one panel whose merged deepReport keyVariants
// includes the rsID. Returns the gene slug (lowercase symbol) or null. Markers
// without a deepReport (panels whose reports have not shipped) never match.
function findGeneInPanel(panelSlug: PanelSlug, rsid: string): string | null {
  const panel = PANEL_BY_SLUG[panelSlug];
  if (!panel) return null;
  for (const group of panel.groups) {
    for (const marker of group.markers) {
      if (marker.deepReport?.keyVariants.some((variant) => variant.rsid === rsid)) {
        return marker.symbol.toLowerCase();
      }
    }
  }
  return null;
}

// Resolve a Your Variants card to its Blueprint report.
//   1. Prefer the panel the card is shown under (disambiguates a gene that
//      appears in more than one panel, since the active tab decides which).
//   2. Within that panel, find the gene whose keyVariants includes the rsID.
//   3. If no match in the card's panel, fall back to scanning every panel.
//   4. If still no match, return exists: false so the pill is never rendered.
export function resolveVariantReport(rsid: string, panelSlugFromTab: string): VariantReportTarget {
  const noMatch: VariantReportTarget = {
    href: "",
    exists: false,
    panelSlug: "",
    geneSlug: "",
    rsid,
  };

  if (!rsid) return noMatch;

  // 1 and 2: the card's own panel first.
  const ownPanel = TAB_SLUG_TO_PANEL_SLUG[panelSlugFromTab] ?? (panelSlugFromTab as PanelSlug);
  const ownGene = findGeneInPanel(ownPanel, rsid);
  if (ownGene) {
    return {
      href: buildHref(ownPanel, ownGene, rsid),
      exists: true,
      panelSlug: ownPanel,
      geneSlug: ownGene,
      rsid,
    };
  }

  // 3: fall back to scanning every panel by rsID.
  for (const panel of GENEX360_PANELS) {
    const gene = findGeneInPanel(panel.slug, rsid);
    if (gene) {
      return {
        href: buildHref(panel.slug, gene, rsid),
        exists: true,
        panelSlug: panel.slug,
        geneSlug: gene,
        rsid,
      };
    }
  }

  // 4: no matching report.
  return noMatch;
}
