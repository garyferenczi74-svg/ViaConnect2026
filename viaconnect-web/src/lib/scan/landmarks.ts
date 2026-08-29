import type { Landmark } from './types';
export const LM = {
  nose: 0, lEye: 2, rEye: 5, lEar: 7, rEar: 8,
  lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
  lHeel: 29, rHeel: 30, lFoot: 31, rFoot: 32,
} as const;
export function vis(lms: Landmark[], i: number): number { return lms[i]?.visibility ?? 0; }
export function distX(a: Landmark, b: Landmark): number { return Math.abs(a.x - b.x); }
export function midpointX(a: Landmark, b: Landmark): number { return (a.x + b.x) / 2; }
