// Prompt #92 Phase 3: Helix redemption engine.
//
// Pure validation helpers + DB-backed redeem() that calls the atomic
// helix_redeem_catalog_item RPC. The RPC is the source of truth for
// stock, balance, and per-user-limit enforcement; these TypeScript
// helpers mirror the logic for pre-submit validation in UI.

import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';
import type { Database } from '@/lib/supabase/types';

export type HelixRedemptionCatalogRow = Database['public']['Tables']['helix_redemption_catalog']['Row'];

export interface RedeemRequest {
  userId: string;
  catalogItemId: string;
  applicationContext?: Record<string, unknown>;
}

export interface RedeemResult {
  success: boolean;
  redemptionId?: string;
  pointsSpent?: number;
  redemptionType?: string;
  discountPercent?: number | null;
  creditDollarsCents?: number | null;
  error?: string;
}

// ----- Pure validators ------------------------------------------------------

export interface ValidationContext {
  item: HelixRedemptionCatalogRow;
  userBalanceAvailable: number;
  userRedemptionCountForItem: number;
  nowMs?: number;
}

export function validateRedemption(ctx: ValidationContext): { ok: true } | { ok: false; reason: string } {
  const { item, userBalanceAvailable, userRedemptionCountForItem } = ctx;
  const now = ctx.nowMs ?? Date.now();

  if (!item.is_active) return { ok: false, reason: 'Redemption item not available' };
  if (item.valid_from && new Date(item.valid_from).getTime() > now) {
    return { ok: false, reason: 'Redemption not yet available' };
  }
  if (item.valid_until && new Date(item.valid_until).getTime() < now) {
    return { ok: false, reason: 'Redemption expired' };
  }
  if (item.stock_limit !== null && (item.stock_remaining ?? 0) <= 0) {
    return { ok: false, reason: 'Out of stock' };
  }
  if (item.redemption_limit_per_user !== null && userRedemptionCountForItem >= (item.redemption_limit_per_user ?? 0)) {
    return { ok: false, reason: 'Redemption limit reached for this item' };
  }
  if (userBalanceAvailable < item.points_cost) {
    return { ok: false, reason: 'Insufficient Helix balance' };
  }
  if (item.redemption_type === 'supplement_discount' && (item.discount_percent ?? 0) > 15) {
    return { ok: false, reason: 'Supplement discount redemption exceeds 15 percent cap' };
  }
  return { ok: true };
}

// ----- DB-backed --------------------------------------------------------------

export async function loadCatalog(client: PricingSupabaseClient): Promise<HelixRedemptionCatalogRow[]> {
  const { data, error } = await client
    .from('helix_redemption_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(`Failed to load catalog: ${error.message}`);
  return (data ?? []) as HelixRedemptionCatalogRow[];
}

export async function getCatalogItem(
  client: PricingSupabaseClient,
  id: string,
): Promise<HelixRedemptionCatalogRow | null> {
  const { data } = await client
    .from('helix_redemption_catalog')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  return (data as HelixRedemptionCatalogRow | null) ?? null;
}

export async function redeemCatalogItem(
  client: PricingSupabaseClient,
  request: RedeemRequest,
): Promise<RedeemResult> {
  const { data: redemptionId, error } = await client.rpc('helix_redeem_catalog_item', {
    p_user_id: request.userId,
    p_catalog_item_id: request.catalogItemId,
    p_application_context: (request.applicationContext ?? {}) as never,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  // Fetch the item details for the success response
  const item = await getCatalogItem(client, request.catalogItemId);
  return {
    success: true,
    redemptionId: redemptionId as unknown as string,
    pointsSpent: item?.points_cost,
    redemptionType: item?.redemption_type,
    discountPercent: item?.discount_percent ?? null,
    creditDollarsCents: item?.credit_dollars_cents ?? null,
  };
}
