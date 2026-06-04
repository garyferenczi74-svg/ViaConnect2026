// =============================================================================
// Prompt 173c Phase D (2026-06-04): CAQ path accessor.
//
// One read path AND one write path for public.caq_paths. The choice screen
// writes here; the protocol engine + the navigation layer read here. The
// table has its own owner-only RLS so the calls run as the signed-in user.
//
// Quick to Complete upgrade: writeCaqPath('complete') automatically sets
// upgraded_to_complete_at when the prior row was a quick pick. This keeps
// the re-engagement loop honest without requiring callers to remember to
// stamp the timestamp.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CaqPath } from '@/config/caq-phase-order';

export interface CaqPathRecord {
  userId: string;
  path: CaqPath;
  pickedAt: string;
  upgradedToCompleteAt: string | null;
}

interface CaqPathRow {
  user_id: string;
  path: CaqPath;
  picked_at: string;
  upgraded_to_complete_at: string | null;
}

function rowToRecord(row: CaqPathRow): CaqPathRecord {
  return {
    userId: row.user_id,
    path: row.path,
    pickedAt: row.picked_at,
    upgradedToCompleteAt: row.upgraded_to_complete_at,
  };
}

export async function readCaqPath(
  userId: string,
  supabase: SupabaseClient,
): Promise<CaqPathRecord | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('caq_paths')
    .select('user_id, path, picked_at, upgraded_to_complete_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`readCaqPath failed: ${error.message}`);
  if (!data) return null;
  return rowToRecord(data as CaqPathRow);
}

export interface WriteCaqPathInput {
  userId: string;
  path: CaqPath;
}

/**
 * Upsert the CAQ path. If the user previously picked 'quick' and is now
 * upgrading to 'complete', stamp upgraded_to_complete_at with the current
 * server time so the re-engagement audit trail is preserved. First-time
 * picks set picked_at to now() via the column default.
 */
export async function writeCaqPath(
  input: WriteCaqPathInput,
  supabase: SupabaseClient,
): Promise<CaqPathRecord> {
  const existing = await readCaqPath(input.userId, supabase);
  const isUpgrade =
    existing?.path === 'quick' && input.path === 'complete';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upsert: Record<string, unknown> = {
    user_id: input.userId,
    path: input.path,
  };
  if (isUpgrade) {
    upsert.upgraded_to_complete_at = new Date().toISOString();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('caq_paths')
    .upsert(upsert, { onConflict: 'user_id' })
    .select('user_id, path, picked_at, upgraded_to_complete_at')
    .single();
  if (error) throw new Error(`writeCaqPath failed: ${error.message}`);
  return rowToRecord(data as CaqPathRow);
}
