// Prompt 191 (2026-06-12): My Genetics bento hub "Your Variants" SAMPLE data.
//
// IMPORTANT: every row here is illustrative / preview data, not a real user
// result. Each test carries isSample: true so the UI can render a clear
// "Sample data" label and never present these rows as live results. When the
// per test results series lands, the real variants come from the
// genetic_variants table; this module is only the demo backbone the hub UI
// renders against until then.
//
// Compliance: summaries are descriptive only. They state what a variant
// relates to (a pathway, an enzyme, a trait) and never make a disease claim,
// a diagnosis, or a treatment / dosing directive. The older flat demo on the
// /genetics page carried "recommendation" copy; that is intentionally omitted
// here.
//
// Standing rules honored: tokens only (no colors live in this data file), no
// emojis, no em or en dashes anywhere, TypeScript strict (no any).

export type VariantImpact = "High" | "Moderate" | "Low";

export interface SampleVariant {
  gene: string;
  variant: string;
  rsId: string;
  genotype: string;
  impact: VariantImpact;
  category: string;
  summary: string;
}

export interface GeneticTest {
  // Lowercase slug used for the ?test= deep link and aria wiring.
  id: "genexm" | "nutrigendx" | "hormoneiq" | "epigenhq" | "peptideiq" | "cannabisiq";
  // Pill display label. No hyphen, no trademark symbol.
  label: "GeneXM" | "NutrigenDX" | "HormoneIQ" | "EpigenHQ" | "PeptideIQ" | "CannabisIQ";
  // Always true: this dataset is preview data, flagged so the UI labels it.
  isSample: true;
  variants: SampleVariant[];
}

