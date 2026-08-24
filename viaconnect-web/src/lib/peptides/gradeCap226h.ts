/**
 * Prompt 226h G50/G54: provenance grade ceilings after automated grading.
 * Caps apply automatically. Lifting a cap requires Jeffery review (not in this module).
 */

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type TranslationMethod =
  | 'published_translation'
  | 'machine_translation'
  | 'human_translation'
  | 'none';

export type ProvenanceSignals = {
  /** Share of evidence from the single largest author network, 0..1 */
  institutionalConcentration: number;
  /** Distinct author networks with publications */
  distinctAuthorNetworks: number;
  /** Studies from a network other than the originating group */
  independentReplicationCount: number;
  /** Best (lowest number) source_tier among contributing records. Null = unknown. */
  bestSourceTier?: number | null;
  /** True when contributing sources are exclusively Tier 3 (no Tier 1/2). */
  tier3Only?: boolean;
  translationMethod?: TranslationMethod | null;
  translationReviewed?: boolean;
};

const GRADE_RANK: Record<EvidenceGrade, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

const RANK_GRADE: EvidenceGrade[] = ['A', 'B', 'C', 'D', 'E'];

export function isEvidenceSingleSource(
  concentration: number,
  threshold = 0.8,
): boolean {
  return concentration >= threshold;
}

export function applyProvenanceGradeCap(
  rawGrade: EvidenceGrade,
  signals: ProvenanceSignals,
  singleSourceThreshold = 0.8,
): { grade: EvidenceGrade; reasons: string[] } {
  let ceiling: EvidenceGrade = 'A';
  const reasons: string[] = [];

  if (
    isEvidenceSingleSource(
      signals.institutionalConcentration,
      singleSourceThreshold,
    )
  ) {
    ceiling = worseCeiling(ceiling, 'C');
    reasons.push('single_author_network_cap_C');
  }

  if (signals.tier3Only === true) {
    ceiling = worseCeiling(ceiling, 'C');
    reasons.push('tier3_only_cap_C');
  }

  if (signals.bestSourceTier != null && signals.bestSourceTier >= 4) {
    ceiling = worseCeiling(ceiling, 'E');
    reasons.push('tier4_never_grade_contributing');
  }

  if (
    signals.translationMethod === 'machine_translation' &&
    signals.translationReviewed !== true
  ) {
    ceiling = worseCeiling(ceiling, 'D');
    reasons.push('unreviewed_machine_translation_cap_D');
  }

  if (signals.independentReplicationCount < 1) {
    // Cannot reach B (or A) without independent replication
    ceiling = worseCeiling(ceiling, 'C');
    reasons.push('no_independent_replication_cannot_reach_B');
  }

  const grade =
    GRADE_RANK[rawGrade] > GRADE_RANK[ceiling] ? rawGrade : ceiling;
  return { grade, reasons: [...new Set(reasons)] };
}

function worseCeiling(current: EvidenceGrade, proposed: EvidenceGrade): EvidenceGrade {
  return GRADE_RANK[proposed] > GRADE_RANK[current] ? proposed : current;
}

export function isConsumerRetrievablePublication(args: {
  translationMethod: TranslationMethod | null | undefined;
  translationReviewedBy: string | null | undefined;
  sourceTier: number | null | undefined;
}): boolean {
  if (args.sourceTier != null && args.sourceTier >= 4) return false;
  if (
    args.translationMethod === 'machine_translation' &&
    !args.translationReviewedBy
  ) {
    return false;
  }
  return true;
}

export const BIOREGULATOR_PROVENANCE_DISCLOSURE_226H =
  'The published research on this compound comes overwhelmingly from a single research institution and its affiliated laboratories, published largely in Russian-language or Russian-affiliated journals. Independent replication outside that group is limited. This does not mean the findings are wrong. It means they have not passed through the independent replication that is normally required before a finding is treated as established.';

export function formatProvenanceCounts(args: {
  publicationCount: number;
  distinctAuthorNetworks: number;
  largestNetworkCount: number;
  independentReplicationCount: number;
}): string {
  const pubs = args.publicationCount;
  const nets = args.distinctAuthorNetworks;
  const largest = args.largestNetworkCount;
  const indep = args.independentReplicationCount;
  return `${pubs} publications, from ${nets} distinct research groups. ${largest} of ${pubs} from one institution. Independent replication of the primary effect: ${
    indep === 0 ? 'none identified' : String(indep)
  }.`;
}

// silence unused in case tree-shaking
void RANK_GRADE;
