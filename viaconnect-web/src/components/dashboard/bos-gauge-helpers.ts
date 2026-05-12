// Pure helpers shared with bos-score-gauge.tsx. Extracted to a JSX
// free module so Vitest (configured environment: 'node' with no React
// JSX runtime) can import the band classifier and geometry helpers.
//
// The .tsx gauge component imports these and re-exports them through
// __testables for legacy compatibility.
//
// Patch pass (Phase A corrective): canonical legacy geometry is a
// SINGLE size (240px outer diameter, 14px stroke) used responsively
// via CSS, matching the recovered BioOptimizationGauge.tsx. The dual
// 120/160 mobile/desktop branch from the earlier rewrite is removed
// because it diverged from the legacy's hero-scale visual language.

// 5 tier color band per legacy BioOptimizationGauge.colorForScore.
export function colorForScore(score: number): string {
  if (score >= 91) return '#A855F7';
  if (score >= 76) return '#22C55E';
  if (score >= 51) return '#2DA5A0';
  if (score >= 26) return '#F59E0B';
  return '#EF4444';
}

export function labelForScore(score: number): string {
  if (score >= 91) return 'OPTIMAL';
  if (score >= 76) return 'EXCELLENT';
  if (score >= 51) return 'GOOD';
  if (score >= 26) return 'BUILDING';
  return 'NEEDS ATTENTION';
}

export function sentenceCase(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase();
}

// SVG geometry. 270 degree sweep open at bottom; rotation 135deg.
// Canonical legacy dimensions: 240px outer, 14px stroke.
export const SWEEP_DEGREES = 270;
export const START_ANGLE_DEGREES = 135;
export const GAUGE_SIZE = 240;
export const GAUGE_STROKE = 14;

export function geometryFor(size: number, stroke: number): {
  radius: number;
  center: number;
  circumference: number;
  arcLength: number;
} {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (SWEEP_DEGREES / 360) * circumference;
  return { radius, center, circumference, arcLength };
}

// Pure math kernel for the legacy useCountUp animator. Ease-out-cubic
// over the 0..1 progress range, rounded to an integer. Extracted so
// Vitest can assert the curve without requestAnimationFrame timing.
export function countUpValueAtProgress(target: number, progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  const eased = 1 - Math.pow(1 - clamped, 3);
  return Math.round(target * eased);
}
