// Arnold Brain — Domain 3: Anthropometric Standards & Population Data
// NHANES 2017-2020 body fat percentiles; FFMI; WHtR; somatotypes.

import type { BiologicalSex } from './bodyCompositionScience';

export interface Percentiles {
  p10: number; p25: number; p50: number; p75: number; p90: number;
}

export type AgeBand = '18-29' | '30-39' | '40-49' | '50-59' | '60+';

export const BODY_FAT_PERCENTILES: Record<BiologicalSex, Record<AgeBand, Percentiles>> = {
  male: {
    '18-29': { p10: 10.2, p25: 14.8, p50: 20.1, p75: 25.3, p90: 30.4 },
    '30-39': { p10: 13.1, p25: 17.5, p50: 22.4, p75: 27.1, p90: 31.8 },
    '40-49': { p10: 14.2, p25: 18.9, p50: 23.7, p75: 28.5, p90: 33.1 },
    '50-59': { p10: 15.0, p25: 19.8, p50: 24.6, p75: 29.4, p90: 33.7 },
    '60+':   { p10: 15.8, p25: 20.5, p50: 25.2, p75: 29.8, p90: 33.9 },
  },
  female: {
    '18-29': { p10: 17.5, p25: 21.8, p50: 27.4, p75: 33.1, p90: 38.2 },
    '30-39': { p10: 19.2, p25: 23.4, p50: 29.1, p75: 34.8, p90: 39.7 },
    '40-49': { p10: 20.8, p25: 25.1, p50: 30.7, p75: 36.2, p90: 41.0 },
    '50-59': { p10: 22.1, p25: 26.8, p50: 32.4, p75: 37.5, p90: 42.1 },
    '60+':   { p10: 23.0, p25: 27.5, p50: 33.1, p75: 38.0, p90: 42.6 },
  },
};

export function ageToBand(age: number): AgeBand {
  if (age < 30) return '18-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  return '60+';
}

export function bodyFatPercentile(sex: BiologicalSex, age: number, bodyFatPct: number): number {
  const band = ageToBand(age);
  const p = BODY_FAT_PERCENTILES[sex][band];
  if (bodyFatPct <= p.p10) return Math.round((bodyFatPct / p.p10) * 10);
  if (bodyFatPct <= p.p25) return Math.round(10 + ((bodyFatPct - p.p10) / (p.p25 - p.p10)) * 15);
  if (bodyFatPct <= p.p50) return Math.round(25 + ((bodyFatPct - p.p25) / (p.p50 - p.p25)) * 25);
  if (bodyFatPct <= p.p75) return Math.round(50 + ((bodyFatPct - p.p50) / (p.p75 - p.p50)) * 25);
  if (bodyFatPct <= p.p90) return Math.round(75 + ((bodyFatPct - p.p75) / (p.p90 - p.p75)) * 15);
  return Math.min(99, Math.round(90 + ((bodyFatPct - p.p90) / 10) * 9));
}

// FFMI — Fat Free Mass Index (Kouri 1995, Schutz 2002)
// Formula: (lean_mass_kg / height_m^2) + 6.1 * (1.8 - height_m)
export function calculateFFMI(leanMassKg: number, heightM: number): number {
  if (heightM <= 0) return 0;
  return (leanMassKg / (heightM * heightM)) + 6.1 * (1.8 - heightM);
}

export const FFMI_CLASSIFICATION = {
  male: [
    { maxFFMI: 18,   label: 'Below Average' },
    { maxFFMI: 20,   label: 'Average' },
    { maxFFMI: 22,   label: 'Above Average' },
    { maxFFMI: 23,   label: 'Excellent' },
    { maxFFMI: 25,   label: 'Superior' },
    { maxFFMI: 26,   label: 'Near Natural Limit' },
    { maxFFMI: 999,  label: 'Beyond Natural Limit (suspect PED)' },
  ],
  female: [
    { maxFFMI: 14,   label: 'Below Average' },
    { maxFFMI: 16,   label: 'Average' },
    { maxFFMI: 18,   label: 'Above Average' },
    { maxFFMI: 19.5, label: 'Excellent' },
    { maxFFMI: 21,   label: 'Superior' },
    { maxFFMI: 999,  label: 'Near Natural Limit' },
  ],
} as const;

export function classifyFFMI(sex: BiologicalSex, ffmi: number): string {
  for (const tier of FFMI_CLASSIFICATION[sex]) {
    if (ffmi <= tier.maxFFMI) return tier.label;
  }
  return 'Unknown';
}

// Waist-to-height ratio (WHtR) — Ashwell meta-analysis 2012
export const WHTR_THRESHOLDS = [
  { max: 0.40, label: 'Underweight',  risk: 'Underweight risk' },
  { max: 0.43, label: 'Healthy, slim', risk: 'None, slim' },
  { max: 0.50, label: 'Healthy',       risk: 'None, healthy' },
  { max: 0.53, label: 'Overweight',    risk: 'Increased metabolic risk' },
  { max: 0.58, label: 'Obese',         risk: 'High metabolic risk' },
  { max: 999,  label: 'Very obese',    risk: 'Very high risk' },
] as const;

export function classifyWHtR(waistCm: number, heightCm: number): { ratio: number; label: string; risk: string } {
  if (heightCm <= 0) return { ratio: 0, label: 'Unknown', risk: 'Unknown' };
  const ratio = waistCm / heightCm;
  for (const t of WHTR_THRESHOLDS) {
    if (ratio < t.max) return { ratio: Math.round(ratio * 100) / 100, label: t.label, risk: t.risk };
  }
  return { ratio: Math.round(ratio * 100) / 100, label: 'Very obese', risk: 'Very high risk' };
}

export const SOMATOTYPES = {
  ectomorph: { description: 'Narrow frame, long limbs, low body fat, difficulty gaining muscle', cues: ['Narrow shoulders','Long limbs relative to torso','Flat chest','Small wrists and ankles'] },
  mesomorph: { description: 'Athletic build, broad shoulders, responds well to training',         cues: ['Wide shoulders','Narrow waist','Thick joints','Muscular even without training'] },
  endomorph: { description: 'Wider frame, stores fat easily, strong but rounded',                 cues: ['Wide hips','Rounded midsection','Thick limbs','Soft contours'] },
} as const;

export const ANTHROPOMETRIC_SUMMARY = `
POPULATION REFERENCES (NHANES 2017-2020):
  Body fat percentiles by age and sex available for 18-29, 30-39, 40-49, 50-59, 60+

FFMI (Kouri 1995, Schutz 2002):
  Formula: (lean_kg / height_m^2) + 6.1 * (1.8 - height_m)
  Male natural limit ~25, beyond 26 suggests PED use
  Female natural limit ~21

WAIST-TO-HEIGHT (Ashwell 2012):
  Under 0.50 = healthy; 0.50-0.53 overweight; 0.53+ increasing risk
  Simple public health rule: waist should be less than half height

SOMATOTYPES (Heath-Carter):
  Ectomorph: narrow, low fat, hard to gain
  Mesomorph: athletic, broad shoulders, narrow waist
  Endomorph: wide frame, stores fat easily
  Most people are a blend; report ratios like 2-5-3
`.trim();
