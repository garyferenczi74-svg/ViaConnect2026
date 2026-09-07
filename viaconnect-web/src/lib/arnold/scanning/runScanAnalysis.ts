'use client';

// Top-level scan orchestrator. Runs the full pipeline for a given
// photo session and persists results. Designed to be invoked from a
// React component; progress events surfaced via onProgress callback.

import { createClient } from '@/lib/supabase/client';
import { processSilhouette, ensureSelfieSegmenter } from './silhouetteProcessor';
import { detectLandmarks, ensureImagePoseLandmarker } from './landmarkDetector';
import { assessQuality } from './scanQualityAssessor';
import { extractMeasurements, unknownExtractedMeasurements } from './measurementEngine';
import { classifyCircFail, circFailDetail, type CircViewFail } from './circFailReason';
import { analyzeAsymmetry } from './asymmetryAnalyzer';
import { navyBodyFat } from './navyBodyFat';
import { cunbaeBodyFat } from './cunbaeBodyFat';
import { blendComposition } from './compositionBlender';
import { applyCalibration } from './calibrationManager';
import { ingestMeasurementsFromScan, type IngestClient } from '@/lib/body-measurements/ingestScanMeasurements';
import { resolveWeightKg } from '@/lib/scan/clinicalBodyMetrics';
import { safeLog } from '@/lib/utils/safe-log';
import { assessCaptureQuality } from './accuracy/captureQuality';
import { silhouetteToQualityInput, retakePromptForIssues, type ViewQualityResult } from './accuracy/silhouetteToQualityInput';
import type {
  BiologicalSex,
  CompositionEstimate,
  ExtractedMeasurements,
  ManualCalibrationInput,
  PoseId,
  PoseSilhouette,
  BodyModelParameters,
  AsymmetryReport,
} from './types';

export type { ViewQualityResult };

export interface ScanProgress {
  phase:
    | 'idle'
    | 'loading_models'
    | 'processing_front'
    | 'processing_back'
    | 'processing_left'
    | 'processing_right'
    | 'measuring'
    | 'estimating_composition'
    | 'saving'
    | 'complete'
    | 'failed';
  percent: number;
  message: string;
}

export interface ScanAnalysisOutput {
  measurements: ExtractedMeasurements;
  composition: CompositionEstimate;
  asymmetry: AsymmetryReport;
  avatarParameters: BodyModelParameters;
  qualityScore: number;
  qualityIssues: string[];
}

export interface ScanAnalysisInputs {
  sessionId: string;
  onProgress?: (p: ScanProgress) => void;
}

// ---------------------------------------------------------------------------
// In-memory measurement pipeline (Task 9 - Prompt 210c)
// Runs client-side on the four in-memory capture Blobs.
// Pixels NEVER leave the device for this path; no bucket download occurs.
// Each per-view CV inference is wrapped in Promise.race with a 4-second timeout
// and a try/catch fail-open: a slow or failing view contributes UNKNOWN to
// extractMeasurements, and the run always completes (never hangs).
// ---------------------------------------------------------------------------

/** Per-view CV inference timeout in milliseconds. Set to 4 s (Section 13). */
export const VIEW_INFERENCE_TIMEOUT_MS = 4000;

/**
 * Front view only: IMAGE WASM detect + TFJS selfie can still pay residual
 * work after pre-warm. Side/back stay at 4s. Fail-open if this still loses.
 */
export const VIEW_INFERENCE_FRONT_TIMEOUT_MS = 12000;

export function viewInferenceTimeoutMs(pose: PoseId): number {
  return pose === 'front' ? VIEW_INFERENCE_FRONT_TIMEOUT_MS : VIEW_INFERENCE_TIMEOUT_MS;
}

