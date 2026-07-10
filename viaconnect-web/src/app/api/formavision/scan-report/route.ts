// Prompt 211a Workstream 3 - doctor-ready scan report PDF route.
//
// POST /api/formavision/scan-report
// Returns: { signedUrl, storagePath, scanDate }  (200)
//
// Pipeline (mirrors the board download route pattern):
//   1. Server-confirmed auth via createClient().auth.getUser().
//   2. Read the user's scan history from the SAME single contract W3 reads:
//      body_scan_measurements (the composition history source). That one table
//      already carries the 12 *_circ_cm girths, the composition (lean_mass_kg,
//      fat_mass_kg, body_fat_pct_mid), overall_confidence, and the per-
//      measurement confidence_map. There is NO second data path.
//   3. Map the latest + genuine-first rows into the honest renderer input.
//   4. Render bytes via the reused pdf-lib renderer (renderScanReportPdf).
//   5. Upload to the private body-scan-pdfs bucket and return a signed URL.
//
// Resilience: every supabase call is wrapped in withTimeout; failures are
// surfaced via reportSupabaseError (fail-open with drift visibility) with a
// table context only. NO PII in logs. Confidence is never upgraded: an absent
// confidence_map entry is UNKNOWN (null), never a fabricated value.
//
// Legal entity in the artifact is FarmCeutica Wellness LLC and the brand is
// Via Cura (both live inside the renderer). The report is strictly clinical:
// no engagement or reward data of any kind reaches this surface (Section 8).
//
// Standing rules honored: no em dashes, no en dashes, no emojis, zero any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { reportSupabaseError } from '@/lib/utils/schema-drift';
import { safeLog } from '@/lib/utils/safe-log';
import { numericToConfidenceLevel } from '@/lib/arnold/scanning/accuracy/confidenceDisplay';
import {
  renderScanReportPdf,
  type ScanReportCircumference,
  type ScanReportInput,
} from '@/lib/formavision/report/scanReportPdf';
import type { ConfidenceLevel } from '@/lib/arnold/scanning/types';

export const runtime = 'nodejs';

const BUCKET = 'body-scan-pdfs';
const TABLE = 'body_scan_measurements';
const SCOPE = 'api.formavision.scan-report';
const TIMEOUT_MS = 8000;
const SIGNED_URL_TTL_SECONDS = 600;

// Columns read from the single contract. Every name here is a real column of
// body_scan_measurements (migration 20260416000100).
const SCAN_COLS =
  'scan_date,' +
  'neck_circ_cm,shoulder_circ_cm,chest_circ_cm,waist_natural_circ_cm,hip_circ_cm,' +
  'right_bicep_circ_cm,left_bicep_circ_cm,right_forearm_circ_cm,left_forearm_circ_cm,' +
  'right_thigh_circ_cm,left_thigh_circ_cm,right_calf_circ_cm,' +
  'body_fat_pct_mid,lean_mass_kg,fat_mass_kg,overall_confidence,confidence_map';

// The 12 report rows: DB circumference column -> { confidence_map key, label }.
// The confidence_map keys are the camelCase ExtractedMeasurements field names
// written by buildConfidenceMap in runScanAnalysis. Hip has no confidence_map
// entry (it is derived), so its confidence resolves to UNKNOWN honestly.
const ROW_SPEC: ReadonlyArray<{ col: string; confKey: string | null; label: string }> = [
  { col: 'neck_circ_cm', confKey: 'neckCirc', label: 'Neck' },
  { col: 'shoulder_circ_cm', confKey: 'shoulderCirc', label: 'Shoulders' },
  { col: 'chest_circ_cm', confKey: 'chestCirc', label: 'Chest' },
  { col: 'waist_natural_circ_cm', confKey: 'waistNaturalCirc', label: 'Waist' },
  { col: 'hip_circ_cm', confKey: 'hipCirc', label: 'Hips' },
  { col: 'right_bicep_circ_cm', confKey: 'rightBicepCirc', label: 'R. Upper Arm' },
  { col: 'left_bicep_circ_cm', confKey: 'leftBicepCirc', label: 'L. Upper Arm' },
  { col: 'right_forearm_circ_cm', confKey: 'rightForearmCirc', label: 'R. Forearm' },
  { col: 'left_forearm_circ_cm', confKey: 'leftForearmCirc', label: 'L. Forearm' },
  { col: 'right_thigh_circ_cm', confKey: 'rightThighCirc', label: 'R. Thigh' },
  { col: 'left_thigh_circ_cm', confKey: 'leftThighCirc', label: 'L. Thigh' },
  { col: 'right_calf_circ_cm', confKey: 'rightCalfCirc', label: 'R. Calf' },
];

// Minimal structural view of a scan row (only the fields we read).
type ScanRow = Record<string, unknown>;

// Minimal result shape of a maybeSingle() read. The generated PostgrestBuilder
// is a thenable but not typed as a Promise, so each query is wrapped in
// Promise.resolve(...) and awaited as this shape (mirrors measurementsAccess.ts).
type ScanQueryResult = { data: ScanRow | null; error: { message: string } | null };

