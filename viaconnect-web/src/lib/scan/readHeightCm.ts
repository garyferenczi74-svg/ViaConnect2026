import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { safeLog } from '@/lib/utils/safe-log';
import {
  resolveHeightCm,
  type HeightCmSource,
  type ResolvedHeightCm,
} from '@/lib/scan/clinicalBodyMetrics';

const SCOPE = 'scan.readHeightCm';

export type { HeightCmSource, ResolvedHeightCm };

/**
 * Ordered geometric height read. Never fabricates a height (no 170 default).
 * 1. clinical_assessments.height_cm
 * 2. body_goals.height_in (inches → cm)
 * 3. assessment_results phase=1 demographics.height
 * Missing / non-positive / read failure → null (UNKNOWN).
 */
export async function readResolvedHeightCm(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ResolvedHeightCm> {
  try {
    return await resolveHeightCm(supabase, userId);
  } catch (error) {
    safeLog.warn(SCOPE, 'height resolve failed (fail-open)', { error });
    return { heightCm: null, source: null };
  }
}

export async function readHeightCm(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number | null> {
  const resolved = await readResolvedHeightCm(supabase, userId);
  return resolved.heightCm;
}
