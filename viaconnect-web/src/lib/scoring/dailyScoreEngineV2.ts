// Daily Score Engine V2 (Prompt #68)
// Pure-function scoring engine: manual check-in + wearable + meal log → 6 gauges.
// Zero runtime API cost. All computation is local.

export type DataMode = 'manual' | 'wearable' | 'combined';

export interface DailyCheckinData {
  sleep_duration_hours: number | null;
  sleep_quality: number | null;
  energy_level: number | null;
  fatigue_rating: number | null;
  mood_rating: number | null;
  stress_level: number | null;
  exercise_type: string | null;
  exercise_duration_minutes: number | null;
  exercise_intensity: number | null;
  hydration_glasses: number | null;
}

export interface MealLogData {
  meals: Array<{
    meal_type: string;
    calories: number | null;
    protein_grams: number | null;
    carbs_grams: number | null;
    fats_grams: number | null;
    includes_vegetables: boolean;
    includes_whole_grains: boolean;
    includes_lean_protein: boolean;
    meal_quality_rating: number | null;
  }>;
}

export interface WearableDataInput {
  sleep_duration_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  sleep_score: number | null;
  resting_heart_rate: number | null;
  hrv_ms: number | null;
  readiness_score: number | null;
  steps: number | null;
  active_minutes: number | null;
  calories_burned: number | null;
  stress_score: number | null;
}

export interface GaugeScore {
  score: number;
  manualScore: number | null;
  wearableScore: number | null;
  manualWeight: number;
  wearableWeight: number;
  confidence: number;
  label: string;
  color: string;
}

export interface DailyScoreResult {
  dataMode: DataMode;
  sleep: GaugeScore;
  energy: GaugeScore;
  moodStress: GaugeScore;
  nutrition: GaugeScore;
  activity: GaugeScore;
  overall: GaugeScore;
  manualCompleteness: number;
  wearableCompleteness: number;
}

function n10(val: number | null): number | null {
  if (val === null || val === undefined) return null;
  return Math.round(Math.min(100, Math.max(0, (val / 10) * 100)));
}

function calcManualSleep(d: DailyCheckinData): number | null {
  const { sleep_duration_hours: h, sleep_quality: q } = d;
  if (h === null && q === null) return null;
  let score = 0, n = 0;
  if (h !== null) {
    if (h >= 7 && h <= 9) score += 100;
    else if (h >= 6) score += 70;
    else if (h > 9 && h <= 10) score += 75;
    else if (h >= 5) score += 45;
    else score += 20;
    n++;
  }
  if (q !== null) { score += n10(q)!; n++; }
  return n > 0 ? Math.round(score / n) : null;
}

function calcManualEnergy(d: DailyCheckinData): number | null {
  const { energy_level: e, fatigue_rating: f } = d;
  if (e === null && f === null) return null;
  let score = 0, n = 0;
  if (e !== null) { score += n10(e)!; n++; }
  if (f !== null) { score += 100 - n10(f)!; n++; }
  return n > 0 ? Math.round(score / n) : null;
}

function calcManualMoodStress(d: DailyCheckinData): number | null {
  const { mood_rating: m, stress_level: s } = d;
  if (m === null && s === null) return null;
  let score = 0, n = 0;
  if (m !== null) { score += n10(m)!; n++; }
  if (s !== null) { score += 100 - n10(s)!; n++; }
  return n > 0 ? Math.round(score / n) : null;
}

