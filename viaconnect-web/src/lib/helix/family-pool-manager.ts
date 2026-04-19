// Prompt #92 Phase 2: Family pool manager.
//
// For Platinum+ Family accounts, determines whether a given user's earning
// event should credit to the individual user or be routed to the primary
// account holder's shared pool. Pool type defaults to 'shared' and can be
// toggled by the primary; existing balances do not redistribute when toggled.

import type { UserPricingContext } from '@/types/pricing';
import type { PoolRouting, PoolType } from '@/types/helix';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

export type PoolTypeSetting = 'shared' | 'individual';

export interface PoolContext {
  userId: string;
  isFamilyTier: boolean;
  isPrimary: boolean;
  primaryUserId: string | null;
  configuredPoolType: PoolTypeSetting;
}

/** Pure: given the resolved pool context, decide where earnings credit. */
export function resolveRouting(ctx: PoolContext): PoolRouting {
  if (!ctx.isFamilyTier) {
    return { targetUserId: ctx.userId, poolType: 'individual', primaryUserId: null };
  }
  const primary = ctx.primaryUserId ?? ctx.userId;
  if (ctx.configuredPoolType === 'shared') {
    return { targetUserId: primary, poolType: 'shared_family', primaryUserId: primary };
  }
  return { targetUserId: ctx.userId, poolType: 'individual', primaryUserId: primary };
}

/** DB-backed: look up family membership + pool config and route accordingly. */
export async function routeToCorrectPool(
  client: PricingSupabaseClient,
  userId: string,
  pricingContext: Pick<UserPricingContext, 'tierLevel'>,
): Promise<PoolRouting> {
  if (pricingContext.tierLevel !== 3) {
    return resolveRouting({ userId, isFamilyTier: false, isPrimary: true, primaryUserId: null, configuredPoolType: 'shared' });
  }

  // Is this user a family member (not primary)?
  const { data: membership } = await client
    .from('family_members')
    .select('primary_user_id')
    .eq('member_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  const primaryUserId = ((membership as { primary_user_id: string | null } | null)?.primary_user_id) ?? userId;
  const isPrimary = primaryUserId === userId;

  const { data: config } = await client
    .from('helix_family_pool_config')
    .select('pool_type')
    .eq('primary_user_id', primaryUserId)
    .maybeSingle();
  const configured = ((config as { pool_type: PoolTypeSetting | null } | null)?.pool_type) ?? 'shared';

  return resolveRouting({
    userId,
    isFamilyTier: true,
    isPrimary,
    primaryUserId,
    configuredPoolType: configured,
  });
}

export async function initializeFamilyPoolConfig(
  client: PricingSupabaseClient,
  primaryUserId: string,
): Promise<void> {
  await client
    .from('helix_family_pool_config')
    .upsert(
      {
        primary_user_id: primaryUserId,
        pool_type: 'shared',
        configured_at: new Date().toISOString(),
        last_changed_at: new Date().toISOString(),
      } as never,
      { onConflict: 'primary_user_id' },
    );
}

export async function switchFamilyPoolType(
  client: PricingSupabaseClient,
  primaryUserId: string,
  newPoolType: PoolTypeSetting,
): Promise<void> {
  const { error } = await client
    .from('helix_family_pool_config')
    .update({
      pool_type: newPoolType,
      last_changed_at: new Date().toISOString(),
    } as never)
    .eq('primary_user_id', primaryUserId);
  if (error) throw new Error(`Failed to switch family pool type: ${error.message}`);
  // Note: existing balances are not redistributed. Only future earnings follow the new routing.
}

export function isSharedPool(pt: PoolType): boolean {
  return pt === 'shared_family';
}
