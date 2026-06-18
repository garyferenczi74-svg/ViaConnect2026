// Prompt 204c (2026-06-18): map standard methylation-pathway report labels
// (Doctor's Data, Yasko-style panels) to their rsID, so a report that lists
// results by GENE/VARIANT name and a +/+ +/- -/- mutation call (not by rsID +
// genotype) can be ingested.
//
// CLINICAL DISCIPLINE: only variants with a well-documented, confident rsID are
// included. The gene/variant -> rsID mappings are established panel content, not
// invented. Variants on a report that are NOT in this map are reported as a
// coverage gap and never guessed. Hannah verifies these mappings in review;
// expanding coverage (AHCY, BHMT, the MTRR sub-variants, SUOX, ACAT) is a
// follow-up that needs sourced rsIDs.
//
// All entries are the methylation panel. The report STATES the +/+ +/- -/-
// status directly (the lab's call), so the engine reads it rather than deriving
// it from a genotype.

export interface MethylationVariant {
  rsid: string;
  gene: string;
  clinical_significance: string;
}

// Keyed by the report label normalized to uppercase alphanumerics (slashes and
// spaces stripped), so "MTHFR/C677T", "MTHFR C677T" and "mthfr c677t" all match.
export const METHYLATION_VARIANTS: Record<string, MethylationVariant> = {
  MTHFRC677T: { rsid: 'rs1801133', gene: 'MTHFR', clinical_significance: 'MTHFR C677T variant affects folate metabolism and homocysteine remethylation.' },
  MTHFRA1298C: { rsid: 'rs1801131', gene: 'MTHFR', clinical_significance: 'MTHFR A1298C variant affects BH4 recycling.' },
  MTRA2756G: { rsid: 'rs1805087', gene: 'MTR', clinical_significance: 'MTR (methionine synthase) variant affects B12-dependent remethylation of homocysteine.' },
  MTRRA66G: { rsid: 'rs1801394', gene: 'MTRR', clinical_significance: 'MTRR variant affects methionine synthase reductase recycling of B12.' },
  COMTV158M: { rsid: 'rs4680', gene: 'COMT', clinical_significance: 'COMT Val158Met affects catecholamine and estrogen methylation.' },
  COMTH62H: { rsid: 'rs4633', gene: 'COMT', clinical_significance: 'COMT H62H, a synonymous variant in linkage with the COMT activity haplotype.' },
  VDRTAQ1: { rsid: 'rs731236', gene: 'VDR', clinical_significance: 'VDR Taq1 variant, vitamin D receptor function.' },
  VDRFOK1: { rsid: 'rs2228570', gene: 'VDR', clinical_significance: 'VDR Fok1 variant, vitamin D receptor function and immune regulation.' },
  MAOA: { rsid: 'rs6323', gene: 'MAOA', clinical_significance: 'MAOA variant affects monoamine (serotonin, dopamine) degradation.' },
  CBSC699T: { rsid: 'rs234706', gene: 'CBS', clinical_significance: 'CBS C699T variant affects the transsulfuration pathway (homocysteine to cystathionine).' },
  NOSD298E: { rsid: 'rs1799983', gene: 'NOS3', clinical_significance: 'NOS3 (eNOS) Asp298Glu variant affects nitric oxide production.' },
  SHMTC1420T: { rsid: 'rs1979277', gene: 'SHMT1', clinical_significance: 'SHMT1 variant affects folate partitioning between DNA synthesis and methylation.' },
};

/** Reverse index by rsID, so the confirm step can re-derive the authoritative
 *  gene + clinical from an rsID the client sends back (never trusting the rest). */
export const METHYLATION_BY_RSID: Record<string, MethylationVariant> = Object.values(
  METHYLATION_VARIANTS,
).reduce(
  (acc, v) => {
    acc[v.rsid] = v;
    return acc;
  },
  {} as Record<string, MethylationVariant>,
);

/** The only statuses a methylation report states. */
export const METHYLATION_STATUSES = ['+/+', '+/-', '-/-'] as const;
export type MethylationStatus = (typeof METHYLATION_STATUSES)[number];

export function isMethylationStatus(s: unknown): s is MethylationStatus {
  return typeof s === 'string' && (METHYLATION_STATUSES as readonly string[]).includes(s);
}

/** Normalize a report label to the map key form: uppercase alphanumerics only. */
export function normalizeVariantLabel(label: string): string {
  return (label ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function lookupMethylationVariant(label: string): MethylationVariant | null {
  return METHYLATION_VARIANTS[normalizeVariantLabel(label)] ?? null;
}
