// Verbatim morning-card copy. Bio Optimization Score only. Never Vitality.
// Rewards gamification stays off this card.

export const MORNING_CARD_SCORE_LABEL = 'Bio Optimization Score';

export const MORNING_CARD_ARIA_LABEL = 'Bio Optimization Score';

export const MORNING_CARD_PENDING_SCORE = '--';

export const MORNING_CTA_EMPTY = 'No protocol item due today.';

export const MORNING_CTA_EMPTY_LINK = 'My Supplements';

/** Folded into empty (Brief 48). Kept so existing imports stay stable. */
export const MORNING_CTA_COMPLETE = MORNING_CTA_EMPTY;

export const MORNING_CTA_LOADING = 'Loading today protocol';

export const MORNING_CTA_ERROR = "Couldn't load today's protocol.";

export const MORNING_CTA_RETRY = 'Retry';

/** Brief 48 error copy. Alias for older imports. */
export const MORNING_CTA_UNAVAILABLE = MORNING_CTA_ERROR;

export const MORNING_CONTRIBUTOR_PENDING_NOTE =
  'Sources pending until wearable sync is confirmed.';

export const MORNING_CONTRIBUTOR_PENDING_VALUE = 'UNKNOWN';

export const MORNING_CONNECT_YOUR_DEVICE = 'Connect your device';

export { CONNECTIONS_PATH as MORNING_CONNECTIONS_HREF } from '@/lib/body-tracker/wearable-tiles';

export const MORNING_CONTRIBUTOR_DISAGREE = 'DISAGREE';

export function morningCtaTakeLabel(name: string): string {
  return `Take ${name}`;
}

export function morningScoreAria(score: number | null): string {
  if (score === null) return 'Bio Optimization Score not yet computed';
  return `Bio Optimization Score ${score}`;
}
