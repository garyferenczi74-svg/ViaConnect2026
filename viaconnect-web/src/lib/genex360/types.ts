// Prompt 193c (2026-06-12), config-driven reconciliation: minimal shared types
// for the Your Variants to Genetic Blueprint link. These are intentionally
// structural so the registry can hold the full SnpDeepReport objects from
// genex-m-deep.ts (Prompt 193a) while the resolver only reads the keyVariants it
// needs. Any object with a keyVariants array of { rsid, name } satisfies
// DeepReportLike, including a full SnpDeepReport (which carries many more fields).
//
// Standing rules honored: no em or en dashes; TypeScript strict (no any).

export interface VariantRef {
  rsid: string; // for example "rs1801133"
  name: string; // variant name, for example "C677T (Ala222Val)"
}

// A report carries one or more variants. A full SnpDeepReport is assignable here
// because its keyVariants entries each have rsid + name (plus extra fields).
export interface DeepReportLike {
  keyVariants: VariantRef[];
}

// gene slug to report, for example { mthfr: {...}, comt: {...} }.
export type PanelDeepReports = Record<string, DeepReportLike>;

// panel slug to its gene reports, for example { "genex-m": {...} }.
export type DeepReportRegistry = Record<string, PanelDeepReports>;

export interface VariantReportTarget {
  href: string; // full href into the Blueprint page, empty when not found
  exists: boolean; // true only when a matching report is found
  panelSlug: string; // resolved panel, for example "genex-m"
  geneSlug: string; // resolved gene, for example "mthfr"
  rsid: string; // the join key
}
