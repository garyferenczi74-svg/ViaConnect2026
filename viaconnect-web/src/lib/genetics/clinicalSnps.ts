// Prompt 204b (2026-06-17): the clinical SNP annotation set the DNA analysis
// engine reads. Every entry is REUSED from annotations already in the repo, not
// invented (the prompt forbids inventing clinical significance):
//   - methylation and detox SNPs come from PANEL_DEFINITIONS in
//     src/app/api/genex/upload/route.ts (riskAlleles + clinical summaries),
//     except rs762551 (CYP1A2), which is from TARGET_SNPS (genetic-import-service).
//   - nutrition SNPs come from TARGET_SNPS in
//     src/lib/api/genetic-import-service.ts (risk allele taken from the
//     documented homozygous-high-risk genotype).
//
// COVERAGE NOTE (Decision Gate 2): a raw DNA file yields SNP genotypes, so only
// the genotype-based panels can be populated from an upload. GeneXM is a
// "Methylation and Detox" panel, so detox CYP/GST genes map to `methylation`.
// nutrigen-dx is genotype-based and seeded here with its repo nutrition SNPs.
//
// Prompt 204 (2026-06-21): peptide and cannabis are now genotype-scored too,
// authored by Hannah and signed off by Gary, reversing the earlier educational
// only decision for those two panels. Their canonical rsIDs come from the
// PeptideIQ and CannabisIQ deep reports; the effect alleles and clinical lines
// are Hannah authored, and the per-genotype TIERS live in the peptide-iq and
// cannabis-iq severity drafts (most SNPs stay unscored by design, they still
// appear in the list with their genotype). The hormone panel (a measured DUTCH
// urine test) and epigenetic panel (a methylation array) are still NOT derivable
// from raw genotype data and have no annotation here.

import type { PanelKey } from './panelLabels';

export interface ClinicalSnp {
  rsid: string;
  gene: string;
  panel_key: PanelKey;
  /** The effect (variant) allele. Status counts how many copies appear. */
  riskAllele: string;
  /** Reused from the source annotation; descriptive, never a fabricated value. */
  clinical_significance: string;
}

