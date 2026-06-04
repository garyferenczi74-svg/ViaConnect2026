// =============================================================================
// Prompt 175 Part B (2026-06-04): server-side image validation + EXIF strip.
//
// Runs BEFORE the model call so a bad upload never burns a tier of budget.
// Validates mime type, decoded size, longest side, and strips EXIF metadata
// during the sharp re-encode so incidental personal data (camera serial,
// GPS, timestamps) does not travel upstream.
//
// Returns the validated + normalized base64 + the mime type the upstream
// call should send. Throws a typed code on rejection so the caller maps to
// the right outcomeCode without parsing prose.
// =============================================================================

import sharp from 'sharp';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION_PX,
  TARGET_RESIZE_DIMENSION_PX,
} from './config';

export type ValidationFailureCode = 'unsupported_image' | 'image_normalize_failed';

export class SupplementImageValidationError extends Error {
  code: ValidationFailureCode;
  constructor(code: ValidationFailureCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'SupplementImageValidationError';
  }
}

export interface NormalizedImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  bytes: number;
}

/**
 * Validate + normalize a base64 image. HEIC inputs are transparently
 * re-encoded as JPEG; the sharp pipeline strips EXIF on every path.
 */
export async function validateAndNormalize(
  base64: string,
  mimeType: string | null | undefined,
): Promise<NormalizedImage> {
  if (typeof base64 !== 'string' || base64.length < 100) {
    throw new SupplementImageValidationError('unsupported_image', 'No image payload.');
  }

  let inputBuffer: Buffer;
  try {
    inputBuffer = Buffer.from(base64, 'base64');
  } catch {
    throw new SupplementImageValidationError('unsupported_image', 'Could not decode image.');
  }
  if (inputBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new SupplementImageValidationError('unsupported_image', 'Image too large.');
  }

  const lowerMime = (typeof mimeType === 'string' ? mimeType : 'image/jpeg').toLowerCase();
  const isHeic = lowerMime === 'image/heic' || lowerMime === 'image/heif';
  const isAllowed = (ALLOWED_IMAGE_MIME as ReadonlyArray<string>).includes(lowerMime);
  if (!isHeic && !isAllowed) {
    throw new SupplementImageValidationError('unsupported_image', 'Unsupported mime type.');
  }

  try {
    // sharp pipeline: read, optionally rotate per EXIF orientation, resize
    // if the longest side exceeds the cap, re-encode as JPEG (which strips
    // EXIF by default). The output is bounded by TARGET_RESIZE_DIMENSION_PX
    // so the model receives a consistent budget regardless of source size.
    const metadata = await sharp(inputBuffer).metadata();
    const longestSide = Math.max(metadata.width ?? 0, metadata.height ?? 0);
    if (longestSide > MAX_IMAGE_DIMENSION_PX * 2) {
      // Extremely large images get a hard reject before sharp tries to
      // decode them in full (memory + cost guard).
      throw new SupplementImageValidationError('unsupported_image', 'Image dimensions too large.');
    }

    const pipeline = sharp(inputBuffer, { failOn: 'truncated' }).rotate();
    const sized = longestSide > TARGET_RESIZE_DIMENSION_PX
      ? pipeline.resize({
          width: metadata.width && metadata.width >= (metadata.height ?? 0) ? TARGET_RESIZE_DIMENSION_PX : undefined,
          height: metadata.height && metadata.height > (metadata.width ?? 0) ? TARGET_RESIZE_DIMENSION_PX : undefined,
          withoutEnlargement: true,
        })
      : pipeline;
    const outputBuffer = await sized.jpeg({ quality: 85 }).toBuffer();

    return {
      base64: outputBuffer.toString('base64'),
      mimeType: 'image/jpeg',
      bytes: outputBuffer.byteLength,
    };
  } catch (err) {
    if (err instanceof SupplementImageValidationError) throw err;
    throw new SupplementImageValidationError(
      'image_normalize_failed',
      err instanceof Error ? err.message : 'sharp pipeline failed',
    );
  }
}

export function isValidationError(err: unknown): err is SupplementImageValidationError {
  return err instanceof SupplementImageValidationError;
}
