/**
 * Prompt 227a G61: Class 0 batch cumulative-effect detector.
 * If applying additive Class 0 records would change derived grades/honesty, escalate.
 */

import type { EvidenceGrade } from '@/lib/peptides/gradeCap226h';
import { applyProvenanceGradeCap } from '@/lib/peptides/gradeCap226h';

export type DerivedSnapshot = {
  peptideId: string;
  evidenceGrade: EvidenceGrade;
  honestyTrialsRegistered: number;
  honestyPublicationsHuman: number;
  institutionalConcentration: number;
  independentReplicationCount: number;
};

export type Class0BatchItem = {
  peptideId: string;
  /** Hypothetical honesty delta if this Class 0 addition applied */
  deltaTrialsRegistered?: number;
  deltaPublicationsHuman?: number;
  addsToLargestNetwork?: boolean;
};

export function detectCumulativeEffect(args: {
  baselines: DerivedSnapshot[];
  batch: Class0BatchItem[];
}): {
  wouldChangeDerived: boolean;
  escalatedPeptideIds: string[];
  reasons: string[];
} {
  const reasons: string[] = [];
  const escalated = new Set<string>();

  for (const base of args.baselines) {
    const deltas = args.batch.filter((b) => b.peptideId === base.peptideId);
    if (deltas.length === 0) continue;

    const addTrials = deltas.reduce(
      (n, d) => n + (d.deltaTrialsRegistered ?? 0),
      0,
    );
    const addPubs = deltas.reduce(
      (n, d) => n + (d.deltaPublicationsHuman ?? 0),
      0,
    );
    const growsLargest = deltas.some((d) => d.addsToLargestNetwork === true);

    const nextTrials = base.honestyTrialsRegistered + addTrials;
    const nextPubs = base.honestyPublicationsHuman + addPubs;
    const nextConcentration = growsLargest
      ? Math.min(1, base.institutionalConcentration + 0.05 * addPubs)
      : base.institutionalConcentration;

    if (
      nextTrials !== base.honestyTrialsRegistered ||
      nextPubs !== base.honestyPublicationsHuman
    ) {
      escalated.add(base.peptideId);
      reasons.push(`honesty_count_shift:${base.peptideId}`);
    }

    const capped = applyProvenanceGradeCap(base.evidenceGrade, {
      institutionalConcentration: nextConcentration,
      distinctAuthorNetworks: nextConcentration >= 0.8 ? 1 : 2,
      independentReplicationCount: base.independentReplicationCount,
    });
    if (capped.grade !== base.evidenceGrade) {
      escalated.add(base.peptideId);
      reasons.push(`grade_shift:${base.peptideId}:${base.evidenceGrade}->${capped.grade}`);
    }
  }

  return {
    wouldChangeDerived: escalated.size > 0,
    escalatedPeptideIds: [...escalated],
    reasons: [...new Set(reasons)],
  };
}
