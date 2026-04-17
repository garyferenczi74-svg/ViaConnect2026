// US Navy circumference-based body fat estimation.
// Source: Hodgdon & Beckett (1984). Used by US military since 1981.
// Inputs in cm; returns body fat percentage.

import type { BiologicalSex } from './types';

export interface NavyInputs {
  sex: BiologicalSex;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number; // Required for female, ignored for male
}

export interface NavyResult {
  bodyFatPct: number;
  method: 'navy_male' | 'navy_female';
  valid: boolean;
  issues: string[];
}

export function navyBodyFat(inputs: NavyInputs): NavyResult {
  const issues: string[] = [];
  if (inputs.heightCm <= 0) issues.push('Height required');
  if (inputs.neckCm <= 0)   issues.push('Neck circumference required');
  if (inputs.waistCm <= 0)  issues.push('Waist circumference required');
  if (inputs.sex === 'female' && (!inputs.hipCm || inputs.hipCm <= 0)) {
    issues.push('Hip circumference required for female formula');
  }
  if (inputs.sex === 'male' && inputs.waistCm <= inputs.neckCm) {
    issues.push('Waist must exceed neck (log argument non positive)');
  }

  if (issues.length > 0) {
    return { bodyFatPct: 0, method: inputs.sex === 'male' ? 'navy_male' : 'navy_female', valid: false, issues };
  }

  if (inputs.sex === 'male') {
    const density =
      1.0324
      - 0.19077 * Math.log10(inputs.waistCm - inputs.neckCm)
      + 0.15456 * Math.log10(inputs.heightCm);
    const bf = 495 / density - 450;
    return {
      bodyFatPct: round1(bf),
      method: 'navy_male',
      valid: Number.isFinite(bf) && bf > 0 && bf < 70,
      issues,
    };
  }

  const density =
    1.29579
    - 0.35004 * Math.log10(inputs.waistCm + (inputs.hipCm ?? 0) - inputs.neckCm)
    + 0.22100 * Math.log10(inputs.heightCm);
  const bf = 495 / density - 450;
  return {
    bodyFatPct: round1(bf),
    method: 'navy_female',
    valid: Number.isFinite(bf) && bf > 0 && bf < 70,
    issues,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
