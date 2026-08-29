// Prompt 231: single source for scan reads (219d <domain>Shared.ts
// convention, mirrors src/lib/supplements/dailyScheduleShared.ts). Both the
// 224 dashboard tile and the scan history list call getLatestScan/listScans
// here; neither surface recomputes a scan count or status on its own
// (condition 17). No caller re-derives "latest" or "visible" from a raw
// body_photo_sessions query.
//
// Filtered to protocol='4pose_v1' (the new guided flow; journal_v0 rows are
// the pre-231 free-form flow and are out of scope here) and excludes
// tombstoned rows (capture_status delete_pending/deleted). NULL or any
// non-tombstone capture_status is visible, mirroring the legacy-reader rule
// (condition 5). Returns capture_status, never the legacy is_complete
// column, and never raw storage paths (condition 13, least exposure) - only
// pose presence booleans, since signed URLs are always minted through the
// Task 13 /api/scan/signed-url route.
//
// Resilient: every query is raced against a timeout and fails open to a
// null/empty result with a structured log, never a thrown error.

import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { PROTOCOL_ID, POSE_ORDER, type PoseId } from '@/lib/scan/poses';

const SCOPE = 'scan.scanReadsShared';
const QUERY_TIMEOUT_MS = 5000;
const DEFAULT_HISTORY_LIMIT = 30;

const TOMBSTONE_STATUSES = ['delete_pending', 'deleted'] as const;
type TombstoneStatus = (typeof TOMBSTONE_STATUSES)[number];

export type ScanCaptureStatus = 'uploading' | 'ready' | 'partial' | 'delete_pending' | 'deleted';

export interface ScanSummary {
  id: string;
  date: string;
  protocol: string;
  captureStatus: ScanCaptureStatus | null;
  poses: Record<PoseId, boolean>;
}

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
function isVisible(row: RawScanRow): boolean {
  if (row.protocol !== PROTOCOL_ID) return false;
  if (isTombstoned(row.capture_status)) return false;
  return true;
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
