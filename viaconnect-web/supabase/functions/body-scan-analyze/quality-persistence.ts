// =============================================================================
// body-scan-analyze/quality-persistence.ts
//
// Prompt #169 Phase 1: Server-side persistence helpers for quality, tier,
// composition (CI columns), personal baseline drift, and CAQ delta.
//
// ADDITIVE ONLY. No existing body-scan-analyze logic is modified here.
// All functions are fail-open: they catch their own errors, log them via
// safeLog, and return without rethrowing so that the primary scan result
// is never blocked by ancillary persistence failures.
// =============================================================================

import { SupabaseClient }               from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { safeLog }                      from '../_shared/safe-log.ts';
import { flagDemographicDelta }         from './caq-delta.ts';
import {
  PERSONAL_BASELINE_BOOTSTRAP_SCANS,
  OUTLIER_SIGMA_THRESHOLD,
  TIER_CONFIDENCE_PCT,
  CI_Z_95,
} from './constants.ts';

// ---------------------------------------------------------------------------
// Input shapes (all optional; absent fields default to no-op)
// ---------------------------------------------------------------------------

export interface QualityScores {
  lighting:        number | null;
  pose:            number | null;
  clothing:        number | null;
  bgClutter:       number | null;
  cameraLevel:     number | null;
  frameCoverage:   number | null;
  overallPass:     boolean;
  blockingIssues:  unknown[];
  advisoryNotes:   string[];
}

export interface CalibrationInput {
  source:                  'credit_card' | 'user_height' | 'camera_intrinsics';
  scaleFactorPxPerCm:      number;
  floorPlaneInclinationDeg: number | null;
}

export interface FusedKeypoint {
  x:          number;
  y:          number;
  z:          number | null;
  confidence: number;
}

export interface ScanDemographics {
  height_cm: number;
  weight_kg: number;
}

export type DepthSensorType = 'none' | 'lidar' | 'arcore_depth' | 'truedepth';

export interface Phase1Inputs {
  quality_scores?:           QualityScores;
  calibration?:              CalibrationInput;
  fused_keypoints?:          FusedKeypoint[];
  tier?:                     1 | 2 | 3;
  device_model?:             string;
  device_os?:                string;
  depth_sensor_type?:        DepthSensorType;
  scan_reported_demographics?: ScanDemographics | null;
}

export interface CompositionValues {
  bodyFatPct:       number | null;
  leanMassKg:       number | null;
  fatMassKg:        number | null;
  waistNavelCircCm: number | null;
}

// ---------------------------------------------------------------------------
// Internal math helpers (replicated from personal-baseline-drift.ts; Deno
// cannot import src/lib so logic is duplicated. Keep in sync with
// viaconnect-web/src/lib/body-tracker/personal-baseline-drift.ts.)
// ---------------------------------------------------------------------------

