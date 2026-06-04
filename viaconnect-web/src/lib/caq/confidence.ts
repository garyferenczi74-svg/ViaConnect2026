// =============================================================================
// Prompt 173c Phase E (2026-06-04): partial-input confidence + personalization
// indicator math. PURE, I/O-free.
//
// Quick Start completes 3 of 7 phases. The protocol engine + macros engine
// must treat that as "preliminary" rather than "failed". The personalization
// indicator rises from 0 to 1 as additional phases land, framed as
// unlocking precision (NOT as a failed score per 173c 0.5).
//
// Confidence buckets per 173c 2.4:
//   * 'preliminary': Quick-only result (phases 1, 2, 7 complete). The
//     macros and starting protocol are honest, just less personalized.
//   * 'standard':    at least one symptom phase added on top of Quick.
//   * 'full':        all 7 phases complete (Complete path or full upgrade).
//
// Inputs: the set of completed form-phase ids. Output: the bucket + the
// personalization indicator value (0..1) the UI renders as a positive
// "unlock precision" indicator.
// =============================================================================

import { CAQ_FORM_PHASE_IDS, type CaqFormPhaseId } from '@/config/caq-phase-order';

export type ProtocolConfidence = 'preliminary' | 'standard' | 'full';

export interface PersonalizationIndicator {
  // Fraction in [0, 1]. UI maps this to a progress bar / chip width.
  fraction: number;
  // Number of phases the user has completed.
  completedCount: number;
  // Total form-phase count (currently 7 across both paths).
  totalCount: number;
  // Bucket for the protocol engine + UI copy.
  confidence: ProtocolConfidence;
}

const QUICK_REQUIRED: ReadonlySet<CaqFormPhaseId> = new Set(['1', '3', '4']);

/**
 * Compute the personalization indicator from the set of completed form-
 * phase ids. The fraction always rises monotonically as phases land; the
 * confidence bucket promotes from preliminary to standard the first time
 * a symptom phase joins the Quick trio, and to full when all 7 land.
 */
export function computePersonalization(
  completed: ReadonlySet<string>,
): PersonalizationIndicator {
  let completedCount = 0;
  for (const id of CAQ_FORM_PHASE_IDS) {
    if (completed.has(id)) completedCount += 1;
  }
  const totalCount = CAQ_FORM_PHASE_IDS.length;
  const fraction = totalCount > 0 ? completedCount / totalCount : 0;

  // Quick requires phases 1, 2, 7. Anything less is below the preliminary
  // floor (the protocol engine should not emit a result yet).
  const quickComplete = Array.from(QUICK_REQUIRED).every((id) => completed.has(id));
  if (!quickComplete) {
    return { fraction, completedCount, totalCount, confidence: 'preliminary' };
  }

  // Quick required phases all present. Promote to 'standard' the moment a
  // symptom phase lands; 'full' only when everything is done.
  if (completedCount >= totalCount) {
    return { fraction, completedCount, totalCount, confidence: 'full' };
  }
  if (completedCount > QUICK_REQUIRED.size) {
    return { fraction, completedCount, totalCount, confidence: 'standard' };
  }
  return { fraction, completedCount, totalCount, confidence: 'preliminary' };
}

/**
 * Positive, motivating copy for the indicator surface. NEVER reads as a
 * failed or deficient score (173c 0.5). Locked here so the UI imports
 * one string per bucket.
 */
export function getPersonalizationCopy(confidence: ProtocolConfidence): string {
  switch (confidence) {
    case 'preliminary':
      return 'Your starting protocol is ready. Add the symptom phases to deepen the personalization.';
    case 'standard':
      return 'Your protocol is sharpening. Each additional phase makes it more specific to you.';
    case 'full':
      return 'Full personalization unlocked. Every phase landed and your protocol reflects all of it.';
  }
}
