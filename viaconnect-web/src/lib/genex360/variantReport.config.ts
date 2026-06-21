// src/lib/genex360/variantReport.config.ts
//
// Prompt 193c (2026-06-12), config-driven reconciliation (Gary's design): the
// SINGLE place to wire the integration points that depend on the live app. Set
// these once; everything downstream (the resolver, the Report pill, the
// Blueprint island) reads from here. Nothing hardcodes a report URL.
//
// Standing rules honored: no em or en dashes; Via Cura is the only consumer
// brand; TypeScript strict (no any).

import { GENEX_M_DEEP_REPORTS } from "@/data/genex360/genex-m-deep";
// Go-live (2026-06-20, after Gary's clinical and compliance sign-off).
import { NUTRIGEN_DX_DEEP_DRAFTS } from "@/data/genex360/nutrigen-dx-deep.draft";
import { HORMONE_IQ_DEEP_DRAFTS } from "@/data/genex360/hormone-iq-deep.draft";
import { PEPTIDE_IQ_DEEP_DRAFTS } from "@/data/genex360/peptide-iq-deep.draft";
import { CANNABIS_IQ_DEEP_DRAFTS } from "@/data/genex360/cannabis-iq-deep.draft";
import type { DeepReportRegistry } from "./types";

// 1. INTEGRATION POINT: the live route of the Your DNA, Decoded / Your Genetic
//    Blueprint page. This is the standalone page that renders the
//    GeneX360PanelSection island.
export const BLUEPRINT_ROUTE = "/genetics/blueprint";

// 2. INTEGRATION POINT: the anchor scheme the Blueprint island understands.
//    "rsid"        puts the rsID as the third hash segment (#panel/gene/rsid).
//                  Recommended: rsID is an exact join that never mismatches on a
//                  label spelling, and the island gives each variant block the
//                  id variant-<rsid>, so this scheme is fully wired today.
//    "variantSlug" would put a kebab case of the variant name as the third
//                  segment instead. Reserved for future use; the island would
//                  need matching variant-slug-<slug> ids before this is honored.
export type AnchorScheme = "rsid" | "variantSlug";
export const ANCHOR_SCHEME: AnchorScheme = "rsid";

// 3. INTEGRATION POINT: the registry of available deep reports, keyed by panel
//    slug then gene slug. The resolver scans this. GENEX_M_DEEP_REPORTS is a
//    Record<geneSlug, SnpDeepReport> (Prompt 193a), which satisfies
//    PanelDeepReports. Add panels here as their deep reports ship and the Report
//    pill lights up on those variants automatically.
export const DEEP_REPORT_REGISTRY: DeepReportRegistry = {
  "genex-m": GENEX_M_DEEP_REPORTS,
  "nutrigen-dx": NUTRIGEN_DX_DEEP_DRAFTS,
  "hormone-iq": HORMONE_IQ_DEEP_DRAFTS,
  "peptide-iq": PEPTIDE_IQ_DEEP_DRAFTS,
  "cannabis-iq": CANNABIS_IQ_DEEP_DRAFTS,
};

// Maps a visible Your Variants tab label OR its non hyphenated tab slug to the
// canonical Blueprint panel slug. The live tabs render "GeneXM" / "NutrigenDX"
// without hyphens, and their ids (from geneticsVariantSamples) are likewise
// non hyphenated (genexm, nutrigendx). Either form resolves here without
// renaming any visible label. A canonical slug (genex-m) is not listed because
// the kebab fallback below already returns it unchanged.
export const PANEL_LABEL_TO_SLUG: Record<string, string> = {
  // Visible tab labels (Prompt 193d reconciled them to the no hyphen style).
  GeneXM: "genex-m",
  NutrigenDX: "nutrigen-dx",
  HormoneIQ: "hormone-iq",
  EpigenHQ: "epigen-hq",
  PeptideIQ: "peptide-iq",
  CannabisIQ: "cannabis-iq",
  // Non hyphenated tab slugs (the activeTest.id the card forwards).
  genexm: "genex-m",
  nutrigendx: "nutrigen-dx",
  hormoneiq: "hormone-iq",
  epigenhq: "epigen-hq",
  peptideiq: "peptide-iq",
  cannabisiq: "cannabis-iq",
};

// Converts a tab label or slug to its canonical panel slug. A known label or tab
// slug maps directly; a value already in canonical form (genex-m) falls through
// the kebab normalization unchanged. The resolver calls this so callers may pass
// whatever the card has on hand (an id or a label) without breaking the join.
export function panelSlugForLabel(labelOrSlug: string): string {
  const mapped = PANEL_LABEL_TO_SLUG[labelOrSlug];
  if (mapped) return mapped;
  return labelOrSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
