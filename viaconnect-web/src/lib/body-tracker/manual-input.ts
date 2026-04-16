// Body Tracker Manual Input — data sources, sanity ranges, unit systems,
// condition normalization. Imported by forms AND the scoring engine so
// manual data gets first-class treatment (confidence multiplier only).

import type { LucideIcon } from 'lucide-react';
import {
  ScanLine, Radiation, Circle, Waves, Scale, HeartPulse, Watch,
  Ruler, Scissors, Stethoscope, UserCheck, HelpCircle,
} from 'lucide-react';

export type ConfidenceTier =
  | 'professional'
  | 'consumer_device'
  | 'manual'
  | 'clinical'
  | 'estimate';

export type DataSourceId =
  | 'inbody' | 'dexa' | 'bodpod' | 'hydrostatic'
  | 'smart_scale' | 'blood_pressure_monitor' | 'fitness_watch_manual'
  | 'tape_measure' | 'calipers' | 'bathroom_scale'
  | 'clinical_lab' | 'doctor_visit'
  | 'other';

export type DataSourceGroup = 'professional' | 'device' | 'manual' | 'clinical' | 'other';

export interface DataSource {
  id: DataSourceId;
  label: string;
  icon: LucideIcon;
  tier: ConfidenceTier;
  group: DataSourceGroup;
  confidence: number;
  description: string;
  providesSegmental: boolean;
}

export const DATA_SOURCES: readonly DataSource[] = [
  // Professional scans
  { id: 'inbody',       label: 'InBody Scan',          icon: ScanLine,   tier: 'professional',    group: 'professional', confidence: 0.95, providesSegmental: true,  description: 'Gym or clinic InBody composition analyzer' },
  { id: 'dexa',         label: 'DEXA Scan',            icon: Radiation,  tier: 'professional',    group: 'professional', confidence: 0.98, providesSegmental: true,  description: 'Dual energy X ray absorptiometry, gold standard' },
  { id: 'bodpod',       label: 'BodPod',               icon: Circle,     tier: 'professional',    group: 'professional', confidence: 0.96, providesSegmental: false, description: 'Air displacement plethysmography' },
  { id: 'hydrostatic',  label: 'Hydrostatic Weighing', icon: Waves,      tier: 'professional',    group: 'professional', confidence: 0.97, providesSegmental: false, description: 'Underwater weighing' },
  // Consumer devices
  { id: 'smart_scale',           label: 'Smart Scale (manual read)',   icon: Scale,      tier: 'consumer_device', group: 'device', confidence: 0.85, providesSegmental: false, description: 'Reading from Withings, Renpho, Eufy etc. not API synced' },
  { id: 'blood_pressure_monitor', label: 'BP Monitor',                 icon: HeartPulse, tier: 'consumer_device', group: 'device', confidence: 0.90, providesSegmental: false, description: 'Home blood pressure cuff reading' },
  { id: 'fitness_watch_manual',   label: 'Fitness Watch (manual read)', icon: Watch,      tier: 'consumer_device', group: 'device', confidence: 0.82, providesSegmental: false, description: 'Reading from Apple Watch, Garmin etc. not API synced' },
  // Manual methods
  { id: 'tape_measure',   label: 'Tape Measure',        icon: Ruler,    tier: 'manual', group: 'manual', confidence: 0.70, providesSegmental: false, description: 'Body circumference measurements' },
  { id: 'calipers',       label: 'Body Fat Calipers',   icon: Scissors, tier: 'manual', group: 'manual', confidence: 0.75, providesSegmental: false, description: 'Skinfold caliper measurements' },
  { id: 'bathroom_scale', label: 'Bathroom Scale',      icon: Scale,    tier: 'manual', group: 'manual', confidence: 0.80, providesSegmental: false, description: 'Basic weight only scale' },
  // Clinical
  { id: 'clinical_lab',  label: 'Lab / Clinic Results', icon: Stethoscope, tier: 'clinical', group: 'clinical', confidence: 0.99, providesSegmental: false, description: 'From a doctor, lab, or clinical facility' },
  { id: 'doctor_visit',  label: 'Doctor Visit',         icon: UserCheck,   tier: 'clinical', group: 'clinical', confidence: 0.99, providesSegmental: false, description: 'Measurements taken by healthcare provider' },
  // Other
  { id: 'other',         label: 'Other / Estimate',     icon: HelpCircle,  tier: 'estimate', group: 'other',    confidence: 0.50, providesSegmental: false, description: 'Best estimate or unknown source' },
] as const;

export const DATA_SOURCE_GROUP_LABELS: Record<DataSourceGroup, string> = {
  professional: 'Professional Scans',
  device: 'Home Devices',
  manual: 'Manual Methods',
  clinical: 'Clinical',
  other: 'Other',
};

export function getDataSource(id: DataSourceId | null | undefined): DataSource | null {
  if (!id) return null;
  return DATA_SOURCES.find((s) => s.id === id) ?? null;
}

