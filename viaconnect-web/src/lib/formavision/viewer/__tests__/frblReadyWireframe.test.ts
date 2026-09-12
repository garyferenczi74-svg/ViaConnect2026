import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormaVisionFrblReadyPlate } from '@/components/formavision/FormaVisionFrblReadyPlate';
import { FRBL_READY_WIREFRAME_FAIL } from '@/lib/formavision/twoProtocolCopy';
import type { PoseSilhouette } from '@/lib/arnold/scanning/types';
import type { PoseId } from '@/lib/scan/poses';
import {
  classifyWireframeThrow,
  FRBL_WIREFRAME_FAIL_REASONS,
  isFrblWireframeFailReason,
  resolveFrblWireframeMaskFrame,
  runFrblReadyWireframeBuild,
} from '../frblReadyWireframe';
import { buildDenseCageFromMask } from '../frblWireframeCage';

const allPoses = { front: true, right: true, back: true, left: true };

function fillRect(
  mask: Uint8Array,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      mask[y * width + x] = 255;
    }
  }
}

function standingFigure(width = 120, height = 240): {
  mask: Uint8Array;
  width: number;
  height: number;
  contour: Array<{ x: number; y: number }>;
} {
  const mask = new Uint8Array(width * height);
  const sx = width / 120;
  const sy = height / 240;
  fillRect(mask, width, Math.round(48 * sx), Math.round(8 * sy), Math.round(72 * sx), Math.round(36 * sy));
  fillRect(mask, width, Math.round(38 * sx), Math.round(36 * sy), Math.round(82 * sx), Math.round(130 * sy));
  fillRect(mask, width, Math.round(12 * sx), Math.round(48 * sy), Math.round(38 * sx), Math.round(118 * sy));
  fillRect(mask, width, Math.round(82 * sx), Math.round(48 * sy), Math.round(108 * sx), Math.round(118 * sy));
  fillRect(mask, width, Math.round(42 * sx), Math.round(130 * sy), Math.round(58 * sx), Math.round(228 * sy));
  fillRect(mask, width, Math.round(62 * sx), Math.round(130 * sy), Math.round(78 * sx), Math.round(228 * sy));
  const contour = Array.from({ length: 40 }, (_, i) => ({ x: 40 + i, y: 10 }));
  return { mask, width, height, contour };
}

function silhouetteFromMask(
  figure: ReturnType<typeof standingFigure>,
  poseId: PoseId = 'front',
): PoseSilhouette {
  return {
    poseId,
    imageWidth: figure.width,
    imageHeight: figure.height,
    contour: figure.contour,
    landmarks: {},
    scaleCmPerPx: null,
    maskDimensions: { width: figure.width, height: figure.height },
    mask: figure.mask,
    qualityScore: 0,
    qualityIssues: [],
  };
}

describe('FrblWireframeFailReason', () => {
  it('is the closed D0 set', () => {
    expect(FRBL_WIREFRAME_FAIL_REASONS).toEqual([
      'blob',
      'seg',
      'match',
      'cage',
      'timeout',
      'unknown',
    ]);
    for (const reason of FRBL_WIREFRAME_FAIL_REASONS) {
      expect(isFrblWireframeFailReason(reason)).toBe(true);
    }
    expect(isFrblWireframeFailReason('photo')).toBe(false);
  });

  it('classifies abort / timeout throws as timeout, else unknown', () => {
    const aborted = new AbortController();
    aborted.abort();
    expect(classifyWireframeThrow(new Error('nope'), aborted.signal)).toBe('timeout');
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    expect(classifyWireframeThrow(abortErr)).toBe('timeout');
    const timeoutErr = new Error('timed out');
    timeoutErr.name = 'TimeoutError';
    expect(classifyWireframeThrow(timeoutErr)).toBe('timeout');
    expect(classifyWireframeThrow(new Error('seg exploded'))).toBe('unknown');
  });
});

describe('resolveFrblWireframeMaskFrame — H3 packed length', () => {
  it('uses maskDimensions when packed length matches maskImage area', () => {
    const mask = new Uint8Array(16);
    mask.fill(255);
    const frame = resolveFrblWireframeMaskFrame({
      mask,
      imageWidth: 1920,
      imageHeight: 1080,
      maskDimensions: { width: 4, height: 4 },
      contour: [],
    });
    expect(frame.width).toBe(4);
    expect(frame.height).toBe(4);
    expect(frame.mask?.length).toBe(16);
    expect(frame.mask?.length).toBe(frame.width * frame.height);
  });

  it('falls back to imageWidth/Height when packed length matches that area', () => {
    const mask = new Uint8Array(20);
    const frame = resolveFrblWireframeMaskFrame({
      mask,
      imageWidth: 5,
      imageHeight: 4,
      maskDimensions: { width: 256, height: 256 },
      contour: [],
    });
    expect(frame.width).toBe(5);
    expect(frame.height).toBe(4);
    expect(frame.mask?.length).toBe(20);
  });
});

