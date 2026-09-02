/**
 * Arnold golden Upload fixtures — both sets:
 *   inverted originals → orientation-normalize (auto 180 / EXIF)
 *   upright copies     → happy-path upload / analysis
 * Body photos are not committed. Tests read them when present and always
 * lock slot order + both contracts with synthetics.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  FORMAVISION_GOLDEN_UPLOAD_DIR,
  FORMAVISION_GOLDEN_UPRIGHT_DIR,
  FORMAVISION_GOLDEN_UPLOAD_FIXTURES,
  goldenInvertedFixturePaths,
  goldenUprightFixturePaths,
  goldenUploadSlotsMatchScanOrder,
} from '../goldenUploadFixtures';
import { FORMAVISION_SLOT_ORDER, type PhotoPosition } from '../formaVisionScanSlots';
import { presentPhotoPositions } from '../runFormaVisionAnalyze';
import type { FormaVisionPhotoMap } from '../runFormaVisionAnalyze';
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

function setPresent(dir: string): boolean {
  return FORMAVISION_GOLDEN_UPLOAD_FIXTURES.every((f) => existsSync(join(dir, f.file)));
}

const invertedPresent = setPresent(FORMAVISION_GOLDEN_UPLOAD_DIR);
const uprightPresent = setPresent(FORMAVISION_GOLDEN_UPRIGHT_DIR);

async function grayBandsFromJpeg(buf: Buffer): Promise<{
  topMean: number;
  bottomMean: number;
  orientation: number | null;
}> {
  // Sample stored pixels (no EXIF rotate) so A-pose inversion / sideways is
  // judged on the file bytes. Browser bake uses from-image; extra transform
  // is 180° or 90° only when EXIF is missing/1.
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

async function syntheticAPoseJpeg(kind: 'inverted' | 'upright'): Promise<Buffer> {
  const width = 64;
  const height = 128;
  const raw = Buffer.alloc(width * height * 3);
  const floorBand = Math.floor(height * 0.18);
  for (let y = 0; y < height; y += 1) {
    const floor = kind === 'inverted' ? y < floorBand : y >= height - floorBand;
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

describe('Arnold golden Upload fixtures (inverted + upright)', () => {
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
    expect(goldenInvertedFixturePaths().map((f) => f.file)).toEqual(
      goldenUprightFixturePaths().map((f) => f.file),
    );
    expect(FORMAVISION_GOLDEN_UPRIGHT_DIR).toBe(`${FORMAVISION_GOLDEN_UPLOAD_DIR}/upright`);
  });

  it('happy-path upload and inverted normalize both feed the same analyzer', () => {
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    const shared = src('src/lib/body-tracker/composition/runFormaVisionAnalyze.ts');
    const normalize = src('src/lib/body-tracker/composition/normalizeScanPhotoOrientation.ts');
    const golden = src('src/lib/body-tracker/composition/goldenUploadFixtures.ts');
    expect(uploader).toMatch(/normalizeScanPhotoUpright\(stored, 'upload'\)/);
    expect(uploader).toMatch(/alreadyNormalized:\s*true/);
    expect(uploader).toMatch(/source:\s*'upload'/);
    expect(uploader).toMatch(/runFormaVisionAnalyzeSpine/);
    expect(shared).toMatch(/normalizeScanPhotoUpright/);
    expect(shared).toMatch(/body-scan-analyze/);
    expect(shared).not.toMatch(/navyBodyFat/);
    expect(normalize).toMatch(/detectAPoseInversionFromBandLuma/);
    expect(normalize).toMatch(/detectAPoseOrientationFromBandLuma/);
    expect(normalize).toMatch(/imageOrientation:\s*SCAN_PHOTO_IMAGE_ORIENTATION/);
    expect(normalize).not.toMatch(/imageOrientation:\s*'none'/);
    expect(normalize).toMatch(/SCAN_PHOTO_IMAGE_ORIENTATION = 'from-image'/);
    expect(golden).toMatch(/upload-test-2026-09-01\/upright/);
    expect(golden).toMatch(/01-front\.jpg/);
  });

  it('happy-path four slots skip missing views and do not invent fat math', () => {
    const dummy = { file: new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' }), base64: 'abc' };
    const all: FormaVisionPhotoMap = {
      front: dummy,
      right_side: dummy,
      back: dummy,
      left_side: dummy,
    };
    expect(presentPhotoPositions(all)).toEqual(['front', 'right_side', 'back', 'left_side']);
    expect(presentPhotoPositions({ front: dummy, back: dummy })).toEqual(['front', 'back']);
    expect(presentPhotoPositions({})).toEqual([]);
  });

  it('synthetic inverted gallery JPEG (dark floor on top) resolves to 180° upload upright', async () => {
    const buf = await syntheticAPoseJpeg('inverted');
    const sampled = await grayBandsFromJpeg(buf);
    const hint = detectAPoseInversionFromBandLuma(sampled.topMean, sampled.bottomMean);
    expect(hint).toBe('inverted');
    const transform = resolveUprightTransform(sampled.orientation, 'upload', hint);
    expect(transform).toEqual({ rotateQuarterTurns: 2, flipX: false });
    expect(resolveUprightTransform(sampled.orientation, 'live', hint).rotateQuarterTurns).toBe(0);
  });

  it('synthetic upright happy-path JPEG is not 180-flipped before analyze', async () => {
    const buf = await syntheticAPoseJpeg('upright');
    const sampled = await grayBandsFromJpeg(buf);
    const hint = detectAPoseInversionFromBandLuma(sampled.topMean, sampled.bottomMean);
    expect(hint).toBe('upright');
    const transform = resolveUprightTransform(sampled.orientation, 'upload', hint);
    expect(transform).toEqual({ rotateQuarterTurns: 0, flipX: false });
  });

  it.skipIf(!invertedPresent)(
    'shared-box inverted originals are visually inverted and upload uprights them 180°',
    async () => {
      for (const fixture of goldenInvertedFixturePaths()) {
        const buf = readFileSync(fixture.path);
        const sampled = await grayBandsFromJpeg(buf);
        const hint = detectAPoseInversionFromBandLuma(sampled.topMean, sampled.bottomMean);
        expect(sampled.orientation === null || sampled.orientation === 1 || sampled.orientation === 3).toBe(
          true,
        );
        expect(hint).toBe('inverted');
        const transform = resolveUprightTransform(sampled.orientation, 'upload', hint);
        if (sampled.orientation !== null && sampled.orientation >= 2 && sampled.orientation <= 8) {
          expect(transform.rotateQuarterTurns).toBe(0);
        } else {
          expect(transform.rotateQuarterTurns).toBe(2);
        }
      }
    },
  );

  it.skipIf(!uprightPresent)(
    'shared-box upright copies are happy-path (no 180°) and keep Front→Right→Back→Left',
    async () => {
      const slots: PhotoPosition[] = [];
      for (const fixture of goldenUprightFixturePaths()) {
        const buf = readFileSync(fixture.path);
        const sampled = await grayBandsFromJpeg(buf);
        const hint = detectAPoseInversionFromBandLuma(sampled.topMean, sampled.bottomMean);
        expect(hint).toBe('upright');
        const transform = resolveUprightTransform(sampled.orientation, 'upload', hint);
        expect(transform.rotateQuarterTurns).toBe(0);
        slots.push(fixture.slot);
      }
      expect(slots).toEqual(['front', 'right_side', 'back', 'left_side']);
    },
  );
});