// All six tests in the ratified order. Each carries 6 to 9 plausible sample
// variants drawn from its gene panel, with realistic rsIDs and impacts spread
// across the High / Moderate / Low tiers.
export const GENETIC_TESTS: GeneticTest[] = [
  {
    id: "genexm",
    label: "GeneXM",
    isSample: true,
    variants: [
      {
        gene: "MTHFR C677T",
        variant: "C677T",
        rsId: "rs1801133",
        genotype: "CT",
        impact: "High",
        category: "Methylation",
        summary: "Relates to folate metabolism efficiency in the methylation pathway.",
      },
      {
        gene: "MTHFR A1298C",
        variant: "A1298C",
        rsId: "rs1801131",
        genotype: "AC",
        impact: "Moderate",
        category: "Methylation",
        summary: "Relates to a secondary folate processing step within the same enzyme.",
      },
      {
        gene: "COMT Val158Met",
        variant: "Val158Met",
        rsId: "rs4680",
        genotype: "AG",
        impact: "Moderate",
        category: "Methylation",
        summary: "Relates to how quickly catecholamines are broken down by the COMT enzyme.",
      },
      {
        gene: "CBS A360A",
        variant: "A360A",
        rsId: "rs1801181",
        genotype: "GA",
        impact: "Low",
        category: "Methylation",
        summary: "Relates to the transsulfuration step that follows the methylation cycle.",
      },
      {
        gene: "MTR A2756G",
        variant: "A2756G",
        rsId: "rs1805087",
        genotype: "AG",
        impact: "Moderate",
        category: "Methylation",
        summary: "Relates to vitamin B12 recycling in the methionine synthase reaction.",
      },
      {
        gene: "MTRR A66G",
        variant: "A66G",
        rsId: "rs1801394",
        genotype: "GG",
        impact: "Moderate",
        category: "Methylation",
        summary: "Relates to regeneration of the active form of the MTR enzyme.",
      },
      {
        gene: "AHCY",
        variant: "rs819147",
        rsId: "rs819147",
        genotype: "TC",
        impact: "Low",
        category: "Methylation",
        summary: "Relates to clearance of a byproduct generated during methylation reactions.",
      },
      {
        gene: "MAT1A",
        variant: "rs7087728",
        rsId: "rs7087728",
        genotype: "AA",
        impact: "Low",
        category: "Methylation",
        summary: "Relates to production of the universal methyl donor used across the cycle.",
      },
    ],
  },
  {
    id: "nutrigendx",
    label: "NutrigenDX",
    isSample: true,
    variants: [
      {
        gene: "FUT2",
        variant: "rs601338",
        rsId: "rs601338",
        genotype: "AG",
        impact: "Moderate",
        category: "Nutrition",
        summary: "Relates to vitamin B12 status and the composition of the gut microbiome.",
      },
      {
        gene: "GC",
        variant: "rs2282679",
        rsId: "rs2282679",
        genotype: "TG",
        impact: "High",
        category: "Nutrition",
        summary: "Relates to the transport protein that carries vitamin D in the bloodstream.",
      },
      {
        gene: "BCMO1",
        variant: "rs12934922",
        rsId: "rs12934922",
        genotype: "AT",
        impact: "Moderate",
        category: "Nutrition",
        summary: "Relates to conversion of plant beta carotene into active vitamin A.",
      },
      {
        gene: "SLC23A1",
        variant: "rs33972313",
        rsId: "rs33972313",
        genotype: "CC",
        impact: "Low",
        category: "Nutrition",
        summary: "Relates to a transporter involved in vitamin C uptake.",
      },
      {
        gene: "NBPF3",
        variant: "rs4654748",
        rsId: "rs4654748",
        genotype: "CT",
        impact: "Low",
        category: "Nutrition",
        summary: "Relates to circulating levels of vitamin B6.",
      },
      {
        gene: "GC",
        variant: "rs7041",
        rsId: "rs7041",
        genotype: "TG",
        impact: "Moderate",
        category: "Nutrition",
        summary: "Relates to a second site on the vitamin D binding protein.",
      },
      {
        gene: "BCMO1",
        variant: "rs7501331",
        rsId: "rs7501331",
        genotype: "CC",
        impact: "Low",
        category: "Nutrition",
        summary: "Relates to a second position affecting beta carotene conversion activity.",
      },
    ],
  },
  {
    id: "hormoneiq",
    label: "HormoneIQ",
    isSample: true,
    variants: [
      {
        gene: "CYP19A1",
        variant: "rs10046",
        rsId: "rs10046",
        genotype: "CT",
        impact: "Moderate",
        category: "Hormone",
        summary: "Relates to the aromatase enzyme that converts androgens into estrogens.",
      },
      {
        gene: "ESR1",
        variant: "rs2234693",
        rsId: "rs2234693",
        genotype: "TC",
        impact: "Moderate",
        category: "Hormone",
        summary: "Relates to a common variant in the estrogen receptor alpha gene.",
      },
      {
        gene: "AR",
        variant: "rs6152",
        rsId: "rs6152",
        genotype: "GG",
        impact: "Low",
        category: "Hormone",
        summary: "Relates to signaling through the androgen receptor.",
      },
      {
        gene: "DIO2",
        variant: "Thr92Ala",
        rsId: "rs225014",
        genotype: "TC",
        impact: "High",
        category: "Hormone",
        summary: "Relates to local conversion of thyroid hormone T4 into active T3.",
      },
      {
        gene: "HSD17B1",
        variant: "rs605059",
        rsId: "rs605059",
        genotype: "AG",
        impact: "Low",
        category: "Hormone",
        summary: "Relates to interconversion between estradiol and estrone.",
      },
      {
        gene: "ESR1",
        variant: "rs9340799",
        rsId: "rs9340799",
        genotype: "AG",
        impact: "Moderate",
        category: "Hormone",
        summary: "Relates to a second regulatory site in the estrogen receptor alpha gene.",
      },
      {
        gene: "CYP19A1",
        variant: "rs700518",
        rsId: "rs700518",
        genotype: "GG",
        impact: "Low",
        category: "Hormone",
        summary: "Relates to a second position within the aromatase gene.",
      },
    ],
  },
  {
    id: "epigenhq",
    label: "EpigenHQ",
    isSample: true,
    variants: [
      {
        gene: "TERT",
        variant: "rs2736100",
        rsId: "rs2736100",
        genotype: "GT",
        impact: "Moderate",
        category: "Biological Age",
        summary: "Relates to the enzyme component that maintains telomere length.",
      },
      {
        gene: "TERC",
        variant: "rs12696304",
        rsId: "rs12696304",
        genotype: "CG",
        impact: "Moderate",
        category: "Biological Age",
        summary: "Relates to the RNA template used by the telomere maintenance complex.",
      },
      {
        gene: "FOXO3",
        variant: "rs2802292",
        rsId: "rs2802292",
        genotype: "GT",
        impact: "Low",
        category: "Biological Age",
        summary: "Relates to a longevity associated transcription factor.",
      },
      {
        gene: "APOE",
        variant: "rs429358",
        rsId: "rs429358",
        genotype: "TC",
        impact: "High",
        category: "Biological Age",
        summary: "Relates to lipid transport and is one of the two sites that define APOE status.",
      },
      {
        gene: "SIRT1",
        variant: "rs7896005",
        rsId: "rs7896005",
        genotype: "AG",
        impact: "Low",
        category: "Biological Age",
        summary: "Relates to a sirtuin involved in cellular stress response pathways.",
      },
      {
        gene: "APOE",
        variant: "rs7412",
        rsId: "rs7412",
        genotype: "CC",
        impact: "Moderate",
        category: "Biological Age",
        summary: "Relates to the second site that, with rs429358, defines APOE status.",
      },
      {
        gene: "TERT",
        variant: "rs7726159",
        rsId: "rs7726159",
        genotype: "AA",
        impact: "Low",
        category: "Biological Age",
        summary: "Relates to a second position within the telomerase enzyme gene.",
      },
    ],
  },
  {
    id: "peptideiq",
    label: "PeptideIQ",
    isSample: true,
    variants: [
      {
        gene: "GH1",
        variant: "rs2665802",
        rsId: "rs2665802",
        genotype: "AC",
        impact: "Moderate",
        category: "Peptide",
        summary: "Relates to baseline growth hormone production.",
      },
      {
        gene: "IGF1",
        variant: "rs35767",
        rsId: "rs35767",
        genotype: "CT",
        impact: "Moderate",
        category: "Peptide",
        summary: "Relates to circulating levels of insulin like growth factor 1.",
      },
      {
        gene: "COL1A1",
        variant: "Sp1",
        rsId: "rs1800012",
        genotype: "GT",
        impact: "High",
        category: "Peptide",
        summary: "Relates to type 1 collagen production in connective tissue.",
      },
      {
        gene: "COL5A1",
        variant: "rs12722",
        rsId: "rs12722",
        genotype: "CT",
        impact: "Moderate",
        category: "Peptide",
        summary: "Relates to type 5 collagen structure in tendons and ligaments.",
      },
      {
        gene: "MMP1",
        variant: "rs1799750",
        rsId: "rs1799750",
        genotype: "GG",
        impact: "Low",
        category: "Peptide",
        summary: "Relates to an enzyme that remodels collagen in the extracellular matrix.",
      },
      {
        gene: "IGF1",
        variant: "rs6214",
        rsId: "rs6214",
        genotype: "AG",
        impact: "Low",
        category: "Peptide",
        summary: "Relates to a second regulatory site in the IGF1 gene.",
      },
      {
        gene: "COL1A1",
        variant: "rs1107946",
        rsId: "rs1107946",
        genotype: "GG",
        impact: "Low",
        category: "Peptide",
        summary: "Relates to a second position affecting type 1 collagen expression.",
      },
    ],
  },
  {
    id: "cannabisiq",
    label: "CannabisIQ",
    isSample: true,
    variants: [
      {
        gene: "CNR1",
        variant: "rs1049353",
        rsId: "rs1049353",
        genotype: "GA",
        impact: "Moderate",
        category: "Cannabinoid",
        summary: "Relates to the CB1 cannabinoid receptor in the endocannabinoid system.",
      },
      {
        gene: "CNR2",
        variant: "Q63R",
        rsId: "rs2501432",
        genotype: "CT",
        impact: "Low",
        category: "Cannabinoid",
        summary: "Relates to the CB2 cannabinoid receptor found largely on immune cells.",
      },
      {
        gene: "FAAH",
        variant: "P129T",
        rsId: "rs324420",
        genotype: "CA",
        impact: "High",
        category: "Cannabinoid",
        summary: "Relates to the enzyme that breaks down the endocannabinoid anandamide.",
      },
      {
        gene: "CYP2C9*2",
        variant: "*2",
        rsId: "rs1799853",
        genotype: "CT",
        impact: "Moderate",
        category: "Cannabinoid",
        summary: "Relates to an enzyme involved in metabolizing THC.",
      },
      {
        gene: "CYP2C9*3",
        variant: "*3",
        rsId: "rs1057910",
        genotype: "AA",
        impact: "Moderate",
        category: "Cannabinoid",
        summary: "Relates to a second variant in the same THC metabolizing enzyme.",
      },
      {
        gene: "COMT Val158Met",
        variant: "Val158Met",
        rsId: "rs4680",
        genotype: "AG",
        impact: "Low",
        category: "Cannabinoid",
        summary: "Relates to catecholamine breakdown, which overlaps cannabinoid response.",
      },
    ],
  },
];

// Tier counts for one test. all is the sum of the three tier counts.
export function countsForTest(test: GeneticTest): {
  all: number;
  high: number;
  moderate: number;
  low: number;
} {
  let high = 0;
  let moderate = 0;
  let low = 0;
  for (const variant of test.variants) {
    if (variant.impact === "High") {
      high += 1;
    } else if (variant.impact === "Moderate") {
      moderate += 1;
    } else {
      low += 1;
    }
  }
  return { all: high + moderate + low, high, moderate, low };
}

// Total sample variants across all six tests.
export function totalSampleVariantCount(): number {
  return GENETIC_TESTS.reduce((sum, test) => sum + test.variants.length, 0);
}

// Lookup a test by its slug id; undefined when no test matches.
export function getTestById(id: string): GeneticTest | undefined {
  return GENETIC_TESTS.find((test) => test.id === id);
}
