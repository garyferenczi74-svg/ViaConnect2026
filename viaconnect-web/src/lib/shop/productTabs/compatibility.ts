/**
 * Prompt 215 Phase 4: Elysium genetic compatibility scoring (deterministic).
 *
 * THRESHOLD LOGIC (auditable, not vibes):
 * 1. Map product ingredients to ingredient_snp_relevance rows via keyword match.
 * 2. Intersect with user variant rsIDs that Elysium has interpreted (or uploaded mapped).
 * 3. Weight:
 *    - positive + strong/moderate => green +2 / +1
 *    - mixed / coverage / emerging positive => yellow +1
 *    - caution => red +2 (requires Marshall framing_key relevance_caution)
 * 4. Band selection:
 *    - If redWeight > 0 AND redWeight >= greenWeight => RED
 *    - Else if greenWeight >= 2 AND greenWeight > yellowWeight => GREEN
 *    - Else if greenWeight + yellowWeight + redWeight > 0 => YELLOW
 *    - Else if user has genetics but no ingredient matches => YELLOW (coverage gaps)
 *    - Else EMPTY / PENDING / SIGNED_OUT by state machine
 *
 * Colors communicate RELEVANCE prioritization only, never safety/diagnosis/treatment.
 */

import { APPROVED_FRAMING, type CompatibilityResult, type CompatibilityState } from './types';

export interface RelevanceRow {
  ingredient_key: string;
  ingredient_label: string;
  rsid: string;
  gene_symbol?: string | null;
  relevance: 'positive' | 'mixed' | 'caution' | 'coverage';
  evidence_grade: string;
  framing_key: string;
}

export interface UserVariantInput {
  rsid: string;
  gene?: string;
  source?: 'genex360' | 'upload' | 'unknown';
  status?: 'interpreted' | 'pending' | 'unknown';
}

export interface ScoreInput {
  productSlug: string;
  productIngredientNames: string[];
  relevanceRows: RelevanceRow[];
  userVariants: UserVariantInput[];
  signedIn: boolean;
  geneticsState: CompatibilityState;
}

/** Keyword map from formulation ingredient labels to ingredient_key seeds. */
export const INGREDIENT_KEY_MATCHERS: Array<{ key: string; patterns: RegExp[] }> = [
  { key: 'methyl-folate', patterns: [/5-mthf/i, /methyl\s*folate/i, /folate/i, /b9/i] },
  { key: 'methylcobalamin', patterns: [/methylcobalamin/i, /b12/i, /cobalamin/i] },
  { key: 'magnesium', patterns: [/magnesium/i] },
  { key: 'omega-3', patterns: [/omega-?3/i, /epa/i, /dha/i, /algal/i] },
  { key: 'curcumin', patterns: [/curcumin/i, /turmeric/i] },
  { key: 'glutathione-nac', patterns: [/glutathione/i, /\bnac\b/i, /n-acetyl/i] },
  { key: 'coq10-nad', patterns: [/coq10/i, /nad/i, /nicotinamide/i] },
  { key: 'iron', patterns: [/\biron\b/i, /ferrous/i, /ferric/i] },
  { key: 'caffeine-related', patterns: [/caffeine/i, /green\s*tea/i, /theacrine/i] },
  { key: 'comt-support', patterns: [/theanine/i, /magnesium\s*threonate/i, /safran/i, /ashwagandha/i] },
  { key: 'probiotic-gut', patterns: [/probiotic/i, /saccharomyces/i, /butyrate/i, /inulin/i, /glutamine/i] },
  { key: 'collagen-joint', patterns: [/collagen/i, /uc-ii/i, /hyaluronic/i, /msm/i] },
];

export function matchIngredientKeys(ingredientNames: string[]): string[] {
  const keys = new Set<string>();
  for (const name of ingredientNames) {
    for (const m of INGREDIENT_KEY_MATCHERS) {
      if (m.patterns.some((re) => re.test(name))) keys.add(m.key);
    }
  }
  return [...keys];
}

