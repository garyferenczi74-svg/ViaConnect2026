// Prompt: GeneX360 purchase seeding, Slice 2 Task 2. The curated SAMPLE dataset
// that seeds all six panels when a member buys the GeneX360 bundle. Every rsID
// and gene symbol here is a REAL one already present in src/data/genex360/panels.ts
// (in a marker's deepReport.keyVariants). NOTHING clinical is invented: each
// genotype is a documented allele call for its variant, and clinicalSignificance
// is either empty or a SHORT verbatim phrase copied from that marker's existing
// description. A later task writes these rows to the DB.
//
// Five of the six panels are genotype panels (methylation, nutrition, hormone,
// peptide, cannabis) and are seeded as SAMPLE_VARIANTS. The sixth, epigenetic, is
// MEASURED (not a genotype), so it is seeded as SAMPLE_EPIGEN, one input per
// EpigenHQ marker key.
//
// Where a (panel slug, rsID, genotype) has a validated tier in VARIANT_SEVERITY
// (the nutrition and hormone panels), the chosen genotype is one that scores a
// tier, so the seeded sample variant earns a High / Moderate / Low score on the
// Your Variants surface. Methylation is scored by zygosity elsewhere, and peptide
// and cannabis are educational (untiered), so those genotypes are documented
// allele calls that render descriptively.
//
// Standing rules honored: no invented rsIDs, genes, or clinical sentences; no em
// or en dashes; TypeScript strict (no any).

import type { EpigeneticMarkerInput } from "@/lib/genetics/epigenResultStore";

export interface SampleVariant {
  rsid: string;
  gene: string;
  genotype: string;
  panel_key: string;
  clinicalSignificance: string;
}

// The genotype panel_keys this dataset covers (epigenetic is handled separately
// by SAMPLE_EPIGEN).
export const SAMPLE_PANEL_KEYS: string[] = [
  "methylation",
  "nutrition",
  "hormone",
  "peptide",
  "cannabis",
];

export const SAMPLE_VARIANTS: SampleVariant[] = [
  // ---------------------------------------------------------------------------
  // methylation (genex-m). rsIDs from the GeneXM deep reports' keyVariants. The
  // methylation panel is scored by zygosity (methylationSeverityFor), not by
  // genotype, so these are documented allele calls that drive the per-variant
  // display. clinicalSignificance is a short verbatim phrase from the GeneXM
  // marker description in panels.ts.
  // ---------------------------------------------------------------------------
  {
    rsid: "rs1801133",
    gene: "MTHFR",
    genotype: "TT",
    panel_key: "methylation",
    clinicalSignificance:
      "This is the single strongest reason to use methylfolate rather than synthetic folic acid.",
  },
  {
    rsid: "rs1805087",
    gene: "MTR",
    genotype: "AG",
    panel_key: "methylation",
    clinicalSignificance:
      "Slower activity can elevate homocysteine and increase your functional demand for B12.",
  },
  {
    rsid: "rs1801394",
    gene: "MTRR",
    genotype: "GG",
    panel_key: "methylation",
    clinicalSignificance:
      "Keeps B12 in its usable methylcobalamin form so MTR can keep working.",
  },
  {
    rsid: "rs4680",
    gene: "COMT",
    genotype: "AA",
    panel_key: "methylation",
    clinicalSignificance:
      "This is central to how you handle stress, mood, and estrogen detox.",
  },
  {
    rsid: "rs1801198",
    gene: "TCN2",
    genotype: "CG",
    panel_key: "methylation",
    clinicalSignificance:
      "Carries B12 from blood into your cells.",
  },

  // ---------------------------------------------------------------------------
  // nutrition (nutrigen-dx). rsIDs from the NutrigenDX deep reports' keyVariants;
  // each chosen genotype scores a validated tier in NUTRIGEN_DX_SEVERITY_DRAFT.
  // clinicalSignificance is a short verbatim phrase from the NutrigenDX marker
  // description in panels.ts.
  // ---------------------------------------------------------------------------
  {
    rsid: "rs1801133",
    gene: "MTHFR",
    genotype: "TT", // high
    panel_key: "nutrition",
    clinicalSignificance:
      "Controls activation of dietary folate into its usable form.",
  },
  {
    rsid: "rs174537",
    gene: "FADS1",
    genotype: "TT", // moderate
    panel_key: "nutrition",
    clinicalSignificance:
      "Converts plant omega-3 and omega-6 fats into the long chain forms EPA, DHA, and arachidonic acid.",
  },
  {
    rsid: "rs7903146",
    gene: "TCF7L2",
    genotype: "TT", // high
    panel_key: "nutrition",
    clinicalSignificance:
      "The strongest common variant linked to type 2 diabetes risk through effects on insulin secretion.",
  },
  {
    rsid: "rs4880",
    gene: "SOD2",
    genotype: "TT", // moderate
    panel_key: "nutrition",
    clinicalSignificance:
      "Drives mitochondrial antioxidant defense.",
  },
  {
    rsid: "rs10156191",
    gene: "DAO",
    genotype: "TT", // high
    panel_key: "nutrition",
    clinicalSignificance:
      "Clears dietary histamine in the gut.",
  },

  // ---------------------------------------------------------------------------
  // hormone (hormone-iq). rsIDs from the HormoneIQ deep reports' keyVariants; each
  // chosen genotype scores a validated tier in HORMONE_IQ_SEVERITY_DRAFT.
  // clinicalSignificance is a short verbatim phrase from the HormoneIQ marker
  // description in panels.ts.
  // ---------------------------------------------------------------------------
  {
    rsid: "rs4680",
    gene: "COMT",
    genotype: "AA", // moderate
    panel_key: "hormone",
    clinicalSignificance:
      "Methylates and clears catechol estrogens and stress catecholamines.",
  },
  {
    rsid: "rs1048943",
    gene: "CYP1A1",
    genotype: "GG", // moderate
    panel_key: "hormone",
    clinicalSignificance:
      "Drives estrogen hydroxylation toward the protective 2-OH pathway.",
  },
  {
    rsid: "rs1056836",
    gene: "CYP1B1",
    genotype: "GG", // moderate
    panel_key: "hormone",
    clinicalSignificance:
      "Pushes estrogen toward the 4-OH pathway that requires careful clearance.",
  },
  {
    rsid: "rs523349",
    gene: "SRD5A2",
    genotype: "CC", // moderate
    panel_key: "hormone",
    clinicalSignificance:
      "Converts testosterone into the stronger androgen DHT.",
  },

  // ---------------------------------------------------------------------------
  // peptide (peptide-iq). rsIDs from the PeptideIQ deep reports' keyVariants.
  // PeptideIQ is educational and untiered, so these genotypes are documented
  // allele calls that render descriptively. clinicalSignificance is left empty:
  // these markers carry educational laySummary content, not a per-genotype
  // clinical sentence to copy verbatim.
  // ---------------------------------------------------------------------------
  {
    rsid: "rs6184",
    gene: "GHR",
    genotype: "CC",
    panel_key: "peptide",
    clinicalSignificance: "",
  },
  {
    rsid: "rs35767",
    gene: "IGF1",
    genotype: "CT",
    panel_key: "peptide",
    clinicalSignificance: "",
  },
  {
    rsid: "rs1800012",
    gene: "COL1A1",
    genotype: "GT",
    panel_key: "peptide",
    clinicalSignificance: "",
  },
  {
    rsid: "rs2010963",
    gene: "VEGFA",
    genotype: "GC",
    panel_key: "peptide",
    clinicalSignificance: "",
  },

  // ---------------------------------------------------------------------------
  // cannabis (cannabis-iq). rsIDs from the CannabisIQ deep reports' keyVariants.
  // CannabisIQ is educational and untiered, so these genotypes are documented
  // allele calls that render descriptively. clinicalSignificance left empty for
  // the same reason as peptide.
  // ---------------------------------------------------------------------------
  {
    rsid: "rs1049353",
    gene: "CNR1",
    genotype: "GA",
    panel_key: "cannabis",
    clinicalSignificance: "",
  },
  {
    rsid: "rs324420",
    gene: "FAAH",
    genotype: "CA",
    panel_key: "cannabis",
    clinicalSignificance: "",
  },
  {
    rsid: "rs1057910",
    gene: "CYP2C9",
    genotype: "AC",
    panel_key: "cannabis",
    clinicalSignificance: "",
  },
  {
    rsid: "rs1800497",
    gene: "DRD2",
    genotype: "CT",
    panel_key: "cannabis",
    clinicalSignificance: "",
  },
];

