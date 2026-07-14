/**
 * src/lib/arnold/scanning/accuracy/fusion/fusionTelemetry.ts
 *
 * Task 211b-W3b -- calibration fusion telemetry.
 *
 * Tracks anchor adoption (which source a user added) and band-tightening
 * outcomes, for the retention/trust hypothesis behind the fusion feature.
 *
 * Honesty / privacy rules (non-negotiable), mirroring
 * src/lib/formavision/noise/noiseTelemetry.ts:
 *   - NO PHI. No cm values, no kg values, no raw band widths.
 *   - NO identifiable data beyond the authenticated user_id column itself.
 *   - Band tightening is reported as a COARSE BUCKET ('slight' | 'moderate' |
 *     'substantial'), never the raw personal/global cm numbers.
 *   - Fail-open: a telemetry failure must never propagate to the caller.
 *   - Same analytics_events sink as noiseTelemetry / avatarTelemetry.
 *
 * Two events:
 *   formavision.fusion.anchor_adopted  -- a consented anchor source was
 *     ingested for this user. Properties: { source }.
 *   formavision.fusion.band_tightened  -- a region's personal band was
 *     labeled 'tightened' (never emitted for 'not-tightened',
 *     'insufficient', or 'unreliable' - see personalFusionService.ts's
 *     BandStatus). Properties: { region, bucket }.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any.
 */

import { createClient } from '@/lib/supabase/client';
import { safeLog } from '@/lib/utils/safe-log';
import type { Json } from '@/lib/supabase/types';
import type { Region } from '../../types';
import type { AnchorSource } from './anchorTypes';

const DEFAULT_PAGE = '/body-tracker/composition';

export type FusionTelemetryEvent =
  | 'formavision.fusion.anchor_adopted'
  | 'formavision.fusion.band_tightened';

export type TighteningBucket = 'slight' | 'moderate' | 'substantial';

// ---------------------------------------------------------------------------
// Pure bucketing (no raw cm ever leaves this function into telemetry)
// ---------------------------------------------------------------------------

/**
 * Buckets how much a personal band tightened relative to the global band.
 * ratio = personalBandCm / globalBandCm; smaller ratio = more tightening.
 * Only meaningful when personalBandCm < globalBandCm (a real tightening);
 * callers gate on BandStatus === 'tightened' before calling this.
 */
export function bucketTightening(personalBandCm: number, globalBandCm: number): TighteningBucket {
  const ratio = personalBandCm / globalBandCm;
  if (ratio < 0.5) return 'substantial';
  if (ratio < 0.75) return 'moderate';
  return 'slight';
}

// ---------------------------------------------------------------------------
// Payload builders (pure, no IO)
// ---------------------------------------------------------------------------

export function buildAnchorAdoptedPayload(
  source: AnchorSource,
): { event: FusionTelemetryEvent; properties: Record<string, Json>; page: string } {
  return {
    event: 'formavision.fusion.anchor_adopted',
    properties: { source },
    page: DEFAULT_PAGE,
  };
}

export function buildBandTightenedPayload(
  region: Region,
  bucket: TighteningBucket,
): { event: FusionTelemetryEvent; properties: Record<string, Json>; page: string } {
  return {
    event: 'formavision.fusion.band_tightened',
    properties: { region, bucket },
    page: DEFAULT_PAGE,
  };
}

// ---------------------------------------------------------------------------
// Emitters (fail-open, fire-and-forget)
// ---------------------------------------------------------------------------

async function emit(
  userId: string | null | undefined,
  payload: { event: FusionTelemetryEvent; properties: Record<string, Json>; page: string },
): Promise<void> {
  if (!userId) return;
  try {
    await createClient()
      .from('analytics_events')
      .insert({ ...payload, user_id: userId });
  } catch (e) {
    safeLog.warn('formavision.fusion-telemetry', 'fusion event emit failed', {
      event: payload.event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Emits one anchor-adopted event. No-op when userId is falsy. Fail-open. */
export async function emitAnchorAdopted(
  userId: string | null | undefined,
  source: AnchorSource,
): Promise<void> {
  await emit(userId, buildAnchorAdoptedPayload(source));
}

/** Emits one band-tightened event. No-op when userId is falsy. Fail-open.
 *  Callers must only call this for a BandStatus of 'tightened'. */
export async function emitBandTightened(
  userId: string | null | undefined,
  region: Region,
  bucket: TighteningBucket,
): Promise<void> {
  await emit(userId, buildBandTightenedPayload(region, bucket));
}
