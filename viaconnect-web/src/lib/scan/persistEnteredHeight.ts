import { createClient } from '@/lib/supabase/client';
import {
  persistEnteredHeightCm,
  type ClinicalUpsertResult,
} from '@/lib/scan/clinicalBodyMetrics';

/** Client-only: persist a user-entered height into clinical_assessments. Never invents. */
export async function persistEnteredHeightForCurrentUser(
  heightCm: unknown,
): Promise<ClinicalUpsertResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, wrote: { heightCm: null, weightKg: null } };
  }
  return persistEnteredHeightCm(supabase, user.id, heightCm);
}
