/**
 * Arnold golden Upload fixtures: Front, Right, Back, Left.
 * Shared-box JPGs arrive visually 180° inverted (phone-gallery).
 * Body photos are not committed — tests read them when present and
 * always lock the slot order + auto-upright contract with synthetics.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  FORMAVISION_GOLDEN_UPLOAD_DIR,
  FORMAVISION_GOLDEN_UPLOAD_FIXTURES,
  goldenUploadFixturePaths,
  goldenUploadSlotsMatchScanOrder,
} from '../goldenUploadFixtures';
import { FORMAVISION_SLOT_ORDER } from '../formaVisionScanSlots';
import {
  bandLumaMeansFromGray,
  detectAPoseInversionFromBandLuma,
  readJpegExifOrientation,
  resolveUprightTransform,
} from '../normalizeScanPhotoOrientation';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const goldenPresent = FORMAVISION_GOLDEN_UPLOAD_FIXTURES.every((f) =>
  existsSync(join(FORMAVISION_GOLDEN_UPLOAD_DIR, f.file)),
);

async function grayBandsFromJpeg(buf: Buffer): Promise<{
  topMean: number;
  bottomMean: number;
  orientation: number | null;
}> {
  // Do not apply EXIF — we own upright, matching createImageBitmap({ imageOrientation: 'none' }).
  const { data, info } = await sharp(buf)
    .withMetadata()
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bands = bandLumaMeansFromGray(info.width, info.height, data);
  if (!bands) throw new Error('band luma unavailable');
  return { ...bands, orientation: readJpegExifOrientation(buf) };
}

async function syntheticInvertedAPoseJpeg(): Promise<Buffer> {
  const width = 64;
  const height = 128;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const floor = y < Math.floor(height * 0.18);
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      if (floor) {
        raw[i] = 42;
        raw[i + 1] = 30;
        raw[i + 2] = 20;
      } else {
        raw[i] = 228;
        raw[i + 1] = 226;
        raw[i + 2] = 222;
      }
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

describe('Arnold golden Upload fixtures (inverted A-pose)', () => {
  it('maps Front → Right → Back → Left onto the same slot order as live', () => {
    expect(goldenUploadSlotsMatchScanOrder()).toBe(true);
    expect(FORMAVISION_GOLDEN_UPLOAD_FIXTURES.map((f) => f.label)).toEqual([
      'Front',
      'Right',
      'Back',
      'Left',
    ]);
    expect(FORMAVISION_SLOT_ORDER.map((s) => s.key)).toEqual(
      FORMAVISION_GOLDEN_UPLOAD_FIXTURES.map((f) => f.slot),
    );
  });

  it('upload attach + shared spine still upright before analyze (no inverted landmarks)', () => {
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    const shared = src('src/lib/body-tracker/composition/runFormaVisionAnalyze.ts');
    const normalize = src('src/lib/body-tracker/composition/normalizeScanPhotoOrientation.ts');
    expect(uploader).toMatch(/normalizeScanPhotoUpright\(stored, 'upload'\)/);
    expect(uploader).toMatch(/alreadyNormalized:\s*true/);
    expect(shared).toMatch(/normalizeScanPhotoUpright/);
    expect(shared).toMatch(/body-scan-analyze/);
    expect(shared).not.toMatch(/navyBodyFat/);
    expect(normalize).toMatch(/detectAPoseInversionFromBandLuma/);
    expect(normalize).toMatch(/imageOrientation:\s*'none'/);
  });

  it('synthetic inverted gallery JPEG (dark floor on top) resolves to 180° upload upright', async () => {
    const buf = await syntheticInvertedAPoseJpeg();
    const sampled = await grayBandsFromJpeg(buf);
    const hint = detectAPoseInversionFromBandLuma(sampled.topMean, sampled.bottomMean);
    expect(hint).toBe('inverted');
    const transform = resolveUprightTransform(sampled.orientation, 'upload', hint);
    expect(transform).toEqual({ rotateQuarterTurns: 2, flipX: false });
    expect(resolveUprightTransform(sampled.orientation, 'live', hint).rotateQuarterTurns).toBe(0);
  });

  it.skipIf(!goldenPresent)(
    'shared-box golden JPGs are visually inverted and upload uprights them 180°',
    async () => {
      for (const fixture of goldenUploadFixturePaths()) {
        const buf = readFileSync(fixture.path);
        const sampled = await grayBandsFromJpeg(buf);
        const hint = detectAPoseInversionFromBandLuma(sampled.topMean, sampled.bottomMean);
        expect(sampled.orientation === null || sampled.orientation === 1 || sampled.orientation === 3).toBe(
          true,
        );
        expect(hint).toBe('inverted');
        const transform = resolveUprightTransform(sampled.orientation, 'upload', hint);
        expect(transform.rotateQuarterTurns).toBe(2);
      }
    },
  );
});
