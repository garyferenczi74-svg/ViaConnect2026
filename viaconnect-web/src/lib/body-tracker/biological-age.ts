// Biological Age v1 (Prompt 224). Arnold-owned, deterministic, compute-on-read.
//
// Formula (documented weights):
// 1. Baseline = chronological age from profiles.date_of_birth.
// 2. If metabolic_age is present and > 0: blend 50% toward metabolic age
//    (strongest signal): bio = round(0.5 * chrono + 0.5 * metabolicAge).
// 3. Then apply additive adjustments from remaining signals (UNKNOWN skipped):
//    - resting HR: <60 -> -2y; >80 -> +3y
//    - HRV:        >50 -> -2y; <30 -> +3y
//    - body fat %: <20 -> -1y; >30 -> +2y
//    - lab out-of-range count (hormone/metabolic markers with refs):
//         >=2 high/low -> +1y; all in-range with >=2 measured -> -1y
//    - activity consistency (optional 0..1 score): >=0.8 -> -1y; <=0.3 -> +1y
// 4. Clamp result to max(18, bio).
// 5. Confidence scales with input coverage (see computeConfidencePct).
//
// Honesty: with fewer than MIN_SIGNAL_COUNT non-baseline signals, state is
// "insufficient": display chronological age, low confidence, never invent youth.
// No em/en dashes in user-facing strings.

export interface BiologicalAgeInputs {
  metabolicAge?: number;
  restingHR?: number;
  hrv?: number;
  bodyFatPct?: number;
  /** Count of lab markers measured with reference ranges. */
  labsMeasuredWithRefs?: number;
  /** Count of those markers outside reference range. */
  labsOutOfRange?: number;
  /** Optional 0..1 activity consistency; omit when UNKNOWN. */
  activityConsistency?: number;
}

export type BiologicalAgeState = 'insufficient' | 'estimated';

export type ContributorDirection = 'younger' | 'older' | 'neutral' | 'missing';

export interface BiologicalAgeContributor {
  id: string;
  label: string;
  direction: ContributorDirection;
  detail: string;
  nextAction?: string;
}

export interface BiologicalAgeResult {
  chronologicalAge: number;
  /** Value shown in the gauge orb (chrono when insufficient). */
  displayAge: number;
  /** Computed estimate when state === estimated; equals displayAge then. */
  biologicalAge: number | null;
  deltaYears: number;
  confidencePct: number;
  state: BiologicalAgeState;
  contributors: BiologicalAgeContributor[];
  inputsUsed: string[];
}

export const MIN_SIGNAL_COUNT = 1;

export function chronologicalAgeFromDob(
  dateOfBirth: string,
  nowMs: number = Date.now(),
): number {
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return 0;
  return Math.max(0, Math.floor((nowMs - birth.getTime()) / (365.25 * 86_400_000)));
}

function presentNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Pure v1 estimate. Same inputs always yield the same result. */
export function estimateBiologicalAge(
  chronologicalAge: number,
  inputs: BiologicalAgeInputs = {},
): number {
  const chrono = Math.max(0, Math.round(chronologicalAge));
  let bio = chrono;
  let adjustment = 0;

  if (presentNumber(inputs.metabolicAge)) {
    bio = Math.round(0.5 * chrono + 0.5 * inputs.metabolicAge);
  }

  if (presentNumber(inputs.restingHR)) {
    if (inputs.restingHR < 60) adjustment -= 2;
    else if (inputs.restingHR > 80) adjustment += 3;
  }
  if (presentNumber(inputs.hrv)) {
    if (inputs.hrv > 50) adjustment -= 2;
    else if (inputs.hrv < 30) adjustment += 3;
  }
  if (presentNumber(inputs.bodyFatPct)) {
    if (inputs.bodyFatPct < 20) adjustment -= 1;
    else if (inputs.bodyFatPct > 30) adjustment += 2;
  }

  const measured = inputs.labsMeasuredWithRefs ?? 0;
  const oor = inputs.labsOutOfRange ?? 0;
  if (measured >= 2) {
    if (oor >= 2) adjustment += 1;
    else if (oor === 0) adjustment -= 1;
  }

  if (typeof inputs.activityConsistency === 'number' && Number.isFinite(inputs.activityConsistency)) {
    if (inputs.activityConsistency >= 0.8) adjustment -= 1;
    else if (inputs.activityConsistency <= 0.3) adjustment += 1;
  }

  return Math.max(18, bio + adjustment);
}

export function computeConfidencePct(inputs: BiologicalAgeInputs): number {
  let covered = 0;
  const slots = 6;
  if (presentNumber(inputs.metabolicAge)) covered += 1;
  if (presentNumber(inputs.restingHR)) covered += 1;
  if (presentNumber(inputs.hrv)) covered += 1;
  if (presentNumber(inputs.bodyFatPct)) covered += 1;
  if ((inputs.labsMeasuredWithRefs ?? 0) > 0) covered += 1;
  if (typeof inputs.activityConsistency === 'number') covered += 1;
  return Math.round((covered / slots) * 100);
}

export function countSignals(inputs: BiologicalAgeInputs): number {
  let n = 0;
  if (presentNumber(inputs.metabolicAge)) n += 1;
  if (presentNumber(inputs.restingHR)) n += 1;
  if (presentNumber(inputs.hrv)) n += 1;
  if (presentNumber(inputs.bodyFatPct)) n += 1;
  if ((inputs.labsMeasuredWithRefs ?? 0) > 0) n += 1;
  if (typeof inputs.activityConsistency === 'number') n += 1;
  return n;
}

