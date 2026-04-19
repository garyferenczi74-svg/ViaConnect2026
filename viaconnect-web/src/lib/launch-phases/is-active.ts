// Lightweight server-side launch-phase status check.
//
// Used by feature surfaces that want to gate UI without going through the
// full feature-flag evaluation engine. The engine is the right tool when a
// feature has tier requirements, rollout percentages, etc.; for surfaces
// that only need "is this commercial phase live yet?", this is simpler.
//
// active and completed both count as "the phase is open"; anything else
// (planned, scheduled, paused, canceled) is treated as "not yet".

import type { SupabaseClient } from '@supabase/supabase-js';

export type LaunchPhaseStatus =
  | 'planned' | 'scheduled' | 'active' | 'paused' | 'completed' | 'canceled';

export async function getLaunchPhaseStatus(
  phaseId: string,
  supabase: SupabaseClient | unknown,
): Promise<LaunchPhaseStatus | null> {
  const sb = supabase as any;
  const { data } = await sb
    .from('launch_phases')
    .select('activation_status')
    .eq('id', phaseId)
    .maybeSingle();
  return (data?.activation_status as LaunchPhaseStatus | undefined) ?? null;
}

export async function isLaunchPhaseActive(
  phaseId: string,
  supabase: SupabaseClient | unknown,
): Promise<boolean> {
  const status = await getLaunchPhaseStatus(phaseId, supabase);
  return status === 'active' || status === 'completed';
}
