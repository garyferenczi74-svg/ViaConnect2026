// Bio Optimization Score write-telemetry helper.
//
// Writes one row to bos_write_telemetry (created in
// supabase/migrations/20260512020236_bos_compute_v2.sql §11).
//
// Fire-and-forget: every Supabase error or thrown exception is logged
// to console.error and swallowed. A telemetry failure MUST NOT propagate
// out of the parent compute / projection operation.

import type { SupabaseClient } from '@supabase/supabase-js';

export type BOSWriteTarget =
  | 'bio_optimization_history'
  | 'profiles.bio_optimization_score'
  | 'daily_scores.bio_optimization_score'
  | 'health_scores'
  | 'compute_bio_optimization_score_rpc';

export interface LogBOSWriteParams {
  caller_module: string;
  write_target: BOSWriteTarget;
  is_canonical: boolean;
  success: boolean;
  error_message?: string;
  user_id?: string;
  supabase: SupabaseClient;
}

export async function logBOSWrite(params: LogBOSWriteParams): Promise<void> {
  try {
    const { error } = await params.supabase.from('bos_write_telemetry').insert({
      caller_module: params.caller_module,
      write_target: params.write_target,
      is_canonical: params.is_canonical,
      success: params.success,
      error_message: params.error_message ?? null,
      user_id: params.user_id ?? null,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('logBOSWrite: telemetry insert failed', {
        write_target: params.write_target,
        caller_module: params.caller_module,
        error: error.message ?? String(error),
      });
    }
  } catch (caught) {
    // eslint-disable-next-line no-console
    console.error('logBOSWrite: telemetry threw', {
      write_target: params.write_target,
      caller_module: params.caller_module,
      thrown: caught instanceof Error ? caught.message : String(caught),
    });
  }
}