function contributor(
  id: string,
  label: string,
  direction: ContributorDirection,
  detail: string,
  nextAction?: string,
): BiologicalAgeContributor {
  return { id, label, direction, detail, nextAction };
}

export function buildContributors(inputs: BiologicalAgeInputs): BiologicalAgeContributor[] {
  const rows: BiologicalAgeContributor[] = [];

  if (presentNumber(inputs.metabolicAge)) {
    rows.push(contributor('metabolic_age', 'Metabolic age', 'neutral', `Measured metabolic age ${inputs.metabolicAge} years`));
  } else {
    rows.push(contributor('metabolic_age', 'Metabolic age', 'missing', 'Not yet measured', 'Open Metabolic and log resting metrics'));
  }

  if (presentNumber(inputs.restingHR)) {
    const dir: ContributorDirection =
      inputs.restingHR < 60 ? 'younger' : inputs.restingHR > 80 ? 'older' : 'neutral';
    rows.push(contributor('resting_hr', 'Resting heart rate', dir, `${inputs.restingHR} bpm`));
  } else {
    rows.push(contributor('resting_hr', 'Resting heart rate', 'missing', 'Not yet measured', 'Log resting heart rate in Metabolic'));
  }

  if (presentNumber(inputs.hrv)) {
    const dir: ContributorDirection =
      inputs.hrv > 50 ? 'younger' : inputs.hrv < 30 ? 'older' : 'neutral';
    rows.push(contributor('hrv', 'Heart rate variability', dir, `${inputs.hrv} ms`));
  } else {
    rows.push(contributor('hrv', 'Heart rate variability', 'missing', 'Not yet measured', 'Connect a wearable or log HRV'));
  }

  if (presentNumber(inputs.bodyFatPct)) {
    const dir: ContributorDirection =
      inputs.bodyFatPct < 20 ? 'younger' : inputs.bodyFatPct > 30 ? 'older' : 'neutral';
    rows.push(contributor('body_fat', 'Body fat', dir, `${inputs.bodyFatPct.toFixed(1)}%`));
  } else {
    rows.push(contributor('body_fat', 'Body fat', 'missing', 'Not yet measured', 'Scan with FormaVision or log body comp'));
  }

  if ((inputs.labsMeasuredWithRefs ?? 0) > 0) {
    const oor = inputs.labsOutOfRange ?? 0;
    const dir: ContributorDirection = oor >= 2 ? 'older' : oor === 0 ? 'younger' : 'neutral';
    rows.push(contributor('labs', 'Lab biomarkers', dir, `${inputs.labsMeasuredWithRefs} with ranges, ${oor} outside range`));
  } else {
    rows.push(contributor('labs', 'Lab biomarkers', 'missing', 'Not yet measured', 'Upload labs'));
  }

  if (typeof inputs.activityConsistency === 'number') {
    const dir: ContributorDirection =
      inputs.activityConsistency >= 0.8 ? 'younger' : inputs.activityConsistency <= 0.3 ? 'older' : 'neutral';
    rows.push(contributor('activity', 'Activity consistency', dir, `${Math.round(inputs.activityConsistency * 100)}% consistency`));
  } else {
    rows.push(contributor('activity', 'Activity consistency', 'missing', 'Not yet measured', 'Connect activity sources'));
  }

  return rows;
}

export function resolveBiologicalAge(
  chronologicalAge: number,
  inputs: BiologicalAgeInputs = {},
): BiologicalAgeResult {
  const chrono = Math.max(0, Math.round(chronologicalAge));
  const signals = countSignals(inputs);
  const confidencePct = computeConfidencePct(inputs);
  const contributors = buildContributors(inputs);
  const inputsUsed = contributors
    .filter((c) => c.direction !== 'missing')
    .map((c) => c.label);

  if (chrono <= 0 || signals < MIN_SIGNAL_COUNT) {
    return {
      chronologicalAge: chrono,
      displayAge: chrono > 0 ? chrono : 0,
      biologicalAge: null,
      deltaYears: 0,
      confidencePct,
      state: 'insufficient',
      contributors,
      inputsUsed,
    };
  }

  const biologicalAge = estimateBiologicalAge(chrono, inputs);
  return {
    chronologicalAge: chrono,
    displayAge: biologicalAge,
    biologicalAge,
    deltaYears: biologicalAge - chrono,
    confidencePct,
    state: 'estimated',
    contributors,
    inputsUsed,
  };
}

/** Marker position 0..1 on Younger←center→Older bar. Clamps at ±15 years. */
export function biologicalAgeMarkerPosition(
  biologicalAge: number,
  chronologicalAge: number,
  rangeYears = 15,
): number {
  const delta = biologicalAge - chronologicalAge;
  const clamped = Math.max(-rangeYears, Math.min(rangeYears, delta));
  return (clamped / rangeYears) * 0.5 + 0.5;
}

/** DRAFT Marshall framing strings. Do not treat as approved. */
export const BIOLOGICAL_AGE_FRAMING_DRAFT = {
  title: 'Biological Age',
  disclaimer:
    'Educational estimate from your ViaConnect data. Not a medical or diagnostic measurement. DRAFT pending Marshall review.',
  insufficientPrompt:
    'Log entries and connect sources so Arnold can estimate your biological age',
  methodologyTitle: 'How this is estimated',
  methodologyIntro:
    'Arnold starts from your chronological age, then adjusts using the signals listed below when they are present. Missing signals contribute nothing.',
} as const;