export const CLINICAL_SNPS: ClinicalSnp[] = [
  // ---- Methylation (genex-m: methylation + detox), from PANEL_DEFINITIONS ----
  {
    rsid: 'rs1801133', gene: 'MTHFR', panel_key: 'methylation', riskAllele: 'T',
    clinical_significance: 'MTHFR C677T variant affects folate metabolism. TT homozygous shows reduced enzyme activity.',
  },
  {
    rsid: 'rs1801131', gene: 'MTHFR', panel_key: 'methylation', riskAllele: 'C',
    clinical_significance: 'MTHFR A1298C variant affects BH4 recycling. Compound heterozygous with C677T increases impact.',
  },
  {
    rsid: 'rs7412', gene: 'APOE', panel_key: 'methylation', riskAllele: 'T',
    clinical_significance: 'APOE variant influences lipid metabolism and cardiovascular risk profile.',
  },
  {
    rsid: 'rs429358', gene: 'APOE', panel_key: 'methylation', riskAllele: 'C',
    clinical_significance: 'APOE e4 allele carrier status. Relevant for cardiovascular and cognitive health planning.',
  },
  {
    rsid: 'rs1695', gene: 'GSTP1', panel_key: 'methylation', riskAllele: 'G',
    clinical_significance: 'GSTP1 Ile105Val variant reduces glutathione S-transferase activity, affecting phase II detox.',
  },
  {
    rsid: 'rs1056836', gene: 'CYP1B1', panel_key: 'methylation', riskAllele: 'G',
    clinical_significance: 'CYP1B1 Leu432Val affects estrogen metabolism and detoxification capacity.',
  },
  {
    rsid: 'rs4244285', gene: 'CYP2C19', panel_key: 'methylation', riskAllele: 'A',
    clinical_significance: 'CYP2C19*2 poor metabolizer variant affects drug metabolism capacity.',
  },
  {
    rsid: 'rs4986893', gene: 'CYP2C19', panel_key: 'methylation', riskAllele: 'A',
    clinical_significance: 'CYP2C19*3 variant affects drug metabolism. Important for pharmacogenomic profiling.',
  },
  {
    rsid: 'rs3892097', gene: 'CYP2D6', panel_key: 'methylation', riskAllele: 'A',
    clinical_significance: 'CYP2D6*4 variant, the most common poor metabolizer allele in Caucasians.',
  },
  {
    rsid: 'rs762551', gene: 'CYP1A2', panel_key: 'methylation', riskAllele: 'C',
    clinical_significance: 'CYP1A2 variant affects caffeine and xenobiotic metabolism (slow vs fast metabolizer).',
  },

  // ---- Nutrition (nutrigen-dx), from genetic-import-service TARGET_SNPS ----
  {
    rsid: 'rs1544410', gene: 'VDR', panel_key: 'nutrition', riskAllele: 'T',
    clinical_significance: 'VDR (BsmI) variant, vitamin D receptor function and calcium and bone metabolism.',
  },
  {
    rsid: 'rs9939609', gene: 'FTO', panel_key: 'nutrition', riskAllele: 'A',
    clinical_significance: 'FTO variant associated with appetite regulation and body weight metabolism.',
  },
  {
    rsid: 'rs1815739', gene: 'ACTN3', panel_key: 'nutrition', riskAllele: 'T',
    clinical_significance: 'ACTN3 R577X variant, fast-twitch muscle fiber function and exercise response.',
  },

  // ---- Peptide (peptide-iq), from the PeptideIQ deep report rsIDs. Effect
  // alleles and clinical lines Hannah authored; tiers live in the peptide-iq
  // severity draft (only MC4R, COL1A1, NOS3 are tiered, all the rest unscored). ----
  {
    rsid: 'rs6184', gene: 'GHR', panel_key: 'peptide', riskAllele: 'C',
    clinical_significance: 'Common GHR coding variant studied for small differences in growth hormone signaling and tissue response.',
  },
  {
    rsid: 'rs4988496', gene: 'GHRHR', panel_key: 'peptide', riskAllele: 'T',
    clinical_significance: 'Common GHRHR coding variant studied at a population level for small differences in growth hormone release and stature.',
  },
  {
    rsid: 'rs35767', gene: 'IGF1', panel_key: 'peptide', riskAllele: 'T',
    clinical_significance: 'Promoter variant near IGF1 studied for small differences in circulating IGF1, a repair and anabolic signal.',
  },
  {
    rsid: 'rs2854744', gene: 'IGFBP3', panel_key: 'peptide', riskAllele: 'A',
    clinical_significance: 'Promoter variant affecting IGFBP3, the carrier that meters how much IGF1 is available to tissues.',
  },
  {
    rsid: 'rs696217', gene: 'GHRL', panel_key: 'peptide', riskAllele: 'T',
    clinical_significance: 'Ghrelin Leu72Met studied for small differences in appetite rhythm and post meal ghrelin response.',
  },
  {
    rsid: 'rs572169', gene: 'GHSR', panel_key: 'peptide', riskAllele: 'T',
    clinical_significance: 'Common GHSR receptor variant studied for small differences in how strongly secretagogue and appetite signals are received.',
  },
  {
    rsid: 'rs17782313', gene: 'MC4R', panel_key: 'peptide', riskAllele: 'C',
    clinical_significance: 'Variant near MC4R, a central appetite regulator; the C allele is associated with small differences in appetite and body weight tendency.',
  },
  {
    rsid: 'rs1800012', gene: 'COL1A1', panel_key: 'peptide', riskAllele: 'T',
    clinical_significance: 'COL1A1 Sp1 site variant; the T allele is associated with altered collagen ratio and with tendon, ligament, and bone density tendency.',
  },
  {
    rsid: 'rs12722', gene: 'COL5A1', panel_key: 'peptide', riskAllele: 'T',
    clinical_significance: 'COL5A1 three prime region variant studied for small differences in soft tissue resilience and flexibility, with mixed results across populations.',
  },
  {
    rsid: 'rs679620', gene: 'MMP3', panel_key: 'peptide', riskAllele: 'A',
    clinical_significance: 'MMP3 remodeling variant studied alongside the collagen genes for small differences in connective tissue remodeling.',
  },
  {
    rsid: 'rs2010963', gene: 'VEGFA', panel_key: 'peptide', riskAllele: 'C',
    clinical_significance: 'VEGFA five prime region variant studied for small differences in VEGFA expression and the blood supply to healing tissue.',
  },
  {
    rsid: 'rs1800795', gene: 'IL6', panel_key: 'peptide', riskAllele: 'C',
    clinical_significance: 'IL6 promoter variant studied for small differences in inflammatory tone during recovery.',
  },
  {
    rsid: 'rs1800629', gene: 'TNF', panel_key: 'peptide', riskAllele: 'A',
    clinical_significance: 'TNF promoter variant studied for small differences in inflammatory load during recovery.',
  },
  {
    rsid: 'rs1799983', gene: 'NOS3', panel_key: 'peptide', riskAllele: 'T',
    clinical_significance: 'NOS3 Glu298Asp; the T (Asp298) allele is associated with lower basal nitric oxide and modest differences in vascular tone.',
  },

  // ---- Cannabis (cannabis-iq), from the CannabisIQ deep report rsIDs. Education,
  // not advice: never a recommendation to use cannabis. Tiers live in the
  // cannabis-iq severity draft (CYP2C9, CYP3A4, COMT, AKT1 tiered; CNR1, CNR2,
  // FAAH, MGLL, ABCB1, ANKK1 unscored). ----
  {
    rsid: 'rs1049353', gene: 'CNR1', panel_key: 'cannabis', riskAllele: 'A',
    clinical_significance: 'CB1 receptor variant studied for small differences in endocannabinoid tone. Educational, not a recommendation to use cannabis.',
  },
  {
    rsid: 'rs2501432', gene: 'CNR2', panel_key: 'cannabis', riskAllele: 'A',
    clinical_significance: 'CB2 receptor variant studied for small immune facing endocannabinoid differences. Educational, not advice.',
  },
  {
    rsid: 'rs324420', gene: 'FAAH', panel_key: 'cannabis', riskAllele: 'A',
    clinical_significance: 'FAAH C385A; the A allele reduces FAAH activity and raises anandamide, a physiological response marker. Educational, not advice.',
  },
  {
    rsid: 'rs604300', gene: 'MGLL', panel_key: 'cannabis', riskAllele: 'G',
    clinical_significance: 'MGLL regulatory variant studied for small differences in 2-AG endocannabinoid tone. Educational, not advice.',
  },
  {
    rsid: 'rs1057910', gene: 'CYP2C9', panel_key: 'cannabis', riskAllele: 'C',
    clinical_significance: 'CYP2C9 star 3 (Ile359Leu); the C allele reduces clearance of THC and many medications, so two copies indicate a poor metabolizer pattern. Medication questions belong with your clinician or pharmacist.',
  },
  {
    rsid: 'rs35599367', gene: 'CYP3A4', panel_key: 'cannabis', riskAllele: 'T',
    clinical_significance: 'CYP3A4 star 22; the rare T allele is a decreased function variant that slows clearance of cannabinoids and many medications. Medication questions belong with your clinician or pharmacist.',
  },
  {
    rsid: 'rs1045642', gene: 'ABCB1', panel_key: 'cannabis', riskAllele: 'A',
    clinical_significance: 'ABCB1 C3435T synonymous transporter variant studied for small, inconsistent distribution differences. Educational, not advice.',
  },
  {
    rsid: 'rs4680', gene: 'COMT', panel_key: 'cannabis', riskAllele: 'A',
    clinical_significance: 'COMT Val158Met; the A (Met) slow clearing genotype is associated with greater sensitivity to the cognitive and mood effects of cannabinoids. A neutral sensitivity marker, not a diagnosis.',
  },
  {
    rsid: 'rs2494732', gene: 'AKT1', panel_key: 'cannabis', riskAllele: 'C',
    clinical_significance: 'AKT1 variant; in research the C/C genotype is associated with a higher reported chance of adverse psychological effects from heavy cannabis use. A non-deterministic, non-diagnostic risk awareness marker, not a diagnosis of any condition.',
  },
  {
    rsid: 'rs1800497', gene: 'ANKK1', panel_key: 'cannabis', riskAllele: 'T',
    clinical_significance: 'Taq1A, physically in ANKK1 and associated with DRD2 receptor density; reward and mood context only, not a cannabis specific tier.',
  },
];

/** rsID to annotation lookup, built once. */
export const CLINICAL_SNP_BY_RSID: Record<string, ClinicalSnp> = CLINICAL_SNPS.reduce(
  (acc, snp) => {
    acc[snp.rsid] = snp;
    return acc;
  },
  {} as Record<string, ClinicalSnp>,
);
