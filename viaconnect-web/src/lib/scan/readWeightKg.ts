import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { safeLog } from '@/lib/utils/safe-log';
import {
  resolveWeightKg,
  type ResolvedWeightKg,
  type WeightKgSource,
} from '@/lib/scan/clinicalBodyMetrics';

const SCOPE = 'scan.readWeightKg';

export type { ResolvedWeightKg, WeightKgSource };

/**
 * Ordered Total Weight read. Never fabricates a weight.
 * 1. assessment_results phase=1 demographics.weight (kg; parseCaqWeightKg)
 * 2. clinical_assessments.weight_kg
 * Missing / non-positive / read failure → null (UNKNOWN).
 */
export async function readResolvedWeightKg(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ResolvedWeightKg> {
  try {
    return await resolveWeightKg(supabase, userId);
  } catch (error) {
    safeLog.warn(SCOPE, 'weight resolve failed (fail-open)', { error });
    return { weightKg: null, source: null };
  }
}

export async function readWeightKg(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number | null> {
  const resolved = await readResolvedWeightKg(supabase, userId);
  return resolved.weightKg;
}
