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
// The hormone (biomarker), epigenetic (array), peptide and cannabis
// (educational) panels are NOT derivable from raw genotype data and have no
// annotation here; expanding methylation/nutrition coverage and sourcing the
// other panels' data is a scoped follow-up.

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
];

/** rsID to annotation lookup, built once. */
export const CLINICAL_SNP_BY_RSID: Record<string, ClinicalSnp> = CLINICAL_SNPS.reduce(
  (acc, snp) => {
    acc[snp.rsid] = snp;
    return acc;
  },
  {} as Record<string, ClinicalSnp>,
);
