// Prompt #98 Phase 4: Pure milestone detector.
//
// Decision logic only. Given a candidate (a referred practitioner +
// the milestone whose criteria just got met + the current attribution
// status + whether an event already exists), returns whether to
// record a new event. The DB orchestrator picks up the event evidence
// from the source tables (shop_orders, certifications, etc.) and
// passes it through.

import {
  FRAUD_HOLD_DAYS_DEFAULT,
  type AttributionStatus,
  type MilestoneId,
} from './schema-types';

export interface MilestoneCandidate {
  milestone_id: MilestoneId;
  referred_practitioner_id: string;
  attribution_status: AttributionStatus | null;
  existing_event_for_milestone: boolean;
  evidence: Record<string, unknown>;
}

export interface MilestoneDecision {
  should_record: boolean;
  reason?: string;
  evidence: Record<string, unknown>;
}

const PROGRAM_ACTIVE: AttributionStatus[] = ['verified_active', 'pending_verification'];

export function evaluateMilestoneCandidate(input: MilestoneCandidate): MilestoneDecision {
  if (!input.attribution_status) {
    return { should_record: false, reason: 'no attribution', evidence: input.evidence };
  }
  if (!PROGRAM_ACTIVE.includes(input.attribution_status)) {
    return {
      should_record: false,
      reason: `attribution status ${input.attribution_status} is not program-active`,
      evidence: input.evidence,
    };
  }
  if (input.existing_event_for_milestone) {
    return {
      should_record: false,
      reason: 'milestone already recorded for this attribution',
      evidence: input.evidence,
    };
  }
  return { should_record: true, evidence: input.evidence };
}

export function computeHoldExpiry(now: Date, holdDays: number = FRAUD_HOLD_DAYS_DEFAULT): Date {
  const exp = new Date(now);
  exp.setUTCDate(exp.getUTCDate() + holdDays);
  return exp;
}
