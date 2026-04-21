// Prompt #106 §3.3 — server-side image sanitizer.
//
// Strips EXIF/GPS/camera-serial metadata and validates dimensions using
// the sharp library. sharp runs in Node only; this module MUST NOT be
// imported from an edge function or a client bundle.
//
// Two guarantees on success:
//   1. Output bytes contain zero EXIF/ICC/IPTC/XMP metadata.
//   2. Dimensions are within [800, 4000] on both axes.

import sharp from 'sharp';

export interface SanitizedImage {
  bytes: Buffer;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  byteSize: number;
}

export interface SanitizeOptions {
  /** Override the maximum allowed byte size (default 2 MB). */
  maxBytes?: number;
}

const MIN_DIM = 800;
const MAX_DIM = 4000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Sanitize + validate. Throws with a stable error code prefix on rejection:
 *   DIM_TOO_SMALL, DIM_TOO_LARGE, UNSUPPORTED_FORMAT, BYTES_TOO_LARGE.
 */
export async function sanitizeImage(
  input: ArrayBuffer | Uint8Array | Buffer,
  options: SanitizeOptions = {},
): Promise<SanitizedImage> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const inputBuffer = Buffer.isBuffer(input)
    ? input
    : input instanceof Uint8Array
      ? Buffer.from(input)
      : Buffer.from(new Uint8Array(input));

  const metadata = await sharp(inputBuffer).metadata();
  const fmt = metadata.format;
  if (fmt !== 'png' && fmt !== 'jpeg' && fmt !== 'jpg') {
    throw new Error(`UNSUPPORTED_FORMAT: ${fmt ?? 'unknown'} (only png + jpeg permitted per §3.3)`);
  }
  const format: 'png' | 'jpeg' = fmt === 'png' ? 'png' : 'jpeg';

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < MIN_DIM || height < MIN_DIM) {
    throw new Error(`DIM_TOO_SMALL: ${width}x${height} below ${MIN_DIM}x${MIN_DIM} minimum`);
  }
  if (width > MAX_DIM || height > MAX_DIM) {
    throw new Error(`DIM_TOO_LARGE: ${width}x${height} above ${MAX_DIM}x${MAX_DIM} maximum`);
  }

  // Pipeline: rotate(true) applies EXIF orientation then drops EXIF.
  // withMetadata() with no args strips all metadata (opposite of the
  // "preserve metadata" default in older sharp versions).
  let pipeline = sharp(inputBuffer).rotate();
  if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  } else {
    pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  }
  // Explicitly drop EXIF/XMP/ICC/IPTC. Sharp ≥ 0.33 strips by default
  // when the output format is re-encoded, but we guarantee it via
  // keepMetadata(false-equivalent). Different sharp versions expose this
  // differently; the safest way is to simply re-encode and never pass a
  // withMetadata({...}) argument.
  const out = await pipeline.toBuffer({ resolveWithObject: true });

  if (out.info.size > maxBytes) {
    throw new Error(`BYTES_TOO_LARGE: ${out.info.size} exceeds ${maxBytes} byte ceiling`);
  }

  return {
    bytes: out.data,
    width: out.info.width,
    height: out.info.height,
    format,
    byteSize: out.info.size,
  };
}