function _mean(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function _sampleStdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = _mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

function _isOutlier(newValue: number, recentValues: number[], sigma = OUTLIER_SIGMA_THRESHOLD): boolean {
  if (recentValues.length === 0) return false;
  const std = _sampleStdDev(recentValues);
  if (std === 0) return false;
  const m = _mean(recentValues);
  return Math.abs((newValue - m) / std) > sigma;
}

// ---------------------------------------------------------------------------
// 1. Persist body_scan_quality
// ---------------------------------------------------------------------------

export async function persistQuality(
  sa:        SupabaseClient,
  sessionId: string,
  userId:    string,
  scores:    QualityScores,
): Promise<void> {
  try {
    const { error } = await sa.from('body_scan_quality').insert({
      session_id:                  sessionId,
      user_id:                     userId,
      lighting_score:              scores.lighting,
      pose_score:                  scores.pose,
      clothing_tightness_score:    scores.clothing,
      background_clutter_score:    scores.bgClutter,
      camera_level_score:          scores.cameraLevel,
      frame_coverage_score:        scores.frameCoverage,
      blocking_issues:             scores.blockingIssues ?? [],
    });
    if (error) {
      safeLog.error('body-scan-analyze', 'persistQuality insert failed', {
        scan_id:  sessionId,
        user_id:  userId,
        stage:    'persistQuality',
        error:    error.message,
      });
    } else {
      safeLog.info('body-scan-analyze', 'persistQuality ok', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'persistQuality',
      });
    }
  } catch (e) {
    safeLog.error('body-scan-analyze', 'persistQuality exception', {
      scan_id: sessionId,
      user_id: userId,
      stage:   'persistQuality',
      error:   String(e),
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Persist body_scan_tier_log
// ---------------------------------------------------------------------------

export async function persistTierLog(
  sa:               SupabaseClient,
  sessionId:        string,
  userId:           string,
  tier:             1 | 2 | 3,
  deviceModel?:     string,
  deviceOs?:        string,
  depthSensorType?: DepthSensorType,
): Promise<void> {
  try {
    const confidenceScore = TIER_CONFIDENCE_PCT[tier];
    const { error } = await sa.from('body_scan_tier_log').insert({
      session_id:        sessionId,
      user_id:           userId,
      tier,
      confidence_score:  confidenceScore,
      device_model:      deviceModel ?? null,
      device_os:         deviceOs ?? null,
      depth_sensor_type: depthSensorType ?? null,
    });
    if (error) {
      safeLog.error('body-scan-analyze', 'persistTierLog insert failed', {
        scan_id: sessionId,
        user_id: userId,
        tier,
        stage:   'persistTierLog',
        error:   error.message,
      });
    } else {
      safeLog.info('body-scan-analyze', 'persistTierLog ok', {
        scan_id: sessionId,
        user_id: userId,
        tier,
        stage:   'persistTierLog',
      });
    }
  } catch (e) {
    safeLog.error('body-scan-analyze', 'persistTierLog exception', {
      scan_id: sessionId,
      user_id: userId,
      stage:   'persistTierLog',
      error:   String(e),
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Persist body_scan_composition (with CI columns from drift baseline)
// ---------------------------------------------------------------------------

export async function persistComposition(
  sa:          SupabaseClient,
  sessionId:   string,
  userId:      string,
  composition: CompositionValues,
): Promise<void> {
  try {
    // Fetch the personal baseline for body_fat_pct so we can supply CI columns.
    // Fail-open if baseline is unavailable.
    let ciLow:  number | null = null;
    let ciHigh: number | null = null;

    if (composition.bodyFatPct !== null) {
      try {
        const { data: baselineRow } = await sa
          .from('body_scan_personal_baselines')
          .select('std_dev')
          .eq('user_id', userId)
          .eq('measurement_type', 'body_fat_pct')
          .maybeSingle();
        if (baselineRow && baselineRow.std_dev !== null) {
          const halfWidth = CI_Z_95 * Number(baselineRow.std_dev);
          ciLow  = composition.bodyFatPct - halfWidth;
          ciHigh = composition.bodyFatPct + halfWidth;
        }
      } catch {
        // Baseline fetch failed; CI stays null (acceptable).
      }
    }

    const { error } = await sa.from('body_scan_composition').insert({
      session_id:           sessionId,
      user_id:              userId,
      body_fat_pct:         composition.bodyFatPct,
      ci_low_body_fat_pct:  ciLow,
      ci_high_body_fat_pct: ciHigh,
      lean_mass_kg:         composition.leanMassKg,
      fat_mass_kg:          composition.fatMassKg,
    });
    if (error) {
      safeLog.error('body-scan-analyze', 'persistComposition insert failed', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'persistComposition',
        error:   error.message,
      });
    } else {
      safeLog.info('body-scan-analyze', 'persistComposition ok', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'persistComposition',
      });
    }
  } catch (e) {
    safeLog.error('body-scan-analyze', 'persistComposition exception', {
      scan_id: sessionId,
      user_id: userId,
      stage:   'persistComposition',
      error:   String(e),
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Persist calibration into body_photo_sessions columns / extracted_measurements
// ---------------------------------------------------------------------------

export async function persistCalibration(
  sa:          SupabaseClient,
  sessionId:   string,
  userId:      string,
  calibration: CalibrationInput,
): Promise<void> {
  try {
    // The T2 migration did not add a dedicated body_scan_calibration table.
    // Calibration source goes into body_photo_sessions.calibration_source (TEXT).
    // The scale factor is stored under a 'calibration' key in
    // body_photo_sessions.extracted_measurements (JSONB). Per spec §T5.
    const { error } = await sa
      .from('body_photo_sessions')
      .update({
        calibration_source: calibration.source,
        calibration_date:   new Date().toISOString().slice(0, 10),
        extracted_measurements: {
          calibration: {
            source:                  calibration.source,
            scale_factor_px_per_cm:  calibration.scaleFactorPxPerCm,
            floor_plane_inclination_deg: calibration.floorPlaneInclinationDeg,
          },
        },
      })
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (error) {
      safeLog.error('body-scan-analyze', 'persistCalibration update failed', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'persistCalibration',
        error:   error.message,
      });
    } else {
      safeLog.info('body-scan-analyze', 'persistCalibration ok', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'persistCalibration',
      });
    }
  } catch (e) {
    safeLog.error('body-scan-analyze', 'persistCalibration exception', {
      scan_id: sessionId,
      user_id: userId,
      stage:   'persistCalibration',
      error:   String(e),
    });
  }
}

// ---------------------------------------------------------------------------
// 5. CAQ Phase 1 demographic delta flag
//    Fetches assessment_results phase=1 (or profiles as fallback) and
//    appends delta reasons into body_photo_sessions.quality_issues TEXT[].
// ---------------------------------------------------------------------------

export async function checkAndFlagCaqDelta(
  sa:                    SupabaseClient,
  sessionId:             string,
  userId:                string,
  scanReportedDemographics: ScanDemographics,
): Promise<void> {
  try {
    // Primary: assessment_results phase=1, data->height / data->weight.
    // The CAQ stores height as a string (parseFloat-able) in data.height
    // and weight in data.weight per src/app/api/recommendations/generate/route.ts.
    // Fallback: profiles.height_cm / profiles.weight_kg.
    let caqHeight: number | null = null;
    let caqWeight: number | null = null;

    const { data: arRow } = await sa
      .from('assessment_results')
      .select('data')
      .eq('user_id', userId)
      .eq('phase', 1)
      .maybeSingle();

    if (arRow?.data) {
      const d = arRow.data as Record<string, unknown>;
      if (d.height) caqHeight = parseFloat(String(d.height)) || null;
      if (d.weight) caqWeight = parseFloat(String(d.weight)) || null;
    }

    // Fallback to profiles if assessment_results has no data.
    if (caqHeight === null || caqWeight === null) {
      const { data: profileRow } = await sa
        .from('profiles')
        .select('height_cm, weight_kg')
        .eq('id', userId)
        .maybeSingle();
      if (profileRow) {
        if (caqHeight === null && profileRow.height_cm !== null) {
          caqHeight = Number(profileRow.height_cm);
        }
        if (caqWeight === null && profileRow.weight_kg !== null) {
          caqWeight = Number(profileRow.weight_kg);
        }
      }
    }

    if (caqHeight === null || caqWeight === null) {
      // No CAQ demographics found; nothing to flag.
      safeLog.info('body-scan-analyze', 'checkAndFlagCaqDelta no caq data', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'checkAndFlagCaqDelta',
      });
      return;
    }

    const result = flagDemographicDelta(scanReportedDemographics, {
      height_cm: caqHeight,
      weight_kg: caqWeight,
    });

    if (!result.flagged) {
      safeLog.info('body-scan-analyze', 'checkAndFlagCaqDelta no delta', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'checkAndFlagCaqDelta',
      });
      return;
    }

    // Append reasons to body_photo_sessions.quality_issues.
    // Use a PostgreSQL array concatenation RPC approach via raw SQL through
    // the Supabase client. The cleanest approach is to fetch the existing
    // array and merge, then update.
    const { data: sessionRow } = await sa
      .from('body_photo_sessions')
      .select('quality_issues')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    const existing: string[] = Array.isArray(sessionRow?.quality_issues)
      ? (sessionRow!.quality_issues as string[])
      : [];
    const merged = [...existing, ...result.reasons];

    const { error } = await sa
      .from('body_photo_sessions')
      .update({ quality_issues: merged })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      safeLog.error('body-scan-analyze', 'checkAndFlagCaqDelta update failed', {
        scan_id: sessionId,
        user_id: userId,
        stage:   'checkAndFlagCaqDelta',
        error:   error.message,
      });
    } else {
      safeLog.info('body-scan-analyze', 'checkAndFlagCaqDelta flagged', {
        scan_id:  sessionId,
        user_id:  userId,
        stage:    'checkAndFlagCaqDelta',
        reasons:  result.reasons,
      });
    }
  } catch (e) {
    safeLog.error('body-scan-analyze', 'checkAndFlagCaqDelta exception', {
      scan_id: sessionId,
      user_id: userId,
      stage:   'checkAndFlagCaqDelta',
      error:   String(e),
    });
  }
}

// ---------------------------------------------------------------------------
// 6. Personal baseline drift correction for body_fat_pct (and waist_navel)
//    Fetches recent N scans from body_scan_composition, computes std-dev,
//    upserts body_scan_personal_baselines, and appends outlier flag if >2 sigma.
// ---------------------------------------------------------------------------

export async function updatePersonalBaseline(
  sa:              SupabaseClient,
  sessionId:       string,
  userId:          string,
  bodyFatPct:      number | null,
  waistNavelCm:    number | null,
): Promise<void> {
  try {
    await _updateBaselineForMeasurement(
      sa, sessionId, userId, 'body_fat_pct', bodyFatPct,
    );
    if (waistNavelCm !== null) {
      await _updateBaselineForMeasurement(
        sa, sessionId, userId, 'waist_navel_circ_cm', waistNavelCm,
      );
    }
  } catch (e) {
    safeLog.error('body-scan-analyze', 'updatePersonalBaseline exception', {
      scan_id: sessionId,
      user_id: userId,
      stage:   'updatePersonalBaseline',
      error:   String(e),
    });
  }
}

async function _updateBaselineForMeasurement(
  sa:              SupabaseClient,
  sessionId:       string,
  userId:          string,
  measurementType: 'body_fat_pct' | 'waist_navel_circ_cm',
  newValue:        number | null,
): Promise<void> {
  if (newValue === null) return;

  try {
    // Pull the N most recent composition rows (including the one just inserted).
    const selectCol = measurementType === 'body_fat_pct' ? 'body_fat_pct' : 'id';
    // body_scan_composition stores body_fat_pct; waist_navel is in body_scan_measurements.
    // For waist_navel_circ_cm we query body_scan_measurements; for body_fat_pct we
    // query body_scan_composition.
    let recentValues: number[] = [];

    if (measurementType === 'body_fat_pct') {
      const { data: rows } = await sa
        .from('body_scan_composition')
        .select('body_fat_pct')
        .eq('user_id', userId)
        .not('body_fat_pct', 'is', null)
        .order('computed_at', { ascending: false })
        .limit(PERSONAL_BASELINE_BOOTSTRAP_SCANS);

      recentValues = (rows ?? [])
        .map((r: Record<string, unknown>) => Number(r[selectCol]))
        .filter((v: number) => Number.isFinite(v));
    } else {
      // waist_navel_circ_cm lives in body_scan_measurements.
      const { data: rows } = await sa
        .from('body_scan_measurements')
        .select('waist_navel_circ_cm')
        .eq('user_id', userId)
        .not('waist_navel_circ_cm', 'is', null)
        .order('created_at', { ascending: false })
        .limit(PERSONAL_BASELINE_BOOTSTRAP_SCANS);

      recentValues = (rows ?? [])
        .map((r: Record<string, unknown>) => Number(r['waist_navel_circ_cm']))
        .filter((v: number) => Number.isFinite(v));
    }

    if (recentValues.length < PERSONAL_BASELINE_BOOTSTRAP_SCANS) {
      // Not enough data yet.
      safeLog.info('body-scan-analyze', 'baseline insufficient data', {
        scan_id:          sessionId,
        user_id:          userId,
        stage:            '_updateBaselineForMeasurement',
        measurement_type: measurementType,
        sample_size:      recentValues.length,
      });
      return;
    }

    const n      = recentValues.length;
    const m      = recentValues.reduce((acc, v) => acc + v, 0) / n;
    const stdDev = _sampleStdDev(recentValues);

    // Upsert into body_scan_personal_baselines.
    const { error: upsertErr } = await sa
      .from('body_scan_personal_baselines')
      .upsert(
        {
          user_id:          userId,
          measurement_type: measurementType,
          std_dev:          stdDev,
          sample_size:      n,
          computed_at:      new Date().toISOString(),
        },
        { onConflict: 'user_id,measurement_type' },
      );

    if (upsertErr) {
      safeLog.error('body-scan-analyze', 'baseline upsert failed', {
        scan_id:          sessionId,
        user_id:          userId,
        stage:            '_updateBaselineForMeasurement',
        measurement_type: measurementType,
        error:            upsertErr.message,
      });
      return;
    }

    safeLog.info('body-scan-analyze', 'baseline upserted', {
      scan_id:          sessionId,
      user_id:          userId,
      stage:            '_updateBaselineForMeasurement',
      measurement_type: measurementType,
      std_dev:          stdDev,
      sample_size:      n,
      mean:             m,
    });

    // Outlier check: is the newest value >2 sigma from the prior mean?
    // Use prior values (exclude the new one) for outlier detection if N > 1.
    const priorValues = recentValues.slice(1); // newest is index 0 due to DESC order
    if (priorValues.length >= 2 && _isOutlier(newValue, priorValues)) {
      const outlierMsg = measurementType === 'body_fat_pct'
        ? 'Outlier: body fat reading 2 sigma from your baseline. Confirm before saving.'
        : 'Outlier: waist measurement reading 2 sigma from your baseline. Confirm before saving.';

      const { data: sessionRow } = await sa
        .from('body_photo_sessions')
        .select('quality_issues')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();

      const existing: string[] = Array.isArray(sessionRow?.quality_issues)
        ? (sessionRow!.quality_issues as string[])
        : [];

      if (!existing.includes(outlierMsg)) {
        const { error: updateErr } = await sa
          .from('body_photo_sessions')
          .update({ quality_issues: [...existing, outlierMsg] })
          .eq('id', sessionId)
          .eq('user_id', userId);

        if (updateErr) {
          safeLog.error('body-scan-analyze', 'outlier flag update failed', {
            scan_id:          sessionId,
            user_id:          userId,
            stage:            '_updateBaselineForMeasurement',
            measurement_type: measurementType,
            error:            updateErr.message,
          });
        } else {
          safeLog.warn('body-scan-analyze', 'outlier flagged', {
            scan_id:          sessionId,
            user_id:          userId,
            stage:            '_updateBaselineForMeasurement',
            measurement_type: measurementType,
            new_value:        newValue,
            outlier_msg:      outlierMsg,
          });
        }
      }
    }
  } catch (e) {
    safeLog.error('body-scan-analyze', '_updateBaselineForMeasurement exception', {
      scan_id:          sessionId,
      user_id:          userId,
      stage:            '_updateBaselineForMeasurement',
      measurement_type: measurementType,
      error:            String(e),
    });
  }
}
