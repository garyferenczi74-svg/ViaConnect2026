// Prompt 231: single source for scan reads (219d <domain>Shared.ts
// convention, mirrors src/lib/supplements/dailyScheduleShared.ts). Both the
// 224 dashboard tile and the scan history list call getLatestScan/listScans
// here; neither surface recomputes a scan count or status on its own
// (condition 17). No caller re-derives "latest" or "visible" from a raw
// body_photo_sessions query.
//
// Lists 4-pose guided sessions (protocol='4pose_v1') AND FormaVision photo
// scans (body_tracker_photo_scans / protocol='formavision_photo'). journal_v0
// rows stay out of scope. Tombstoned 4-pose rows (capture_status
// delete_pending/deleted) are excluded. NULL or any non-tombstone
// capture_status is visible, mirroring the legacy-reader rule (condition 5).
// Returns capture_status, never the legacy is_complete column, and never raw
// storage paths (condition 13, least exposure) - only pose presence booleans,
// since signed URLs are always minted through the Task 13 /api/scan/signed-url
// route. Photo-scan rows have no stored images (analyze discards them);
// poses stay absent and ScanHistory hides the FRBL grid (no ImageOff).
//
// Resilient: every query is raced against a timeout and fails open to a
// null/empty result with a structured log, never a thrown error.

