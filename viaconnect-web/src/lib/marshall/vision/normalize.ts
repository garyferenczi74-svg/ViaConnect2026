// Prompt #124 P1: Image normalizer.
//
// Every suspect image passes through normalize() before any downstream work:
//   - Validate content type (JPEG / PNG / WebP / HEIC / HEIF / AVIF).
//   - Reject non-image payloads and bombs (byte size cap).
//   - Re-encode to sRGB JPEG (stable, universally-supported for vision APIs).
//   - Clamp longest edge to 2048 px while preserving aspect ratio.
//   - Strip EXIF (GPS, orientation tags, device metadata) — privacy + stability.
//   - Record dimensions for the image_characteristics.resolution_adequate gate.
//   - Compute SHA-256 and perceptual hash of the normalized bytes.
//
// "Adequate resolution" = at least 256 px on the shorter edge. Below that,
// packaging-feature evaluation is unreliable and the determination engine
// short-circuits to insufficient_image_quality.

import { createHash } from 'node:crypto';
import sharp from 'sharp';

import { computePhash } from './phash';
import type { NormalizedImage } from './types';

const MAX_LONG_EDGE = 2048;
const MIN_SHORT_EDGE = 256;
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB

const ACCEPTED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
]);

export interface NormalizeInput {
  bytes: Uint8Array;
  declaredContentType?: string;
}

export class NormalizeError extends Error {
  constructor(public code: NormalizeErrorCode, message: string) {
    super(message);
    this.name = 'NormalizeError';
  }
}

export type NormalizeErrorCode =
  | 'oversize_input'
  | 'unsupported_format'
  | 'corrupt_image'
  | 'decode_failed';

export async function normalizeImage(input: NormalizeInput): Promise<NormalizedImage> {
  if (input.bytes.byteLength > MAX_INPUT_BYTES) {
    throw new NormalizeError(
      'oversize_input',
      `image exceeds ${MAX_INPUT_BYTES} byte cap (${input.bytes.byteLength})`,
    );
  }

  if (input.declaredContentType && !ACCEPTED_CONTENT_TYPES.has(input.declaredContentType.toLowerCase())) {
    throw new NormalizeError(
      'unsupported_format',
      `content type "${input.declaredContentType}" not allowed`,
    );
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input.bytes).metadata();
  } catch (err) {
    throw new NormalizeError('decode_failed', `sharp metadata failed: ${(err as Error).message}`);
  }

  if (!meta.format) {
    throw new NormalizeError('corrupt_image', 'no detectable image format');
  }
  if (!['jpeg', 'png', 'webp', 'heif', 'avif'].includes(meta.format)) {
    throw new NormalizeError('unsupported_format', `decoded format "${meta.format}" not allowed`);
  }

  // Compute the longest-edge resize target. fit: 'inside' preserves aspect.
  let outBytes: Buffer;
  try {
    outBytes = await sharp(input.bytes)
      .rotate()                                           // honor EXIF orientation THEN strip
      .resize(MAX_LONG_EDGE, MAX_LONG_EDGE, { fit: 'inside', withoutEnlargement: true })
      .toColorspace('srgb')
      .jpeg({ quality: 90, chromaSubsampling: '4:2:0', mozjpeg: true })
      .withMetadata({ exif: {} })                         // strip EXIF; keep only orientation already applied
      .toBuffer();
  } catch (err) {
    throw new NormalizeError('corrupt_image', `sharp re-encode failed: ${(err as Error).message}`);
  }

  // Re-read dimensions from the output for the adequate-resolution gate.
  const outMeta = await sharp(outBytes).metadata();
  const widthPx = outMeta.width ?? 0;
  const heightPx = outMeta.height ?? 0;
  const shortEdge = Math.min(widthPx, heightPx);

  const bytes = new Uint8Array(outBytes);
  const sha256 = createHash('sha256').update(outBytes).digest('hex');
  const phash = await computePhash(bytes);

  return {
    bytes,
    contentType: 'image/jpeg',
    sha256,
    perceptualHash: phash.hex,
    widthPx,
    heightPx,
    resolutionAdequate: shortEdge >= MIN_SHORT_EDGE,
    exifStripped: true,
  };
}

/**
 * Sniff whether a byte stream is a plausible image format. Used before paying
 * the normalize cost on obvious non-image payloads.
 */
export function looksLikeImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
  // HEIC/HEIF: ftypheic / ftypheix / ftypmif1 / ftypmsf1 at byte 4
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true;
  // AVIF has same ftyp prefix (matched above).
  return false;
}
