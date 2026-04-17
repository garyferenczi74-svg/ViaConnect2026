// Bilateral asymmetry analysis — QuadraScan-style but derived from
// pairs of measurements rather than full gait analysis.

import type { AsymmetryCheck, AsymmetryReport, ExtractedMeasurements } from './types';

const THRESHOLDS = {
  balanced: 95,
  minor: 90,
  moderate: 85,
};

export function analyzeAsymmetry(m: ExtractedMeasurements): AsymmetryReport {
  const checks: AsymmetryCheck[] = [];

  checks.push(check('Bicep circumference',  m.leftBicepCirc.cm,   m.rightBicepCirc.cm,   'cm'));
  checks.push(check('Forearm circumference', m.leftForearmCirc.cm, m.rightForearmCirc.cm, 'cm'));
  checks.push(check('Thigh circumference',  m.leftThighCirc.cm,   m.rightThighCirc.cm,   'cm'));
  checks.push(check('Calf circumference',   m.leftCalfCirc.cm,    m.rightCalfCirc.cm,    'cm'));

  const flagged = checks.filter((c) => c.status !== 'balanced');
  const overallScore = checks.length
    ? Math.round(checks.reduce((s, c) => s + c.balanceRatioPct, 0) / checks.length)
    : 100;

  return {
    checks,
    overallScore,
    flaggedAreas: flagged.map((c) => c.name),
    recommendations: flagged.map((c) => c.recommendation),
  };
}

function check(name: string, left: number, right: number, unit: string): AsymmetryCheck {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) {
    return {
      name, leftValue: left, rightValue: right, unit,
      balanceRatioPct: 0,
      status: 'balanced',
      recommendation: 'Not measured',
    };
  }
  const smaller = Math.min(left, right);
  const larger = Math.max(left, right);
  const ratio = Math.round((smaller / larger) * 1000) / 10;

  let status: AsymmetryCheck['status'];
  let recommendation: string;
  if (ratio >= THRESHOLDS.balanced) {
    status = 'balanced';
    recommendation = 'Balanced, no action needed.';
  } else if (ratio >= THRESHOLDS.minor) {
    status = 'minor_imbalance';
    recommendation = `Minor imbalance in ${name.toLowerCase()}, ${ratio.toFixed(1)}%. Normal individual variation; unilateral work can even it out.`;
  } else if (ratio >= THRESHOLDS.moderate) {
    status = 'moderate_imbalance';
    recommendation = `Moderate imbalance in ${name.toLowerCase()}, ${ratio.toFixed(1)}%. Consider 2 to 3 sets of unilateral work per training session on the weaker side.`;
  } else {
    status = 'significant_imbalance';
    recommendation = `Significant imbalance in ${name.toLowerCase()}, ${ratio.toFixed(1)}%. If this has persisted or worsened, consider evaluation with a physical therapist or trainer.`;
  }
  return {
    name,
    leftValue: round1(left),
    rightValue: round1(right),
    unit,
    balanceRatioPct: ratio,
    status,
    recommendation,
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
