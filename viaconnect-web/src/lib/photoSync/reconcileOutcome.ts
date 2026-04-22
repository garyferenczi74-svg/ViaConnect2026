// Photo Sync prompt §6: pure outcome classifier for the reconciliation
// report. Given the pre-apply classification, post-apply classification,
// and planned confidence, returns one of the nine outcome labels the
// reconciliation markdown groups by.
//
// Kept free of I/O so it can be unit-tested without fixture files.

import type { ImageUrlClassification, MatchConfidence } from './types';

export type ReconciliationOutcome =
  | 'flipped_to_valid'       // HIGH/LOW plan row is now VALID_SUPABASE
  | 'already_valid'          // VALID pre, VALID post
  | 'unchanged_external'     // EXTERNAL skipped deliberately
  | 'unchanged_placeholder'  // NONE confidence, still PLACEHOLDER
  | 'unchanged_null'         // NONE confidence, still NULL
  | 'unchanged_stale'        // NONE / LOW confidence, still STALE_SUPABASE
  | 'failed_to_flip'         // HIGH plan row did NOT become VALID_SUPABASE — ERROR
  | 'unexpected_regress'     // was VALID, now STALE/NULL — ERROR
  | 'no_plan_entry';         // audit row with no corresponding plan row

export interface ClassifyOutcomeArgs {
  pre: ImageUrlClassification | null;       // null when audit-only row (no plan entry)
  post: ImageUrlClassification;
  confidence: MatchConfidence | null;       // null when audit-only row
}

export function classifyOutcome({ pre, post, confidence }: ClassifyOutcomeArgs): ReconciliationOutcome {
  // Regression trumps everything: a row that was VALID cannot become not-VALID.
  if (pre === 'VALID_SUPABASE' && post !== 'VALID_SUPABASE') return 'unexpected_regress';

  // Audit-only row (no plan entry).
  if (pre == null || confidence == null) return 'no_plan_entry';

  if (pre === 'EXTERNAL') return 'unchanged_external';

  if (confidence === 'HIGH') {
    return post === 'VALID_SUPABASE' ? 'flipped_to_valid' : 'failed_to_flip';
  }

  if (confidence === 'LOW') {
    return post === 'VALID_SUPABASE' ? 'flipped_to_valid' : 'unchanged_stale';
  }

  // NONE
  if (post === 'VALID_SUPABASE' && pre === 'VALID_SUPABASE') return 'already_valid';
  if (post === 'NULL') return 'unchanged_null';
  if (post === 'PLACEHOLDER') return 'unchanged_placeholder';
  if (post === 'STALE_SUPABASE') return 'unchanged_stale';
  if (post === 'VALID_SUPABASE') return 'already_valid';   // row quietly resolved without a plan
  return 'no_plan_entry';
}

export const ERROR_OUTCOMES: ReadonlySet<ReconciliationOutcome> = new Set<ReconciliationOutcome>([
  'failed_to_flip',
  'unexpected_regress',
]);