export function confidenceStars(confidence: number): number {
  // 0.50 => 2, 0.70 => 3, 0.80 => 4, 0.90 => 4, 0.95+ => 5
  if (confidence >= 0.93) return 5;
  if (confidence >= 0.85) return 4;
  if (confidence >= 0.70) return 3;
  if (confidence >= 0.55) return 2;
  return 1;
}

// ---------- Unit systems ----------
export type UnitSystem = 'imperial' | 'metric';

export const UNIT_LABELS: Record<UnitSystem, Record<'weight' | 'length' | 'circumference' | 'temperature', string>> = {
  imperial: { weight: 'lbs', length: 'in',  circumference: 'in', temperature: 'F' },
  metric:   { weight: 'kg',  length: 'cm',  circumference: 'cm', temperature: 'C' },
};

export const LBS_PER_KG = 2.20462262;
export const IN_PER_CM  = 0.393700787;
export const F_OFFSET_C = 32;

export const toKg = (lbs: number): number => lbs / LBS_PER_KG;
export const toLbs = (kg: number): number => kg * LBS_PER_KG;
export const toCm  = (inches: number): number => inches / IN_PER_CM;
export const toIn  = (cm: number): number => cm * IN_PER_CM;
export const cToF  = (c: number): number => (c * 9) / 5 + F_OFFSET_C;
export const fToC  = (f: number): number => ((f - F_OFFSET_C) * 5) / 9;

// ---------- Condition context ----------
export type ConditionContext = 'resting' | 'post_exercise' | 'stressed' | 'sick';

export const CONDITION_NORMALIZATION: Record<ConditionContext, number> = {
  resting:       1.0,
  post_exercise: 0.7,
  stressed:      0.85,
  sick:          0.5,
};

export const CONDITION_LABELS: Record<ConditionContext, string> = {
  resting:       'Resting',
  post_exercise: 'Post exercise',
  stressed:      'Stressed',
  sick:          'Sick',
};

// ---------- Time of day ----------
export type TimeOfDay = 'morning_fasted' | 'afternoon' | 'evening' | 'unknown';

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning_fasted: 'Morning (fasted)',
  afternoon:      'Afternoon',
  evening:        'Evening',
  unknown:        'Not sure',
};

// ---------- Sanity ranges ----------
export type SanityFieldKey =
  | 'weight_lbs' | 'weight_kg'
  | 'body_fat_pct' | 'muscle_mass_lbs'
  | 'resting_hr' | 'hrv_ms'
  | 'systolic_bp' | 'diastolic_bp'
  | 'metabolic_age' | 'vo2_max'
  | 'waist_in' | 'hip_in'
  | 'bmr_kcal' | 'bone_mass_lbs'
  | 'body_water_pct' | 'visceral_fat'
  | 'segmental_fat_pct' | 'segmental_muscle_lbs'
  | 'body_temperature_f' | 'blood_oxygen_pct' | 'respiratory_rate';

export interface SanityRange {
  min: number;
  max: number;
  softMin: number;
  softMax: number;
  unit?: string;
}

export const SANITY_RANGES: Record<SanityFieldKey, SanityRange> = {
  weight_lbs:       { min: 50,  max: 700, softMin: 80, softMax: 400, unit: 'lbs' },
  weight_kg:        { min: 23,  max: 318, softMin: 36, softMax: 182, unit: 'kg' },
  body_fat_pct:     { min: 2,   max: 70,  softMin: 5,  softMax: 55 },
  muscle_mass_lbs:  { min: 20,  max: 250, softMin: 40, softMax: 180 },
  resting_hr:       { min: 25,  max: 220, softMin: 40, softMax: 120, unit: 'bpm' },
  hrv_ms:           { min: 5,   max: 300, softMin: 15, softMax: 200, unit: 'ms' },
  systolic_bp:      { min: 60,  max: 260, softMin: 90, softMax: 180, unit: 'mmHg' },
  diastolic_bp:     { min: 30,  max: 160, softMin: 50, softMax: 110, unit: 'mmHg' },
  metabolic_age:    { min: 10,  max: 120, softMin: 16, softMax: 90,  unit: 'yrs' },
  vo2_max:          { min: 10,  max: 90,  softMin: 20, softMax: 70,  unit: 'ml/kg/min' },
  waist_in:         { min: 18,  max: 70,  softMin: 22, softMax: 55,  unit: 'in' },
  hip_in:           { min: 24,  max: 80,  softMin: 28, softMax: 60,  unit: 'in' },
  bmr_kcal:         { min: 600, max: 4000, softMin: 900, softMax: 3000, unit: 'kcal' },
  bone_mass_lbs:    { min: 2,   max: 15,  softMin: 3,  softMax: 10,  unit: 'lbs' },
  body_water_pct:   { min: 30,  max: 80,  softMin: 40, softMax: 65 },
  visceral_fat:     { min: 1,   max: 50,  softMin: 1,  softMax: 30 },
  segmental_fat_pct:    { min: 1, max: 60, softMin: 5, softMax: 45 },
  segmental_muscle_lbs: { min: 1, max: 60, softMin: 3, softMax: 40, unit: 'lbs' },
  body_temperature_f:   { min: 85,  max: 110, softMin: 95, softMax: 104, unit: 'F' },
  blood_oxygen_pct:     { min: 70,  max: 100, softMin: 90, softMax: 100, unit: '%' },
  respiratory_rate:     { min: 6,   max: 60,  softMin: 10, softMax: 30,  unit: 'br/min' },
};