function calcManualNutrition(ml: MealLogData, hydration: number | null): number | null {
  const { meals } = ml;
  if (meals.length === 0 && hydration === null) return null;
  let score = 0, n = 0;
  if (meals.length > 0) {
    const main = meals.filter((m) => m.meal_type !== 'snack').length;
    score += Math.min(100, (main / 3) * 100);
    n++;
    const qf = meals.reduce((s, m) => {
      let f = 0;
      if (m.includes_vegetables) f++;
      if (m.includes_whole_grains) f++;
      if (m.includes_lean_protein) f++;
      return s + (f / 3) * 100;
    }, 0) / meals.length;
    score += qf;
    n++;
    const rated = meals.filter((m) => m.meal_quality_rating !== null);
    if (rated.length > 0) {
      const avg = rated.reduce((s, m) => s + m.meal_quality_rating!, 0) / rated.length;
      score += n10(avg)!;
      n++;
    }
  }
  if (hydration !== null) { score += Math.min(100, (hydration / 8) * 100); n++; }
  return n > 0 ? Math.round(score / n) : null;
}

function calcManualActivity(d: DailyCheckinData): number | null {
  const { exercise_type: t, exercise_duration_minutes: dur, exercise_intensity: inten } = d;
  if (t === null) return null;
  if (t === 'none') return 15;
  let score = 0, n = 0;
  if (dur !== null) { score += Math.min(100, (dur / 60) * 100); n++; }
  if (inten !== null) { score += n10(inten)!; n++; }
  score += 20; n++;
  return n > 0 ? Math.round(Math.min(100, score / n)) : null;
}

function calcWearableSleep(w: WearableDataInput): number | null {
  if (w.sleep_score !== null) return Math.min(100, w.sleep_score);
  if (w.sleep_duration_minutes === null) return null;
  const h = w.sleep_duration_minutes / 60;
  let s = h >= 7 && h <= 9 ? 85 : h >= 6 ? 65 : 35;
  if (w.deep_sleep_minutes && w.deep_sleep_minutes > 60) s += 5;
  if (w.rem_sleep_minutes && w.rem_sleep_minutes > 80) s += 5;
  return Math.min(100, s);
}

function calcWearableEnergy(w: WearableDataInput): number | null {
  if (w.readiness_score !== null) return Math.min(100, w.readiness_score);
  if (w.hrv_ms === null && w.resting_heart_rate === null) return null;
  let s = 50;
  if (w.hrv_ms !== null) s = w.hrv_ms > 50 ? 80 : w.hrv_ms > 30 ? 60 : 40;
  if (w.resting_heart_rate !== null) s += w.resting_heart_rate < 60 ? 10 : w.resting_heart_rate < 72 ? 5 : -5;
  return Math.min(100, Math.max(0, s));
}

function calcWearableActivity(w: WearableDataInput): number | null {
  if (w.steps === null && w.active_minutes === null) return null;
  let s = 0, n = 0;
  if (w.steps !== null) { s += Math.min(100, (w.steps / 10000) * 100); n++; }
  if (w.active_minutes !== null) { s += Math.min(100, (w.active_minutes / 60) * 100); n++; }
  return n > 0 ? Math.round(s / n) : null;
}

function calcWearableStress(w: WearableDataInput): number | null {
  if (w.stress_score === null) return null;
  return Math.max(0, 100 - w.stress_score);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#2DA5A0';
  if (score >= 60) return '#4CAF50';
  if (score >= 40) return '#B75E18';
  if (score >= 20) return '#FF9800';
  return '#F44336';
}

function blend(manual: number | null, wearable: number | null, label: string): GaugeScore {
  const hm = manual !== null;
  const hw = wearable !== null;
  let score: number, mw: number, ww: number, conf: number;

  if (hm && hw) { mw = 0.35; ww = 0.65; score = Math.round(manual! * mw + wearable! * ww); conf = 0.9; }
  else if (hm) { mw = 1; ww = 0; score = manual!; conf = 0.6; }
  else if (hw) { mw = 0; ww = 1; score = wearable!; conf = 0.7; }
  else { mw = 0; ww = 0; score = 0; conf = 0; }

  return { score, manualScore: manual, wearableScore: wearable, manualWeight: mw, wearableWeight: ww, confidence: conf, label, color: getScoreColor(score) };
}

