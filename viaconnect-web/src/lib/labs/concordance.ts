// Prompt 208a Module E (E4): genotype-phenotype concordance.
//
// Genotype predicts; phenotype confirms. A risk variant PLUS a confirming lab is
// a high-confidence, act-now signal. A risk variant with a normal lab is a
// predisposition that is not currently expressed (guidance softens). A risk
// variant with the lab pushed the OTHER way is discordant and is surfaced, not
// hidden.
//
// This is the PURE engine only. The gene->biomarker->risk-direction pairs are the
// platform's existing Hannah-vetted overlay set (MTHFR/MTR/IL6/VDR), not newly
// fabricated. Feeding concordance into synthesis to raise/soften recommendation
// confidence is a SEPARATE wiring task (E4b) and is NOT done here. Pure,
// deterministic, never throws. No em/en-dashes, no emojis.

export type ConcordanceState = 'concordant' | 'discordant' | 'predisposition_only';
export type ConcordanceConfidence = 'high' | 'moderate' | 'low';

export interface ConcordanceRule {
  gene: string;
  biomarker: string;
  /** Direction the risk variant is expected to push the biomarker. */
  riskDirection: 'high' | 'low';
}

// Established gene -> biomarker pairs reused from the existing genetic-optimal
// overlay (lab-service.ts), Hannah-vetted. Not invented here.
export const CONCORDANCE_RULES: ConcordanceRule[] = [
  { gene: 'MTHFR', biomarker: 'homocysteine', riskDirection: 'high' },
  { gene: 'MTR', biomarker: 'vitamin_b12', riskDirection: 'low' },
  { gene: 'IL6', biomarker: 'hscrp', riskDirection: 'high' },
  { gene: 'VDR', biomarker: 'vitamin_d', riskDirection: 'low' },
];

export interface RefRange {
  low: number;
  high: number;
}

/** A variant carries the risk allele when its zygosity is +/+ or +/-. */
export function variantPresent(status: string | null): boolean {
  if (!status) return false;
  const s = status.replace(/\s+/g, '');
  return s === '+/+' || s === '+/-' || s === '-/+';
}

/**
 * Classify concordance for ONE gene/biomarker pair.
 *   variant absent           -> null (no assessment without the variant)
 *   out-of-range in riskDir   -> 'concordant'      (high confidence, actionable)
 *   within range              -> 'predisposition_only' (moderate, softened)
 *   out-of-range opposite dir -> 'discordant'      (low confidence, surface it)
 */
export function concordanceState(
  present: boolean,
  value: number | null,
  range: RefRange | null,
  riskDirection: 'high' | 'low',
): { state: ConcordanceState; confidence: ConcordanceConfidence } | null {
  if (!present) return null;
  if (value === null || !range) return { state: 'predisposition_only', confidence: 'moderate' };

  const aboveHigh = value > range.high;
  const belowLow = value < range.low;
  const outInRiskDir = riskDirection === 'high' ? aboveHigh : belowLow;
  const outOppositeDir = riskDirection === 'high' ? belowLow : aboveHigh;

  if (outInRiskDir) return { state: 'concordant', confidence: 'high' };
  if (outOppositeDir) return { state: 'discordant', confidence: 'low' };
  return { state: 'predisposition_only', confidence: 'moderate' };
}

export interface ConcordanceRecord {
  gene: string;
  biomarker: string;
  state: ConcordanceState;
  confidence: ConcordanceConfidence;
}

export interface VariantInput {
  gene: string | null;
  status: string | null;
}
export interface LabInput {
  biomarker: string;
  value: number | null;
  range: RefRange | null;
}

/**
 * Build concordance records across all rules for which the user has BOTH the
 * gene variant and the biomarker lab. Pure: no DB, no side effects.
 */
export function buildConcordances(
  variants: VariantInput[],
  labs: LabInput[],
): ConcordanceRecord[] {
  const records: ConcordanceRecord[] = [];
  for (const rule of CONCORDANCE_RULES) {
    const variant = variants.find((v) => (v.gene ?? '').toUpperCase() === rule.gene.toUpperCase());
    if (!variant) continue;
    const lab = labs.find((l) => l.biomarker.toLowerCase() === rule.biomarker.toLowerCase());
    if (!lab) continue;
    const result = concordanceState(
      variantPresent(variant.status),
      lab.value,
      lab.range,
      rule.riskDirection,
    );
    if (!result) continue;
    records.push({
      gene: rule.gene,
      biomarker: rule.biomarker,
      state: result.state,
      confidence: result.confidence,
    });
  }
  return records;
}

// === PROMPT 208b 4.3 EXTENSION START ===
// Triangulated (three-way) concordance: symptom (CAQ) + biomarker (lab) +
// genotype (variant). Confidence rises with the number of CONCORDANT dimensions
// (3 -> high, 2 -> moderate, 1 -> low) so a three-way agreement reads higher than
// any pair. ADDITIVE: the 208a buildConcordances + CONCORDANCE_RULES above stay
// unchanged; this builder reuses buildConcordances and enriches each record. Like
// 208a, this is INFORMATIONAL only and never gates an interlock. The biomarker
// dimension counts ONLY when the lab genuinely confirms (state 'concordant'), not
// when it is merely present. Pure, deterministic, never throws.

