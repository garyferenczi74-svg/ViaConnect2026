/* eslint-disable @typescript-eslint/no-explicit-any */
// Prompt 179c: read + soft-delete helpers for the Measurements surface. Reads fail
// open (return empty, never block the page); the soft-delete sets deleted_at so the
// row is preserved (DD-4). All scoped to the authenticated user_id (RLS also
// enforces this).

import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { COLUMN_TO_SITE, type CanonicalSite } from './sites';
import type { MeasurementUnit } from './units';

const SCOPE = 'measurements.access';
const TIMEOUT_MS = 8000;
const MAX_ROWS = 200;

export interface MeasurementEvent {
  id: string; // body_tracker_circumference id
  date: string; // entry_date (yyyy-mm-dd) from the parent event
  source: 'manual' | 'scan';
  entryUnit: MeasurementUnit; // unit the values are stored in
  values: Partial<Record<CanonicalSite, number>>; // stored values, in entryUnit
}

export type AccessClient = { from(table: string): any };

// Newest-first list of non-deleted circumference events with their date + source.
// Two queries (circumference rows, then their parent entries) rather than an embed,
// to stay robust against the live FK metadata. Fail open: any error yields [].
export async function listMeasurementEvents(
  userId: string,
  supabase: AccessClient,
): Promise<MeasurementEvent[]> {
  try {
    const circRes = await withTimeout(
      Promise.resolve(
        supabase
          .from('body_tracker_circumference')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(MAX_ROWS),
      ),
      TIMEOUT_MS,
      `${SCOPE}.circ`,
    );
    const circRows: any[] = circRes?.data ?? [];
    if (circRows.length === 0) return [];

    const entryIds = Array.from(new Set(circRows.map((r) => r.entry_id).filter(Boolean)));
    const entryRes = await withTimeout(
      Promise.resolve(
        supabase.from('body_tracker_entries').select('id, entry_date, source').in('id', entryIds),
      ),
      TIMEOUT_MS,
      `${SCOPE}.entries`,
    );
    const entryById = new Map<string, { entry_date: string; source: string }>(
      (entryRes?.data ?? []).map((e: any) => [e.id, { entry_date: e.entry_date, source: e.source }]),
    );

    const events: MeasurementEvent[] = [];
    for (const row of circRows) {
      const entry = entryById.get(row.entry_id);
      const source: 'manual' | 'scan' = row.source === 'scan' || entry?.source === 'scan' ? 'scan' : 'manual';
      const date = entry?.entry_date ?? String(row.created_at ?? '').slice(0, 10);
      const values: Partial<Record<CanonicalSite, number>> = {};
      for (const col of Object.keys(COLUMN_TO_SITE)) {
        const v = row[col];
        if (typeof v === 'number' && Number.isFinite(v)) {
          values[COLUMN_TO_SITE[col]] = v;
        }
      }
      if (Object.keys(values).length > 0) {
        events.push({
          id: row.id,
          date,
          source,
          entryUnit: row.entry_unit === 'cm' ? 'cm' : 'in',
          values,
        });
      }
    }
    return events;
  } catch (error) {
    safeLog.warn(SCOPE, 'listMeasurementEvents failed; returning empty', { userId, error });
    return [];
  }
}

// Soft-delete (manual) or hide (scan): set deleted_at, preserving the row (DD-4 +
// criterion 7). Scoped to the owner. Returns true on success.
export async function softDeleteMeasurement(
  circumferenceId: string,
  userId: string,
  supabase: AccessClient,
): Promise<boolean> {
  try {
    const res = await withTimeout(
      Promise.resolve(
        supabase
          .from('body_tracker_circumference')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', circumferenceId)
          .eq('user_id', userId)
          .is('deleted_at', null),
      ),
      TIMEOUT_MS,
      `${SCOPE}.softDelete`,
    );
    if (res?.error) {
      safeLog.warn(SCOPE, 'softDelete failed', { circumferenceId, error: res.error });
      return false;
    }
    return true;
  } catch (error) {
    safeLog.warn(SCOPE, 'softDelete threw', { circumferenceId, error });
    return false;
  }
}

// session_id of the member's most recent scan that produced measurements, for the
// explicit "Import from latest scan" action. Null when there is no scan.
export async function getLatestScanId(userId: string, supabase: AccessClient): Promise<string | null> {
  try {
    const res = await withTimeout(
      Promise.resolve(
        supabase
          .from('body_scan_measurements')
          .select('session_id, scan_date')
          .eq('user_id', userId)
          .order('scan_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      TIMEOUT_MS,
      `${SCOPE}.latestScan`,
    );
    return (res?.data?.session_id as string | undefined) ?? null;
  } catch (error) {
    safeLog.warn(SCOPE, 'getLatestScanId failed', { userId, error });
    return null;
  }
}
