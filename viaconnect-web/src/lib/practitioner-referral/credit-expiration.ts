// Prompt #98 Phase 5: Credit expiration + warning classifier.
//
// Pure. matchFifoExpiration walks a practitioner's ledger (one
// practitioner at a time) and returns the set of expired amounts to
// write as new negative ledger entries of entry_type='expired'. The
// matching is FIFO: earliest earned entries are consumed first by
// subsequent applications, voids, and prior expirations. Only the
// residual unused portion of entries older than the 24-month window
// is expired.
//
// classifyExpirationWarningWindow maps an earned entry's age to one
// of the four notification windows (90 / 60 / 30 / 7 days before
// expiration). The Edge Function dispatches the right template.

import { CREDIT_EXPIRATION_MONTHS_DEFAULT } from './schema-types';

export const EXPIRATION_WARNING_DAYS = [90, 60, 30, 7] as const;

export interface LedgerEntry {
  id: string;
  practitioner_id: string;
  entry_type:
    | 'earned_from_milestone'
    | 'applied_to_subscription'
    | 'applied_to_wholesale_order'
    | 'applied_to_certification_fee'
    | 'applied_to_level_3_fee'
    | 'applied_to_level_4_fee'
    | 'expired'
    | 'voided_fraud'
    | 'voided_admin'
    | 'admin_adjustment';
  amount_cents: number;                  // signed per Phase 1
  created_at: string;                    // ISO timestamp
  milestone_event_id?: string | null;    // only set on earned + voided_*
}

export interface ExpirationInstruction {
  source_entry_id: string;
  amount_cents: number;     // positive; caller will negate when writing the ledger row
}

/**
 * Walk a practitioner's ledger in chronological order. For each
 * earned entry whose age exceeds `expirationMonths`, compute the
 * unused portion by FIFO-consuming later negative-signed entries
 * (applications, voids, and prior expirations).
 *
 * Returns one ExpirationInstruction per earned entry with a positive
 * residual. An empty array means no new expirations to write.
 */
export function matchFifoExpiration(
  ledger: LedgerEntry[],
  now: Date,
  expirationMonths: number = CREDIT_EXPIRATION_MONTHS_DEFAULT,
): ExpirationInstruction[] {
  const sorted = [...ledger].sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Build a stack of earned entries with remaining-unused amounts.
  interface RemainingBucket { id: string; earned_at: string; remaining_cents: number }
  const buckets: RemainingBucket[] = [];

  for (const e of sorted) {
    if (e.entry_type === 'earned_from_milestone' && e.amount_cents > 0) {
      buckets.push({ id: e.id, earned_at: e.created_at, remaining_cents: e.amount_cents });
      continue;
    }
    // Negative-signed consuming entries: applications, voids, or prior expirations.
    if (e.amount_cents < 0) {
      let toConsume = Math.abs(e.amount_cents);
      // FIFO from the oldest bucket with remaining balance.
      for (const b of buckets) {
        if (toConsume <= 0) break;
        if (b.remaining_cents <= 0) continue;
        const take = Math.min(b.remaining_cents, toConsume);
        b.remaining_cents -= take;
        toConsume -= take;
      }
      continue;
    }
    // Positive admin_adjustment: treat as its own bucket. This lets
    // an admin top-up of goodwill credit live on its own 24-month
    // clock rather than extending an existing earn. If the spec later
    // wants a different policy we revisit here.
    if (e.entry_type === 'admin_adjustment' && e.amount_cents > 0) {
      buckets.push({ id: e.id, earned_at: e.created_at, remaining_cents: e.amount_cents });
    }
  }

  // Any bucket whose earned_at is older than the expiration window
  // AND still has a positive remaining amount gets expired.
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - expirationMonths);

  const out: ExpirationInstruction[] = [];
  for (const b of buckets) {
    if (b.remaining_cents <= 0) continue;
    if (new Date(b.earned_at).getTime() > cutoff.getTime()) continue;
    out.push({ source_entry_id: b.id, amount_cents: b.remaining_cents });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Warning window classifier
// ---------------------------------------------------------------------------

export interface ClassifyWarningInput {
  earned_at: string;
  now: Date;
  expirationMonths?: number;
}

/**
 * Returns the warning window (90 / 60 / 30 / 7) the entry is
 * currently inside, or null when it is either too far from
 * expiration to warn OR already expired.
 */
export function classifyExpirationWarningWindow(input: ClassifyWarningInput): number | null {
  const months = input.expirationMonths ?? CREDIT_EXPIRATION_MONTHS_DEFAULT;
  const earnedMs = new Date(input.earned_at).getTime();
  // Approximate: 30 days per month for the notification trigger. The
  // actual expiration use setUTCMonth which varies, but the warning
  // windows are advisory and do not need day-level precision.
  const expiresAtMs = earnedMs + months * 30 * 86_400_000;
  const daysUntilExpiry = Math.floor((expiresAtMs - input.now.getTime()) / 86_400_000);

  if (daysUntilExpiry < 0) return null;                 // already expired
  if (daysUntilExpiry > EXPIRATION_WARNING_DAYS[0]) return null;

  // Return the tightest window whose threshold >= daysUntilExpiry.
  // So at daysUntilExpiry=3 we return 7 (the closest threshold still
  // covering); at daysUntilExpiry=80 we return 90.
  for (const window of EXPIRATION_WARNING_DAYS) {
    if (daysUntilExpiry <= window) {
      // Prefer the tightest window it fits inside; keep scanning to
      // find a smaller one when daysUntilExpiry is very small.
      let best = window;
      for (const w of EXPIRATION_WARNING_DAYS) {
        if (daysUntilExpiry <= w && w < best) best = w;
      }
      return best;
    }
  }
  return null;
}
