// Prompt #94 Phase 3.4: NRR / GRR + retention curve projection.
//
// Pure helpers. The LTV engine uses the projection helpers to extrapolate
// incomplete cohorts to the LTV horizon (12, 24, 36 months).

// ---------------------------------------------------------------------------
// Net Revenue Retention
// ---------------------------------------------------------------------------

export interface NRRInput {
  startingMrrCents: number;
  expansionMrrCents: number;
  contractionMrrCents: number;
  churnMrrCents: number;
}

export interface NRRResult {
  nrr_percent: number | null;
  is_expansion_mode: boolean;
}

export function computeNRR(input: NRRInput): NRRResult {
  if (input.startingMrrCents <= 0) {
    return { nrr_percent: null, is_expansion_mode: false };
  }
  const ending =
    input.startingMrrCents +
    input.expansionMrrCents -
    input.contractionMrrCents -
    input.churnMrrCents;
  const ratio = ending / input.startingMrrCents;
  return {
    nrr_percent: roundPercent(ratio * 100),
    is_expansion_mode: ratio > 1,
  };
}

// ---------------------------------------------------------------------------
// Gross Revenue Retention
// ---------------------------------------------------------------------------

export interface GRRInput {
  startingMrrCents: number;
  contractionMrrCents: number;
  churnMrrCents: number;
}

export interface GRRResult {
  grr_percent: number | null;
}

export function computeGRR(input: GRRInput): GRRResult {
  if (input.startingMrrCents <= 0) {
    return { grr_percent: null };
  }
  const ending = Math.max(
    0,
    input.startingMrrCents - input.contractionMrrCents - input.churnMrrCents,
  );
  // GRR is bounded above at 100 (no expansion in the formula).
  const ratio = Math.min(1, ending / input.startingMrrCents);
  return { grr_percent: roundPercent(ratio * 100) };
}

// ---------------------------------------------------------------------------
// Retention curve projection
// ---------------------------------------------------------------------------

export interface RetentionPoint {
  month: number;     // offset from cohort start, 0 = first month
  retention: number; // 0..1
}

export type ProjectionMethod = 'actual' | 'exponential_decay' | 'linear_decay';

export interface RetentionFit {
  method: ProjectionMethod;
  // Exponential: retention(m) = a * exp(-b * m)
  a?: number;
  b?: number;
  // Linear:      retention(m) = m_slope * m + intercept
  m_slope?: number;
  intercept?: number;
}

export function fitExponentialDecay(points: RetentionPoint[]): RetentionFit {
  // Filter out non-positive retentions (log undefined for zero/negative).
  const positives = points.filter((p) => p.retention > 0);
  if (positives.length < 3) {
    return fitLinearDecay(points);
  }

  // Linearize: ln(retention) = ln(a) - b * m
  const n = positives.length;
  const xs = positives.map((p) => p.month);
  const ys = positives.map((p) => Math.log(p.retention));
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;

  if (denom === 0) {
    return fitLinearDecay(points);
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  // slope corresponds to -b, intercept to ln(a)
  return {
    method: 'exponential_decay',
    a: Math.exp(intercept),
    b: -slope,
  };
}

export function fitLinearDecay(points: RetentionPoint[]): RetentionFit {
  if (points.length < 2) {
    return { method: 'linear_decay', m_slope: 0, intercept: points[0]?.retention ?? 1 };
  }
  const n = points.length;
  const xs = points.map((p) => p.month);
  const ys = points.map((p) => p.retention);
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return {
    method: 'linear_decay',
    m_slope: slope,
    intercept,
  };
}

export function projectExponentialDecay(fit: RetentionFit, month: number): number {
  if (fit.method === 'exponential_decay' && fit.a !== undefined && fit.b !== undefined) {
    return clamp01(fit.a * Math.exp(-fit.b * month));
  }
  if (fit.method === 'linear_decay' && fit.m_slope !== undefined && fit.intercept !== undefined) {
    return clamp01(fit.m_slope * month + fit.intercept);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function roundPercent(n: number): number {
  return Math.round(n * 1000) / 1000;
}
