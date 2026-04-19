// Prompt #92 Phase 2: Helix earning engine.
//
// Credits Helix tokens for an earning event. Applies the user's current
// Helix tier multiplier, routes through the family pool manager, and writes
// an auditable transaction row. Frequency limits are enforced per event type.

import type { UserPricingContext } from '@/types/pricing';
import type { EarningRequest, EarningResult, HelixEarningEventType, HelixTierId } from '@/types/helix';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';
import { buildUserPricingContext } from '@/lib/pricing/user-pricing-context';
import { determineHelixTier } from './tier-progression';
import { routeToCorrectPool } from './family-pool-manager';

// ----- Pure: frequency limit math -------------------------------------------

export type FrequencyLimit = 'unlimited' | 'once_per_day' | 'once_per_week' | 'once_per_month' | 'once_per_lifetime';

/** Pure: given the frequency limit, compute the earliest timestamp an event
 *  of the same type must pre-date for the limit to permit a new credit. */
export function cutoffFor(limit: FrequencyLimit | null | undefined, nowMs: number = Date.now()): Date | null {
  if (!limit || limit === 'unlimited') return null;
  const d = new Date(nowMs);
  switch (limit) {
    case 'once_per_day':      d.setUTCHours(d.getUTCHours() - 24); return d;
    case 'once_per_week':     d.setUTCDate(d.getUTCDate() - 7);   return d;
    case 'once_per_month':    d.setUTCMonth(d.getUTCMonth() - 1); return d;
    case 'once_per_lifetime': d.setUTCFullYear(d.getUTCFullYear() - 100); return d;
  }
}

/** Pure: compute the final earned points after applying the tier multiplier. */
export function applyMultiplier(basePoints: number, multiplier: number): number {
  if (basePoints <= 0 || multiplier <= 0) return 0;
  return Math.round(basePoints * multiplier);
}

// ----- DB-backed wrapper ----------------------------------------------------

async function loadEventType(
  client: PricingSupabaseClient,
  eventTypeId: string,
): Promise<HelixEarningEventType | null> {
  const { data } = await client
    .from('helix_earning_event_types')
    .select('*')
    .eq('id', eventTypeId)
    .eq('is_active', true)
    .maybeSingle();
  return (data as HelixEarningEventType | null) ?? null;
}

async function passesFrequencyLimit(
  client: PricingSupabaseClient,
  userId: string,
  eventTypeId: string,
  limit: FrequencyLimit | null | undefined,
): Promise<boolean> {
  const cutoff = cutoffFor(limit);
  if (!cutoff) return true;
  const { count, error } = await client
    .from('helix_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type_id', eventTypeId)
    .eq('type', 'earning')
    .gte('created_at', cutoff.toISOString());
  if (error) return false;
  return (count ?? 0) === 0;
}

export async function creditEarning(
  client: PricingSupabaseClient,
  request: EarningRequest,
): Promise<EarningResult> {
  // 1. Pricing context (for membership tier gate + family pool detection)
  const pricingContext: UserPricingContext = await buildUserPricingContext(client, request.userId);

  // Free tier has no Helix access
  if (pricingContext.tierLevel === 0) {
    return { success: false, skippedReason: 'Free tier users cannot earn Helix Rewards' };
  }

  // 2. Event type
  const eventType = await loadEventType(client, request.eventTypeId);
  if (!eventType) {
    return { success: false, skippedReason: `Unknown or inactive event type: ${request.eventTypeId}` };
  }

  // 3. Frequency limit
  const freqOk = await passesFrequencyLimit(
    client,
    request.userId,
    request.eventTypeId,
    eventType.frequency_limit as FrequencyLimit | null,
  );
  if (!freqOk) {
    return { success: false, skippedReason: `Frequency limit reached: ${eventType.frequency_limit}` };
  }

  // 4. Base points (customBasePoints overrides for per-$ events)
  const basePoints = request.customBasePoints ?? eventType.base_points;

  // 5. Tier multiplier
  const { tierId: helixTierId, earningMultiplier } = await determineHelixTier(
    client,
    request.userId,
    pricingContext,
  );
  const pointsEarned = applyMultiplier(basePoints, earningMultiplier);
  if (pointsEarned <= 0) {
    return { success: false, skippedReason: 'Computed zero points (tier multiplier 0 or base 0)' };
  }

  // 6. Pool routing
  const routing = await routeToCorrectPool(client, request.userId, pricingContext);

  // 7. Balance increment via atomic RPC
  const { error: rpcErr } = await client.rpc('helix_increment_balance', {
    p_user_id: routing.targetUserId,
    p_points: pointsEarned,
  });
  if (rpcErr) {
    return { success: false, skippedReason: `Balance update failed: ${rpcErr.message}` };
  }

  // 8. Read current balance for transaction audit (balance_after)
  const { data: balanceRow } = await client
    .from('helix_balances')
    .select('current_balance')
    .eq('user_id', routing.targetUserId)
    .maybeSingle();
  const balanceAfter = (balanceRow as { current_balance: number | null } | null)?.current_balance ?? pointsEarned;

  // 9. Audit transaction row
  const sourceUserId = routing.targetUserId !== request.userId ? request.userId : null;
  const { data: txn, error: txnErr } = await client
    .from('helix_transactions')
    .insert({
      user_id: routing.targetUserId,
      type: 'earning',
      amount: pointsEarned,
      source: eventType.id,
      description: `${eventType.display_name}${sourceUserId ? ' (family-credited)' : ''}`,
      balance_after: balanceAfter,
      multiplier_applied: earningMultiplier,
      related_entity_id: request.referenceId ?? null,
      event_type_id: eventType.id,
      metadata: {
        base_points: basePoints,
        ...(request.metadata ?? {}),
      },
      helix_tier_at_time: helixTierId ?? null,
      pool_type: routing.poolType,
      source_user_id: sourceUserId,
    } as never)
    .select('id')
    .single();

  if (txnErr) {
    return { success: false, skippedReason: `Transaction insert failed: ${txnErr.message}` };
  }

  return {
    success: true,
    pointsEarned,
    basePoints,
    multiplierApplied: earningMultiplier,
    creditedToUserId: routing.targetUserId,
    creditedToPool: routing.poolType,
    helixTierAtTime: (helixTierId ?? undefined) as HelixTierId | undefined,
    transactionId: (txn as { id: string } | null)?.id,
  };
}
