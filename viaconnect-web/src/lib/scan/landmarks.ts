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

// Prompt 231: body skeleton edges for the debug SkeletonOverlay, indexed
// through LM above rather than magic numbers. Limited to the landmark
// indices LM already names (no face-mesh or hand-finger detail), which is
// sufficient for a debug overlay whose only job is showing pose geometry.
export const POSE_CONNECTIONS: Array<{ from: number; to: number }> = [
  { from: LM.lEye, to: LM.rEye },
  { from: LM.lEye, to: LM.lEar },
  { from: LM.rEye, to: LM.rEar },
  { from: LM.lShoulder, to: LM.rShoulder },
  { from: LM.lShoulder, to: LM.lElbow },
  { from: LM.lElbow, to: LM.lWrist },
  { from: LM.rShoulder, to: LM.rElbow },
  { from: LM.rElbow, to: LM.rWrist },
  { from: LM.lShoulder, to: LM.lHip },
  { from: LM.rShoulder, to: LM.rHip },
  { from: LM.lHip, to: LM.rHip },
  { from: LM.lHip, to: LM.lKnee },
  { from: LM.lKnee, to: LM.lAnkle },
  { from: LM.rHip, to: LM.rKnee },
  { from: LM.rKnee, to: LM.rAnkle },
  { from: LM.lAnkle, to: LM.lHeel },
  { from: LM.lHeel, to: LM.lFoot },
  { from: LM.rAnkle, to: LM.rHeel },
  { from: LM.rHeel, to: LM.rFoot },
];
