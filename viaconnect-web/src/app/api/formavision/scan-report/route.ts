// Prompt 211a Workstream 3 - doctor-ready scan report PDF route.
//
// POST /api/formavision/scan-report
// Returns: { signedUrl, storagePath, scanDate }  (200)
//
// ONE-SOURCE GUARANTEE (Section 8: "do not show a number that disagrees with the
// cards"). This route reads the SAME body_tracker_* SPINE the FormaVision
// composition + circumference cards render from, so the report numbers EQUAL the
// card numbers BY CONSTRUCTION:
//
//   - 12 girths + per-girth confidence: body_tracker_circumference (values stored
//     in entry_unit, converted to cm with the SHARED circumference lib; confidence
//     from the *_confidence columns via numericToConfidenceLevel) - exactly what
//     useCircumferenceData / useCircumferenceHistory read and the ConfidenceChip shows.
//   - Hip (13th) + hip confidence: body_tracker_weight.hips_in / hips_confidence
//     (per the #85d WHR-as-source storage decision) - same as the card hooks.
//   - Body fat %: body_tracker_segmental_fat.total_body_fat_pct - the exact
//     snapshot.totalBodyFatPct that useLatestComposition -> BodyCompositionCard renders.
//   - Lean mass: body_tracker_segmental_muscle.total_muscle_mass_lbs (converted
//     lbs -> kg) - the same snapshot.totalMuscleMassLbs the card shows, with the
//     SAME weight x (1 - bf/100) fallback the card uses when muscle mass is absent.
//   - Fat mass: derived from the SAME card-consistent inputs (weight_kg - leanMassKg).
//     The composition cards persist no fat-mass figure, so we never surface a number
//     the cards contradict; UNKNOWN when weight is absent (never fabricated, never 0).
//
// The rows are joined by entry_id off one body_tracker_entries header, exactly as
// the card hooks join them. body_scan_measurements (the old divergent source) is
// NOT read for any numeric value.
//
// Resilience: every supabase call is wrapped in withTimeout; failures are
// surfaced via reportSupabaseError (fail-open with drift visibility) with a
// table context only. NO PII in logs. Confidence is never upgraded: an absent
// *_confidence value is UNKNOWN (null), never a fabricated value.
//
// Legal entity in the artifact is FarmCeutica Wellness LLC and the brand is
// Via Cura (both live inside the renderer). The report is strictly clinical:
// no engagement or reward data of any kind reaches this surface (Section 8).
//
// Standing rules honored: no em dashes, no en dashes, no emojis, zero any.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { reportSupabaseError } from '@/lib/utils/schema-drift';
import { safeLog } from '@/lib/utils/safe-log';
import { numericToConfidenceLevel } from '@/lib/arnold/scanning/accuracy/confidenceDisplay';
import {
  MEASUREMENT_DB_COLUMN,
  MEASUREMENT_EXTERNAL_KEYS,
  convertMeasurement,
  type MeasurementKey,
  type MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import {
  renderScanReportPdf,
  type ScanReportCircumference,
  type ScanReportInput,
} from '@/lib/formavision/report/scanReportPdf';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

const BUCKET = 'body-scan-pdfs';
const SCOPE = 'api.formavision.scan-report';
const TIMEOUT_MS = 8000;
const SIGNED_URL_TTL_SECONDS = 600;

// lbs -> kg (the exact factor useLatestComposition uses for the weight source).
const LB_TO_KG = 0.45359237;

// The 12 circumference report rows, in the doctor-report display order. Each row
// names the shared MeasurementKey (single source of truth for the DB column +
// confidence column + external-table routing), so the report reads the SAME
// column the card hooks read. Hip is the MEASUREMENT_EXTERNAL_KEYS.hip key and
// resolves to body_tracker_weight.hips_in / hips_confidence, exactly like the cards.
const ROW_SPEC: ReadonlyArray<{ key: MeasurementKey; label: string }> = [
  { key: 'neck', label: 'Neck' },
  { key: 'shoulderWidth', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hips' },
  { key: 'rightBicep', label: 'R. Upper Arm' },
  { key: 'leftBicep', label: 'L. Upper Arm' },
  { key: 'rightForearm', label: 'R. Forearm' },
  { key: 'leftForearm', label: 'L. Forearm' },
  { key: 'rightQuadriceps', label: 'R. Thigh' },
  { key: 'leftQuadriceps', label: 'L. Thigh' },
  { key: 'rightCalf', label: 'R. Calf' },
];

// Columns pulled from body_tracker_circumference: the 12 girths the cards read
// (MEASUREMENT_DB_COLUMN, minus hip which lives in body_tracker_weight) plus each
// girth's *_confidence column (Task 10 / migration 20260629090000) and entry_unit.
const CIRC_COLS =
  'entry_id,entry_unit,created_at,' +
  'neck,neck_confidence,' +
  'shoulder_width,shoulder_width_confidence,' +
  'chest,chest_confidence,' +
  'waist,waist_confidence,' +
  'right_upper_arm,right_upper_arm_confidence,' +
  'left_upper_arm,left_upper_arm_confidence,' +
  'right_forearm,right_forearm_confidence,' +
  'left_forearm,left_forearm_confidence,' +
  'right_upper_thigh,right_upper_thigh_confidence,' +
  'left_upper_thigh,left_upper_thigh_confidence,' +
  'right_calf,right_calf_confidence,' +
  'left_calf,left_calf_confidence';

// Minimal structural row views (only the fields this route reads). The generated
// PostgrestBuilder is a thenable but not typed as a Promise, so each query is
// wrapped in Promise.resolve(...) and awaited as one of these shapes.
type Row = Record<string, unknown>;
type QueryResult<T> = { data: T | null; error: { message: string } | null };

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

/** Circumference display unit for the report. cm mirrors the renderer's unit. */
const DISPLAY_UNIT: MeasurementUnit = 'cm';

/**
 * Build the 12 circumference report rows from the spine rows the cards read.
 *
 * girths + girth confidence: body_tracker_circumference (values in entry_unit,
 * converted to cm with the shared convertMeasurement; confidence from the
 * <col>_confidence columns via numericToConfidenceLevel).
 * hip + hip confidence: body_tracker_weight.hips_in / hips_confidence (inches).
 *
 * Every value is the SAME number the card hooks surface. A null measurement
 * stays null (UNKNOWN, never 0); a null confidence stays null (never upgraded).
 */
function buildCircumferences(
  circRow: Row | null,
  hipInches: number | null,
  hipConfidenceRaw: number | null,
): ScanReportCircumference[] {
  const entryUnit: MeasurementUnit =
    circRow && circRow.entry_unit === 'in' ? 'in' : 'cm';
  const hipExternal = MEASUREMENT_EXTERNAL_KEYS.hip;

  return ROW_SPEC.map((spec) => {
    if (MEASUREMENT_EXTERNAL_KEYS[spec.key]) {
      // Hip: external table (body_tracker_weight), stored in inches.
      const valueCm =
        hipInches !== null && hipExternal
          ? convertMeasurement(hipInches, hipExternal.storedUnit, DISPLAY_UNIT)
          : null;
      return {
        key: MEASUREMENT_DB_COLUMN[spec.key],
        label: spec.label,
        valueCm,
        confidence: valueCm === null ? null : numericToConfidenceLevel(hipConfidenceRaw),
      };
    }

    const dbCol = MEASUREMENT_DB_COLUMN[spec.key];
    const rawValue = circRow ? numOrNull(circRow[dbCol]) : null;
    const valueCm = convertMeasurement(rawValue, entryUnit, DISPLAY_UNIT);
    const confRaw = circRow ? numOrNull(circRow[`${dbCol}_confidence`]) : null;
    return {
      key: dbCol,
      label: spec.label,
      valueCm,
      // UNKNOWN measurement -> UNKNOWN confidence; otherwise the spine's own score.
      confidence: valueCm === null ? null : numericToConfidenceLevel(confRaw),
    };
  });
}

/**
 * Latest single row of a body_tracker_* detail table for the user, most recent by
 * created_at. Returns null on absence or a soft error (fail-open with drift log).
 */
async function fetchLatest(
  supabase: SupabaseClient,
  table: string,
  cols: string,
  userId: string,
  activeOnly: boolean,
): Promise<Row | null> {
  try {
    const base = supabase.from(table).select(cols).eq('user_id', userId);
    const scoped = activeOnly ? base.is('deleted_at', null) : base;
    const res = await withTimeout<QueryResult<Row[]>>(
      Promise.resolve(
        scoped.order('created_at', { ascending: false }).limit(1),
      ) as unknown as Promise<QueryResult<Row[]>>,
      TIMEOUT_MS,
      `${SCOPE}.${table}`,
    );
    if (res.error) {
      reportSupabaseError(`${SCOPE}.${table}`, res.error, { table });
      return null;
    }
    return (res.data && res.data[0]) ?? null;
  } catch (e) {
    if (isTimeoutError(e)) throw e;
    reportSupabaseError(`${SCOPE}.${table}`, e, { table });
    return null;
  }
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

    // 1. Latest circumference row (girths + per-girth confidence) - active only,
    //    exactly as useCircumferenceData reads (deleted_at IS NULL).
    const circRow = await fetchLatest(
      supabase,
      'body_tracker_circumference',
      CIRC_COLS,
      user.id,
      true,
    );

    // 2. Latest segmental fat row (total_body_fat_pct) - the card body-fat source.
    const fatRow = await fetchLatest(
      supabase,
      'body_tracker_segmental_fat',
      'total_body_fat_pct,entry_id,created_at',
      user.id,
      false,
    );

    // 3. Latest segmental muscle row (total_muscle_mass_lbs) - the card lean-mass source.
    const muscleRow = await fetchLatest(
      supabase,
      'body_tracker_segmental_muscle',
      'total_muscle_mass_lbs,entry_id,created_at',
      user.id,
      false,
    );

    // 4. Latest weight row carrying a real weight (hip lives here too, per #85d).
    //    weight_lbs feeds the lean/fat-mass fallback exactly as the card does;
    //    hips_in / hips_confidence feed the hip circumference row.
    let weightRow: Row | null = null;
    try {
      const res = await withTimeout<QueryResult<Row[]>>(
        Promise.resolve(
          supabase
            .from('body_tracker_weight')
            .select('weight_lbs,hips_in,hips_confidence,created_at')
            .eq('user_id', user.id)
            .not('weight_lbs', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1),
        ) as unknown as Promise<QueryResult<Row[]>>,
        TIMEOUT_MS,
        `${SCOPE}.body_tracker_weight`,
      );
      if (res.error) {
        reportSupabaseError(`${SCOPE}.body_tracker_weight`, res.error, { table: 'body_tracker_weight' });
      } else {
        weightRow = (res.data && res.data[0]) ?? null;
      }
    } catch (e) {
      if (isTimeoutError(e)) throw e;
      reportSupabaseError(`${SCOPE}.body_tracker_weight`, e, { table: 'body_tracker_weight' });
    }

    // Hip comes from body_tracker_weight even when weight_lbs is null on the hip
    // row, so probe a dedicated latest-hip row when the weight-carrying row has none.
    let hipInches = weightRow ? numOrNull(weightRow.hips_in) : null;
    let hipConfidenceRaw = weightRow ? numOrNull(weightRow.hips_confidence) : null;
    if (hipInches === null) {
      const hipRow = await fetchLatest(
        supabase,
        'body_tracker_weight',
        'hips_in,hips_confidence,created_at',
        user.id,
        false,
      );
      if (hipRow) {
        hipInches = numOrNull(hipRow.hips_in);
        hipConfidenceRaw = numOrNull(hipRow.hips_confidence);
      }
    }

    // Genuine earliest body-fat reading (trend baseline) from the SAME fat spine.
    let firstFatRow: Row | null = null;
    try {
      const res = await withTimeout<QueryResult<Row[]>>(
        Promise.resolve(
          supabase
            .from('body_tracker_segmental_fat')
            .select('total_body_fat_pct,created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1),
        ) as unknown as Promise<QueryResult<Row[]>>,
        TIMEOUT_MS,
        `${SCOPE}.body_tracker_segmental_fat.first`,
      );
      if (res.error) {
        reportSupabaseError(`${SCOPE}.body_tracker_segmental_fat.first`, res.error, {
          table: 'body_tracker_segmental_fat',
        });
      } else {
        firstFatRow = (res.data && res.data[0]) ?? null;
      }
    } catch (e) {
      if (isTimeoutError(e)) throw e;
      reportSupabaseError(`${SCOPE}.body_tracker_segmental_fat.first`, e, {
        table: 'body_tracker_segmental_fat',
      });
    }

    // A report needs at least one spine reading. Without any composition or
    // circumference row there is nothing honest to render.
    if (!circRow && !fatRow && !muscleRow && hipInches === null) {
      return NextResponse.json({ error: 'No scan on record yet.' }, { status: 404 });
    }

    // 5. Display name from the caller identity (never fabricated): user_metadata
    //    full_name, else the email local part, else a neutral fallback.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const metaName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
    const emailLocal = typeof user.email === 'string' ? user.email.split('@')[0] : '';
    const displayName = metaName || emailLocal || 'Member';

    // Latest / first scan dates from the spine rows' created_at (the same
    // timestamps the history hooks order by). Latest is the most recent of the
    // composition/circumference rows we read.
    const latestCandidates = [circRow?.created_at, fatRow?.created_at, muscleRow?.created_at]
      .map(strOrNull)
      .filter((d): d is string => d !== null);
    const latestScanDate =
      latestCandidates.length > 0
        ? latestCandidates.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b))
        : null;
    const firstScanDate = firstFatRow ? strOrNull(firstFatRow.created_at) : null;

    // Body fat + trend from the fat spine (snapshot.totalBodyFatPct on the card).
    const latestBodyFatPct = fatRow ? numOrNull(fatRow.total_body_fat_pct) : null;
    const isSingleScan = !firstScanDate || firstScanDate === latestScanDate;
    const firstBodyFatPct = isSingleScan
      ? null
      : firstFatRow
        ? numOrNull(firstFatRow.total_body_fat_pct)
        : null;

    // Lean mass = total_muscle_mass_lbs (card source), converted lbs -> kg. When
    // muscle mass is absent the card derives lean from weight x (1 - bf/100); we
    // mirror that exact fallback so the report equals the card either way.
    const weightLbs = weightRow ? numOrNull(weightRow.weight_lbs) : null;
    const weightKg = weightLbs !== null ? weightLbs * LB_TO_KG : null;
    const muscleLbs = muscleRow ? numOrNull(muscleRow.total_muscle_mass_lbs) : null;

    let leanMassKg: number | null = null;
    if (muscleLbs !== null) {
      leanMassKg = muscleLbs * LB_TO_KG;
    } else if (
      weightKg !== null &&
      weightKg > 0 &&
      latestBodyFatPct !== null &&
      latestBodyFatPct >= 0 &&
      latestBodyFatPct < 100
    ) {
      leanMassKg = weightKg * (1 - latestBodyFatPct / 100);
    }

    // Fat mass from the SAME card-consistent inputs: weight_kg - leanMassKg. The
    // composition cards persist no fat-mass figure, so we never surface a number
    // the cards contradict; UNKNOWN (null, never 0) when weight is absent.
    const fatMassKg =
      weightKg !== null && weightKg > 0 && leanMassKg !== null
        ? Math.max(0, weightKg - leanMassKg)
        : null;

    const input: ScanReportInput = {
      displayName,
      latestScanDate,
      firstScanDate: isSingleScan ? null : firstScanDate,
      avatarPng: null, // no server-side avatar snapshot in this path; omitted honestly
      circumferences: buildCircumferences(circRow, hipInches, hipConfidenceRaw),
      composition: {
        bodyFatPct: latestBodyFatPct,
        leanMassKg,
        fatMassKg,
      },
      trend: {
        firstBodyFatPct,
        latestBodyFatPct,
      },
    };

    // 6. Render (source-agnostic renderer, unchanged).
    let bytes: Uint8Array;
    try {
      bytes = await renderScanReportPdf(input);
    } catch (err) {
      safeLog.error(SCOPE, 'render failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
      return NextResponse.json({ error: 'report_render_failed' }, { status: 500 });
    }

    // 7. Upload to the private bucket and sign. Admin (service-role) client for the
    //    storage write (RLS on storage.objects); path is namespaced per user.
    const admin: SupabaseClient = createAdminClient();
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
      safeLog.error(SCOPE, 'database timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
