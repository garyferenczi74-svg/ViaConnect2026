// Prompt #125 P10: Platform kill-switch helper.
//
// Reads scheduler_platform_states.mode for a platform and exposes the
// three-way gate expected by the orchestrator + webhook receivers:
//   active     normal pipeline runs end-to-end
//   scan_only  orchestrator evaluates but intercept.ts short-circuits
//              so the platform API is never called on the hold path
//   disabled   webhook receivers 200-skip the event before persist;
//              poll ticks noop; practitioners are notified separately
//              that coverage is paused

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchedulerPlatform } from './types';

export type PlatformMode = 'active' | 'scan_only' | 'disabled';

export async function readPlatformMode(
  supabase: SupabaseClient,
  platform: SchedulerPlatform,
): Promise<PlatformMode> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('scheduler_platform_states')
    .select('mode')
    .eq('platform', platform)
    .maybeSingle();
  if (error || !data) {
    // Fail-safe: if we can't read the state, assume active so we don't
    // accidentally disable compliance coverage. The overview dashboard
    // makes state drift visible.
    return 'active';
  }
  const mode = (data as { mode?: string }).mode;
  if (mode === 'scan_only' || mode === 'disabled' || mode === 'active') return mode;
  return 'active';
}

export function shouldSkipInterception(mode: PlatformMode): boolean {
  return mode === 'scan_only' || mode === 'disabled';
}

export function shouldSkipIngestion(mode: PlatformMode): boolean {
  return mode === 'disabled';
}
