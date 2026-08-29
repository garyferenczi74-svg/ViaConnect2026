import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const SCOPE = 'scan.readHeightCm';
const TIMEOUT_MS = 4000;

/**
 * Prompt 231 (condition 25): height_cm lives on clinical_assessments, NOT
 * profiles (profiles.height_cm does not exist). Returns null (UNKNOWN) on
 * any missing row, non-positive value, or read failure; never fabricates a
 * height. Fail-open: a read error never blocks the capture route.
 */
export async function readHeightCm(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number | null> {
  try {
    const result = await withTimeout(
      Promise.resolve(
        supabase
          .from('clinical_assessments')
          .select('height_cm')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      TIMEOUT_MS,
      SCOPE,
    );
    if (result.error) {
      safeLog.warn(SCOPE, 'clinical_assessments query error (fail-open)', {
        message: result.error.message,
      });
      return null;
    }
    const heightCm = result.data?.height_cm ?? null;
    return typeof heightCm === 'number' && heightCm > 0 ? heightCm : null;
  } catch (error) {
    safeLog.warn(SCOPE, 'clinical_assessments fetch failed (fail-open)', { error });
    return null;
  }
}