/** Input for the in-memory client-side measurement pipeline. */
export interface InMemoryPhotoInput {
  /** The four capture Blobs keyed by PoseId. Absent poses are skipped. */
  photos: Partial<Record<PoseId, Blob>>;
  /** User's height in cm (required for pixel-to-cm scale). */
  heightCm: number;
  /** Biological sex, used by extractMeasurements. */
  sex: BiologicalSex;
  /** Optional progress callback (mirrors ScanProgress phases). */
  onProgress?: (p: ScanProgress) => void;
  /**
   * Optional per-view quality callback (Task 13b).
   * Called immediately after each silhouette's quality is assessed.
   * Fires even for views that fail (pass: false) - the caller can use the
   * result to display retake prompts or log the failure.
   * RULE 9: a failed quality result does NOT silently become a good measurement;
   * the silhouette.qualityScore is set from the assessment so that downstream
   * confidence scoring reflects the actual capture quality.
   */
  onViewQuality?: (result: ViewQualityResult) => void;
}

/**
 * Run the full client-side geometric measurement pipeline on in-memory Blobs.
 * This is the 209 capture path: pixels never leave the device.
 * Produces ExtractedMeasurements with per-field confidence + UNKNOWN (null)
 * for any measurement that could not be determined (RULE 9: never cm:0).
 */
export async function runInMemoryMeasurement(
  input: InMemoryPhotoInput,
): Promise<ExtractedMeasurements> {
  const { photos, heightCm, sex, onProgress, onViewQuality } = input;
  const report = (phase: ScanProgress['phase'], percent: number, message: string) =>
    onProgress?.({ phase, percent, message });

  report('loading_models', 5, 'Loading scan models');
  await Promise.all([ensureImagePoseLandmarker(), ensureSelfieSegmenter()]);

  const poses: PoseId[] = ['front', 'back', 'left', 'right'];
  const progressSteps: Record<PoseId, ScanProgress['phase']> = {
    front: 'processing_front',
    back:  'processing_back',
    left:  'processing_left',
    right: 'processing_right',
  };

  const silhouettes: PoseSilhouette[] = [];
  const viewFails: CircViewFail[] = [];

  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    const blob = photos[pose];
    if (!blob) continue;

    report(progressSteps[pose], 10 + i * 18, `Processing ${pose} view`);
    const viewBudgetMs = viewInferenceTimeoutMs(pose);

    try {
      const silhouette = await Promise.race([
        (async (): Promise<PoseSilhouette> => {
          const landmarks = await detectLandmarks(blob);
          if (Object.keys(landmarks).length === 0) {
            const fail: CircViewFail = { pose, reason: 'empty_landmarks' };
            viewFails.push(fail);
            safeLog.warn(
              'arnold.scanning.inmemory',
              `${pose} view empty landmarks (fail-open, no invented cm)`,
              fail,
            );
          }
          return processSilhouette({ blob, poseId: pose, userHeightCm: heightCm, landmarks });
        })(),
        new Promise<never>((_, rej) =>
          setTimeout(
            () => rej(new Error(`[T9] ${pose} view CV timeout after ${viewBudgetMs}ms`)),
            viewBudgetMs,
          ),
        ),
      ]);

      // Task 13b: per-view quality assessment (additive, never alters T9/T10 path).
      // Maps the silhouette to a CaptureQualityInput and runs assessCaptureQuality.
      // The result populates silhouette.qualityScore + silhouette.qualityIssues so
      // downstream confidence scoring (confidenceModel.ts) reflects actual capture
      // quality. RULE 9: a failed view is flagged low-confidence, never silently
      // treated as good.
      try {
        const qualityInput = silhouetteToQualityInput(silhouette, pose);
        const qualityResult = assessCaptureQuality(qualityInput);
        // Populate the stubbed fields on the silhouette (Section 5.4)
        silhouette.qualityScore = qualityResult.score;
        silhouette.qualityIssues = qualityResult.issues;
        const viewResult: ViewQualityResult = {
          poseId: pose,
          score: qualityResult.score,
          issues: qualityResult.issues,
          pass: qualityResult.pass,
          retakePrompt: qualityResult.pass ? '' : retakePromptForIssues(qualityResult.issues),
        };
        onViewQuality?.(viewResult);
        if (!qualityResult.pass) {
          safeLog.warn(
            'arnold.scanning.inmemory',
            `[T13b] ${pose} view failed quality check - measurements will be low-confidence`,
            { pose, score: qualityResult.score, issues: qualityResult.issues },
          );
        }
      } catch (qErr) {
        // Quality assessment is non-fatal: the pipeline continues even if the
        // quality check itself errors (fail-open, graceful degradation).
        safeLog.warn(
          'arnold.scanning.inmemory',
          `[T13b] ${pose} view quality assessment failed (non-fatal, continuing)`,
          { pose, error: qErr instanceof Error ? qErr.message : String(qErr) },
        );
      }

      silhouettes.push(silhouette);
    } catch (err) {
      // Fail-open: log the honest reason and skip this view.
      // Its measurements will be UNKNOWN (null), never fabricated (RULE 9).
      const reason = classifyCircFail({ error: err });
      const fail: CircViewFail = { pose, reason, detail: circFailDetail(err) };
      viewFails.push(fail);
      safeLog.warn(
        'arnold.scanning.inmemory',
        `${pose} view ${reason} - treated as UNKNOWN (fail-open, no invented cm)`,
        fail,
      );
    }
  }

  report('measuring', 82, 'Extracting measurements from silhouettes');

  let measurements;
  try {
    measurements = extractMeasurements({ silhouettes, sex, heightCm });
  } catch (err) {
    const fail: CircViewFail = {
      pose: 'extract',
      reason: 'extract_throw',
      detail: circFailDetail(err),
    };
    viewFails.push(fail);
    safeLog.warn(
      'arnold.scanning.inmemory',
      'extractMeasurements threw - UNKNOWN girths (fail-open, no invented cm)',
      fail,
    );
    measurements = unknownExtractedMeasurements();
  }

  report('complete', 100, 'Client-side measurement complete');
  safeLog.info(
    'arnold.scanning.inmemory',
    'In-memory scan measurement complete',
    {
      viewsProcessed: silhouettes.length,
      totalViews: poses.filter((p) => p in photos).length,
      viewFails,
      // Height stamp is NOT the live circ gate. Girth POST is hasFiniteGeometricGirth.
      circGate: 'hasFiniteGeometricGirth',
    },
  );

  return measurements;
}