import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { PROTOCOL_ID, POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';
import {
  finiteEstimateNumber,
  hasAnyPresentPose,
  type ScanCaptureStatus,
  type ScanSummary,
} from '@/lib/scan/scanSummary';

export { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';
export type { ScanCaptureStatus, ScanSummary } from '@/lib/scan/scanSummary';

const SCOPE = 'scan.scanReadsShared';
const QUERY_TIMEOUT_MS = 5000;
const DEFAULT_HISTORY_LIMIT = 30;

const TOMBSTONE_STATUSES = ['delete_pending', 'deleted'] as const;
type TombstoneStatus = (typeof TOMBSTONE_STATUSES)[number];


const SELECT_COLUMNS =
  'id,session_date,protocol,capture_status,' +
  POSE_ORDER.map((p) => `${p}_full_path`).join(',');

const TOMBSTONE_FILTER = `capture_status.is.null,capture_status.not.in.(${TOMBSTONE_STATUSES.join(',')})`;

interface RawScanRow {
  id: string;
  session_date: string;
  protocol: string;
  capture_status: string | null;
  [key: string]: unknown;
}

interface QueryResult {
  data: RawScanRow[] | null;
  error: { message: string } | null;
}

function isCaptureStatus(value: unknown): value is ScanCaptureStatus {
  return (
    value === 'uploading' ||
    value === 'ready' ||
    value === 'partial' ||
    value === 'delete_pending' ||
    value === 'deleted'
  );
}

function isTombstoned(value: unknown): value is TombstoneStatus {
  return value === 'delete_pending' || value === 'deleted';
}

function toSummary(row: RawScanRow): ScanSummary {
  const poses = {} as Record<PoseId, boolean>;
  for (const pose of POSE_ORDER) {
    const path = row[`${pose}_full_path`];
    poses[pose] = typeof path === 'string' && path.length > 0;
  }
  return {
    id: row.id,
    date: row.session_date,
    protocol: row.protocol,
    captureStatus: isCaptureStatus(row.capture_status) ? row.capture_status : null,
    poses,
  };
}

/**
 * Defense in depth: even though the query itself filters to protocol and
 * excludes tombstones, never trust the DB round trip alone. A row that is
 * somehow tombstoned or off-protocol is dropped here too before it ever
 * reaches a caller.
 */
function isGuidedProtocol(protocol: string): boolean {
  return protocol === PROTOCOL_ID || protocol === FORMAVISION_PHOTO_PROTOCOL;
}

function isVisible(row: RawScanRow): boolean {
  if (!isGuidedProtocol(row.protocol)) return false;
  if (isTombstoned(row.capture_status)) return false;
  return true;
}

interface PhotoScanRow {
  id: string;
  scan_date: string;
  created_at?: string | null;
  estimated_body_fat_min?: number | null;
  estimated_body_fat_max?: number | null;
  estimated_whr_min?: number | null;
  estimated_whr_max?: number | null;
}

function finiteOrNull(value: unknown): number | null {
  return finiteEstimateNumber(value);
}

function photoScanToSummary(row: PhotoScanRow): ScanSummary {
  // SSOT: do not map pose-present for photo scans. Analyze discards images;
  // history hides the FRBL grid instead of ImageOff / signed-URL.
  const poses = {} as Record<PoseId, boolean>;
  for (const pose of POSE_ORDER) poses[pose] = false;
  return {
    id: row.id,
    date: row.scan_date,
    protocol: FORMAVISION_PHOTO_PROTOCOL,
    captureStatus: 'ready',
    poses,
    estimatedBodyFatMin: finiteOrNull(row.estimated_body_fat_min),
    estimatedBodyFatMax: finiteOrNull(row.estimated_body_fat_max),
    estimatedWhrMin: finiteOrNull(row.estimated_whr_min),
    estimatedWhrMax: finiteOrNull(row.estimated_whr_max),
  };
}

function sortByDateDesc(a: ScanSummary, b: ScanSummary): number {
  const aTime = new Date(a.date).getTime();
  const bTime = new Date(b.date).getTime();
  const aOk = Number.isFinite(aTime);
  const bOk = Number.isFinite(bTime);
  if (aOk && bOk) return bTime - aTime;
  if (a.date === b.date) return 0;
  return a.date < b.date ? 1 : -1;
}

function rowTimeMs(row: PhotoScanRow): number {
  const raw = row.created_at ?? row.scan_date;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortPhotoRowsNewestFirst(rows: PhotoScanRow[]): PhotoScanRow[] {
  return [...rows].sort((a, b) => {
    const byTime = rowTimeMs(b) - rowTimeMs(a);
    if (byTime !== 0) return byTime;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

function calendarDay(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const t = new Date(date).getTime();
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  return date;
}

async function queryPhotoScanRows(userId: string, limit: number): Promise<{
  data: PhotoScanRow[] | null;
  error: { message: string } | null;
}> {
  const supabase = await createClient();
  return withTimeout(
    Promise.resolve(
      supabase
        .from('body_tracker_photo_scans')
        .select(
          'id, scan_date, created_at, estimated_body_fat_min, estimated_body_fat_max, estimated_whr_min, estimated_whr_max',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ) as unknown as Promise<{ data: PhotoScanRow[] | null; error: { message: string } | null }>,
    QUERY_TIMEOUT_MS,
    `${SCOPE}.photoQuery`,
  );
}

async function listPhotoScans(userId: string, limit: number): Promise<ScanSummary[]> {
  try {
    const { data, error } = await queryPhotoScanRows(userId, limit);
    if (error) {
      safeLog.warn(SCOPE, 'photo scan query error (fail-open)', { error, userId });
      return [];
    }
    return sortPhotoRowsNewestFirst(data ?? []).map(photoScanToSummary);
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'photo scan query timed out (fail-open)', { userId });
    } else {
      safeLog.warn(SCOPE, 'photo scan query threw (fail-open)', { error, userId });
    }
    return [];
  }
}

function mergeScanSummaries(sessions: ScanSummary[], photos: ScanSummary[], limit: number): ScanSummary[] {
  // Cheap Ready collapse: one formavision_photo per calendar day (scan_date is
  // DATE), plus drop empty-pose 4pose_v1 leftovers on a day that already has
  // a photo scan. Guided rows with real pose paths stay.
  const seenPhotoDay = new Set<string>();
  const uniquePhotos: ScanSummary[] = [];
  for (const photo of photos) {
    const day = calendarDay(photo.date);
    if (seenPhotoDay.has(day)) continue;
    seenPhotoDay.add(day);
    uniquePhotos.push(photo);
  }

  const uniqueSessions = sessions.filter((scan) => {
    if (scan.protocol !== PROTOCOL_ID) return true;
    if (hasAnyPresentPose(scan.poses)) return true;
    return !seenPhotoDay.has(calendarDay(scan.date));
  });

  const byId = new Map<string, ScanSummary>();
  for (const scan of [...uniqueSessions, ...uniquePhotos]) {
    if (!byId.has(scan.id)) byId.set(scan.id, scan);
  }
  return Array.from(byId.values()).sort(sortByDateDesc).slice(0, limit);
}

async function queryScanRows(userId: string, limit: number): Promise<QueryResult> {
  const supabase = await createClient();
  return withTimeout<QueryResult>(
    Promise.resolve(
      supabase
        .from('body_photo_sessions')
        .select(SELECT_COLUMNS)
        .eq('user_id', userId)
        .eq('protocol', PROTOCOL_ID)
        .or(TOMBSTONE_FILTER)
        .order('session_date', { ascending: false })
        .limit(limit),
    ) as unknown as Promise<QueryResult>,
    QUERY_TIMEOUT_MS,
    `${SCOPE}.query`,
  );
}

/**
 * The single most-recent 4-pose scan for this user, or null when there is
 * none / the read failed. Used by the 224 dashboard tile.
 */
export async function getLatestScan(userId: string): Promise<ScanSummary | null> {
  const [session, photos] = await Promise.all([
    getLatestSessionScan(userId),
    listPhotoScans(userId, 1),
  ]);
  const merged = mergeScanSummaries(session ? [session] : [], photos, 1);
  return merged[0] ?? null;
}

async function getLatestSessionScan(userId: string): Promise<ScanSummary | null> {
  try {
    const { data, error } = await queryScanRows(userId, 1);
    if (error) {
      safeLog.warn(SCOPE, 'getLatestScan query error (fail-open)', { error, userId });
      return null;
    }
    const row = (data ?? []).find(isVisible);
    return row ? toSummary(row) : null;
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'getLatestScan timed out (fail-open)', { userId });
    } else {
      safeLog.warn(SCOPE, 'getLatestScan threw (fail-open)', { error, userId });
    }
    return null;
  }
}

/**
 * Every 4-pose scan for this user, newest first, or [] when there are none /
 * the read failed. Used by the scan history list.
 */
export async function listScans(
  userId: string,
  limit: number = DEFAULT_HISTORY_LIMIT,
): Promise<ScanSummary[]> {
  const [sessions, photos] = await Promise.all([
    listSessionScans(userId, limit),
    listPhotoScans(userId, limit),
  ]);
  return mergeScanSummaries(sessions, photos, limit);
}

async function listSessionScans(
  userId: string,
  limit: number,
): Promise<ScanSummary[]> {
  try {
    const { data, error } = await queryScanRows(userId, limit);
    if (error) {
      safeLog.warn(SCOPE, 'listScans query error (fail-open)', { error, userId });
      return [];
    }
    return (data ?? []).filter(isVisible).map(toSummary);
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'listScans timed out (fail-open)', { userId });
    } else {
      safeLog.warn(SCOPE, 'listScans threw (fail-open)', { error, userId });
    }
    return [];
  }
}
