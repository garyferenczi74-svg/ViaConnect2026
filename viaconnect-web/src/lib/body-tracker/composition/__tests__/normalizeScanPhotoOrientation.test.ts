import { describe, it, expect } from 'vitest';
import {
  isIdentityTransform,
  readJpegExifOrientation,
  resolveUprightTransform,
  transformFromExifOrientation,
} from '../normalizeScanPhotoOrientation';

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

  it('prefers EXIF 2–8 over the upload 180 fallback', () => {
    expect(resolveUprightTransform(6, 'upload')).toEqual({ rotateQuarterTurns: 1, flipX: false });
    expect(resolveUprightTransform(3, 'live')).toEqual({ rotateQuarterTurns: 2, flipX: false });
  });

  it('applies 180° upright on upload when EXIF is missing or identity (inverted gallery fixtures)', () => {
    expect(resolveUprightTransform(null, 'upload')).toEqual({ rotateQuarterTurns: 2, flipX: false });
    expect(resolveUprightTransform(1, 'upload')).toEqual({ rotateQuarterTurns: 2, flipX: false });
    expect(isIdentityTransform(resolveUprightTransform(null, 'upload'))).toBe(false);
  });

  it('does not 180-flip live camera frames when EXIF is missing', () => {
    expect(resolveUprightTransform(null, 'live')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(resolveUprightTransform(1, 'live')).toEqual({ rotateQuarterTurns: 0, flipX: false });
    expect(isIdentityTransform(resolveUprightTransform(null, 'live'))).toBe(true);
  });
});
