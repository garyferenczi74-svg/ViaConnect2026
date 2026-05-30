/**
 * Prompt 170l Phase 1b: server-side barcode_scan_sessions sampled writer.
 *
 * Gate 4: 10% sampling in prod (BARCODE_TELEMETRY_SAMPLE_RATE = 0.10).
 * Sampling decision uses Math.random for low-overhead. barcode_value is
 * stored per spec but the table RLS restricts SELECT to service_role,
 * matching the practitioner-redaction posture from spec §14.3.
 *
 * Telemetry never throws; failures degrade silently per the non-blocking
 * contract (the scan flow proceeds regardless).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/safe-log';
import { BARCODE_TELEMETRY_SAMPLE_RATE } from './feature-flags';
import type { BarcodeScanSessionWrite } from './types';

export interface BarcodeTelemetryContext {
  supabaseAdmin: SupabaseClient;
  userHash: string;
  requestId: string;
  payload: BarcodeScanSessionWrite;
  forceSample?: boolean;
}

/**
 * Writes a barcode scan session row if the random sampling check passes.
 * Returns true if a row was written, false if skipped (unsampled or error).
 */
export async function writeBarcodeScanSession(
  ctx: BarcodeTelemetryContext,
): Promise<boolean> {
  const sampled = ctx.forceSample === true
    || Math.random() < BARCODE_TELEMETRY_SAMPLE_RATE;
  if (!sampled) return false;

  try {
    const { error } = await ctx.supabaseAdmin
      .from('barcode_scan_sessions')
      .insert({
        user_hash: ctx.userHash,
        meal_id: ctx.payload.meal_id,
        barcode_value: ctx.payload.barcode_value,
        lookup_outcome: ctx.payload.lookup_outcome,
        cache_hit: ctx.payload.cache_hit,
        off_completeness_score: ctx.payload.off_completeness_score,
        off_nova_group: ctx.payload.off_nova_group,
        off_nutrition_grade_fr: ctx.payload.off_nutrition_grade_fr,
        user_overrode_macros: ctx.payload.user_overrode_macros,
        manual_entry: ctx.payload.manual_entry,
        multi_product_position: ctx.payload.multi_product_position,
        decoder_used: ctx.payload.decoder_used,
        decoder_latency_ms: ctx.payload.decoder_latency_ms,
        lookup_latency_ms: ctx.payload.lookup_latency_ms,
        device_kind: ctx.payload.device_kind,
        session_outcome: ctx.payload.session_outcome,
        error_class: ctx.payload.error_class,
      });

    if (error) {
      safeLog.warn('nutrition.barcode.telemetry.write_error', 'session write failed', {
        request_id: ctx.requestId,
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (err) {
    safeLog.warn('nutrition.barcode.telemetry.write_threw', 'session write threw', {
      request_id: ctx.requestId,
      error: err,
    });
    return false;
  }
}
