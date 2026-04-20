// Prompt #100 MAP Enforcement — grace-period policy.
//
// Mirrors the DB map_grace_hours(severity) function. Values per
// Prompt #100 §4.3:
//   Yellow  7 days (168 hours) monitoring window
//   Orange  72 hours to remediate
//   Red     48 hours
//   Black   24 hours
//
// Fair-enforcement guardrail §3.4: commission claw-back (#98) must
// not fire before these hours elapse. The escalation edge function
// reads violation.grace_period_ends_at before emitting the event.

import type { MAPSeverity } from './types';

export const GRACE_HOURS: Record<MAPSeverity, number> = {
  yellow: 168,
  orange: 72,
  red: 48,
  black: 24,
};

/** Pure: return the grace-period hours for a given severity. */
export function graceHoursFor(severity: MAPSeverity): number {
  return GRACE_HOURS[severity];
}

/** Pure: returns true if the grace period has not yet expired. */
export function isWithinGracePeriod(gracePeriodEndsAt: string, now: Date = new Date()): boolean {
  return new Date(gracePeriodEndsAt).getTime() > now.getTime();
}

/** Pure: hours remaining in the grace period, rounded down. Negative
 *  values indicate the period has already passed. */
export function hoursRemainingInGrace(
  gracePeriodEndsAt: string,
  now: Date = new Date(),
): number {
  const diffMs = new Date(gracePeriodEndsAt).getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/** Pure: compute the grace-period deadline for a new violation. */
export function computeGraceDeadline(
  severity: MAPSeverity,
  from: Date = new Date(),
): Date {
  return new Date(from.getTime() + GRACE_HOURS[severity] * 60 * 60 * 1000);
}
