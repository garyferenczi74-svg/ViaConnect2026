// Prompt 204g (2026-06-19): the validated per-genotype severity SOURCE. This is
// the single place a variant earns its High / Moderate / Low score, keyed by rsID
// and then by the member's specific genotype. Severity is a clinical mapping from
// the variant AND the genotype, NOT a function of zygosity: a heterozygous result
// on a high impact variant can be High, while a heterozygous result on a minor
// variant can be Low.
//
// IT SHIPS EMPTY ON PURPOSE. The diagnostic for 204g found that no per-genotype
// severity source ever existed in this codebase (only retired demo impacts in
// geneticsVariantSamples.ts, hand assigned per rsID and never per genotype). Per
// the Decision Gate, severity tiers must NOT be invented, because that would
// silently change clinical scoring. So the engine reads tiers ONLY from this map;
// an unmapped (rsID, genotype) returns null and the variant renders the neutral
// unscored fallback, never a fabricated tier. This mirrors the 204d / 204f
// pattern: the structure is wired now, the validated content is a human gated
// pass (Hannah plus clinical and compliance review) that populates this map.
//
// To populate (the content pass, not this prompt): add an rsID key whose value
// maps each clinically reviewed genotype (normalized, see normalizeGenotype) to
// its validated tier. Example shape only, intentionally commented out so nothing
// ships unvalidated:
//   // 'rs1801133': { 'CT': 'high', 'TT': 'high', 'CC': 'low' },
//
// Standing rules honored: no invented tiers, no em or en dashes, TypeScript
// strict (no any).

import type { SeverityTier } from './severity';

// rsID (lowercase) -> normalized genotype -> validated tier. EMPTY for the
// genotype-keyed path: the DNA-raw upload pipeline that stores an actual genotype
// (CT, GG, ...) has no validated per-genotype source yet, so it stays empty and
// every such variant renders the honest unscored fallback until a content pass
// populates it. Methylation-panel variants take the separate zygosity-keyed path
// below (METHYLATION_SEVERITY), because their stored result is a +/+ +/- -/-
// zygosity call, not a genotype.
export const VARIANT_SEVERITY: Record<string, Record<string, SeverityTier>> = {};

// Normalize a genotype string for lookup: uppercase, strip spaces and separators
// so "C/T", "c t", and "CT" all match the same key. Order is preserved as stored
// in the source; the content pass decides the canonical orientation per variant.
//
// NOTE: this MUST NOT be used for methylation zygosity keys. It strips "/" and
// "-", which would collapse "+/+", "+/-" and "-/-" into the same token and
// destroy the per-zygosity distinction. Zygosity lookups use the raw status
// string (see methylationSeverityFor).
export function normalizeGenotype(genotype: string): string {
  return genotype.replace(/[\s/|,;-]+/g, '').toUpperCase();
}

// Resolve the validated severity tier for a member's result, or null when the
// (rsID, genotype) has no validated assignment yet. Null is the honest unscored
// state; callers must NOT substitute a guessed tier.
export function severityFor(rsid: string | null, genotype: string | null): SeverityTier | null {
  if (!rsid || !genotype) return null;
  const byGenotype = VARIANT_SEVERITY[rsid.trim().toLowerCase()];
  if (!byGenotype) return null;
  return byGenotype[normalizeGenotype(genotype)] ?? null;
}

// ---------------------------------------------------------------------------
// Prompt 204g methylation panel: VALIDATED per-zygosity severity (Hannah).
// ---------------------------------------------------------------------------
//
// Methylation-pathway reports (Doctor's Data / Yasko style) STATE the zygosity
// directly: +/+ = homozygous mutation (two copies), +/- = heterozygous (one),
// -/- = none. Our stored row keeps genotype empty and puts that call in `status`.
// So for these variants the severity key is the ZYGOSITY STATE per rsID.
//
// CLINICAL PRINCIPLE (Gary's 204g directive): severity is NOT a blanket function
// of zygosity. The tier reflects THAT variant's functional impact at THAT
// zygosity. A +/+ on a high-impact enzyme variant (MTHFR C677T, ~70% reduced
// activity homozygous) is High; a +/+ on a synonymous or functionally minor
// variant is Low. We never auto-map +/+ to High.
//
// This is structure/function wellness framing, not disease diagnosis. Each tier
// is paired with a rationale, an evidence grade, and a confidence in METHYLATION_
// SEVERITY_NOTES below. Where a variant has NO validated functional effect at a
// given zygosity, it is intentionally OMITTED from the tier map so the resolver
// returns null and the UI renders UNSCORED, never a fabricated tier. A "-/-"
// result is baseline and is not stored or displayed at all (see
// extractMethylationReport.mapMethylationRows), so no "-/-" key is needed.
//
// Standing rules honored: no fabricated tiers, no em or en dashes, strict types.

