'use client';

// Top-level scan orchestrator. Runs the full pipeline for a given
// photo session and persists results. Designed to be invoked from a
// React component; progress events surfaced via onProgress callback.

import { createClient } from '@/lib/supabase/client';
import { processSilhouette } from './silhouetteProcessor';
import { detectLandmarks } from './landmarkDetector';
import { assessQuality } from './scanQualityAssessor';
import { extractMeasurements } from './measurementEngine';
import { analyzeAsymmetry } from './asymmetryAnalyzer';
import { navyBodyFat } from './navyBodyFat';
import { cunbaeBodyFat } from './cunbaeBodyFat';
import { blendComposition } from './compositionBlender';
import { applyCalibration } from './calibrationManager';
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
  const weightKg = p?.weight_kg ?? null;
  const age = p?.date_of_birth
    ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400000))
    : 30;

  if (!heightCm || !weightKg) {
    throw new Error('Height and weight in your profile are required for scan analysis. Set them in your profile and try again.');
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

  let measurements = extractMeasurements({ silhouettes, sex, heightCm });

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
  const navy = navyBodyFat({
    sex,
    heightCm,
    neckCm: measurements.neckCirc.cm,
    waistCm: measurements.waistNaturalCirc.cm,
    hipCm: sex === 'female' ? measurements.hipCirc.cm : undefined,
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

  const avatarParameters: BodyModelParameters = {
    heightCm,
    shoulderCircCm: measurements.shoulderCirc.cm,
    chestCircCm:    measurements.chestCirc.cm,
    waistCircCm:    measurements.waistNaturalCirc.cm,
    hipCircCm:      measurements.hipCirc.cm,
    neckCircCm:     measurements.neckCirc.cm,
    bicepCircCm:    avgOrZero(measurements.rightBicepCirc.cm, measurements.leftBicepCirc.cm),
    thighCircCm:    avgOrZero(measurements.rightThighCirc.cm, measurements.leftThighCirc.cm),
    calfCircCm:     avgOrZero(measurements.rightCalfCirc.cm,  measurements.leftCalfCirc.cm),
    inseamCm:       measurements.inseamCm,
    torsoLengthCm:  measurements.torsoLengthCm,
    sex,
    bodyFatPct:     composition.bodyFatPct.mid,
  };

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

  const cm = (v: { cm: number }): number => round1(v.cm);
  await supabase.from('body_scan_measurements').insert({
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
  } as never);
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

function avgOrZero(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  if (a <= 0 && b <= 0) return 0;
  if (a <= 0) return b;
  if (b <= 0) return a;
  return (a + b) / 2;
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