export function calculateDailyScores(
  checkin: DailyCheckinData | null,
  mealLog: MealLogData | null,
  wearable: WearableDataInput | null,
): DailyScoreResult {
  const mS = checkin ? calcManualSleep(checkin) : null;
  const mE = checkin ? calcManualEnergy(checkin) : null;
  const mM = checkin ? calcManualMoodStress(checkin) : null;
  const mN = mealLog ? calcManualNutrition(mealLog, checkin?.hydration_glasses ?? null) : null;
  const mA = checkin ? calcManualActivity(checkin) : null;

  const wS = wearable ? calcWearableSleep(wearable) : null;
  const wE = wearable ? calcWearableEnergy(wearable) : null;
  const wM = wearable ? calcWearableStress(wearable) : null;
  const wA = wearable ? calcWearableActivity(wearable) : null;

  const sleep = blend(mS, wS, 'Sleep Quality');
  const energy = blend(mE, wE, 'Energy Level');
  const moodStress = blend(mM, wM, 'Mood & Stress');
  const nutrition = blend(mN, null, 'Nutrition');
  const activity = blend(mA, wA, 'Physical Activity');

  const gauges = [sleep, energy, moodStress, nutrition, activity];
  const active = gauges.filter((g) => g.confidence > 0);
  const overallScore = active.length > 0
    ? Math.round(active.reduce((s, g) => s + g.score, 0) / active.length)
    : 0;

  const overall: GaugeScore = {
    score: overallScore, manualScore: null, wearableScore: null,
    manualWeight: 0, wearableWeight: 0,
    confidence: active.length / 5,
    label: 'Overall Wellness', color: getScoreColor(overallScore),
  };

  const hasManual = checkin !== null || (mealLog !== null && mealLog.meals.length > 0);
  const hasWearable = wearable !== null;
  const dataMode: DataMode = hasManual && hasWearable ? 'combined' : hasWearable ? 'wearable' : 'manual';

  const mf = checkin ? [checkin.sleep_duration_hours, checkin.sleep_quality, checkin.energy_level, checkin.fatigue_rating, checkin.mood_rating, checkin.stress_level, checkin.exercise_type, checkin.hydration_glasses] : [];
  const mc = mf.length > 0 ? mf.filter((f) => f !== null && f !== undefined).length / mf.length : 0;

  const wf = wearable ? [wearable.sleep_duration_minutes, wearable.hrv_ms, wearable.steps, wearable.active_minutes, wearable.resting_heart_rate, wearable.stress_score] : [];
  const wc = wf.length > 0 ? wf.filter((f) => f !== null && f !== undefined).length / wf.length : 0;

  return { dataMode, sleep, energy, moodStress, nutrition, activity, overall, manualCompleteness: mc, wearableCompleteness: wc };
}

/** Map DailyCheckIn slider state (Prompt #65 format) to DailyCheckinData. */
export function mapCheckInToScoringInput(raw: Record<string, any>): DailyCheckinData {
  return {
    sleep_duration_hours: raw.sleep_hours ?? raw.sleepHours ?? null,
    sleep_quality: raw.sleep_quality_score ?? raw.sleepQuality ?? null,
    energy_level: raw.energy_recovery_score ?? raw.energyLevel ?? null,
    fatigue_rating: null,
    mood_rating: null,
    stress_level: raw.stress_level_score ?? raw.stressLevel ?? null,
    exercise_type: (raw.cardio_active || raw.cardioActive || raw.resistance_active || raw.resistanceActive) ? 'mixed' : 'none',
    exercise_duration_minutes: ((raw.cardio_active || raw.cardioActive) ? (raw.cardio_duration_min ?? raw.cardioDuration ?? 0) : 0)
      + ((raw.resistance_active || raw.resistanceActive) ? (raw.resistance_duration_min ?? raw.resistanceDuration ?? 0) : 0) || null,
    exercise_intensity: raw.activity_level_score ?? raw.activityLevel ?? null,
    hydration_glasses: null,
  };
}