interface SessionRow {
  id: string;
  user_id: string;
  session_date: string;
  front_full_path: string | null;
  back_full_path: string | null;
  left_full_path: string | null;
  right_full_path: string | null;
  arnold_analysis: Record<string, unknown> | null;
}

interface ProfileRow {
  sex: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
}

export async function runScanAnalysis({ sessionId, onProgress }: ScanAnalysisInputs): Promise<ScanAnalysisOutput> {
  const supabase = createClient();
  const report = (phase: ScanProgress['phase'], percent: number, message: string) =>
    onProgress?.({ phase, percent, message });

  report('loading_models', 5, 'Loading scan models');
  await Promise.all([ensureImagePoseLandmarker(), ensureSelfieSegmenter()]);

  const { data: session, error: sErr } = await supabase
    .from('body_photo_sessions')
    .select('id, user_id, session_date, front_full_path, back_full_path, left_full_path, right_full_path, arnold_analysis')
    .eq('id', sessionId)
    .maybeSingle();
  if (sErr || !session) throw new Error('Scan session not found');

  await supabase.from('body_photo_sessions').update({ scan_status: 'extracting' } as never).eq('id', sessionId);

  const { data: profile } = await supabase
    .from('profiles')
    .select('sex, date_of_birth, height_cm, weight_kg')
    .eq('id', (session as unknown as SessionRow).user_id)
    .maybeSingle();

  const p = profile as unknown as ProfileRow | null;
  const sex: BiologicalSex = p?.sex === 'female' ? 'female' : 'male';
  const heightCm = p?.height_cm ?? null;
  const resolvedWeight = await resolveWeightKg(supabase, (session as unknown as SessionRow).user_id);
  const weightKg = resolvedWeight.weightKg;
  const age = p?.date_of_birth
    ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400000))
    : 30;

  if (!heightCm || !weightKg) {
    throw new Error('Height and a real CAQ/clinical weight are required for scan analysis. Never invent weight.');
  }

  // Phase-by-phase silhouette extraction
  const poses: PoseId[] = ['front', 'back', 'left', 'right'];
  const silhouettes: PoseSilhouette[] = [];
  const progressSteps: Record<PoseId, ScanProgress['phase']> = {
    front: 'processing_front',
    back:  'processing_back',
    left:  'processing_left',
    right: 'processing_right',
  };

  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    const path = (session as unknown as SessionRow)[`${pose}_full_path`];
    if (!path) continue;
    report(progressSteps[pose], 10 + i * 20, `Analyzing ${pose} view`);

    const { data: blobData, error: dErr } = await supabase.storage.from('body-progress-photos').download(path);
    if (dErr || !blobData) continue;

    try {
      const landmarks = await detectLandmarks(blobData);
      const sil = await processSilhouette({ blob: blobData, poseId: pose, userHeightCm: heightCm, landmarks });
      silhouettes.push(sil);
    } catch (e) {
      console.warn(`[runScanAnalysis] ${pose} pose failed`, e);
    }
  }

  if (silhouettes.length === 0) {
    await supabase
      .from('body_photo_sessions')
      .update({ scan_status: 'failed' } as never)
      .eq('id', sessionId);
    throw new Error('No photos could be analyzed. Verify captures have good lighting and a clear view of your full body.');
  }

  const quality = assessQuality(silhouettes);
  silhouettes.forEach((s) => {
    s.qualityScore = quality.score;
    s.qualityIssues = quality.issues.filter((i) => i.endsWith(s.poseId));
  });

  report('measuring', 70, 'Extracting measurements');
  await supabase.from('body_photo_sessions').update({ scan_status: 'measuring' } as never).eq('id', sessionId);

  let measurements;
  try {
    measurements = extractMeasurements({ silhouettes, sex, heightCm });
  } catch (err) {
    safeLog.warn(
      'arnold.scanning',
      'extractMeasurements threw - UNKNOWN girths (fail-open, no invented cm)',
      { reason: 'extract_throw', detail: circFailDetail(err) },
    );
    measurements = unknownExtractedMeasurements();
  }

  // Calibrate with latest tape measurements if available
  const { data: tapeRow } = await supabase
    .from('body_tracker_weight')
    .select('waist_in, hips_in, chest_in, neck_in, right_arm_in, left_arm_in, right_thigh_in, left_thigh_in, right_calf_in, left_calf_in, created_at')
    .eq('user_id', (session as unknown as SessionRow).user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let calibratedWithManual = false;
  let calibrationSource: string | null = null;
  let calibrationDate: string | null = null;

  if (tapeRow) {
    const t = tapeRow as Record<string, number | string | null>;
    const toCm = (inches: number | null) => (inches == null ? undefined : inches * 2.54);
    const manual: ManualCalibrationInput = {
      tapeMeasurements: {
        waist_natural: toCm(t.waist_in as number | null)  ?? 0,
        hips:          toCm(t.hips_in as number | null)   ?? 0,
        chest:         toCm(t.chest_in as number | null)  ?? 0,
        neck:          toCm(t.neck_in as number | null)   ?? 0,
        right_arm:     toCm(t.right_arm_in as number | null) ?? 0,
        left_arm:      toCm(t.left_arm_in as number | null)  ?? 0,
        right_thigh:   toCm(t.right_thigh_in as number | null) ?? 0,
        left_thigh:    toCm(t.left_thigh_in as number | null) ?? 0,
        right_calf:    toCm(t.right_calf_in as number | null) ?? 0,
        left_calf:     toCm(t.left_calf_in as number | null) ?? 0,
      },
      calibratedAtDate: t.created_at as string | null,
    };
    // Strip zeroed entries so the calibration only applies where we have real manual values
    const nonZero: Record<string, number> = {};
    for (const [k, v] of Object.entries(manual.tapeMeasurements!)) {
      if (v && v > 0) nonZero[k] = v;
    }
    if (Object.keys(nonZero).length > 0) {
      const applied = applyCalibration(measurements, { ...manual, tapeMeasurements: nonZero });
      measurements = applied.calibrated;
      if (applied.calibratedCount > 0) {
        calibratedWithManual = true;
        calibrationSource = applied.calibrationSource;
        calibrationDate = applied.calibrationDate;
      }
    }
  }

  report('estimating_composition', 85, 'Estimating body composition');
  // null (UNKNOWN) circumferences are coerced to 0 for the Navy formula;
  // navyBodyFat treats 0 as an invalid input and returns valid:false, so
  // composition.navyBodyFatPct will be null rather than a fabricated estimate.
  const navy = navyBodyFat({
    sex,
    heightCm,
    neckCm:  measurements.neckCirc.cm          ?? 0,
    waistCm: measurements.waistNaturalCirc.cm  ?? 0,
    hipCm:   sex === 'female' ? (measurements.hipCirc.cm ?? 0) : undefined,
  });
  const cunbae = cunbaeBodyFat({ weightKg, heightCm, age, sex });

  const visualRange = extractVisualRange((session as unknown as SessionRow).arnold_analysis);
  const manualSnapshot = await loadManualSnapshot(supabase, (session as unknown as SessionRow).user_id);

  const composition = blendComposition({
    sex,
    heightCm,
    weightKg,
    navyBodyFatPct: navy.valid ? navy.bodyFatPct : null,
    visualLowPct: visualRange?.low ?? null,
    visualHighPct: visualRange?.high ?? null,
    bmiBodyFatPct: cunbae.valid ? cunbae.bodyFatPct : null,
    manualBodyFatPct: manualSnapshot.pct,
    manualSource: manualSnapshot.source,
    manualConfidence: manualSnapshot.confidence,
  });

  const asymmetry = analyzeAsymmetry(measurements);

  const avatarParameters = buildAvatarParameters({
    measurements,
    sex,
    heightCm,
    bodyFatPct: composition.bodyFatPct.mid,
  });

  report('saving', 95, 'Saving results');
  await persistScan({
    supabase,
    session: session as unknown as SessionRow,
    measurements,
    composition,
    asymmetry,
    avatarParameters,
    silhouettes,
    quality,
    calibratedWithManual,
    calibrationSource,
    calibrationDate,
  });

  report('complete', 100, 'Scan complete');

  return {
    measurements,
    composition,
    asymmetry,
    avatarParameters,
    qualityScore: quality.score,
    qualityIssues: quality.issues,
  };
}

