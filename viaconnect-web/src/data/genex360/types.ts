// Prompt 193 (2026-06-12): shared types for the GENEX360 per panel description
// cards on the /shop/genex360 Your DNA section.
//
// Standing rules honored: no em or en dashes anywhere; consumer brand is Via
// Cura; bioavailability copy is locked at "10x to 28x"; the score is named
// "Bio Optimization". These types only describe shape; the copy lives in
// panels.ts, transcribed verbatim from the prompt Section 7.

export type PanelSlug =
  | "genex-m"
  | "nutrigen-dx"
  | "hormone-iq"
  | "epigen-hq"
  | "peptide-iq"
  | "cannabis-iq";

export interface PanelMarker {
  symbol: string; // gene symbol or analyte label, for example "MTHFR" or "Cortisol (free, diurnal)"
  fullName: string; // expanded name
  description: string; // function plus variant or marker effect plus health impact, no em or en dashes
  // Prompt 193a: optional comprehensive per SNP report shown in the expanded
  // disclosure. Present on the GeneX-M SNP markers after the genex-m-deep merge;
  // absent on panels without per SNP reports.
  deepReport?: SnpDeepReport;
}

// Prompt 193a (2026-06-12): comprehensive per SNP deep report types for the
// GeneX-M individual SNP reports. The rsid and genotype fields are DEFAULTS to
// reconcile with the live GENEX-M assay (see the genex-m-deep.ts header); the
// biology, health associations, and strategy copy is authoritative. No em or en
// dashes anywhere; bioavailability stays "10x to 28x"; score is "Bio Optimization".

export interface SnpGenotype {
  genotype: string; // for example "CC", "CT", "TT", "GG", or "Reference" / "Variant" for representative variants
  label: string; // short status, for example "Typical", "Intermediate", "Reduced function"
  interpretation: string; // what this genotype means functionally and for health, no em or en dashes
}

export interface SnpVariant {
  rsid: string; // for example "rs1801133"
  name: string; // common name, for example "C677T (Ala222Val)"
  genotypes: SnpGenotype[];
}

export interface SnpDeepReport {
  aliases: string[]; // alternate gene names, empty array if none
  pathway: string; // for example "Methylation"
  keyVariants: SnpVariant[]; // one or more variants with genotype interpretations
  biologicalRole: string; // what the gene or enzyme does
  functionalImpact: string; // consequence of reduced or altered function
  healthAssociations: string[]; // associative phenotype links, wellness framed (paragraph kept as one entry where the source is prose)
  nutrientStrategy: string[]; // cofactors and nutrient forms that support the pathway
  cautions: string[]; // what to watch or avoid, titration notes
  dietLifestyle: string[]; // food and lifestyle levers
  interactions: string[]; // gene to gene synergies relevant to this SNP (paragraph kept as one entry)
  protocolTieIn: string; // Via Cura protocol and Bio Optimization tie in
}

export interface PanelMarkerGroup {
  groupTitle: string; // for example "Methylation Pathway Efficiency"
  markers: PanelMarker[];
}

export type PanelType = "snp" | "biomarker" | "epigenetic" | "educational";

export interface Panel {
  slug: PanelSlug;
  pillLabel: string; // short label on the pill, for example "GeneX-M"
  displayName: string; // full display name
  subtitle: string; // for example "Genetic Methylation and Detox Profile"
  tagline: string; // a short panel specific line
  panelType: PanelType;
  overview: string; // 2 to 4 sentence panel summary
  markerCount: number; // derived count for display, for example 20
  markerCountLabel: string; // for example "20 SNPs" or "12 epigenetic markers"
  groups: PanelMarkerGroup[];
  whatYoullLearn: string[];
  collection: string[]; // test kit and delivery bullets
  protocolTieIn: string; // one paragraph connecting results to the Via Cura protocol and Bio Optimization
}
