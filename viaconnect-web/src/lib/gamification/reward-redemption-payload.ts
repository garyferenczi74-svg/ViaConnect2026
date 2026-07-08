/**
 * reward_redemptions live-shape contract (Prompt 210d, P0-5 / P0-8b)
 *
 * Pure payload builder for the LIVE reward_redemptions table
 * (docs/integrity/snapshot/live-types.ts:24440: reward_id, claimed_at,
 * tokens_spent, status, user_id). The pre-210d keys item_id and created_at
 * do not exist on the live table; P0-5 fixed the key pair and extracted this
 * builder so src/lib/gamification/__tests__/live-shape.test.ts can pin the
 * exact key set.
 *
 * P0-8b (Gary's signed Option B, docs/integrity/p0-viatokens-decision.md)
 * retired the only writer, redeemTokens in the deleted
 * src/lib/gamification/token-engine.ts, along with the rest of the dead
 * ViaTokens lane. The table itself EXISTS live and serves the rewards
 * system, so this module is kept as the documented contract: any future
 * writer of reward_redemptions must build its insert payload here (or match
 * this shape) and stays covered by the live-shape test.
 *
 * No Supabase client, no side effects: pure data shaping only.
 */

// Prompt 210d P0-5: redemption insert payload, extracted into a pure builder
// so the live-shape test (src/lib/gamification/__tests__/live-shape.test.ts)
// can assert the keys match the live reward_redemptions columns (reward_id
// and claimed_at; the pre-210d keys item_id and created_at do not exist on
// the live table, so the insert was silently rejected).
export interface RewardRedemptionPayload {
  user_id: string;
  reward_id: string;
  tokens_spent: number;
  status: 'pending';
  claimed_at: string;
}

export function buildRewardRedemptionPayload(input: {
  userId: string;
  rewardId: string;
  tokensSpent: number;
}): RewardRedemptionPayload {
  return {
    user_id: input.userId,
    reward_id: input.rewardId,
    tokens_spent: input.tokensSpent,
    status: 'pending',
    claimed_at: new Date().toISOString(),
  };
}
