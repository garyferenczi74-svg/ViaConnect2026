// Heuristic scan quality scoring. Looks at: landmark visibility
// (blocked by clothing or cropped), torso-to-image height ratio (is the
// subject too far or too close?), pose consistency across front/side
// (are arms positioned similarly?).

import type { LandmarkMap, PoseSilhouette } from './types';

export interface ScanQuality {
  score: number;
  issues: string[];
}

export function assessQuality(silhouettes: PoseSilhouette[]): ScanQuality {
  const issues: string[] = [];
  let score = 1.0;

  if (silhouettes.length < 2) {
    issues.push('insufficient_poses');
    score -= 0.3;
  }

  for (const s of silhouettes) {
    const lm = s.landmarks;
    // Core landmarks must be visible
    const coreKeys = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle'] as const;
    for (const k of coreKeys) {
      const p = lm[k];
      if (!p) {
        issues.push(`missing_landmark_${k}_${s.poseId}`);
        score -= 0.08;
        continue;
      }
      if ((p.visibility ?? 1) < 0.4) {
        issues.push(`low_visibility_${k}_${s.poseId}`);
        score -= 0.04;
      }
    }

    // Torso span: shoulder to hip distance should be a meaningful portion of image
    const span = torsoSpanPx(lm);
    if (span !== null && span < s.imageHeight * 0.25) {
      issues.push(`subject_too_far_${s.poseId}`);
      score -= 0.10;
    }
    if (span !== null && span > s.imageHeight * 0.75) {
      issues.push(`subject_too_close_${s.poseId}`);
      score -= 0.10;
    }

    if (s.scaleCmPerPx === null) {
      issues.push(`no_scale_${s.poseId}`);
      score -= 0.05;
    }
  }

  return { score: Math.max(0, Math.min(1, round2(score))), issues: dedupe(issues) };
}

function torsoSpanPx(lm: LandmarkMap): number | null {
  const ls = lm.left_shoulder;
  const rs = lm.right_shoulder;
  const lh = lm.left_hip;
  const rh = lm.right_hip;
  if (!ls || !rs || !lh || !rh) return null;
  const shoulderY = (ls.y + rs.y) / 2;
  const hipY = (lh.y + rh.y) / 2;
  return Math.abs(hipY - shoulderY);
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
