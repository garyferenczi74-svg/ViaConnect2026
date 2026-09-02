// Upright-normalize photos before FormaVision analyze / avatar input.
// Decode with createImageBitmap({ imageOrientation: 'from-image' }) so the
// browser applies JPEG EXIF 1–8 (including iPhone 6/8) once, then bake those
// pixels to a JPEG. Do not ALSO apply transformFromExifOrientation — iOS often
// ignores a none-orientation decode, so a second 90° makes FRBL previews
// sideways. Missing/identity EXIF (HEIC reencode strips the tag) uses A-pose
// visual: 180° if inverted, 90° CW/CCW if the dark floor is on a side.
// Live camera canvases are already upright — no visual fallback.

export type ScanPhotoSource = 'upload' | 'live';

export interface UprightTransform {
  /** Clockwise quarter-turns (0, 90, 180, 270). */
  rotateQuarterTurns: 0 | 1 | 2 | 3;
  flipX: boolean;
}

const IDENTITY: UprightTransform = { rotateQuarterTurns: 0, flipX: false };
const ROTATE_90_CW: UprightTransform = { rotateQuarterTurns: 1, flipX: false };
const ROTATE_90_CCW: UprightTransform = { rotateQuarterTurns: 3, flipX: false };
const ROTATE_180: UprightTransform = { rotateQuarterTurns: 2, flipX: false };

/** Shared with processPhoto so HEIC/resize never decode as `none` while bake uses from-image. */
export const SCAN_PHOTO_IMAGE_ORIENTATION = 'from-image' as const;

export function isIdentityTransform(t: UprightTransform): boolean {
  return t.rotateQuarterTurns === 0 && !t.flipX;
}

/**
 * JPEG EXIF Orientation (1–8), or null when the file is not JPEG / has no tag.
 * Does not inspect pixel content.
 */
export function readJpegExifOrientation(input: ArrayBuffer | Uint8Array): number | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return null;
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (size < 2 || offset + 2 + size > bytes.length) return null;

    if (marker === 0xe1) {
      const start = offset + 4;
      const end = offset + 2 + size;
      const orientation = readExifOrientationFromApp1(bytes.subarray(start, end));
      if (orientation !== null) return orientation;
    }
    offset += 2 + size;
  }
  return null;
}

function readExifOrientationFromApp1(segment: Uint8Array): number | null {
  if (segment.length < 14) return null;
  if (
    segment[0] !== 0x45 ||
    segment[1] !== 0x78 ||
    segment[2] !== 0x69 ||
    segment[3] !== 0x66 ||
    segment[4] !== 0x00 ||
    segment[5] !== 0x00
  ) {
    return null;
  }

  const tiff = segment.subarray(6);
  if (tiff.length < 8) return null;
  const le = tiff[0] === 0x49 && tiff[1] === 0x49;
  const be = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!le && !be) return null;

  const u16 = (i: number): number =>
    le ? tiff[i] | (tiff[i + 1] << 8) : (tiff[i] << 8) | tiff[i + 1];
  const u32 = (i: number): number =>
    le
      ? tiff[i] | (tiff[i + 1] << 8) | (tiff[i + 2] << 16) | (tiff[i + 3] << 24)
      : (tiff[i] << 24) | (tiff[i + 1] << 16) | (tiff[i + 2] << 8) | tiff[i + 3];

  if (u16(2) !== 42) return null;
  const ifd0 = u32(4);
  if (ifd0 < 0 || ifd0 + 2 > tiff.length) return null;
  const count = u16(ifd0);
  for (let n = 0; n < count; n++) {
    const entry = ifd0 + 2 + n * 12;
    if (entry + 12 > tiff.length) return null;
    const tag = u16(entry);
    if (tag !== 0x0112) continue;
    const type = u16(entry + 2);
    const valueCount = u32(entry + 4);
    if (type !== 3 || valueCount !== 1) return null;
    const value = le ? tiff[entry + 8] | (tiff[entry + 9] << 8) : (tiff[entry + 8] << 8) | tiff[entry + 9];
    if (value < 1 || value > 8) return null;
    return value;
  }
  return null;
}

