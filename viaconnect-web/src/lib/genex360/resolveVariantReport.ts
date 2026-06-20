// Prompt 193c (2026-06-12), config-driven reconciliation (Gary's design): the
// single function that joins a Your Variants card (My Genetics) to its full
// report on the Your DNA, Decoded / Your Genetic Blueprint page. The join key is
// the rsID, which both sides already carry: the Your Variants sample data
// exposes SampleVariant.rsId and each Blueprint deep report carries
// keyVariants[].rsid. No component hardcodes a report URL; they all call
// resolveVariantReport and read its href.
//
// All three integration points (the route, the anchor scheme, the registry of
// shipped reports) live in variantReport.config.ts. This file only implements
// the lookup. panelSlugForLabel normalizes whatever the card forwards (a non
// hyphenated tab slug like "genexm", a visible label like "GeneXM", or an
// already canonical "genex-m") to the canonical panel slug, so the own panel
// lookup (which disambiguates a gene that appears in more than one panel) is
// correct no matter what the caller passes.
//
// Standing rules honored: no em or en dashes; Via Cura is the only consumer
// brand; TypeScript strict (no any).

import {
  ANCHOR_SCHEME,
  BLUEPRINT_ROUTE,
  DEEP_REPORT_REGISTRY,
  panelSlugForLabel,
} from "./variantReport.config";
import type { DeepReportRegistry, VariantReportTarget } from "./types";

// Kebab case of a variant name, for example "C677T (Ala222Val)" to
// "c677t-ala222val". Used only when ANCHOR_SCHEME is "variantSlug".
export function toVariantSlug(variantName: string): string {
  return variantName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Build the Blueprint href. Three nested hash segments: panelSlug/geneSlug/anchor
// where anchor is the rsID (Scheme A, the default) or a variant slug (Scheme B).
// The Blueprint island parses these segments, opens the named gene report, then
// scrolls to and highlights the variant block whose id matches the anchor.
function buildHref(
  panelSlug: string,
  geneSlug: string,
  rsid: string,
  variantName: string,
): string {
  const anchorSegment =
    ANCHOR_SCHEME === "rsid" ? rsid : toVariantSlug(variantName);
  return `${BLUEPRINT_ROUTE}#${panelSlug}/${geneSlug}/${anchorSegment}`;
}

// Find the gene within one panel whose keyVariants includes the rsID. Returns the
// gene slug (the registry key) and the matched variant name, or null. A panel
// whose reports have not shipped is simply absent from the registry and never
// matches.
function findInPanel(
  registry: DeepReportRegistry,
  panelSlug: string,
  rsid: string,
): { geneSlug: string; variantName: string } | null {
  const panel = registry[panelSlug];
  if (!panel) return null;
  for (const geneSlug of Object.keys(panel)) {
    const match = panel[geneSlug].keyVariants.find((v) => v.rsid === rsid);
    if (match) return { geneSlug, variantName: match.name };
  }
  return null;
}

// Prompt 204i: find the panel slug that hosts a gene by its slug (the registry
// key), preferring the card's own panel. Used for the gene-level fallback, so a
// variant whose exact rsID is not a keyVariant still links to its gene report and
// every variant on Your Variants has a Full Report. Own-property safe so a crafted
// gene name cannot resolve to an inherited prototype key.
function findGenePanel(
  registry: DeepReportRegistry,
  ownPanelSlug: string,
  geneSlug: string,
): string | null {
  if (!geneSlug) return null;
  const own = registry[ownPanelSlug];
  if (own && Object.prototype.hasOwnProperty.call(own, geneSlug)) return ownPanelSlug;
  for (const slug of Object.keys(registry)) {
    const panel = registry[slug];
    if (panel && Object.prototype.hasOwnProperty.call(panel, geneSlug)) return slug;
  }
  return null;
}

// Resolve a Your Variants card to its Blueprint report.
//   1. Prefer the panel the card is shown under (disambiguates a gene that
//      appears in more than one panel, since the active tab decides which).
//   2. Within that panel, find the gene whose keyVariants includes the rsID.
//   3. If no match in the card's panel, fall back to scanning every shipped panel.
//   4. If still no match, return exists: false so the pill is never rendered.
export function resolveVariantReport(
  rsid: string,
  panelSlugFromTab: string,
  // Prompt 204i: the variant's gene, for the gene-level fallback (step 5). When
  // the exact rsID is not a keyVariant of any shipped report but its gene has a
  // deep report, the variant still links to that gene report.
  gene?: string,
  registry: DeepReportRegistry = DEEP_REPORT_REGISTRY,
): VariantReportTarget {
  const notFound: VariantReportTarget = {
    href: "",
    exists: false,
    panelSlug: panelSlugFromTab,
    geneSlug: "",
    rsid,
    level: "variant",
  };

  if (!rsid) return notFound;

  // 1 and 2: the card's own panel first (normalized to the canonical slug).
  const ownPanelSlug = panelSlugForLabel(panelSlugFromTab);
  let hit = findInPanel(registry, ownPanelSlug, rsid);
  let panelSlug = ownPanelSlug;

  // 3: fall back to scanning every other shipped panel by rsID.
  if (!hit) {
    for (const slug of Object.keys(registry)) {
      if (slug === ownPanelSlug) continue;
      const candidate = findInPanel(registry, slug, rsid);
      if (candidate) {
        hit = candidate;
        panelSlug = slug;
        break;
      }
    }
  }

  if (hit) {
    return {
      href: buildHref(panelSlug, hit.geneSlug, rsid, hit.variantName),
      exists: true,
      panelSlug,
      geneSlug: hit.geneSlug,
      rsid,
      level: "variant",
    };
  }

  // 5: gene-level fallback (Prompt 204i). The exact rsID is not a keyVariant in
  // any shipped report, but if the variant's gene has a deep report, link to that
  // gene report so every variant has a Full Report. The href still carries the
  // rsID as the anchor; the island opens the gene and, finding no variant block
  // for this rsID, falls back to scrolling the gene row into view.
  const geneSlug = (gene ?? "").trim().toLowerCase();
  const genePanel = findGenePanel(registry, ownPanelSlug, geneSlug);
  if (genePanel) {
    return {
      href: buildHref(genePanel, geneSlug, rsid, ""),
      exists: true,
      panelSlug: genePanel,
      geneSlug,
      rsid,
      level: "gene",
    };
  }

  // 6: no matching report.
  return notFound;
}
