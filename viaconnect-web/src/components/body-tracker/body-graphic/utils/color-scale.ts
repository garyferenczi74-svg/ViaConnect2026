// Prompt #118 — Heatmap color scale. Maps normalized value (0..1) + optional
// HealthStatus to a semantic hex color.

import type { HealthStatus } from "../BodyGraphic.types";

export const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: "#2DA5A0",    // Teal (primary)
  caution: "#B75E18",    // Orange
  alert:   "#C94040",    // Crimson
  "no-data": "#475569",  // Slate-600
};

// Ramp used when only a numeric value is given (0..1). Low values are subtle
// (slate), mid values teal, high values orange — NOT red (reserved for alert).
const VALUE_RAMP: readonly { stop: number; hex: string }[] = [
  { stop: 0.0, hex: "#475569" },
  { stop: 0.3, hex: "#336F7F" },
  { stop: 0.6, hex: "#2DA5A0" },
  { stop: 0.9, hex: "#B75E18" },
];

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const p = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export function colorFromValue(value: number): string {
  const v = Math.max(0, Math.min(1, value));
  for (let i = 0; i < VALUE_RAMP.length - 1; i++) {
    const lo = VALUE_RAMP[i];
    const hi = VALUE_RAMP[i + 1];
    if (v >= lo.stop && v <= hi.stop) {
      const t = (v - lo.stop) / (hi.stop - lo.stop || 1);
      const [r1, g1, b1] = hexToRgb(lo.hex);
      const [r2, g2, b2] = hexToRgb(hi.hex);
      return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
    }
  }
  return VALUE_RAMP[VALUE_RAMP.length - 1].hex;
}

export function colorScale(value: number | undefined, status?: HealthStatus): string {
  if (status && status in STATUS_COLORS) return STATUS_COLORS[status];
  if (typeof value === "number" && Number.isFinite(value)) return colorFromValue(value);
  return STATUS_COLORS["no-data"];
}

export function alphaFill(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}