describe('runFrblReadyWireframeBuild — fail-reason branches', () => {
  it('blob: fetch returns null', async () => {
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      fetchBlob: async () => null,
      segment: async () => {
        throw new Error('segment must not run');
      },
    });
    expect(result).toEqual({ ok: false, reason: 'blob' });
  });

  it('seg: processSilhouette throws', async () => {
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      fetchBlob: async () => new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      segment: async () => {
        throw new Error('TFJS selfie failed');
      },
    });
    expect(result).toEqual({ ok: false, reason: 'seg' });
  });

  it('match: packed mask length does not match w×h / empty body', async () => {
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      fetchBlob: async () => new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      segment: async () =>
        silhouetteFromMask({
          mask: new Uint8Array(8),
          width: 80,
          height: 80,
          contour: Array.from({ length: 20 }, (_, i) => ({ x: i, y: i })),
        }),
    });
    expect(result).toEqual({ ok: false, reason: 'match' });
  });

  it('cage: body-matched but MIN_RINGS / sampling cannot loft a cage', async () => {
    const width = 80;
    const height = 40;
    const mask = new Uint8Array(width * height);
    fillRect(mask, width, 20, 10, 60, 28);
    const contour = Array.from({ length: 20 }, (_, i) => ({ x: 20 + i, y: 10 }));
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      fetchBlob: async () => new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      segment: async () =>
        silhouetteFromMask({ mask, width, height, contour }),
    });
    expect(result).toEqual({ ok: false, reason: 'cage' });
  });

  it('timeout: aborted signal before fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      signal: controller.signal,
      fetchBlob: async () => new Blob([new Uint8Array([1])]),
      segment: async () => {
        throw new Error('must not run');
      },
    });
    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('timeout: fetch throws AbortError', async () => {
    const err = new Error('The user aborted a request.');
    err.name = 'AbortError';
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      fetchBlob: async () => {
        throw err;
      },
      segment: async () => {
        throw new Error('must not run');
      },
    });
    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('unknown: fetch throws a non-abort error', async () => {
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      fetchBlob: async () => {
        throw new Error('network down');
      },
      segment: async () => {
        throw new Error('must not run');
      },
    });
    expect(result).toEqual({ ok: false, reason: 'unknown' });
  });

  it('success: same-origin blob + matched full-body mask paints a cage', async () => {
    const figure = standingFigure();
    const result = await runFrblReadyWireframeBuild({
      sessionId: 'sess-1',
      side: 'front',
      fetchBlob: async () => new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      segment: async ({ includeMask }) => {
        expect(includeMask).toBe(true);
        return silhouetteFromMask(figure);
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.ringCount).toBeGreaterThanOrEqual(36);
    expect(result.spec.polylines.length).toBeGreaterThan(0);
  });
});

describe('H4 — real FRBL full-body mask passes existing gates', () => {
  it('does not need MIN_RINGS lowered for a standing full-body mask', () => {
    const figure = standingFigure(640, 1280);
    const cage = buildDenseCageFromMask(
      figure.mask,
      figure.width,
      figure.height,
      figure.contour,
    );
    expect(cage).not.toBeNull();
    expect(cage?.ringCount).toBeGreaterThanOrEqual(36);
  });
});

describe('Brief 65 smoke — stay on Wireframe chamber', () => {
  it('fail hook keeps mode=wireframe + Lex honesty + fail-reason', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormaVisionFrblReadyPlate, {
        sessionId: 'sess-retain-65',
        poses: allPoses,
        initialMode: 'wireframe',
        initialWireframeFail: true,
        initialWireframeFailReason: 'seg',
      }),
    );
    expect(html).toContain('data-ready-mode="wireframe"');
    expect(html).toContain('data-chamber="fail"');
    expect(html).toContain('data-wireframe-fail-reason="seg"');
    expect(html).toContain('formavision-frbl-ready-wireframe-fail');
    expect(html).toContain(FRBL_READY_WIREFRAME_FAIL);
    expect(html).not.toContain('data-testid="formavision-frbl-ready-wireframe"');
    expect(html).not.toContain('formavision-anatomical-floor');
    expect(html).not.toContain('formavision-model-viewer');
    expect(html).not.toContain('formavision-3d-mount');
    expect(html).not.toMatch(/generateAvatarMesh|AnatomicalFloor|avatarMeshGenerator/);
  });

  it('plate source never force-reverts to Photo; still bans GLB / AnatomicalFloor', () => {
    const plate = readFileSync(
      join(process.cwd(), 'src/components/formavision/FormaVisionFrblReadyPlate.tsx'),
      'utf8',
    );
    const helper = readFileSync(join(__dirname, '..', 'frblReadyWireframe.ts'), 'utf8');
    const runtime = readFileSync(
      join(process.cwd(), 'src/lib/arnold/scanning/selfieSegmenterRuntime.ts'),
      'utf8',
    );
    expect(plate).toMatch(/stayOnWireframeFail/);
    expect(plate).toMatch(/data-wireframe-fail-reason/);
    expect(plate).toMatch(/runFrblReadyWireframeBuild/);
    expect(plate).not.toMatch(/revertToPhoto/);
    expect(plate).not.toMatch(/setMode\('photo'\)/);
    expect(plate).not.toMatch(/from ['"][^'"]*avatarMeshGenerator['"]/);
    expect(plate).not.toMatch(/FormaVisionAnatomicalFloor/);
    expect(helper).toMatch(/includeMask:\s*true/);
    expect(helper).not.toMatch(/generateAvatarMesh|AnatomicalFloor|avatarMeshGenerator/);
    expect(helper).not.toMatch(/@react-three|model-viewer/);
    expect(runtime).toMatch(/@tensorflow\/tfjs/);
    expect(runtime).toMatch(/@tensorflow-models\/body-segmentation/);
    expect(runtime).not.toMatch(/turbopackIgnore:\s*true/);
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8');
    expect(nextConfig).toMatch(/transpilePackages/);
    expect(nextConfig).toMatch(/@tensorflow\/tfjs/);
    expect(nextConfig).toMatch(/@tensorflow-models\/body-segmentation/);
    expect(nextConfig).toMatch(/mediapipe-selfie-segmentation/);
  });
});
