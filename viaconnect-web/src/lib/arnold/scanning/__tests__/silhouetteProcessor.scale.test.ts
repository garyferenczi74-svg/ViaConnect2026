// Arnold PASS C — frontScaleCmPerPx (lifted computeScale).
// Finite only from height + nose + ankle mid-frame. Never invents cm.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BODY_HEIGHT_MIN } from '@/lib/scan/qaThresholds';
import { frontScaleCmPerPx } from '../silhouetteProcessor';
import type { LandmarkMap } from '../types';

const HEIGHT_CM = 180;
const FRAME = 400;

const midFrameAnchors: LandmarkMap = {
  nose: { x: 100, y: 40 },
  left_ankle: { x: 90, y: 360 },
  right_ankle: { x: 110, y: 360 },
};

describe('frontScaleCmPerPx', () => {
  it('is finite when height + nose + ankle are mid-frame', () => {
    const scale = frontScaleCmPerPx(midFrameAnchors, HEIGHT_CM, FRAME);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });

  it('uses Number.isFinite the same way hasFrontScaleAnchors does', () => {
    expect(frontScaleCmPerPx({
      nose: { x: 100, y: Number.NaN },
      left_ankle: { x: 90, y: 360 },
    }, HEIGHT_CM, FRAME)).toBeNull();
    expect(frontScaleCmPerPx({
      nose: { x: 100, y: 40 },
      left_ankle: { x: 90, y: Number.POSITIVE_INFINITY },
    }, HEIGHT_CM, FRAME)).toBeNull();
  });

  it('is null when anchors are missing', () => {
    expect(frontScaleCmPerPx({}, HEIGHT_CM, FRAME)).toBeNull();
    expect(frontScaleCmPerPx({ nose: { x: 100, y: 40 } }, HEIGHT_CM, FRAME)).toBeNull();
    expect(frontScaleCmPerPx({ left_ankle: { x: 90, y: 360 } }, HEIGHT_CM, FRAME)).toBeNull();
  });

  it('is null when height is missing, ≤0, or not finite', () => {
    expect(frontScaleCmPerPx(midFrameAnchors, null, FRAME)).toBeNull();
    expect(frontScaleCmPerPx(midFrameAnchors, 0, FRAME)).toBeNull();
    expect(frontScaleCmPerPx(midFrameAnchors, -10, FRAME)).toBeNull();
    expect(frontScaleCmPerPx(midFrameAnchors, Number.NaN, FRAME)).toBeNull();
  });

  it('is null when nose-to-ankle span is ≤0', () => {
    expect(frontScaleCmPerPx({
      nose: { x: 100, y: 200 },
      left_ankle: { x: 90, y: 200 },
    }, HEIGHT_CM, FRAME)).toBeNull();
  });

  it('is null when span is below BODY_HEIGHT_MIN of the frame (too far — never invent)', () => {
    const span = BODY_HEIGHT_MIN * FRAME - 1;
    expect(frontScaleCmPerPx({
      nose: { x: 100, y: 40 },
      left_ankle: { x: 90, y: 40 + span },
    }, HEIGHT_CM, FRAME)).toBeNull();
  });

  it('C4a: full-bleed FRBL (span ≈ frame) stays finite — no 1.1× reject', () => {
    const scale = frontScaleCmPerPx({
      nose: { x: 100, y: 1 },
      left_ankle: { x: 90, y: FRAME - 1 },
    }, HEIGHT_CM, FRAME);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });

  it('accepts a single finite ankle (left or right)', () => {
    expect(Number.isFinite(frontScaleCmPerPx({
      nose: { x: 100, y: 40 },
      right_ankle: { x: 110, y: 360 },
    }, HEIGHT_CM, FRAME))).toBe(true);
  });

  it('never invents a scale number when inputs are unknown', () => {
    const unknown = frontScaleCmPerPx({}, HEIGHT_CM, FRAME);
    expect(unknown).toBeNull();
    expect(JSON.stringify(unknown)).not.toMatch(/cm|muscle|lbs/i);
  });
});

describe('silhouetteProcessor C4a source contract', () => {
  it('dropped the estimatedTotalPx > imageHeight * 1.1 reject', () => {
    const src = readFileSync(join(__dirname, '..', 'silhouetteProcessor.ts'), 'utf8');
    expect(src).toMatch(/export function frontScaleCmPerPx/);
    expect(src).toMatch(/Number\.isFinite/);
    expect(src).toMatch(/BODY_HEIGHT_MIN/);
    expect(src).not.toMatch(/imageHeight \* 1\.1/);
    expect(src).not.toMatch(/estimatedTotalPx > imageHeight/);
  });
});

describe('C2/C5 live in-memory path source contract', () => {
  it('wires hasFrontScaleAnchors after detectLandmarks and logs scale on the existing info line', () => {
    const src = readFileSync(join(__dirname, '..', 'runScanAnalysis.ts'), 'utf8');
    expect(src).toMatch(/hasFrontScaleAnchors\(landmarks\)/);
    expect(src).toMatch(/pose === 'front' && !hasFrontScaleAnchors/);
    expect(src).toMatch(/reason: 'empty_landmarks'/);
    expect(src).toMatch(/hasFrontScaleAnchors: frontSil/);
    expect(src).toMatch(/scaleCmPerPx: frontSil/);
    expect(src).toMatch(/circGate: 'hasFiniteGeometricGirth'/);
  });

  it('does not expand the five-reason circ taxonomy', () => {
    const src = readFileSync(join(__dirname, '..', 'circFailReason.ts'), 'utf8');
    expect(src).toMatch(/'timeout',\s*'empty_landmarks',\s*'extract_throw',\s*'all_unknown',\s*'height'/);
  });
});