// Confidence-map value shape written by buildConfidenceMap.
interface ConfMapEntry {
  confidence?: string;
  source?: string;
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Resolve a row's per-measurement confidence honestly. Preference order:
 *   1. The confidence_map entry's level string ('high' | 'moderate' | 'low').
 *   2. Fall back to the row overall_confidence numeric via numericToConfidenceLevel.
 *   3. null (UNKNOWN) when neither is present. Never upgraded, never fabricated.
 * If the value itself is null (UNKNOWN measurement), confidence is forced null.
 */
function resolveConfidence(
  valueCm: number | null,
  confKey: string | null,
  confMap: Record<string, ConfMapEntry> | null,
  overall: number | null,
): ConfidenceLevel | null {
  if (valueCm === null) return null; // UNKNOWN measurement -> UNKNOWN confidence
  if (confKey && confMap) {
    const entry = confMap[confKey];
    const lvl = entry?.confidence;
    if (lvl === 'high' || lvl === 'moderate' || lvl === 'low') return lvl;
  }
  return numericToConfidenceLevel(overall);
}

function parseConfMap(raw: unknown): Record<string, ConfMapEntry> | null {
  if (raw === null || typeof raw !== 'object') return null;
  return raw as Record<string, ConfMapEntry>;
}

function buildCircumferences(row: ScanRow): ScanReportCircumference[] {
  const confMap = parseConfMap(row.confidence_map);
  const overall = numOrNull(row.overall_confidence);
  return ROW_SPEC.map((spec) => {
    const valueCm = numOrNull(row[spec.col]);
    return {
      key: spec.col,
      label: spec.label,
      valueCm,
      confidence: resolveConfidence(valueCm, spec.confKey, confMap, overall),
    };
  });
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: userData } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      `${SCOPE}.auth`,
    );
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Latest scan (most recent by scan_date).
    let latestRow: ScanRow | null = null;
    try {
      const res = await withTimeout<ScanQueryResult>(
        Promise.resolve(
          supabase
            .from('body_scan_measurements')
            .select(SCAN_COLS)
            .eq('user_id', user.id)
            .order('scan_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ) as Promise<ScanQueryResult>,
        TIMEOUT_MS,
        `${SCOPE}.latest`,
      );
      if (res.error) {
        reportSupabaseError(`${SCOPE}.latest`, res.error, { table: 'body_scan_measurements' });
      } else {
        latestRow = (res.data as ScanRow | null) ?? null;
      }
    } catch (e) {
      if (isTimeoutError(e)) throw e;
      reportSupabaseError(`${SCOPE}.latest`, e, { table: TABLE });
    }

    if (!latestRow) {
      return NextResponse.json({ error: 'No scan on record yet.' }, { status: 404 });
    }

    // 2. Genuine first scan (oldest by scan_date) for the trend baseline.
    let firstRow: ScanRow | null = null;
    try {
      const res = await withTimeout<ScanQueryResult>(
        Promise.resolve(
          supabase
            .from(TABLE)
            .select('scan_date,body_fat_pct_mid')
            .eq('user_id', user.id)
            .order('scan_date', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ) as Promise<ScanQueryResult>,
        TIMEOUT_MS,
        `${SCOPE}.first`,
      );
      if (res.error) {
        reportSupabaseError(`${SCOPE}.first`, res.error, { table: TABLE });
      } else {
        firstRow = (res.data as ScanRow | null) ?? null;
      }
    } catch (e) {
      if (isTimeoutError(e)) throw e;
      // Fail open: without a first row the trend is simply omitted (honest).
      reportSupabaseError(`${SCOPE}.first`, e, { table: TABLE });
    }

    // 3. Resolve a display name from the caller identity (never fabricated).
    //    user_metadata.full_name if present, otherwise the email local part,
    //    otherwise a neutral fallback. No extra table read.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const metaName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
    const emailLocal = typeof user.email === 'string' ? user.email.split('@')[0] : '';
    const displayName = metaName || emailLocal || 'Member';

    const latestScanDate =
      typeof latestRow.scan_date === 'string' ? latestRow.scan_date : null;
    const firstScanDate =
      firstRow && typeof firstRow.scan_date === 'string' ? firstRow.scan_date : null;

    // Trend baseline: only honest when there is a genuine earlier scan.
    const latestBodyFatPct = numOrNull(latestRow.body_fat_pct_mid);
    const isSingleScan = !firstScanDate || firstScanDate === latestScanDate;
    const firstBodyFatPct = isSingleScan ? null : numOrNull(firstRow?.body_fat_pct_mid);

    const input: ScanReportInput = {
      displayName,
      latestScanDate,
      firstScanDate: isSingleScan ? null : firstScanDate,
      avatarPng: null, // no server-side avatar snapshot in this path; omitted honestly
      circumferences: buildCircumferences(latestRow),
      composition: {
        bodyFatPct: latestBodyFatPct,
        leanMassKg: numOrNull(latestRow.lean_mass_kg),
        fatMassKg: numOrNull(latestRow.fat_mass_kg),
      },
      trend: {
        firstBodyFatPct,
        latestBodyFatPct,
      },
    };

    // 4. Render.
    let bytes: Uint8Array;
    try {
      bytes = await renderScanReportPdf(input);
    } catch (err) {
      safeLog.error(SCOPE, 'render failed', {
        table: TABLE,
        error: err instanceof Error ? err.message : 'unknown',
      });
      return NextResponse.json({ error: 'report_render_failed' }, { status: 500 });
    }

    // 5. Upload to the private bucket and sign. Admin client for storage write
    //    (RLS on storage.objects); path is namespaced per user.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as unknown as any;
    const storagePath = `${user.id}/scan-report-${Date.now()}.pdf`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (upErr) {
      reportSupabaseError(`${SCOPE}.upload`, upErr, { table: BUCKET });
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) {
      reportSupabaseError(`${SCOPE}.sign`, signErr ?? new Error('sign failed'), { table: BUCKET });
      return NextResponse.json({ error: 'signed_url_failed' }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: signed.signedUrl,
      storagePath,
      scanDate: latestScanDate,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error(SCOPE, 'database timeout', { table: TABLE, error: err });
      return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { table: TABLE, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