function weightFor(row: RelevanceRow): { g: number; y: number; r: number } {
  if (row.relevance === 'caution') return { g: 0, y: 0, r: 2 };
  if (row.relevance === 'positive') {
    if (row.evidence_grade === 'strong') return { g: 2, y: 0, r: 0 };
    if (row.evidence_grade === 'moderate') return { g: 1, y: 0, r: 0 };
    return { g: 0, y: 1, r: 0 };
  }
  if (row.relevance === 'mixed' || row.relevance === 'coverage') return { g: 0, y: 1, r: 0 };
  return { g: 0, y: 0, r: 0 };
}

function framingFor(row: RelevanceRow): string {
  if (row.relevance === 'caution' || row.framing_key === 'relevance_caution') {
    return APPROVED_FRAMING.red_caution;
  }
  if (row.relevance === 'positive' && (row.evidence_grade === 'strong' || row.evidence_grade === 'moderate')) {
    return APPROVED_FRAMING.green;
  }
  return APPROVED_FRAMING.yellow;
}

/**
 * Pure scorer. Same inputs always produce the same band and weights.
 */
export function scoreGeneticCompatibility(input: ScoreInput): CompatibilityResult {
  const disclaimer = APPROVED_FRAMING.disclaimer;
  const now = new Date().toISOString();

  if (!input.signedIn || input.geneticsState === 'signed_out') {
    return {
      band: 'signed_out',
      state: 'signed_out',
      framingLine: 'Sign in to see your personalized genetic relevance for this product.',
      disclaimer,
      lastUpdated: null,
      reasons: [],
      coverageCaveats: [],
      scoreInputs: { greenWeight: 0, yellowWeight: 0, redWeight: 0, matchedVariants: 0 },
    };
  }

  if (input.geneticsState === 'processing') {
    return {
      band: 'pending',
      state: 'processing',
      framingLine: 'Your genetics results are processing. A personalized score will appear when Elysium finishes interpretation.',
      disclaimer,
      lastUpdated: null,
      reasons: [],
      coverageCaveats: ['Results processing: no provisional score is shown.'],
      scoreInputs: { greenWeight: 0, yellowWeight: 0, redWeight: 0, matchedVariants: 0 },
    };
  }

  if (input.geneticsState === 'no_data' || input.userVariants.length === 0) {
    return {
      band: 'empty',
      state: 'no_data',
      framingLine: `Connect GENEX360 or upload existing test data to unlock ${APPROVED_FRAMING.subline}.`,
      disclaimer,
      lastUpdated: null,
      reasons: [],
      coverageCaveats: [
        'No personal score is generated without your genetics data. Population averages are never shown as personal scores.',
      ],
      scoreInputs: { greenWeight: 0, yellowWeight: 0, redWeight: 0, matchedVariants: 0 },
    };
  }

  const keys = matchIngredientKeys(input.productIngredientNames);
  const userRsids = new Set(
    input.userVariants
      .filter((v) => v.status !== 'unknown')
      .map((v) => v.rsid.toLowerCase()),
  );

  let greenWeight = 0;
  let yellowWeight = 0;
  let redWeight = 0;
  const reasons: CompatibilityResult['reasons'] = [];
  const coverageCaveats: string[] = [];

  const applicable = input.relevanceRows.filter((r) => keys.includes(r.ingredient_key));

  for (const row of applicable) {
    const hit = userRsids.has(row.rsid.toLowerCase());
    if (!hit) {
      coverageCaveats.push(
        `Variant ${row.rsid} (${row.gene_symbol ?? 'gene'}) relevant to ${row.ingredient_label} was not assessed in your available genetics data.`,
      );
      continue;
    }
    const w = weightFor(row);
    greenWeight += w.g;
    yellowWeight += w.y;
    redWeight += w.r;
    reasons.push({
      ingredientLabel: row.ingredient_label,
      rsid: row.rsid,
      gene: row.gene_symbol ?? '',
      relevance: row.relevance,
      evidenceGrade: row.evidence_grade,
      framing: framingFor(row),
    });
  }

  if (input.geneticsState === 'uploaded_only') {
    coverageCaveats.unshift(
      'Uploaded third-party panels may not cover every GENEX360 variant. Gaps above are honest UNKNOWN assessments, not zeros.',
    );
  }

  let band: CompatibilityResult['band'] = 'yellow';
  let framingLine = APPROVED_FRAMING.yellow;

  if (redWeight > 0 && redWeight >= greenWeight) {
    band = 'red';
    framingLine = APPROVED_FRAMING.red;
  } else if (greenWeight >= 2 && greenWeight > yellowWeight) {
    band = 'green';
    framingLine = APPROVED_FRAMING.green;
  } else if (greenWeight + yellowWeight + redWeight === 0) {
    band = 'yellow';
    framingLine = APPROVED_FRAMING.yellow;
    coverageCaveats.push(
      'No direct ingredient-variant matches for this product in your interpreted set; relevance is partial or limited.',
    );
  } else {
    band = 'yellow';
    framingLine = APPROVED_FRAMING.yellow;
  }

  return {
    band,
    state: input.geneticsState,
    framingLine,
    disclaimer,
    lastUpdated: now,
    reasons,
    coverageCaveats,
    scoreInputs: {
      greenWeight,
      yellowWeight,
      redWeight,
      matchedVariants: reasons.length,
    },
  };
}