async function persistScan(args: {
  supabase: ReturnType<typeof createClient>;
  session: SessionRow;
  measurements: ExtractedMeasurements;
  composition: CompositionEstimate;
  asymmetry: AsymmetryReport;
  avatarParameters: BodyModelParameters;
  silhouettes: PoseSilhouette[];
  quality: { score: number; issues: string[] };
  calibratedWithManual: boolean;
  calibrationSource: string | null;
  calibrationDate: string | null;
}): Promise<void> {
  const { supabase, session, measurements, composition, asymmetry, avatarParameters, silhouettes, quality } = args;

  const silhouetteSummary = silhouettes.map((s) => ({
    pose: s.poseId,
    width: s.imageWidth,
    height: s.imageHeight,
    contourPoints: s.contour.length,
    landmarksDetected: Object.keys(s.landmarks).length,
    scaleCmPerPx: s.scaleCmPerPx,
  }));

  await supabase
    .from('body_photo_sessions')
    .update({
      silhouette_data: silhouetteSummary,
      extracted_measurements: measurements,
      composition_estimate: composition,
      asymmetry_report: asymmetry,
      avatar_parameters: avatarParameters,
      scan_status: 'complete',
      scan_quality_score: quality.score,
      quality_issues: quality.issues,
      calibrated_with_manual: args.calibratedWithManual,
      calibration_source: args.calibrationSource,
      calibration_date: args.calibrationDate,
    } as never)
    .eq('id', session.id);

  // cm() maps a MeasuredValue to a nullable DB value; null is stored honestly
  // rather than fabricating 0 for unknown measurements.
  const cm = (v: { cm: number | null }): number | null => v.cm !== null ? round1(v.cm) : null;
  const scanMeasurementsRow = {
    user_id: session.user_id,
    session_id: session.id,
    scan_date: session.session_date,
    neck_circ_cm: cm(measurements.neckCirc),
    shoulder_circ_cm: cm(measurements.shoulderCirc),
    chest_circ_cm: cm(measurements.chestCirc),
    waist_natural_circ_cm: cm(measurements.waistNaturalCirc),
    waist_navel_circ_cm: cm(measurements.waistNavelCirc),
    hip_circ_cm: cm(measurements.hipCirc),
    right_bicep_circ_cm: cm(measurements.rightBicepCirc),
    left_bicep_circ_cm: cm(measurements.leftBicepCirc),
    right_forearm_circ_cm: cm(measurements.rightForearmCirc),
    left_forearm_circ_cm: cm(measurements.leftForearmCirc),
    right_thigh_circ_cm: cm(measurements.rightThighCirc),
    left_thigh_circ_cm: cm(measurements.leftThighCirc),
    right_calf_circ_cm: cm(measurements.rightCalfCirc),
    left_calf_circ_cm: cm(measurements.leftCalfCirc),
    waist_to_hip_ratio: measurements.waistToHipRatio,
    waist_to_height_ratio: measurements.waistToHeightRatio,
    shoulder_to_waist_ratio: measurements.shoulderToWaistRatio,
    inseam_cm: measurements.inseamCm,
    torso_length_cm: measurements.torsoLengthCm,
    body_fat_pct_low: composition.bodyFatPct.low,
    body_fat_pct_mid: composition.bodyFatPct.mid,
    body_fat_pct_high: composition.bodyFatPct.high,
    lean_mass_kg: composition.leanMassKg.mid,
    fat_mass_kg: composition.fatMassKg.mid,
    ffmi: composition.ffmi,
    estimation_method: composition.blendedMethod,
    overall_confidence: composition.blendedConfidence,
    calibrated: composition.calibrated,
    confidence_map: buildConfidenceMap(measurements),
  };
  await supabase.from('body_scan_measurements').insert(scanMeasurementsRow as never);

  // Prompt 179c: Platinum members get their scan girths imported into Measurements
  // automatically. Fire and forget: the entitlement gate + idempotency live inside
  // ingestMeasurementsFromScan, and any failure here must never block scan
  // completion (the scan is already marked complete above, and the import is
  // retryable via the explicit Import from latest scan action). The row just
  // persisted is passed through to skip a redundant read.
  void ingestMeasurementsFromScan(
    { scanId: session.id, userId: session.user_id, prefetchedScanRow: scanMeasurementsRow },
    supabase as unknown as IngestClient,
  ).catch(() => {
    /* non-fatal; scan completion is unaffected */
  });
}

