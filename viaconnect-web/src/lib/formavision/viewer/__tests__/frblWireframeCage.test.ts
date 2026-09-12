import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildDenseCageFromMask,
  FRBL_WIREFRAME_CYAN,
  FRBL_WIREFRAME_MIN_MERIDIANS,
  FRBL_WIREFRAME_MIN_RINGS,
  silhouetteMaskIsBodyMatched,
} from '../frblWireframeCage';
import type { Point2D } from '@/lib/arnold/scanning/types';

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

function standingFigureMask(): { mask: Uint8Array; width: number; height: number; contour: Point2D[] } {
  const width = 120;
  const height = 240;
  const mask = new Uint8Array(width * height);
  fillRect(mask, width, 48, 8, 72, 36);
  fillRect(mask, width, 38, 36, 82, 130);
  fillRect(mask, width, 12, 48, 38, 118);
  fillRect(mask, width, 82, 48, 108, 118);
  fillRect(mask, width, 42, 130, 58, 228);
  fillRect(mask, width, 62, 130, 78, 228);
  const contour: Point2D[] = [];
  for (let i = 0; i < 40; i += 1) contour.push({ x: 40 + i, y: 10 });
  return { mask, width, height, contour };
}

describe('buildDenseCageFromMask', () => {
  it('builds a dense near+far cage from a body-matched mask', () => {
    const { mask, width, height, contour } = standingFigureMask();
    expect(
      silhouetteMaskIsBodyMatched({ mask, width, height, contour }),
    ).toBe(true);
    const cage = buildDenseCageFromMask(mask, width, height, contour);
    expect(cage).not.toBeNull();
    if (!cage) return;
    expect(cage.ringCount).toBeGreaterThanOrEqual(FRBL_WIREFRAME_MIN_RINGS);
    expect(cage.meridianCount).toBeGreaterThanOrEqual(FRBL_WIREFRAME_MIN_MERIDIANS);
    expect(cage.farPolylineCount).toBeGreaterThan(0);
    expect(cage.nearPolylineCount).toBeGreaterThan(0);
    expect(cage.tubeCount).toBeGreaterThanOrEqual(1);
    expect(cage.polylines.length).toBeGreaterThan(cage.ringCount);
    expect(FRBL_WIREFRAME_CYAN).toBe('#2EE6D6');
  });

  it('returns null for an empty or speck mask — honesty, no invented body', () => {
    const width = 80;
    const height = 80;
    const empty = new Uint8Array(width * height);
    expect(buildDenseCageFromMask(empty, width, height, [])).toBeNull();
    const speck = new Uint8Array(width * height);
    speck[10 * width + 10] = 255;
    expect(
      silhouetteMaskIsBodyMatched({
        mask: speck,
        width,
        height,
        contour: Array.from({ length: 20 }, (_, i) => ({ x: i, y: i })),
      }),
    ).toBe(false);
    expect(
      buildDenseCageFromMask(
        speck,
        width,
        height,
        Array.from({ length: 20 }, (_, i) => ({ x: i, y: i })),
      ),
    ).toBeNull();
  });
});

describe('Brief 65 cage source contract', () => {
  it('does not use parametric mesh, AnatomicalFloor, or GLB', () => {
    const cage = readFileSync(join(__dirname, '..', 'frblWireframeCage.ts'), 'utf8');
    const plate = readFileSync(
      join(process.cwd(), 'src/components/formavision/FormaVisionFrblReadyPlate.tsx'),
      'utf8',
    );
    const painter = readFileSync(
      join(process.cwd(), 'src/components/formavision/FrblReadyWireframeCage.tsx'),
      'utf8',
    );
    for (const src of [cage, plate, painter]) {
      expect(src).not.toMatch(/generateAvatarMesh/);
      expect(src).not.toMatch(/FormaVisionAnatomicalFloor|FormaVisionLocalSilhouette/);
      expect(src).not.toMatch(/@react-three|model-viewer|THREE\./);
      expect(src).not.toMatch(/picasso|anatomical-2d/);
    }
    expect(plate).toMatch(/processSilhouette/);
    expect(plate).toMatch(/includeMask:\s*true/);
    expect(plate).toMatch(/buildDenseCageFromMask/);
    expect(cage).toMatch(/2\.5D extrusion/);
  });
});
