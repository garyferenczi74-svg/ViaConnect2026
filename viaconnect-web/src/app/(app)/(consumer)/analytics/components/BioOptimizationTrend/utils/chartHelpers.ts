import type { ScorePoint } from "./trendCalculations";

export const CHART_PAD = { t: 30, r: 20, b: 40, l: 50 };
export const CHART_VB_W = 800;
export const CHART_VB_H = 320;

export type ChartScale = {
  xFor: (i: number, total: number) => number;
  yFor: (v: number) => number;
  innerW: number;
  innerH: number;
};

export function buildScale(totalPoints: number): ChartScale {
  const innerW = CHART_VB_W - CHART_PAD.l - CHART_PAD.r;
  const innerH = CHART_VB_H - CHART_PAD.t - CHART_PAD.b;
  return {
    innerW,
    innerH,
    xFor: (i, total) => {
      const denom = Math.max(1, total - 1);
      return CHART_PAD.l + (i / denom) * innerW;
    },
    yFor: (v) => CHART_PAD.t + innerH - (v / 100) * innerH,
  };
}

export function buildLinePath(points: ScorePoint[], scale: ChartScale): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => {
      const x = scale.xFor(i, points.length);
      const y = scale.yFor(p.score);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildAreaPath(points: ScorePoint[], scale: ChartScale): string {
  if (points.length === 0) return "";
  const line = buildLinePath(points, scale);
  const lastX = scale.xFor(points.length - 1, points.length);
  const firstX = scale.xFor(0, points.length);
  const baseY = CHART_PAD.t + scale.innerH;
  return `${line} L${lastX.toFixed(2)},${baseY} L${firstX.toFixed(2)},${baseY} Z`;
}

export function formatDate(iso: string, range: "7D" | "4W" | "3M" | "1Y"): string {
  const d = new Date(iso);
  if (range === "7D") {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  if (range === "4W" || range === "3M") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short" });
}
