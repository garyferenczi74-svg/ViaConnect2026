// DISPLAY source honesty for morning-card contributors.
// pending | named | disagree. Live path stays pending until Brief 12
// honest sync. Named/disagree are typed so the list can render them
// without inventing last-sync timestamps here.

export type MorningSourceStatus = 'pending' | 'named' | 'disagree';

export const MORNING_SOURCE_STATUSES: readonly MorningSourceStatus[] = [
  'pending',
  'named',
  'disagree',
] as const;

export type DisagreementKindForStatus =
  | 'pending'
  | 'single'
  | 'agree'
  | 'manual'
  | 'winner'
  | 'equal_trust_average';

/**
 * Map Brief 4 disagreement kinds onto the Brief 1 triad.
 * pending stays pending. Winner / equal-trust average are disagree.
 * A single named source, agreement, or manual is named.
 */
export function sourceStatusFromDisagreement(
  kind: DisagreementKindForStatus,
): MorningSourceStatus {
  if (kind === 'pending') return 'pending';
  if (kind === 'winner' || kind === 'equal_trust_average') return 'disagree';
  return 'named';
}

export function classifySourceStatus(args: {
  hasNamedSource: boolean;
  devicesDisagree: boolean;
}): MorningSourceStatus {
  if (!args.hasNamedSource) return 'pending';
  if (args.devicesDisagree) return 'disagree';
  return 'named';
}

/** Brief 12 owns last-sync. Brief 1 never treats a timestamp as named. */
export function sourceStatusUntilBrief12(): MorningSourceStatus {
  return 'pending';
}