function buildConfidenceMap(m: ExtractedMeasurements): Record<string, { confidence: string; source: string }> {
  const map: Record<string, { confidence: string; source: string }> = {};
  const keys = ['neckCirc','shoulderCirc','chestCirc','waistNaturalCirc','waistNavelCirc','hipCirc',
                'rightBicepCirc','leftBicepCirc','rightForearmCirc','leftForearmCirc',
                'rightThighCirc','leftThighCirc','rightCalfCirc','leftCalfCirc'] as const;
  for (const k of keys) {
    const v = m[k];
    map[k] = { confidence: v.confidence, source: v.source };
  }
  return map;
}

function extractVisualRange(analysis: unknown): { low: number; high: number } | null {
  if (!analysis || typeof analysis !== 'object') return null;
  const a = analysis as Record<string, unknown>;
  const estimate = (a.bodyFatEstimate ?? a.estimatedBodyFatRange) as { low?: number; high?: number } | undefined;
  if (!estimate || typeof estimate.low !== 'number' || typeof estimate.high !== 'number') return null;
  return { low: estimate.low, high: estimate.high };
}

async function loadManualSnapshot(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: latestFat } = await supabase
    .from('body_tracker_segmental_fat')
    .select('total_body_fat_pct, entry_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let source: string | null = null;
  let confidence: number | null = null;
  if (latestFat?.entry_id) {
    const { data: entry } = await supabase
      .from('body_tracker_entries')
      .select('manual_source_id, confidence')
      .eq('id', latestFat.entry_id)
      .maybeSingle();
    source = entry?.manual_source_id ?? null;
    confidence = entry?.confidence ?? null;
  }
  return {
    pct: latestFat?.total_body_fat_pct ?? null,
    source,
    confidence,
  };
}

