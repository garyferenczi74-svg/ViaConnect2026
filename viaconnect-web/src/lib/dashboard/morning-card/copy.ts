// Verbatim morning-card copy. Bio Optimization Score only. Never Vitality.
// Helix rewards stay off this card.

export const MORNING_CARD_SCORE_LABEL = 'Bio Optimization Score';

export const MORNING_CARD_ARIA_LABEL = 'Bio Optimization Score';

export const MORNING_CARD_PENDING_SCORE = '--';

export const MORNING_CTA_EMPTY = 'Complete your assessment';

export const MORNING_CTA_COMPLETE = "Today's protocol is complete";

export const MORNING_CTA_LOADING = 'Loading today protocol';

export const MORNING_CTA_UNAVAILABLE = 'Protocol unavailable';

export const MORNING_CONTRIBUTOR_PENDING_NOTE =
  'Sources pending until wearable sync is confirmed.';

export const MORNING_CONTRIBUTOR_PENDING_VALUE = 'Pending';

export const MORNING_CONTRIBUTOR_DISAGREE = 'DISAGREE';

export function morningCtaTakeLabel(name: string): string {
  return `Take ${name}`;
}

export function morningScoreAria(score: number | null): string {
  if (score === null) return 'Bio Optimization Score not yet computed';
  return `Bio Optimization Score ${score}`;
}