/** Static seed relevance rows (mirrors migration) for offline scoring. */
export const SEED_RELEVANCE_ROWS: RelevanceRow[] = [
  { ingredient_key: 'methyl-folate', ingredient_label: 'Methyl Folate (5-MTHF)', rsid: 'rs1801133', gene_symbol: 'MTHFR', relevance: 'positive', evidence_grade: 'strong', framing_key: 'relevance_positive' },
  { ingredient_key: 'methyl-folate', ingredient_label: 'Methyl Folate (5-MTHF)', rsid: 'rs1801131', gene_symbol: 'MTHFR', relevance: 'positive', evidence_grade: 'moderate', framing_key: 'relevance_positive' },
  { ingredient_key: 'methylcobalamin', ingredient_label: 'Methylcobalamin B12', rsid: 'rs1801133', gene_symbol: 'MTHFR', relevance: 'positive', evidence_grade: 'moderate', framing_key: 'relevance_positive' },
  { ingredient_key: 'magnesium', ingredient_label: 'Magnesium forms', rsid: 'rs1544410', gene_symbol: 'VDR', relevance: 'mixed', evidence_grade: 'emerging', framing_key: 'relevance_partial' },
  { ingredient_key: 'omega-3', ingredient_label: 'Omega-3 EPA DHA', rsid: 'rs174537', gene_symbol: 'FADS1', relevance: 'positive', evidence_grade: 'moderate', framing_key: 'relevance_positive' },
  { ingredient_key: 'curcumin', ingredient_label: 'Curcumin', rsid: 'rs1800795', gene_symbol: 'IL6', relevance: 'positive', evidence_grade: 'emerging', framing_key: 'relevance_positive' },
  { ingredient_key: 'glutathione-nac', ingredient_label: 'Glutathione / NAC', rsid: 'rs1695', gene_symbol: 'GSTP1', relevance: 'positive', evidence_grade: 'moderate', framing_key: 'relevance_positive' },
  { ingredient_key: 'iron', ingredient_label: 'Iron forms', rsid: 'rs1800562', gene_symbol: 'HFE', relevance: 'caution', evidence_grade: 'moderate', framing_key: 'relevance_caution' },
  { ingredient_key: 'comt-support', ingredient_label: 'Catechol / stress support nutrients', rsid: 'rs4680', gene_symbol: 'COMT', relevance: 'positive', evidence_grade: 'moderate', framing_key: 'relevance_positive' },
  { ingredient_key: 'probiotic-gut', ingredient_label: 'Probiotic and gut barrier nutrients', rsid: 'rs4986790', gene_symbol: 'TLR4', relevance: 'coverage', evidence_grade: 'unknown', framing_key: 'relevance_partial' },
  { ingredient_key: 'collagen-joint', ingredient_label: 'Collagen / joint matrix', rsid: 'rs1800012', gene_symbol: 'COL1A1', relevance: 'positive', evidence_grade: 'emerging', framing_key: 'relevance_positive' },
];