// avgOrZero: used only for avatar BodyModelParameters which require number.
// null (UNKNOWN) is treated as "not available for this side"; if both sides
// are null the result is 0 (the avatar-only unset sentinel).
/**
 * Template-default circumferences (cm) for an UNKNOWN region, per sex.
 * Section 9.2: an undeterminable circumference must render the anatomically
 * plausible TEMPLATE DEFAULT, never 0 (a zero radius collapses the avatar
 * segment in generateAvatarMesh, since rFromCirc(0)=0).  These are approximate
 * adult population averages drawn from published anthropometric references
 * (ANSUR II U.S. Army survey and CDC NHANES adult body-measurement tables);
 * they are a neutral visual placeholder, NOT a measured value, and never reach
 * the honest health rows in body_scan_measurements (those stay null).
 * Follow-up: a later pass can mark these avatar regions as "estimated"
 * downstream so the UI can visually distinguish template-filled segments.
 */
const AVATAR_TEMPLATE_CM: Record<
  BiologicalSex,
  { neck: number; shoulder: number; chest: number; waist: number; hip: number; bicep: number; thigh: number; calf: number }
> = {
  male:   { neck: 40, shoulder: 115, chest: 102, waist: 90, hip: 100, bicep: 34, thigh: 56, calf: 38 },
  female: { neck: 33, shoulder: 98,  chest: 90,  waist: 78, hip: 103, bicep: 29, thigh: 57, calf: 35 },
};

