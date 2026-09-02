import { describe, it, expect } from 'vitest';
import {
  bandLumaMeansFromGray,
  detectAPoseInversionFromBandLuma,
  isIdentityTransform,
  needsUprightPixelBake,
  orientedBitmapCanvasSize,
  readJpegExifOrientation,
  resolveUprightTransform,
  SCAN_PHOTO_IMAGE_ORIENTATION,
  transformFromExifOrientation,
} from '../normalizeScanPhotoOrientation';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function u16be(n: number): [number, number] {
  return [(n >> 8) & 0xff, n & 0xff];
}

function jpegWithExifOrientation(orientation: number): Uint8Array {
  const exifBody = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x12, 0x01,
    0x03, 0x00,
    0x01, 0x00, 0x00, 0x00,
    orientation, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ];
  const app1Len = exifBody.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, ...u16be(app1Len), ...exifBody, 0xff, 0xd9]);
}

describe('normalizeScanPhotoOrientation', () => {
  it('reads JPEG EXIF Orientation 3 as 180°', () => {
    expect(readJpegExifOrientation(jpegWithExifOrientation(3))).toBe(3);
    expect(transformFromExifOrientation(3)).toEqual({ rotateQuarterTurns: 2, flipX: false });
  });

  it('reads EXIF 6 (90° CW) and 8 (90° CCW)', () => {
    expect(readJpegExifOrientation(jpegWithExifOrientation(6))).toBe(6);
    expect(transformFromExifOrientation(6)).toEqual({ rotateQuarterTurns: 1, flipX: false });
    expect(readJpegExifOrientation(jpegWithExifOrientation(8))).toBe(8);
    expect(transformFromExifOrientation(8)).toEqual({ rotateQuarterTurns: 3, flipX: false });
  });

  it('returns null for PNG / non-JPEG so upload can apply the 180° fixture fallback', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(readJpegExifOrientation(png)).toBeNull();
  });

  it('does not add a second EXIF rotate after from-image (iOS 6/8 sideways bug)', () => {
    expect(resolveUprightTransform(6, 'upload')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(resolveUprightTransform(8, 'upload')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(resolveUprightTransform(3, 'live')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(resolveUprightTransform(6, 'upload', 'inverted')).toEqual({
      rotateQuarterTurns: 0,
      flipX: false,
    });
  });

  it('bakes 90° EXIF into pixels without swapping an already-oriented bitmap', () => {
    const extra6 = resolveUprightTransform(6, 'upload');
    const extra8 = resolveUprightTransform(8, 'upload');
    expect(isIdentityTransform(extra6)).toBe(true);
    expect(isIdentityTransform(extra8)).toBe(true);
    expect(needsUprightPixelBake(6, extra6, 'upload')).toBe(true);
    expect(needsUprightPixelBake(8, extra8, 'upload')).toBe(true);
    // from-image already produced portrait (300×400). Extra EXIF 6/8 must not swap.
    expect(orientedBitmapCanvasSize(300, 400, extra6)).toEqual({ width: 300, height: 400 });
    expect(orientedBitmapCanvasSize(300, 400, extra8)).toEqual({ width: 300, height: 400 });
    // Contrast: applying the EXIF map on top would landscape the slot (sideways).
    expect(orientedBitmapCanvasSize(300, 400, transformFromExifOrientation(6))).toEqual({
      width: 400,
      height: 300,
    });
  });

  it('applies 180° on upload only when EXIF is missing/1 and the A-pose hint is inverted', () => {
    expect(resolveUprightTransform(null, 'upload')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(resolveUprightTransform(1, 'upload')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(resolveUprightTransform(1, 'upload', 'unknown')).toEqual({
      rotateQuarterTurns: 0,
      flipX: false,
    });
    expect(isIdentityTransform(resolveUprightTransform(null, 'upload'))).toBe(true);
    expect(resolveUprightTransform(1, 'upload', 'inverted')).toEqual({
      rotateQuarterTurns: 2,
      flipX: false,
    });
    expect(needsUprightPixelBake(1, resolveUprightTransform(1, 'upload', 'inverted'), 'upload')).toBe(
      true,
    );
  });

  it('does not 180-flip live camera frames when EXIF is missing', () => {
    expect(resolveUprightTransform(null, 'live')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(resolveUprightTransform(1, 'live')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(isIdentityTransform(resolveUprightTransform(null, 'live'))).toBe(true);
    expect(needsUprightPixelBake(null, resolveUprightTransform(null, 'live'), 'live')).toBe(false);
  });

  it('auto-upright hint overrides the upload fallback so already-upright gallery shots are not flipped twice', () => {
    expect(resolveUprightTransform(null, 'upload', 'upright')).toEqual({
      rotateQuarterTurns: 0,
      flipX: false,
    });
    expect(resolveUprightTransform(1, 'upload', 'inverted')).toEqual({
      rotateQuarterTurns: 2,
      flipX: false,
    });
    expect(resolveUprightTransform(6, 'upload', 'upright')).toEqual({
      rotateQuarterTurns: 0,
      flipX: false,
    });
  });

  it('decodes with from-image (shared processPhoto policy) and never imageOrientation none', () => {
    expect(SCAN_PHOTO_IMAGE_ORIENTATION).toBe('from-image');
    const root = process.cwd();
    const normalize = readFileSync(
      join(root, 'src/lib/body-tracker/composition/normalizeScanPhotoOrientation.ts'),
      'utf8',
    );
    const processPhoto = readFileSync(
      join(root, 'src/components/body-tracker/photos/photoProcessing.ts'),
      'utf8',
    );
    expect(normalize).toMatch(/imageOrientation:\s*SCAN_PHOTO_IMAGE_ORIENTATION/);
    expect(normalize).not.toMatch(/imageOrientation:\s*'none'/);
    expect(normalize).toMatch(/createScanPhotoBitmap/);
    expect(processPhoto).toMatch(/createScanPhotoBitmap/);
    expect(processPhoto).not.toMatch(/createImageBitmap\(file\)/);
  });

  it('detects inverted A-pose when the dark floor band is at the top', () => {
    const width = 32;
    const height = 64;
    const gray = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      const value = y < 10 ? 30 : 220;
      gray.fill(value, y * width, (y + 1) * width);
    }
    const bands = bandLumaMeansFromGray(width, height, gray);
    expect(bands).not.toBeNull();
    expect(detectAPoseInversionFromBandLuma(bands!.topMean, bands!.bottomMean)).toBe('inverted');
    expect(resolveUprightTransform(1, 'upload', 'inverted').rotateQuarterTurns).toBe(2);
  });

  it('detects upright A-pose when the dark floor band is at the bottom', () => {
    const width = 32;
    const height = 64;
    const gray = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      const value = y >= height - 10 ? 30 : 220;
      gray.fill(value, y * width, (y + 1) * width);
    }
    const bands = bandLumaMeansFromGray(width, height, gray);
    expect(bands).not.toBeNull();
    expect(detectAPoseInversionFromBandLuma(bands!.topMean, bands!.bottomMean)).toBe('upright');
    expect(resolveUprightTransform(null, 'upload', 'upright').rotateQuarterTurns).toBe(0);
  });
});