export type Zygosity = '+/+' | '+/-';
export type EvidenceGrade = 'well-established' | 'limited' | 'synonymous-no-clear-function';
export type Confidence = 'high' | 'medium' | 'low';

export interface MethylationSeverityNote {
  rationale: string;
  evidence: EvidenceGrade;
  confidence: Confidence;
}

// rsID (lowercase) -> zygosity ('+/+' | '+/-') -> validated tier. A zygosity is
// OMITTED (no key) when there is no validated functional impact at that state, so
// the resolver returns null and the variant renders unscored rather than guessed.
export const METHYLATION_SEVERITY: Record<string, Partial<Record<Zygosity, SeverityTier>>> = {
  // MTHFR C677T: the best-characterized variant on the panel. Homozygous (TT)
  // reduces enzyme activity ~70 percent and is a well-replicated determinant of
  // elevated homocysteine and lower circulating folate; heterozygous ~35 percent.
  rs1801133: { '+/+': 'high', '+/-': 'moderate' },

  // MTHFR A1298C: affects MTHFR regulatory/BH4-recycling activity, smaller effect
  // than C677T. Homozygous has a modest activity reduction; heterozygous alone is
  // functionally minor. (Compound C677T+A1298C is the clinically notable pairing,
  // but compound state is not a single-variant zygosity and is not scored here.)
  rs1801131: { '+/+': 'moderate', '+/-': 'low' },

  // MTHFR P39P (rs2066470): SYNONYMOUS. No independent validated functional
  // effect; only travels in linkage on the MTHFR haplotype. Both zygosities
  // intentionally OMITTED -> renders UNSCORED.
  // rs2066470: (no validated tier)

  // MTR A2756G: methionine synthase, B12-dependent remethylation of homocysteine.
  // Established but modest effect on homocysteine; homozygous moderate, het low.
  rs1805087: { '+/+': 'moderate', '+/-': 'low' },

  // MTRR A66G (rs1801394): recycles B12 for methionine synthase. Common, modestly
  // associated with homocysteine especially under low B12; homozygous moderate.
  rs1801394: { '+/+': 'moderate', '+/-': 'low' },

  // MTRR H595Y / K350A / R415T / S257T: secondary MTRR variants with limited and
  // inconsistent functional evidence relative to A66G. Homozygous given a low tier
  // (present, but minor impact); heterozygous OMITTED -> unscored.
  rs10380: { '+/+': 'low' },
  rs162036: { '+/+': 'low' },
  rs2287780: { '+/+': 'low' },
  rs1532268: { '+/+': 'low' },

  // MTRR A664A (rs1802059): SYNONYMOUS. No independent validated function.
  // Both zygosities OMITTED -> unscored.
  // rs1802059: (no validated tier)

  // COMT V158M (rs4680): well-established ~3 to 4 fold lower catechol-O-
  // methyltransferase activity for Met/Met (the +/+ "slow" state), affecting
  // catecholamine and estrogen methylation turnover. This is a structure/function
  // difference, NOT pathology, so even +/+ is capped at moderate (it is a normal
  // population polymorphism, roughly a quarter of people).
  rs4680: { '+/+': 'moderate', '+/-': 'low' },

  // COMT H62H (rs4633) and COMT P199P (rs769224): SYNONYMOUS. They tag the COMT
  // activity haplotype but carry no independent validated functional effect, so
  // scoring them would double-count rs4680. Both OMITTED -> unscored.
  // rs4633: (no validated tier)
  // rs769224: (no validated tier)

  // VDR Taq1 (rs731236): vitamin D receptor. Associations with vitamin D status
  // and bone/immune outcomes exist but are inconsistent and population-dependent.
  // Homozygous low; heterozygous OMITTED.
  rs731236: { '+/+': 'low' },

  // VDR Fok1 (rs2228570): the one VDR variant that changes the protein (a longer
  // vs shorter receptor isoform) with a real, replicated functional difference in
  // receptor activity. Homozygous moderate, heterozygous low.
  rs2228570: { '+/+': 'moderate', '+/-': 'low' },

  // MAOA (rs6323): monoamine oxidase A, affects serotonin/dopamine degradation.
  // X-linked, so in males a single call is effectively hemizygous; functional
  // activity difference is modest at the population level. Homozygous low.
  rs6323: { '+/+': 'low' },

  // CBS C699T (rs234706): the panel-popular CBS variant. NOTE: the widespread
  // "upregulation" interpretation is NOT well supported by functional data; the
  // honest call is limited evidence for a clinically meaningful effect. Homozygous
  // given low (present but uncertain direction/magnitude); heterozygous OMITTED.
  rs234706: { '+/+': 'low' },

  // CBS A360A (rs1801181) and CBS N212N (rs2298758): SYNONYMOUS. No independent
  // validated function. Both OMITTED -> unscored.
  // rs1801181: (no validated tier)
  // rs2298758: (no validated tier)

  // NOS3 D298E (rs1799983): endothelial nitric oxide synthase, a real missense
  // (Asp298Glu) with modest associations to nitric oxide / endothelial function
  // and blood pressure. Homozygous low; heterozygous OMITTED.
  rs1799983: { '+/+': 'low' },

  // SHMT1 C1420T (rs1979277): partitions folate between DNA synthesis and
  // methylation. Modest, somewhat inconsistent effect on folate/homocysteine
  // distribution. Homozygous low; heterozygous OMITTED.
  rs1979277: { '+/+': 'low' },

  // AHCY-1/-2/-19 (rs819147 / rs819134 / rs819171): SAH hydrolase, relevant to the
  // SAM/SAH methylation balance, but per-variant functional evidence is limited
  // and these are largely panel-derived. Homozygous low; heterozygous OMITTED.
  rs819147: { '+/+': 'low' },
  rs819134: { '+/+': 'low' },
  rs819171: { '+/+': 'low' },

  // BHMT-1/-2/-4/-8 (rs585800 / rs567754 / rs617219 / rs651852): the betaine /
  // choline remethylation route. BHMT-8 (rs651852) has the most homocysteine
  // association evidence of the set, still modest; the others are limited.
  // Homozygous low across the set; heterozygous OMITTED.
  rs585800: { '+/+': 'low' },
  rs567754: { '+/+': 'low' },
  rs617219: { '+/+': 'low' },
  rs651852: { '+/+': 'low' },

  // ACAT1 (rs3741049): acetyl-CoA acetyltransferase, mitochondrial ketone / B12
  // handling on the panel. Limited per-variant functional evidence. Homozygous
  // low; heterozygous OMITTED.
  rs3741049: { '+/+': 'low' },
};

