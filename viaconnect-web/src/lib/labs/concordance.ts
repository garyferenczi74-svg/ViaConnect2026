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
