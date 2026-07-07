/**
 * live-shape.test.ts (Prompt 210d, Task P0-5)
 *
 * Asserts the exact insert payload keys of two silently-failing writers match
 * the LIVE columns (docs/integrity/snapshot/live-types.ts, 2026-07-06):
 *
 * - helix_transactions awards (dashboard adherence check-off plus the
 *   full-day bonus in src/hooks/useTodaysAdherence.ts) must use the live
 *   column key `type` with its value unchanged ('earn'). The pre-210d key
 *   `transaction_type` does not exist on the live table, so every award
 *   insert was rejected with PGRST204 and swallowed by fail-open.
 * - reward_redemptions rows (redeemTokens in
 *   src/lib/gamification/token-engine.ts) must use the live column keys
 *   `reward_id` and `claimed_at`. The pre-210d keys `item_id` and
 *   `created_at` do not exist on the live table.
 *
 * Only key names change; every value passes through unchanged.
 * Node-safe (no jsdom). No em dashes, no en dashes, no emojis.
 */

import { describe, expect, it } from 'vitest';

import { buildHelixAwardPayload } from '@/hooks/useTodaysAdherence';
import { buildRewardRedemptionPayload } from '@/lib/gamification/token-engine';

describe('buildHelixAwardPayload (helix_transactions live shape)', () => {
  const perCheck = buildHelixAwardPayload({
    userId: 'user-1',
    amount: 5,
    source: 'protocol_adherence',
    description: 'Checked off mthfr-plus',
  });

  it('uses the live column key type with the value unchanged (earn)', () => {
    expect(perCheck.type).toBe('earn');
  });

  it('does not send the phantom transaction_type key', () => {
    expect(Object.keys(perCheck)).not.toContain('transaction_type');
  });

  it('sends exactly the live key set with all values unchanged (per-check award)', () => {
    expect(perCheck).toEqual({
      user_id: 'user-1',
      amount: 5,
      type: 'earn',
      source: 'protocol_adherence',
      description: 'Checked off mthfr-plus',
    });
  });

  it('sends exactly the live key set with all values unchanged (full-day bonus)', () => {
    const bonus = buildHelixAwardPayload({
      userId: 'user-1',
      amount: 15,
      source: 'protocol_adherence_full_day',
      description: '100% daily protocol adherence bonus',
    });
    expect(bonus).toEqual({
      user_id: 'user-1',
      amount: 15,
      type: 'earn',
      source: 'protocol_adherence_full_day',
      description: '100% daily protocol adherence bonus',
    });
  });
});

describe('buildRewardRedemptionPayload (reward_redemptions live shape)', () => {
  const payload = buildRewardRedemptionPayload({
    userId: 'user-1',
    rewardId: 'reward-9',
    tokensSpent: 250,
  });

  it('uses the live column key reward_id (not item_id) with the value unchanged', () => {
    expect(payload.reward_id).toBe('reward-9');
    expect(Object.keys(payload)).not.toContain('item_id');
  });

  it('uses the live column key claimed_at (not created_at) with an ISO timestamp value', () => {
    expect(Object.keys(payload)).not.toContain('created_at');
    expect(new Date(payload.claimed_at).toISOString()).toBe(payload.claimed_at);
  });

  it('sends exactly the live key set with the remaining values unchanged', () => {
    expect(Object.keys(payload).sort()).toEqual([
      'claimed_at',
      'reward_id',
      'status',
      'tokens_spent',
      'user_id',
    ]);
    expect(payload.user_id).toBe('user-1');
    expect(payload.tokens_spent).toBe(250);
    expect(payload.status).toBe('pending');
  });
});