// Symptom keywords parallel to CONCORDANCE_RULES, keyed by both gene and
// biomarker (lookups try either). Lowercased. Hannah-vetted plain-language
// concern terms, not newly invented clinical claims.
export const RULE_SYMPTOMS: Record<string, string[]> = {
  MTHFR: ['fatigue', 'brain fog'],
  homocysteine: ['fatigue', 'brain fog'],
  MTR: ['fatigue', 'numbness', 'tingling'],
  vitamin_b12: ['fatigue', 'numbness', 'tingling'],
  IL6: ['inflammation', 'joint pain', 'swelling'],
  hscrp: ['inflammation', 'joint pain', 'swelling'],
  VDR: ['fatigue', 'low mood', 'bone pain'],
  vitamin_d: ['fatigue', 'low mood', 'bone pain'],
};

/**
 * PURE. True if any keyword overlaps any reported user symptom, case-insensitive
 * and bidirectional (keyword substring of symptom OR symptom substring of
 * keyword). Empty/whitespace entries are ignored. Empty userSymptoms -> false.
 */
export function symptomReported(keywords: string[], userSymptoms: string[]): boolean {
  if (!Array.isArray(keywords) || !Array.isArray(userSymptoms)) return false;
  const norm = (arr: string[]): string[] =>
    arr
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.toLowerCase().trim())
      .filter((s) => s.length > 0);
  const ks = norm(keywords);
  const us = norm(userSymptoms);
  if (ks.length === 0 || us.length === 0) return false;
  for (const k of ks) {
    for (const u of us) {
      if (k.includes(u) || u.includes(k)) return true;
    }
  }
  return false;
}

/**
 * Return the matched keyword term for a rule given the user's symptoms, or null.
 * Used to populate symptom_ref. Returns the canonical keyword (not the raw user
 * phrase) so the persisted reference is a stable, lowercased concern term.
 */
function matchedSymptomTerm(keywords: string[], userSymptoms: string[]): string | null {
  if (!Array.isArray(keywords) || !Array.isArray(userSymptoms)) return null;
  const us = userSymptoms
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length > 0);
  if (us.length === 0) return null;
  for (const raw of keywords) {
    if (typeof raw !== 'string') continue;
    const k = raw.toLowerCase().trim();
    if (k.length === 0) continue;
    for (const u of us) {
      if (k.includes(u) || u.includes(k)) return k;
    }
  }
  return null;
}

export interface TriangulatedConcordance extends ConcordanceRecord {
  /** The corroborating CAQ symptom term, or null when none was reported. */
  symptom_ref: string | null;
  /** How many of the three sources agree: 1, 2, or 3. Drives confidence. */
  concordance_dimensions: 1 | 2 | 3;
}

const CONFIDENCE_BY_DIMENSIONS: Record<1 | 2 | 3, ConcordanceConfidence> = {
  1: 'low',
  2: 'moderate',
  3: 'high',
};

/**
 * Build TRIANGULATED concordance records. Reuses buildConcordances for the
 * variant+biomarker base, then for each record:
 *   dims = 1 (variant present is the base, every emitted record has the variant)
 *        + 1 if the lab genuinely CONFIRMS (state === 'concordant')
 *        + 1 if a matching symptom is reported
 * dims is clamped to 1..3. confidence is RECOMPUTED from dims (3 -> high, 2 ->
 * moderate, 1 -> low), overriding the 2-way confidence so three-way agreement
 * reads higher than any pair. symptom_ref is the matched term or null.
 * Informational only; never gates. Never throws.
 */
export function buildTriangulatedConcordances(
  variants: VariantInput[],
  labs: LabInput[],
  userSymptoms: string[],
): TriangulatedConcordance[] {
  try {
    const base = buildConcordances(variants, labs);
    const symptoms = Array.isArray(userSymptoms) ? userSymptoms : [];
    return base.map((record) => {
      const keywords = RULE_SYMPTOMS[record.gene] ?? RULE_SYMPTOMS[record.biomarker] ?? [];
      const symptomTerm = matchedSymptomTerm(keywords, symptoms);

      // Variant present is the base dimension (buildConcordances only emits a
      // record when the variant is present). The biomarker dimension counts ONLY
      // on genuine confirmation (concordant), never on mere presence or a
      // predisposition_only / discordant lab.
      let dims = 1;
      if (record.state === 'concordant') dims += 1;
      if (symptomTerm !== null) dims += 1;
      const clamped = Math.max(1, Math.min(3, dims)) as 1 | 2 | 3;

      return {
        ...record,
        confidence: CONFIDENCE_BY_DIMENSIONS[clamped],
        symptom_ref: symptomTerm,
        concordance_dimensions: clamped,
      };
    });
  } catch {
    return [];
  }
}
// === PROMPT 208b 4.3 EXTENSION END ===
