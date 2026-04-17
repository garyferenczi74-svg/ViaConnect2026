// CUN-BAE (Clinica Universidad de Navarra Body Adiposity Estimator).
// Gomez-Ambrosi et al. (2012). BMI + age + sex, no circumferences required.
// Useful as a third-opinion fallback when circumferences are unreliable.

import type { BiologicalSex } from './types';

export interface CunbaeInputs {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
}

export interface CunbaeResult {
  bodyFatPct: number;
  bmi: number;
  valid: boolean;
  issues: string[];
}

export function cunbaeBodyFat(inputs: CunbaeInputs): CunbaeResult {
  const issues: string[] = [];
  if (inputs.weightKg <= 0) issues.push('Weight required');
  if (inputs.heightCm <= 0) issues.push('Height required');
  if (inputs.age <= 0)      issues.push('Age required');

  const heightM = inputs.heightCm / 100;
  const bmi = heightM > 0 ? inputs.weightKg / (heightM * heightM) : 0;
  const sexFactor = inputs.sex === 'male' ? 0 : 1;

  if (bmi <= 0 || issues.length > 0) {
    return { bodyFatPct: 0, bmi: 0, valid: false, issues };
  }

  const bf =
    -44.988
    + 0.503 * inputs.age
    + 10.689 * sexFactor
    + 3.172 * bmi
    - 0.026 * bmi * bmi
    + 0.181 * bmi * sexFactor
    - 0.02 * bmi * inputs.age
    - 0.005 * bmi * bmi * sexFactor
    + 0.00021 * bmi * bmi * inputs.age;

  return {
    bodyFatPct: round1(bf),
    bmi: round1(bmi),
    valid: Number.isFinite(bf) && bf > 0 && bf < 70,
    issues,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