/** Map EXIF 1–8 onto canvas quarter-turns + optional horizontal flip. */
export function transformFromExifOrientation(orientation: number): UprightTransform {
  switch (orientation) {
    case 2:
      return { rotateQuarterTurns: 0, flipX: true };
    case 3:
      return { rotateQuarterTurns: 2, flipX: false };
    case 4:
      return { rotateQuarterTurns: 2, flipX: true };
    case 5:
      return { rotateQuarterTurns: 1, flipX: true };
    case 6:
      return { rotateQuarterTurns: 1, flipX: false };
    case 7:
      return { rotateQuarterTurns: 3, flipX: true };
    case 8:
      return { rotateQuarterTurns: 3, flipX: false };
    default:
      return IDENTITY;
  }
}

export type VisualUprightHint =
  | 'inverted'
  | 'upright'
  | 'unknown'
  | 'sideways90cw'
  | 'sideways90ccw';

/** Edge band used to detect inverted / sideways A-pose indoor shots (dark floor). */
export const APOSE_BAND_FRACTION = 0.12;
export const APOSE_LUMA_DELTA = 18;

/**
 * Indoor A-pose: wood/floor is darker than the wall. Upside-down gallery
 * shots put that dark band at the top. Does not invent girths or fat.
 */
export function detectAPoseInversionFromBandLuma(
  topMean: number,
  bottomMean: number,
): VisualUprightHint {
  const delta = topMean - bottomMean;
  if (delta <= -APOSE_LUMA_DELTA) return 'inverted';
  if (delta >= APOSE_LUMA_DELTA) return 'upright';
  return 'unknown';
}

/**
 * Four-edge A-pose: prefer the stronger axis. Dark left → 90° CW (floor to
 * bottom); dark right → 90° CCW. Used when HEIC/reencode stripped EXIF and
 * stored pixels are still sideways. Does not invent girths or fat.
 */
export function detectAPoseOrientationFromBandLuma(
  topMean: number,
  bottomMean: number,
  leftMean: number,
  rightMean: number,
): VisualUprightHint {
  const verticalDelta = topMean - bottomMean;
  const horizontalDelta = leftMean - rightMean;
  const vAbs = Math.abs(verticalDelta);
  const hAbs = Math.abs(horizontalDelta);
  if (hAbs >= APOSE_LUMA_DELTA && hAbs > vAbs) {
    return horizontalDelta < 0 ? 'sideways90cw' : 'sideways90ccw';
  }
  return detectAPoseInversionFromBandLuma(topMean, bottomMean);
}

export function bandLumaMeansFromGray(
  width: number,
  height: number,
  gray: Uint8Array | Uint8ClampedArray,
): { topMean: number; bottomMean: number; leftMean: number; rightMean: number } | null {
  if (width < 8 || height < 8 || gray.length < width * height) return null;
  const bandH = Math.max(2, Math.floor(height * APOSE_BAND_FRACTION));
  const bandW = Math.max(2, Math.floor(width * APOSE_BAND_FRACTION));
  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;
  let nV = 0;
  let nH = 0;
  for (let y = 0; y < bandH; y += 1) {
    for (let x = 0; x < width; x += 1) {
      top += gray[y * width + x];
      bottom += gray[(height - 1 - y) * width + x];
      nV += 1;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < bandW; x += 1) {
      left += gray[y * width + x];
      right += gray[y * width + (width - 1 - x)];
      nH += 1;
    }
  }
  if (nV === 0 || nH === 0) return null;
  return {
    topMean: top / nV,
    bottomMean: bottom / nV,
    leftMean: left / nH,
    rightMean: right / nH,
  };
}

/**
 * Extra canvas transform AFTER a from-image decode (EXIF already applied).
 * EXIF 2–8 → identity (do not rotate again; that is the sideways iOS bug).
 * Live + missing/identity EXIF → no-op.
 * Upload, EXIF missing/1: 180° if inverted; 90° if the floor is on a side
 * (stripped-EXIF HEIC/reencode); upright/unknown stay put.
 */
export function resolveUprightTransform(
  orientation: number | null,
  source: ScanPhotoSource,
  visualHint: VisualUprightHint = 'unknown',
): UprightTransform {
  if (orientation !== null && orientation >= 2 && orientation <= 8) {
    return IDENTITY;
  }
  if (source === 'live') return IDENTITY;
  if (visualHint === 'inverted') return ROTATE_180;
  if (visualHint === 'sideways90cw') return ROTATE_90_CW;
  if (visualHint === 'sideways90ccw') return ROTATE_90_CCW;
  return IDENTITY;
}

