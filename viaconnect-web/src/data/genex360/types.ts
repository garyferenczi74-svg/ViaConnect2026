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
