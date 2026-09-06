import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClientOrNull } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { createTripoVisual } from './createTripoVisual';
import { buildTripoCreateDeps } from './tripoSupabase';

const SCOPE = 'formavision.tripo.start';

/** Fire-and-forget after retain finalize. Never throws. Never waits on Tripo poll. */
export async function startTripoForReadySession(
  sessionId: string,
  userId: string,
  adminClient?: SupabaseClient | null,
): Promise<void> {
  try {
    const admin = adminClient ?? createAdminClientOrNull();
    if (!admin) return;
    await createTripoVisual(sessionId, userId, buildTripoCreateDeps(admin, userId));
  } catch (error) {
    safeLog.warn(SCOPE, 'ready kickoff failed open', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