/** Canvas size for a from-image bitmap plus an extra (usually 180°) transform. */
export function orientedBitmapCanvasSize(
  bitmapWidth: number,
  bitmapHeight: number,
  transform: UprightTransform,
): { width: number; height: number } {
  const swap = transform.rotateQuarterTurns % 2 === 1;
  return {
    width: swap ? bitmapHeight : bitmapWidth,
    height: swap ? bitmapWidth : bitmapHeight,
  };
}

/** Upload always bakes; EXIF 2–8 always bakes; extra 180° always bakes. Live identity skips. */
export function needsUprightPixelBake(
  orientation: number | null,
  transform: UprightTransform,
  source: ScanPhotoSource,
): boolean {
  if (!isIdentityTransform(transform)) return true;
  if (orientation !== null && orientation >= 2 && orientation <= 8) return true;
  return source === 'upload';
}

export async function createScanPhotoBitmap(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, {
      imageOrientation: SCAN_PHOTO_IMAGE_ORIENTATION,
    });
  } catch {
    return await createImageBitmap(source);
  }
}

export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

async function renderUprightBlob(source: Blob, transform: UprightTransform): Promise<Blob> {
  const bitmap = await createScanPhotoBitmap(source);
  try {
    const { width, height } = orientedBitmapCanvasSize(bitmap.width, bitmap.height, transform);
    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height });

    const ctx = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.translate(width / 2, height / 2);
    if (transform.flipX) ctx.scale(-1, 1);
    ctx.rotate((transform.rotateQuarterTurns * Math.PI) / 2);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    if ('convertToBlob' in canvas) {
      return (canvas as OffscreenCanvas).convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    }
    return await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
        'image/jpeg',
        0.92,
      );
    });
  } finally {
    if ('close' in bitmap) bitmap.close();
  }
}

async function sampleVisualUprightHint(file: Blob): Promise<VisualUprightHint> {
  if (typeof createImageBitmap !== 'function') return 'unknown';
  let bitmap: ImageBitmap;
  try {
    bitmap = await createScanPhotoBitmap(file);
  } catch {
    return 'unknown';
  }
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    if (Math.min(width, height) < 8 || Math.max(width, height) < 16) return 'unknown';
    const maxEdge = 160;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const sw = Math.max(8, Math.round(width * scale));
    const sh = Math.max(8, Math.round(height * scale));
    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(sw, sh)
        : Object.assign(document.createElement('canvas'), { width: sw, height: sh });
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) return 'unknown';
    ctx.drawImage(bitmap, 0, 0, sw, sh);
    const pixels = ctx.getImageData(0, 0, sw, sh).data;
    const gray = new Uint8Array(sw * sh);
    for (let i = 0; i < sw * sh; i += 1) {
      const p = i * 4;
      gray[i] = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
    }
    const bands = bandLumaMeansFromGray(sw, sh, gray);
    if (!bands) return 'unknown';
    return detectAPoseOrientationFromBandLuma(
      bands.topMean,
      bands.bottomMean,
      bands.leftMean,
      bands.rightMean,
    );
  } catch {
    return 'unknown';
  } finally {
    if ('close' in bitmap) bitmap.close();
  }
}

/** Bake EXIF / auto-upright into pixels so analyze and avatar never see inverted frames. */
export async function normalizeScanPhotoUpright(
  file: Blob,
  source: ScanPhotoSource,
): Promise<File> {
  const buffer = await blobToArrayBuffer(file);
  const orientation = readJpegExifOrientation(buffer);
  const needsVisual = orientation === null || orientation === 1;
  const visualHint = needsVisual ? await sampleVisualUprightHint(file) : 'unknown';
  const transform = resolveUprightTransform(orientation, source, visualHint);
  if (!needsUprightPixelBake(orientation, transform, source)) {
    if (file instanceof File) return file;
    return new File([file], 'scan.jpg', { type: file.type || 'image/jpeg' });
  }
  const upright = await renderUprightBlob(file, transform);
  return new File([upright], 'scan.jpg', { type: 'image/jpeg' });
}
