import { describe, it, expect } from 'vitest';
import {
  ANALYZE_CLIENT_TIMEOUT_MS,
  buildAnalyzeRequestMediaFields,
  detectMediaTypeFromBase64,
  normalizeDeclaredMediaType,
  resolveAllPhotoMediaTypes,
  resolvePhotoMediaType,
  resolveServerMediaTypes,
} from '../scanMediaTypes';

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const JPEG_B64 = '/9j/4AAQSkZJRgABAQAAAQABAAD';

describe('scanMediaTypes', () => {
  it('waits at least 60s for analyze (no 3–5s abort)', () => {
    expect(ANALYZE_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
  });

  it('maps image/jpg to image/jpeg and rejects HEIC', () => {
    expect(normalizeDeclaredMediaType('image/jpg')).toBe('image/jpeg');
    expect(normalizeDeclaredMediaType('image/png')).toBe('image/png');
    expect(normalizeDeclaredMediaType('image/heic')).toBeNull();
    expect(normalizeDeclaredMediaType('image/jpeg')).toBe('image/jpeg');
  });

  it('sniffs PNG and JPEG magic from base64 and never calls PNG jpeg', () => {
    expect(detectMediaTypeFromBase64(PNG_B64)).toBe('image/png');
    expect(detectMediaTypeFromBase64(JPEG_B64)).toBe('image/jpeg');
    expect(resolvePhotoMediaType({ declaredType: 'image/jpeg', base64: PNG_B64 })).toBe('image/jpeg');
    expect(resolvePhotoMediaType({ declaredType: '', base64: PNG_B64 })).toBe('image/png');
  });

  it('uses one media_type only when all four photos match', () => {
    const png = {
      front: { fileType: 'image/png', base64: PNG_B64 },
      back: { fileType: 'image/png', base64: PNG_B64 },
      left_side: { fileType: 'image/png', base64: PNG_B64 },
      right_side: { fileType: 'image/png', base64: PNG_B64 },
    };
    const all = resolveAllPhotoMediaTypes(png);
    expect(all.ok).toBe(true);
    if (all.ok) {
      expect(buildAnalyzeRequestMediaFields(all.mediaTypes)).toEqual({ media_type: 'image/png' });
    }
  });

  it('sends per-photo media_types when PNG and JPEG are mixed', () => {
    const mixed = resolveAllPhotoMediaTypes({
      front: { fileType: 'image/png', base64: PNG_B64 },
      back: { fileType: 'image/jpeg', base64: JPEG_B64 },
      left_side: { fileType: 'image/png', base64: PNG_B64 },
      right_side: { fileType: 'image/jpeg', base64: JPEG_B64 },
    });
    expect(mixed.ok).toBe(true);
    if (mixed.ok) {
      expect(buildAnalyzeRequestMediaFields(mixed.mediaTypes)).toEqual({
        media_types: {
          front: 'image/png',
          back: 'image/jpeg',
          left_side: 'image/png',
          right_side: 'image/jpeg',
        },
      });
    }
  });

  it('does not default a missing media_type to image/jpeg on the server', () => {
    const missing = resolveServerMediaTypes({});
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toMatch(/do not default PNG/i);
  });

  it('accepts a single matching media_type and per-photo media_types', () => {
    expect(resolveServerMediaTypes({ media_type: 'image/png' })).toEqual({
      ok: true,
      mediaTypes: {
        front: 'image/png',
        back: 'image/png',
        left_side: 'image/png',
        right_side: 'image/png',
      },
    });
    const per = resolveServerMediaTypes({
      media_types: { front: 'image/png', back: 'image/jpeg', left_side: 'image/png', right_side: 'image/webp' },
    });
    expect(per.ok).toBe(true);
    if (per.ok) expect(per.mediaTypes.right_side).toBe('image/webp');
  });
});
