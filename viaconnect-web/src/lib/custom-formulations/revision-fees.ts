// Prompt #97 Phase 6.2: pure revision fee calculator.
//
// Maps a revision classification to the fees re-charged:
//   minor       free (excipient/flavor/sub-10% dose tweaks)
//   substantive medical review fee re-charged
//   material    medical review fee + 50% of dev fee re-charged

import type { RevisionClassification } from './revision-classification';

export interface RevisionFeeInput {
  classification: RevisionClassification;
  developmentFeeCents: number;
  medicalReviewFeeCents: number;
}

export interface RevisionFeeBreakdown {
  medicalReviewFeeCents: number;
  developmentFeePartialCents: number;
  totalCents: number;
  description: string;
}

export function computeRevisionFees(input: RevisionFeeInput): RevisionFeeBreakdown {
  switch (input.classification) {
    case 'minor':
      return {
        medicalReviewFeeCents: 0,
        developmentFeePartialCents: 0,
        totalCents: 0,
        description:
          'Minor revision: cosmetic changes or sub-10% dose tweaks. No fees re-charged.',
      };
    case 'substantive':
      return {
        medicalReviewFeeCents: input.medicalReviewFeeCents,
        developmentFeePartialCents: 0,
        totalCents: input.medicalReviewFeeCents,
        description:
          'Substantive revision: dose >10%, ingredient add/remove, or claim change. Medical review fee re-charged.',
      };
    case 'material': {
      const halfDev = Math.ceil(input.developmentFeeCents / 2);
      return {
        medicalReviewFeeCents: input.medicalReviewFeeCents,
        developmentFeePartialCents: halfDev,
        totalCents: input.medicalReviewFeeCents + halfDev,
        description:
          'Material revision: intended-use shift, delivery form change, or 3+ ingredient churn. Medical review + 50% of development fee re-charged.',
      };
    }
    default: {
      const _exhaustive: never = input.classification;
      throw new Error(`Unhandled classification: ${String(_exhaustive)}`);
    }
  }
}