// ---------------------------------------------------------------------------
// epigenetic (epigen-hq). One sample input per EpigenHQ marker key, using the
// marker's real unit from EPIGEN_MARKERS. Numeric markers (years based) carry a
// plausible sample valueNum; the level markers carry valueText level words. No
// clinical claim is made beyond a neutral level word and a direction.
// ---------------------------------------------------------------------------
export const SAMPLE_EPIGEN: EpigeneticMarkerInput[] = [
  {
    markerKey: "epigenetic-age",
    valueNum: 41,
    valueText: null,
    unit: "years",
    direction: "typical",
  },
  {
    markerKey: "biological-age-gap",
    valueNum: -2,
    valueText: null,
    unit: "years",
    direction: "lower",
  },
  {
    markerKey: "pace-of-aging",
    valueNum: 0.95,
    valueText: null,
    unit: "years per year",
    direction: "lower",
  },
  {
    markerKey: "inflammatory-methylation-index",
    valueNum: null,
    valueText: "Balanced",
    unit: null,
    direction: "typical",
  },
  {
    markerKey: "immune-cell-methylation-profile",
    valueNum: null,
    valueText: "Balanced",
    unit: null,
    direction: "typical",
  },
  {
    markerKey: "metabolic-methylation-score",
    valueNum: null,
    valueText: "Favorable",
    unit: null,
    direction: "typical",
  },
  {
    markerKey: "glucose-insulin-regulation-methylation",
    valueNum: null,
    valueText: "Balanced",
    unit: null,
    direction: "typical",
  },
  {
    markerKey: "ahrr-combustion-exposure",
    valueNum: null,
    valueText: "Low",
    unit: null,
    direction: "lower",
  },
  {
    markerKey: "alcohol-exposure-methylation",
    valueNum: null,
    valueText: "Low",
    unit: null,
    direction: "lower",
  },
  {
    markerKey: "stress-cortisol-exposure-methylation",
    valueNum: null,
    valueText: "Elevated",
    unit: null,
    direction: "higher",
  },
  {
    markerKey: "global-dna-methylation-status",
    valueNum: null,
    valueText: "Balanced",
    unit: null,
    direction: "typical",
  },
  {
    markerKey: "telomere-associated-methylation",
    valueNum: null,
    valueText: "Balanced",
    unit: null,
    direction: "typical",
  },
];