// Per-variant rationale + evidence grade + confidence, keyed by rsID. This is the
// clinical justification record for the tiers above; it is the auditable companion
// to METHYLATION_SEVERITY and is what review (clinical/compliance) signs off on.
// Variants intentionally left UNSCORED still get a note documenting WHY.
export const METHYLATION_SEVERITY_NOTES: Record<string, MethylationSeverityNote> = {
  rs1801133: {
    rationale: 'MTHFR C677T homozygous reduces enzyme activity by roughly 70 percent and is a well-replicated determinant of higher homocysteine and lower folate; heterozygous reduces activity roughly 35 percent.',
    evidence: 'well-established',
    confidence: 'high',
  },
  rs1801131: {
    rationale: 'MTHFR A1298C has a smaller activity effect than C677T; homozygous is a modest reduction, single-copy is functionally minor. The notable clinical pairing is compound with C677T, which is not a single-variant zygosity and is not scored here.',
    evidence: 'well-established',
    confidence: 'medium',
  },
  rs2066470: {
    rationale: 'MTHFR P39P is synonymous and has no independent validated functional effect; it only tags the MTHFR haplotype. Left unscored deliberately.',
    evidence: 'synonymous-no-clear-function',
    confidence: 'high',
  },
  rs1805087: {
    rationale: 'MTR A2756G has an established but modest effect on B12-dependent homocysteine remethylation; homozygous moderate, single-copy low.',
    evidence: 'limited',
    confidence: 'medium',
  },
  rs1801394: {
    rationale: 'MTRR A66G modestly affects homocysteine, most apparent under low B12 status; homozygous moderate, single-copy low.',
    evidence: 'limited',
    confidence: 'medium',
  },
  rs10380: {
    rationale: 'MTRR H595Y is a secondary MTRR variant with limited and inconsistent functional evidence; homozygous given a minor (low) tier, single-copy left unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs162036: {
    rationale: 'MTRR K350A is a secondary MTRR variant with limited functional evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs2287780: {
    rationale: 'MTRR R415T is a secondary MTRR variant with limited functional evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs1532268: {
    rationale: 'MTRR S257T is a secondary MTRR variant with limited functional evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs1802059: {
    rationale: 'MTRR A664A is synonymous with no independent validated function. Left unscored deliberately.',
    evidence: 'synonymous-no-clear-function',
    confidence: 'high',
  },
  rs4680: {
    rationale: 'COMT V158M Met/Met (the +/+ slow state) has a well-established 3 to 4 fold lower COMT activity affecting catecholamine and estrogen methylation turnover. It is a common normal polymorphism, not pathology, so even homozygous is capped at moderate; single-copy low.',
    evidence: 'well-established',
    confidence: 'high',
  },
  rs4633: {
    rationale: 'COMT H62H is synonymous; it tags the COMT activity haplotype but has no independent validated effect, and scoring it would double-count rs4680. Left unscored.',
    evidence: 'synonymous-no-clear-function',
    confidence: 'high',
  },
  rs769224: {
    rationale: 'COMT P199P is synonymous with no independent validated effect; scoring it would double-count rs4680. Left unscored.',
    evidence: 'synonymous-no-clear-function',
    confidence: 'high',
  },
  rs731236: {
    rationale: 'VDR Taq1 associations with vitamin D status and bone/immune outcomes are inconsistent and population-dependent; homozygous given a minor (low) tier, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs2228570: {
    rationale: 'VDR Fok1 changes the receptor protein (longer vs shorter isoform) with a real replicated functional difference in receptor activity; homozygous moderate, single-copy low.',
    evidence: 'well-established',
    confidence: 'medium',
  },
  rs6323: {
    rationale: 'MAOA affects serotonin/dopamine degradation; X-linked so a single call is effectively hemizygous in males. Population-level functional difference is modest; homozygous low.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs234706: {
    rationale: 'CBS C699T is panel-popular, but the common upregulation interpretation is not well supported by functional data; honest grade is limited and direction is uncertain. Homozygous given a minor (low) tier, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs1801181: {
    rationale: 'CBS A360A is synonymous with no independent validated function. Left unscored deliberately.',
    evidence: 'synonymous-no-clear-function',
    confidence: 'high',
  },
  rs2298758: {
    rationale: 'CBS N212N is synonymous with no independent validated function. Left unscored deliberately.',
    evidence: 'synonymous-no-clear-function',
    confidence: 'high',
  },
  rs1799983: {
    rationale: 'NOS3 D298E (Asp298Glu) is a real missense with modest associations to nitric oxide / endothelial function and blood pressure; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'medium',
  },
  rs1979277: {
    rationale: 'SHMT1 C1420T modestly and somewhat inconsistently shifts folate partitioning between DNA synthesis and methylation; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs819147: {
    rationale: 'AHCY-1 relates to the SAM/SAH methylation balance but per-variant functional evidence is limited and largely panel-derived; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs819134: {
    rationale: 'AHCY-2 relates to the SAM/SAH methylation balance with limited per-variant evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs819171: {
    rationale: 'AHCY-19 relates to the SAM/SAH methylation balance with limited per-variant evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs585800: {
    rationale: 'BHMT-1 is part of the betaine/choline remethylation route with limited per-variant functional evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs567754: {
    rationale: 'BHMT-2 is part of the betaine/choline remethylation route with limited per-variant functional evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs617219: {
    rationale: 'BHMT-4 is part of the betaine/choline remethylation route with limited per-variant functional evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs651852: {
    rationale: 'BHMT-8 has the most homocysteine-association evidence of the BHMT set, still modest; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
  rs3741049: {
    rationale: 'ACAT1 relates to mitochondrial ketone / B12 handling on the panel with limited per-variant functional evidence; homozygous low, single-copy unscored.',
    evidence: 'limited',
    confidence: 'low',
  },
};

// The methylation statuses that can carry a tier. "-/-" is baseline and is never
// stored or displayed, so it has no tier.
const SCORED_ZYGOSITIES: readonly Zygosity[] = ['+/+', '+/-'];

function isZygosity(s: string): s is Zygosity {
  return (SCORED_ZYGOSITIES as readonly string[]).includes(s);
}

// Resolve the validated severity tier for a methylation-panel variant from its
// rsID and ZYGOSITY STATUS (the +/+ +/- call the lab stated, stored in the row's
// `status`). Returns null when the variant has no validated tier at that zygosity
// (the honest unscored state) or when the status is not a scored zygosity. This
// deliberately does NOT run normalizeGenotype, which would collapse the zygosity
// tokens. Callers must NOT substitute a guessed tier for null.
export function methylationSeverityFor(
  rsid: string | null,
  status: string | null,
): SeverityTier | null {
  if (!rsid || !status) return null;
  const trimmed = status.trim();
  if (!isZygosity(trimmed)) return null;
  const byZygosity = METHYLATION_SEVERITY[rsid.trim().toLowerCase()];
  if (!byZygosity) return null;
  return byZygosity[trimmed] ?? null;
}