export type SanityResult = 'valid' | 'warning' | 'blocked';

export function validateField(field: SanityFieldKey, value: number | null | undefined): SanityResult {
  if (value === null || value === undefined || Number.isNaN(value)) return 'valid';
  const range = SANITY_RANGES[field];
  if (value < range.min || value > range.max) return 'blocked';
  if (value < range.softMin || value > range.softMax) return 'warning';
  return 'valid';
}

// ---------- Data confidence (scoring engine hook) ----------
export interface EntryConfidenceInput {
  source?: string | null;
  manual_source_id?: string | null;
}

export function getDataConfidence(entry: EntryConfidenceInput): number {
  if (entry.source === 'device' || entry.source === 'api' || entry.source === 'import') return 1.0;
  if (entry.source === 'manual') {
    const src = getDataSource(entry.manual_source_id as DataSourceId | null);
    return src?.confidence ?? 0.70;
  }
  return 0.70;
}

// ---------- Source badge display ----------
export type SourceBadgeKind = 'manual' | 'device' | 'import' | 'api';

export const SOURCE_BADGES: Record<SourceBadgeKind, { label: string; color: string }> = {
  manual: { label: 'Manual', color: '#E8803A' },
  device: { label: 'Device', color: '#2DA5A0' },
  import: { label: 'Import', color: '#7C3AED' },
  api:    { label: 'Synced', color: '#22C55E' },
};

// ---------- Blood pressure classification (read only, DB column is generated) ----------
export function classifyBP(systolic: number, diastolic: number): { label: string; color: string } {
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return { label: 'Unknown', color: '#6B7280' };
  if (systolic > 180 || diastolic > 120)  return { label: 'Hypertensive Crisis', color: '#DC2626' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'High BP Stage 2',     color: '#EF4444' };
  if (systolic >= 130 || diastolic >= 80) return { label: 'High BP Stage 1',     color: '#F97316' };
  if (systolic >= 120)                     return { label: 'Elevated',            color: '#EAB308' };
  return { label: 'Normal', color: '#22C55E' };
}

// ---------- Symmetry (muscle mass left vs right) ----------
export function analyzeSymmetry(left: number, right: number): { ratio: number; status: string; color: string } {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) {
    return { ratio: 0, status: 'Unknown', color: '#6B7280' };
  }
  const smaller = Math.min(left, right);
  const larger  = Math.max(left, right);
  const ratio = Math.round((smaller / larger) * 1000) / 10;
  if (ratio >= 95) return { ratio, status: 'Balanced',             color: '#22C55E' };
  if (ratio >= 90) return { ratio, status: 'Minor imbalance',      color: '#EAB308' };
  return                    { ratio, status: 'Significant imbalance, consider targeted training', color: '#F97316' };
}

// ---------- Waist to hip ratio ----------
export function calculateWHR(waistIn: number, hipIn: number, sex: 'male' | 'female' | 'unspecified' = 'unspecified'): { ratio: number; risk: string; color: string } {
  if (!Number.isFinite(waistIn) || !Number.isFinite(hipIn) || hipIn <= 0) {
    return { ratio: 0, risk: 'Unknown', color: '#6B7280' };
  }
  const ratio = Math.round((waistIn / hipIn) * 100) / 100;
  const highThreshold = sex === 'female' ? 0.85 : 0.90;
  const modThreshold  = sex === 'female' ? 0.80 : 0.85;
  if (ratio > highThreshold) return { ratio, risk: 'High risk',     color: '#EF4444' };
  if (ratio > modThreshold)  return { ratio, risk: 'Moderate risk', color: '#F97316' };
  return                              { ratio, risk: 'Healthy',      color: '#22C55E' };
}

// ---------- Total body fat from 5 region segmental ----------
export function calculateTotalBodyFat(input: {
  rightArmPct: number; leftArmPct: number; trunkPct: number;
  rightLegPct: number; leftLegPct: number;
}): number {
  const { rightArmPct, leftArmPct, trunkPct, rightLegPct, leftLegPct } = input;
  const weighted =
    rightArmPct * 0.125 + leftArmPct * 0.125 +
    trunkPct    * 0.50  +
    rightLegPct * 0.125 + leftLegPct * 0.125;
  return Math.round(weighted * 10) / 10;
}

// ---------- Date validation ----------
export function isValidEntryDate(date: Date): boolean {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return date <= now && date >= oneYearAgo;
}
