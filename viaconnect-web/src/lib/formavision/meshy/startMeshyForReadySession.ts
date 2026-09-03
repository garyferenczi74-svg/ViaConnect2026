import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClientOrNull } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { createMeshyVisual } from './createMeshyVisual';
import { buildCreateDeps } from './meshySupabase';

const SCOPE = 'formavision.meshy.start';

/** Fire-and-forget after a Ready finalize. Never throws. Never waits on Meshy poll. */
export async function startMeshyForReadySession(
  sessionId: string,
  userId: string,
  adminClient?: SupabaseClient | null,
): Promise<void> {
  try {
    const admin = adminClient ?? createAdminClientOrNull();
    if (!admin) return;
    await createMeshyVisual(sessionId, userId, buildCreateDeps(admin, userId));
  } catch (error) {
    safeLog.warn(SCOPE, 'ready kickoff failed open', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
