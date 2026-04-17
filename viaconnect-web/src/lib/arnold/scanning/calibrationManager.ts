// Calibration state: when does a manual tape measurement or professional
// scan "calibrate" an AI measurement? Drives the confidence badges and
// the persistent calibration nudges.

import type { ExtractedMeasurements, ManualCalibrationInput, MeasuredValue } from './types';

export interface CalibrationResult {
  calibrated: ExtractedMeasurements;
  calibratedCount: number;
  calibrationSource: string | null;
  calibrationDate: string | null;
}

const MEASUREMENT_KEYS = [
  'neckCirc', 'shoulderCirc', 'chestCirc', 'underBustCirc',
  'waistNaturalCirc', 'waistNavelCirc', 'hipCirc',
  'rightBicepCirc', 'leftBicepCirc', 'rightForearmCirc', 'leftForearmCirc',
  'rightThighCirc', 'leftThighCirc', 'rightCalfCirc', 'leftCalfCirc',
] as const;

/** If a manual tape measurement for a region is available and recent,
 *  substitute the AI estimate with the manual value and upgrade confidence. */
export function applyCalibration(
  measurements: ExtractedMeasurements,
  manual: ManualCalibrationInput,
): CalibrationResult {
  let calibratedCount = 0;
  const result = { ...measurements } as ExtractedMeasurements;
  const tape = manual.tapeMeasurements ?? {};

  for (const key of MEASUREMENT_KEYS) {
    const manualCm = tape[mapKeyToTapeField(key)];
    const original = (result as unknown as Record<string, MeasuredValue | undefined>)[key];
    if (manualCm !== undefined && Number.isFinite(manualCm) && manualCm > 0 && original) {
      (result as unknown as Record<string, MeasuredValue>)[key] = {
        cm: round1(manualCm),
        uncertaintyCm: 0.3,
        confidence: 'high',
        source: 'tape_calibrated',
      };
      calibratedCount += 1;
    }
  }

  return {
    calibrated: result,
    calibratedCount,
    calibrationSource: calibratedCount > 0 ? 'tape_measure' : null,
    calibrationDate: calibratedCount > 0 ? (manual.calibratedAtDate ?? null) : null,
  };
}

/** Map internal measurement key to the tape field name used on body_tracker_weight. */
function mapKeyToTapeField(key: typeof MEASUREMENT_KEYS[number]): string {
  switch (key) {
    case 'neckCirc': return 'neck';
    case 'shoulderCirc': return 'shoulder';
    case 'chestCirc': return 'chest';
    case 'underBustCirc': return 'under_bust';
    case 'waistNaturalCirc': return 'waist_natural';
    case 'waistNavelCirc': return 'waist_navel';
    case 'hipCirc': return 'hips';
    case 'rightBicepCirc': return 'right_arm';
    case 'leftBicepCirc': return 'left_arm';
    case 'rightForearmCirc': return 'right_forearm';
    case 'leftForearmCirc': return 'left_forearm';
    case 'rightThighCirc': return 'right_thigh';
    case 'leftThighCirc': return 'left_thigh';
    case 'rightCalfCirc': return 'right_calf';
    case 'leftCalfCirc': return 'left_calf';
  }
}

export type NudgeTriggerKey =
  | 'first_scan_complete'
  | 'no_manual_weight_7_days'
  | 'no_tape_measurements_30_days'
  | 'scan_and_manual_disagree'
  | 'no_professional_scan_ever';

export interface NudgeDefinition {
  trigger: NudgeTriggerKey;
  priority: 'high' | 'medium' | 'low';
  message: string;
  cta: string;
  ctaRoute?: string;
}

export const CALIBRATION_NUDGES: readonly NudgeDefinition[] = [
  {
    trigger: 'first_scan_complete',
    priority: 'high',
    message: 'Great first scan. For better accuracy, log your weight from a scale so Arnold can calibrate your body composition estimates.',
    cta: 'Log weight now',
    ctaRoute: '/body-tracker/weight',
  },
  {
    trigger: 'no_manual_weight_7_days',
    priority: 'medium',
    message: 'Your last weight entry was over a week ago. A quick weigh in helps Arnold keep your scan measurements accurate.',
    cta: 'Quick weigh in',
    ctaRoute: '/body-tracker/weight',
  },
  {
    trigger: 'no_tape_measurements_30_days',
    priority: 'medium',
    message: 'A monthly tape measure check, even just waist and hips, calibrates Arnold\'s AI measurements and makes your scans more reliable.',
    cta: 'Log tape measurements',
    ctaRoute: '/body-tracker/weight',
  },
  {
    trigger: 'scan_and_manual_disagree',
    priority: 'low',
    message: 'Arnold noticed your scan measurements differ from your latest tape measurements. Try scanning under consistent conditions, same lighting, clothing, distance.',
    cta: 'View comparison',
  },
  {
    trigger: 'no_professional_scan_ever',
    priority: 'low',
    message: 'An InBody or DEXA scan gives Arnold a professional grade calibration point. Even once per year dramatically improves your AI scan accuracy.',
    cta: 'Learn about professional scans',
  },
] as const;

function round1(n: number): number { return Math.round(n * 10) / 10; }