/**
 * Build the avatar BodyModelParameters from extracted measurements.
 * Any UNKNOWN (null) or non-positive circumference is replaced by the per-sex
 * template default (Section 9.2) so the rendered mesh always has a plausible,
 * non-zero girth.  `|| template` also defends the invalid_input cm:0 case.
 * The health rows persisted separately keep their honest null values.
 */
export function buildAvatarParameters(args: {
  measurements: ExtractedMeasurements;
  sex: BiologicalSex;
  heightCm: number;
  bodyFatPct: number;
}): BodyModelParameters {
  const { measurements: m, sex, heightCm, bodyFatPct } = args;
  const t = AVATAR_TEMPLATE_CM[sex];
  return {
    heightCm,
    shoulderCircCm: m.shoulderCirc.cm     || t.shoulder,
    chestCircCm:    m.chestCirc.cm         || t.chest,
    waistCircCm:    m.waistNaturalCirc.cm  || t.waist,
    hipCircCm:      m.hipCirc.cm           || t.hip,
    neckCircCm:     m.neckCirc.cm          || t.neck,
    bicepCircCm:    avgOrZero(m.rightBicepCirc.cm, m.leftBicepCirc.cm) || t.bicep,
    thighCircCm:    avgOrZero(m.rightThighCirc.cm, m.leftThighCirc.cm) || t.thigh,
    calfCircCm:     avgOrZero(m.rightCalfCirc.cm,  m.leftCalfCirc.cm)  || t.calf,
    inseamCm:       m.inseamCm,
    torsoLengthCm:  m.torsoLengthCm,
    sex,
    bodyFatPct,
  };
}

export { AVATAR_TEMPLATE_CM };

function avgOrZero(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return b! > 0 ? b! : 0;
  if (b === null) return a  > 0 ? a  : 0;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  if (a <= 0 && b <= 0) return 0;
  if (a <= 0) return b;
  if (b <= 0) return a;
  return (a + b) / 2;
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
