/* eslint-disable @typescript-eslint/no-explicit-any */
// Prompt 179c: ingest a completed FormaVision scan's circumference girths into the
// existing body_tracker_circumference table (source 'scan'), idempotently linked to
// the scan. Platinum-gated and FAIL CLOSED (DD-3): any uncertainty about the tier,
// or any entitlement error, results in no write. Shared by the explicit
// "Import from latest scan" route and the post-scan hook.

import { getEffectiveTierForUser } from '@/lib/pricing/membership-manager';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';
import { tierIdToLevel, type TierId } from '@/types/pricing';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { mapScanRowToCircumferenceCm, mappedSiteCount } from './scanMapping';

const SCOPE = 'measurements.ingest';
const TIMEOUT_MS = 8000;

export type IngestReason =
  | 'not_platinum'
  | 'entitlement_error'
  | 'no_scan_data'
  | 'no_girths'
  | 'insert_failed';

export type IngestResult =
  | { ok: false; reason: IngestReason }
  | { ok: true; status: 'imported' | 'already_imported'; entryId: string | null; siteCount: number };

export type IngestClient = { from(table: string): any };

export function isPlatinum(tier: TierId): boolean {
  return tierIdToLevel(tier) >= 2;
}

export async function ingestMeasurementsFromScan(
  params: { scanId: string; userId: string },
  supabase: IngestClient,
): Promise<IngestResult> {
  const { scanId, userId } = params;

  // 1. Entitlement. Fail closed: a non-Platinum tier or any lookup error means no write.
  let tier: TierId;
  try {
    tier = await withTimeout(
      getEffectiveTierForUser(supabase as unknown as PricingSupabaseClient, userId),
      TIMEOUT_MS,
      `${SCOPE}.entitlement`,
    );
  } catch (error) {
    safeLog.warn(SCOPE, 'entitlement lookup failed; failing closed (no write)', { scanId, error });
    return { ok: false, reason: 'entitlement_error' };
  }
  if (!isPlatinum(tier)) {
    safeLog.info(SCOPE, 'gated: not Platinum, no scan import', { scanId, tier });
    return { ok: false, reason: 'not_platinum' };
  }

  // 2. Idempotency: a circumference row already linked to this scan means no-op.
  try {
    const existing = await withTimeout(
      Promise.resolve(
        supabase
          .from('body_tracker_circumference')
          .select('id')
          .eq('scan_id', scanId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle(),
      ),
      TIMEOUT_MS,
      `${SCOPE}.idempotency`,
    );
    if (existing?.data?.id) {
      safeLog.info(SCOPE, 'idempotent hit, scan already imported', { scanId });
      return { ok: true, status: 'already_imported', entryId: null, siteCount: 0 };
    }
  } catch (error) {
    // A failed idempotency read is non-fatal; the partial unique index is the
    // real guard and will reject a duplicate insert below.
    safeLog.warn(SCOPE, 'idempotency read failed; relying on unique index', { scanId, error });
  }

  // 3. Read the scan girths.
  let scanRow: Record<string, unknown> | null = null;
  try {
    const scan = await withTimeout(
      Promise.resolve(
        supabase
          .from('body_scan_measurements')
          .select('*')
          .eq('session_id', scanId)
          .eq('user_id', userId)
          .order('scan_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      TIMEOUT_MS,
      `${SCOPE}.read`,
    );
    scanRow = (scan?.data as Record<string, unknown> | undefined) ?? null;
  } catch (error) {
    safeLog.warn(SCOPE, 'scan read failed', { scanId, error });
    return { ok: false, reason: 'no_scan_data' };
  }
  if (!scanRow) {
    safeLog.warn(SCOPE, 'no scan measurements row', { scanId });
    return { ok: false, reason: 'no_scan_data' };
  }

  const cmPayload = mapScanRowToCircumferenceCm(scanRow);
  const siteCount = mappedSiteCount(cmPayload);
  if (siteCount === 0) {
    safeLog.warn(SCOPE, 'no canonical girths in scan', { scanId });
    return { ok: false, reason: 'no_girths' };
  }

  // 4. Write the event + the circumference row (source scan, cm, scan-linked).
  const scanDate = (scanRow.scan_date as string) ?? new Date().toISOString().slice(0, 10);
  try {
    const entryInsert = await withTimeout(
      Promise.resolve(
        supabase
          .from('body_tracker_entries')
          .insert({
            user_id: userId,
            entry_date: scanDate,
            source: 'scan',
            device_name: 'FormaVision',
            notes: 'Imported from FormaVision scan',
          })
          .select('id')
          .single(),
      ),
      TIMEOUT_MS,
      `${SCOPE}.entry`,
    );
    if (entryInsert?.error || !entryInsert?.data?.id) {
      safeLog.warn(SCOPE, 'entry insert failed', { scanId, error: entryInsert?.error });
      return { ok: false, reason: 'insert_failed' };
    }
    const entryId = entryInsert.data.id as string;

    const circInsert = await withTimeout(
      Promise.resolve(
        supabase.from('body_tracker_circumference').insert({
          entry_id: entryId,
          user_id: userId,
          entry_unit: 'cm',
          source: 'scan',
          scan_id: scanId,
          ...cmPayload,
        }),
      ),
      TIMEOUT_MS,
      `${SCOPE}.circumference`,
    );
    if (circInsert?.error) {
      // 23505 = the partial unique index raced us; treat as already imported.
      if (String(circInsert.error.code) === '23505') {
        safeLog.info(SCOPE, 'unique race, scan already imported', { scanId });
        return { ok: true, status: 'already_imported', entryId: null, siteCount: 0 };
      }
      safeLog.warn(SCOPE, 'circumference insert failed', { scanId, error: circInsert.error });
      return { ok: false, reason: 'insert_failed' };
    }

    safeLog.info(SCOPE, 'scan measurements imported', { scanId, tier, siteCount });
    return { ok: true, status: 'imported', entryId, siteCount };
  } catch (error) {
    safeLog.warn(SCOPE, 'write failed', { scanId, error });
    return { ok: false, reason: 'insert_failed' };
  }
}
