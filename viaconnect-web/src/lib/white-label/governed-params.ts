// Prompt #96 Phase 7: Loader for governance-controlled white-label params.
//
// Reads the singleton white_label_parameters row + the active discount
// tiers from white_label_discount_tiers and returns the shape the pure
// calculator expects. Falls back to spec defaults if either source row
// is missing (so the route still works pre-Phase 7 deployment or in a
// fresh test environment).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_PARAMETERS,
  DEFAULT_DISCOUNT_TIERS,
  type WhiteLabelParameters,
  type DiscountTierRule,
} from './production-quote';

export interface GovernedParametersResult {
  params: WhiteLabelParameters;
  tiers: DiscountTierRule[];
  source: 'governed' | 'default' | 'partial';
}

export async function loadGovernedWhiteLabelParameters(
  supabase: SupabaseClient | unknown,
): Promise<GovernedParametersResult> {
  const sb = supabase as any;

  const [paramsRes, tiersRes] = await Promise.all([
    sb.from('white_label_parameters').select('*').eq('id', 'default').maybeSingle(),
    sb.from('white_label_discount_tiers').select('*').eq('is_active', true).order('min_units', { ascending: true }),
  ]);

  const paramsRow = paramsRes.data as null | {
    minimum_order_value_cents: number;
    expedited_surcharge_percent: number;
  };
  const tierRows = (tiersRes.data ?? []) as Array<{
    id: string; min_units: number; max_units: number | null; discount_percent: number;
  }>;

  const params: WhiteLabelParameters = paramsRow
    ? {
        minimum_order_value_cents: paramsRow.minimum_order_value_cents,
        expedited_surcharge_percent: paramsRow.expedited_surcharge_percent,
      }
    : DEFAULT_PARAMETERS;

  const tiers: DiscountTierRule[] = tierRows.length > 0
    ? tierRows.map((t) => ({
        tier_id: t.id, min_units: t.min_units, max_units: t.max_units, discount_percent: t.discount_percent,
      }))
    : DEFAULT_DISCOUNT_TIERS;

  const source: GovernedParametersResult['source'] =
    paramsRow && tierRows.length > 0 ? 'governed' :
    !paramsRow && tierRows.length === 0 ? 'default' : 'partial';

  return { params, tiers, source };
}
