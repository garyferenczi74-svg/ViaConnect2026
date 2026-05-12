// Pure helpers shared with bos-score-gauge.tsx. Extracted to a JSX
// free module so Vitest (configured environment: 'node' with no React
// JSX runtime) can import the band classifier and geometry helpers.
//
// The .tsx gauge component imports these and re-exports them through
// __testables for legacy compatibility.

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
export const SWEEP_DEGREES = 270;
export const START_ANGLE_DEGREES = 135;

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
