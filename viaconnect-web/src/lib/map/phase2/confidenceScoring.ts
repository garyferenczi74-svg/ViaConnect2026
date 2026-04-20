// Prompt #101 Workstream A — Phase 2 confidence gates.

export const PHASE_2_OBSERVER_CONFIDENCE_MIN = 85;
export const PHASE_2_PRACTITIONER_CONFIDENCE_MIN = 90;

export interface Phase2GateInput {
  observerConfidence: number;
  practitionerConfidence: number | null;
  severity: 'yellow' | 'orange' | 'red' | 'black' | null;
}

export type Phase2GateOutcome =
  | 'auto_escalate'
  | 'investigation_queue'
  | 'human_review_required'
  | 'skip';

/** Pure: per Prompt #101 §3.4, Phase 2 observations have three
 *  gates before a practitioner gets notified:
 *    1. Observer confidence >= 85
 *    2. Practitioner attribution confidence >= 90
 *    3. Red / Black severity requires human admin review before notify
 *
 *  Failing (1) or (2) → observation enters the investigation queue
 *  instead of creating an auto-violation.
 *  Failing (3) → violation created but status is 'investigating' until
 *  admin approval. */
export function classifyPhase2Observation(input: Phase2GateInput): Phase2GateOutcome {
  if (!input.severity) return 'skip';
  if (input.observerConfidence < PHASE_2_OBSERVER_CONFIDENCE_MIN) return 'investigation_queue';
  if ((input.practitionerConfidence ?? 0) < PHASE_2_PRACTITIONER_CONFIDENCE_MIN) {
    return 'investigation_queue';
  }
  if (input.severity === 'red' || input.severity === 'black') return 'human_review_required';
  return 'auto_escalate';
}

/** Pure: a third-party authored message (non-practitioner account)
 *  should never create a violation against the practitioner. */
export function isThirdPartyAuthored(
  messageAuthorId: string | null,
  practitionerVerifiedAccountIds: readonly string[],
): boolean {
  if (!messageAuthorId) return true;
  return !practitionerVerifiedAccountIds.includes(messageAuthorId);
}

/** Pure: stale marketplace listing heuristic. Facebook Marketplace
 *  listings older than 30 days are likely abandoned — lower severity. */
export function isStaleMarketplaceListing(listingAgeDays: number): boolean {
  return listingAgeDays > 30;
}
