import { createClient } from '@/lib/supabase/client';
import { HEIGHT_PERSIST_FAIL_COPY } from '@/lib/body-tracker/composition/circWriteContract';
import {
  persistEnteredHeightCm,
  type ClinicalUpsertResult,
} from '@/lib/scan/clinicalBodyMetrics';

export { HEIGHT_PERSIST_FAIL_COPY };

const EMPTY_WRITE: ClinicalUpsertResult = { ok: false, wrote: { heightCm: null, weightKg: null } };

/** Client-only: persist a user-entered height into clinical_assessments. Never invents. */
export async function persistEnteredHeightForCurrentUser(
  heightCm: unknown,
): Promise<ClinicalUpsertResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_WRITE;
  return persistEnteredHeightCm(supabase, user.id, heightCm);
}

/**
 * Fail-open persist. Soft notice on failure; caller still remasures.
 * Never invents a height.
 */
export async function persistEnteredHeightForCurrentUserFailOpen(
  heightCm: unknown,
  onPersistFail?: (copy: string) => void,
): Promise<ClinicalUpsertResult> {
  try {
    const result = await persistEnteredHeightForCurrentUser(heightCm);
    if (!result.ok) onPersistFail?.(HEIGHT_PERSIST_FAIL_COPY);
    return result;
  } catch {
    onPersistFail?.(HEIGHT_PERSIST_FAIL_COPY);
    return EMPTY_WRITE;
  }
}
