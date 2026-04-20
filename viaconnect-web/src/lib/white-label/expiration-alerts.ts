// Prompt #96 Phase 6: Expiration classifier.
//
// Pure function. Maps a lot's expiration date + a clock to a status the
// inventory dashboard renders and the daily Edge Function notifies on.

export const EXPIRATION_THRESHOLDS_DAYS = {
  approaching: 180,
  warning: 90,
  urgent: 30,
} as const;

export type ExpirationStatus = 'ok' | 'approaching' | 'warning' | 'urgent' | 'expired';

export interface ExpirationInput {
  expiration_date: string;   // YYYY-MM-DD
  now: Date;
}

export interface ExpirationResult {
  status: ExpirationStatus;
  days_until_expiration: number;
}

export function classifyExpiration(input: ExpirationInput): ExpirationResult {
  const exp = new Date(`${input.expiration_date}T00:00:00.000Z`).getTime();
  const today = Date.UTC(
    input.now.getUTCFullYear(),
    input.now.getUTCMonth(),
    input.now.getUTCDate(),
  );
  const diffDays = Math.floor((exp - today) / 86_400_000);

  let status: ExpirationStatus;
  if (diffDays < 0) status = 'expired';
  else if (diffDays <= EXPIRATION_THRESHOLDS_DAYS.urgent) status = 'urgent';
  else if (diffDays <= EXPIRATION_THRESHOLDS_DAYS.warning) status = 'warning';
  else if (diffDays <= EXPIRATION_THRESHOLDS_DAYS.approaching) status = 'approaching';
  else status = 'ok';

  return { status, days_until_expiration: diffDays };
}
