// Prompt 201i (2026-06-16, Gary's "Prompt 200b"): pure math for the bespoke SVG
// Trajectory chart. NO engine math here; these only map the engine-returned
// series to SVG geometry, derive display-only milestones, and compute a
// client-side on-track status (the engine exposes none yet; the chart labels it
// as a guide). Time-based X so actual, projected, today, and the goal endpoint
// sit at their correct temporal positions.

export interface Pt {
  readonly ms: number;
  readonly lb: number;
}

export interface ChartPad {
  readonly t: number;
  readonly r: number;
  readonly b: number;
  readonly l: number;
}

export interface ChartScale {
  xForMs: (ms: number) => number;
  yForLb: (lb: number) => number;
  innerW: number;
  innerH: number;
  baseY: number;
}

export interface ScaleInput {
  readonly minMs: number;
  readonly maxMs: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly vbW: number;
  readonly vbH: number;
  readonly pad: ChartPad;
}

export function buildScale(s: ScaleInput): ChartScale {
  const innerW = s.vbW - s.pad.l - s.pad.r;
  const innerH = s.vbH - s.pad.t - s.pad.b;
  const baseY = s.pad.t + innerH;
  const msSpan = Math.max(1, s.maxMs - s.minMs);
  const lbSpan = Math.max(1, s.yMax - s.yMin);
  return {
    innerW,
    innerH,
    baseY,
    xForMs: (ms) => s.pad.l + ((ms - s.minMs) / msSpan) * innerW,
    yForLb: (lb) => s.pad.t + innerH - ((lb - s.yMin) / lbSpan) * innerH,
  };
}

export function weightYDomain(weights: number[], padLb = 5): [number, number] {
  const valid = weights.filter((w) => Number.isFinite(w));
  if (valid.length === 0) return [0, 1];
  return [Math.min(...valid) - padLb, Math.max(...valid) + padLb];
}

// Monotone-ish Catmull-Rom -> cubic Bezier smoothing through the scaled points.
export function smoothLinePath(pts: Pt[], scale: ChartScale): string {
  if (pts.length === 0) return '';
  const p = pts.map((pt) => ({ x: scale.xForMs(pt.ms), y: scale.yForLb(pt.lb) }));
  if (p.length === 1) return `M${p[0].x.toFixed(2)},${p[0].y.toFixed(2)}`;
  let d = `M${p[0].x.toFixed(2)},${p[0].y.toFixed(2)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export function areaPath(pts: Pt[], scale: ChartScale): string {
  if (pts.length === 0) return '';
  const line = smoothLinePath(pts, scale);
  const lastX = scale.xForMs(pts[pts.length - 1].ms);
  const firstX = scale.xForMs(pts[0].ms);
  return `${line} L${lastX.toFixed(2)},${scale.baseY.toFixed(2)} L${firstX.toFixed(2)},${scale.baseY.toFixed(2)} Z`;
}

// Display-only milestone weights: start, the halfway point, each 10 lb crossing
// strictly between, and goal; ordered from start toward goal.
export function computeMilestones(startLb: number, goalLb: number): number[] {
  if (!Number.isFinite(startLb) || !Number.isFinite(goalLb)) return [];
  if (startLb === goalLb) return [startLb];
  const set = new Set<number>([startLb, goalLb]);
  set.add(Math.round(((startLb + goalLb) / 2) * 10) / 10);
  const lo = Math.min(startLb, goalLb);
  const hi = Math.max(startLb, goalLb);
  for (let w = Math.ceil(lo / 10) * 10; w < hi; w += 10) {
    if (w > lo && w < hi) set.add(w);
  }
  const arr = [...set];
  arr.sort((a, b) => (startLb <= goalLb ? a - b : b - a));
  return arr;
}

// On a narrow visible weight span, drop the intermediate crossings so markers
// never clutter; keep start, a middle, and goal.
export function thinMilestonesForRange(milestoneLbs: number[], visibleLbSpan: number): number[] {
  if (visibleLbSpan >= 6 || milestoneLbs.length <= 3) return milestoneLbs.slice();
  const first = milestoneLbs[0];
  const last = milestoneLbs[milestoneLbs.length - 1];
  const mid = milestoneLbs[Math.floor(milestoneLbs.length / 2)];
  return [...new Set([first, mid, last])];
}

// Evenly sample at most maxTicks timestamps for x labels so they never collide.
export function thinTicks(msList: number[], maxTicks: number): number[] {
  if (msList.length <= maxTicks || maxTicks <= 1) return msList.slice();
  const step = (msList.length - 1) / (maxTicks - 1);
  const out: number[] = [];
  for (let i = 0; i < maxTicks; i++) out.push(msList[Math.round(i * step)]);
  return [...new Set(out)];
}

export type TrackStatus = 'on_track' | 'ahead' | 'behind';

// Client-side on-track guide (the engine exposes no status). Interpolates the
// expected weight today on the linear start->goal path over start->projected and
// compares the latest smoothed weight, direction-aware.
export function onTrackStatus(input: {
  startLb: number;
  latestLb: number | null | undefined;
  goalLb: number;
  startMs: number;
  projectedMs: number | null | undefined;
  todayMs: number;
  toleranceLb?: number;
}): TrackStatus | null {
  const { startLb, latestLb, goalLb, startMs, projectedMs, todayMs } = input;
  const tol = input.toleranceLb ?? 1.5;
  if (latestLb == null || !Number.isFinite(latestLb)) return null;
  if (projectedMs == null || !Number.isFinite(projectedMs) || projectedMs <= startMs) return null;
  if (startLb === goalLb) return null;
  const frac = Math.max(0, Math.min(1, (todayMs - startMs) / (projectedMs - startMs)));
  const expectedLb = startLb + (goalLb - startLb) * frac;
  const diff = latestLb - expectedLb;
  if (Math.abs(diff) <= tol) return 'on_track';
  const losing = goalLb < startLb;
  if (losing) return diff < 0 ? 'ahead' : 'behind';
  return diff > 0 ? 'ahead' : 'behind';
}
