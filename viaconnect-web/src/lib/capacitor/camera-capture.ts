// Prompt #170 Phase 1k: Capacitor camera capture abstraction.
//
// Single entry point used by NutriVisionTab. On native iOS or Android it
// delegates to the @capacitor/camera plugin. On web it falls back to
// getUserMedia (for source: 'camera') or a hidden file input (for
// source: 'gallery'). The plugin is loaded via dynamic import so web
// bundles that never hit the native path do not pull the plugin in.
//
// Phase 1 hardcodes deviceClass to ios_no_lidar and android_no_depth.
// LiDAR + ARCore Depth detection ship in Phase 170b.

import { safeLog } from '@/lib/utils/safe-log';

const LOG_SCOPE = 'nutrivision.capture';

export type CaptureSource = 'camera' | 'gallery';

export type DeviceClass =
  | 'ios_lidar'
  | 'ios_no_lidar'
  | 'android_arcore'
  | 'android_no_depth'
  | 'web';

export type CaptureMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface CaptureResult {
  imageBase64: string;
  mime: CaptureMime;
  capturedAt: string;
  deviceClass: DeviceClass;
  width: number;
  height: number;
  bytesAfterCompression: number;
}

export interface CaptureOpts {
  source: CaptureSource;
  maxBytes?: number;
  jpegQuality?: number;
  maxEdgePx?: number;
}

export class CaptureCancelledError extends Error {
  readonly name = 'CaptureCancelledError' as const;
  constructor(message = 'Capture cancelled by user') {
    super(message);
  }
}

export class CaptureUnsupportedError extends Error {
  readonly name = 'CaptureUnsupportedError' as const;
  constructor(message = 'Capture not supported in this environment') {
    super(message);
  }
}

// Prompt 190: selection validation errors. Messages are user-ready; the
// capture hook surfaces err.message inline in the NutriVision panel.
export class CaptureFileTooLargeError extends Error {
  readonly name = 'CaptureFileTooLargeError' as const;
  constructor(message = 'That photo is larger than 15 MB. Choose a smaller image.') {
    super(message);
  }
}

export class CaptureUnsupportedTypeError extends Error {
  readonly name = 'CaptureUnsupportedTypeError' as const;
  constructor(message = 'That file type is not supported. Choose a JPEG, PNG, WebP, or HEIC photo.') {
    super(message);
  }
}

const DEFAULT_MAX_BYTES = 800_000;
const DEFAULT_JPEG_QUALITY = 80;
const DEFAULT_MAX_EDGE_PX = 1920;
const MIN_JPEG_QUALITY = 50;
const QUALITY_STEP = 5;

// Prompt 190: the Upload path accepts library photos including the iOS
// default HEIC/HEIF; decode goes through the canvas pipeline which
// re-encodes to JPEG, so downstream analysis is unchanged. 15 MB ceiling
// is validated before any decode work.
const GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const MAX_SELECTED_FILE_BYTES = 15 * 1024 * 1024;
const SELECTABLE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]);
const SELECTABLE_EXTENSION_RX = /\.(jpe?g|png|webp|heic|heif)$/i;

// Capacitor's runtime global. We type narrowly so the abstraction does not
// hard-depend on @capacitor/core. Tests stub this via vi.stubGlobal.
interface CapacitorGlobal {
  getPlatform(): 'ios' | 'android' | 'web';
}

interface WindowWithCapacitor {
  Capacitor?: CapacitorGlobal;
}

function readCapacitor(): CapacitorGlobal | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  const w = globalThis as unknown as WindowWithCapacitor;
  return w.Capacitor;
}

export function detectPlatform(): DeviceClass {
  const cap = readCapacitor();
  if (!cap || typeof cap.getPlatform !== 'function') return 'web';
  const platform = cap.getPlatform();
  if (platform === 'ios') return 'ios_no_lidar';
  if (platform === 'android') return 'android_no_depth';
  return 'web';
}

interface NormalizedOpts {
  source: CaptureSource;
  maxBytes: number;
  jpegQuality: number;
  maxEdgePx: number;
}

function normalizeOpts(opts: CaptureOpts): NormalizedOpts {
  return {
    source: opts.source,
    maxBytes: opts.maxBytes ?? DEFAULT_MAX_BYTES,
    jpegQuality: opts.jpegQuality ?? DEFAULT_JPEG_QUALITY,
    maxEdgePx: opts.maxEdgePx ?? DEFAULT_MAX_EDGE_PX,
  };
}

export async function captureMealPhoto(opts: CaptureOpts): Promise<CaptureResult> {
  const normalized = normalizeOpts(opts);
  const platform = detectPlatform();

  if (platform === 'ios_no_lidar' || platform === 'ios_lidar') {
    return captureNative(normalized, platform);
  }
  if (platform === 'android_no_depth' || platform === 'android_arcore') {
    return captureNative(normalized, platform);
  }
  return captureWeb(normalized);
}

// Capacitor plugin types are kept inline so we do not depend on the package
// being installed for type-checking. The dynamic import returns unknown and
// we narrow via runtime guards.
interface CapacitorPhoto {
  base64String?: string;
  format?: string;
  webPath?: string;
}

interface CapacitorCameraModule {
  Camera: {
    getPhoto(options: {
      source: number;
      resultType: number;
      quality: number;
      allowEditing: boolean;
      correctOrientation: boolean;
    }): Promise<CapacitorPhoto>;
  };
  CameraResultType: { Base64: number };
  CameraSource: { Camera: number; Photos: number };
}

function isCapacitorCameraModule(mod: unknown): mod is CapacitorCameraModule {
  if (!mod || typeof mod !== 'object') return false;
  const m = mod as Record<string, unknown>;
  if (!m.Camera || typeof m.Camera !== 'object') return false;
  if (typeof (m.Camera as Record<string, unknown>).getPhoto !== 'function') return false;
  if (!m.CameraResultType || !m.CameraSource) return false;
  return true;
}

async function captureNative(
  opts: NormalizedOpts,
  deviceClass: DeviceClass,
): Promise<CaptureResult> {
  let mod: unknown;
  try {
    // @capacitor/camera is an optional native plugin. When a build has not
    // installed it the dynamic import rejects at runtime and we surface a
    // CaptureUnsupportedError. The package is currently installed, so the
    // specifier typechecks (sweep 2026-06-12 removed a stale expect-error).
    mod = await import('@capacitor/camera');
  } catch {
    throw new CaptureUnsupportedError('Capacitor camera plugin not bundled');
  }
  if (!isCapacitorCameraModule(mod)) {
    throw new CaptureUnsupportedError('Capacitor camera plugin shape unrecognized');
  }
  const { Camera, CameraResultType, CameraSource } = mod;

  safeLog.info(LOG_SCOPE, opts.source === 'gallery' ? 'nutrivision_upload_picker_opened' : 'nutrivision_camera_opened', {
    component: 'camera-capture',
    action: opts.source === 'gallery' ? 'upload_picker' : 'native_camera',
    platform: deviceClass,
  });

  let photo: CapacitorPhoto;
  try {
    photo = await Camera.getPhoto({
      source: opts.source === 'gallery' ? CameraSource.Photos : CameraSource.Camera,
      resultType: CameraResultType.Base64,
      quality: opts.jpegQuality,
      allowEditing: false,
      correctOrientation: true,
    });
  } catch (err) {
    throw new CaptureCancelledError(
      err instanceof Error ? err.message : 'Native capture cancelled',
    );
  }

  if (!photo.base64String) throw new CaptureCancelledError('No photo returned');

  const format = (photo.format ?? 'jpeg').toLowerCase();
  const mime: CaptureMime =
    format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';

  const compressed = await compressIfNeeded(photo.base64String, mime, opts);

  return {
    imageBase64: compressed.base64,
    mime: compressed.mime,
    capturedAt: new Date().toISOString(),
    deviceClass,
    width: compressed.width,
    height: compressed.height,
    bytesAfterCompression: compressed.bytes,
  };
}

interface MediaStreamTrackLike {
  stop(): void;
  kind?: string;
  getSettings?: () => { width?: number; height?: number };
}

export interface MediaStreamLike {
  getTracks(): MediaStreamTrackLike[];
}

type WebCameraVideoConstraints =
  | { video: true }
  | { video: { facingMode: string; width?: { ideal: number }; height?: { ideal: number } } };

interface MediaDevicesLike {
  getUserMedia?: (constraints: WebCameraVideoConstraints) => Promise<MediaStreamLike>;
}

/** Honest user copy. Never a raw DOMException.message. */
export const CAMERA_UNAVAILABLE_USER_COPY =
  'Camera is not available on this device. Upload a photo or log the meal manually.';

export const CAMERA_PERMISSION_USER_COPY =
  'Camera permission was not granted. Enable it in browser settings, or upload a photo or log the meal manually.';

function getUserMediaErrorName(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: unknown }).name;
    if (typeof name === 'string') return name;
  }
  return '';
}

export function isCameraPermissionFailure(err: unknown): boolean {
  const name = getUserMediaErrorName(err);
  if (name === 'NotAllowedError' || name === 'SecurityError') return true;
  return err instanceof Error && /denied|permission/i.test(err.message);
}

/**
 * Map getUserMedia failures to honest copy. NotFoundError,
 * OverconstrainedError, NotAllowedError, and never-granted permission
 * never leak the raw DOMException.message.
 */
export function userFacingCameraFailure(
  err: unknown,
): CaptureCancelledError | CaptureUnsupportedError {
  if (isCameraPermissionFailure(err)) {
    return new CaptureCancelledError(CAMERA_PERMISSION_USER_COPY);
  }
  return new CaptureUnsupportedError(CAMERA_UNAVAILABLE_USER_COPY);
}

// Prompt 231: optional resolution preference. Undefined width/height leaves
// the constraints object identical to the pre-resolution shape (facingMode
// only), which the NutriVision regression test asserts by exact toEqual.
function buildVideoConstraints(
  facingMode: 'environment' | 'user',
  resolution?: { width?: number; height?: number },
): { facingMode: string; width?: { ideal: number }; height?: { ideal: number } } {
  const constraints: { facingMode: string; width?: { ideal: number }; height?: { ideal: number } } = {
    facingMode,
  };
  if (typeof resolution?.width === 'number') {
    constraints.width = { ideal: resolution.width };
  }
  if (typeof resolution?.height === 'number') {
    constraints.height = { ideal: resolution.height };
  }
  return constraints;
}

async function requestWebCameraStream(
  md: MediaDevicesLike,
  facingMode: 'environment' | 'user',
  resolution?: { width?: number; height?: number },
): Promise<MediaStreamLike> {
  if (typeof md.getUserMedia !== 'function') {
    throw new CaptureUnsupportedError(CAMERA_UNAVAILABLE_USER_COPY);
  }
  try {
    return await md.getUserMedia({ video: buildVideoConstraints(facingMode, resolution) });
  } catch (firstErr) {
    if (isCameraPermissionFailure(firstErr)) {
      throw userFacingCameraFailure(firstErr);
    }
    try {
      return await md.getUserMedia({ video: true });
    } catch (secondErr) {
      throw userFacingCameraFailure(secondErr);
    }
  }
}

interface NavigatorWithMedia {
  mediaDevices?: MediaDevicesLike;
}

async function captureWeb(opts: NormalizedOpts): Promise<CaptureResult> {
  if (opts.source === 'gallery') {
    return captureWebGallery(opts);
  }
  return captureWebCamera(opts);
}

// Prompt 190: shared hidden file input picker for the two web file paths.
//
// withCaptureAttribute MUST stay false for the Upload tile: on iOS Safari
// and most Android browsers the capture attribute forces the camera and
// suppresses the library picker entirely, which was the Prompt 190 defect
// (Upload behaved identically to Photo). It is true ONLY for the Photo
// path's fallback when getUserMedia is denied or unavailable, where forcing
// the native camera is the intended behavior.
//
// A fresh input is created per invocation and removed afterwards, so
// selecting the same file twice in a row re-fires change, and it is
// positioned offscreen (never display none) so the programmatic click works
// on iOS.
async function pickWebImageFile(args: {
  withCaptureAttribute: boolean;
}): Promise<File> {
  if (typeof document === 'undefined') {
    throw new CaptureUnsupportedError('document is not available');
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = GALLERY_ACCEPT;
  if (args.withCaptureAttribute) {
    input.setAttribute('capture', 'environment');
  }
  input.style.position = 'fixed';
  input.style.left = '-10000px';
  input.style.top = '-10000px';
  document.body.appendChild(input);

  safeLog.info(LOG_SCOPE, args.withCaptureAttribute ? 'nutrivision_camera_opened' : 'nutrivision_upload_picker_opened', {
    component: 'camera-capture',
    action: args.withCaptureAttribute ? 'camera_fallback_input' : 'upload_picker',
    platform: 'web',
  });

  const file = await new Promise<File>((resolve, reject) => {
    let settled = false;
    input.addEventListener('change', () => {
      settled = true;
      const f = input.files && input.files.length > 0 ? input.files[0] : null;
      if (!f) {
        reject(new CaptureCancelledError('No file chosen'));
        return;
      }
      resolve(f);
    });
    // Some browsers fire a cancel event on the input.
    input.addEventListener('cancel', () => {
      if (!settled) reject(new CaptureCancelledError('File picker dismissed'));
    });
    input.click();
  }).finally(() => {
    if (input.parentNode) input.parentNode.removeChild(input);
  });

  return file;
}

// Prompt 190: client-side validation before any decode work. Unsupported
// types and oversized files surface inline in the panel; nothing is
// uploaded, so no orphaned storage objects.
function validateSelectedFile(file: File): void {
  const type = (file.type ?? '').toLowerCase();
  const name = typeof file.name === 'string' ? file.name : '';
  const typeOk =
    (type.length > 0 && SELECTABLE_TYPES.has(type)) ||
    (type.length === 0 && SELECTABLE_EXTENSION_RX.test(name));
  if (!typeOk) {
    throw new CaptureUnsupportedTypeError();
  }
  if (typeof file.size === 'number' && file.size > MAX_SELECTED_FILE_BYTES) {
    throw new CaptureFileTooLargeError();
  }
}

async function fileToCaptureResult(file: File, opts: NormalizedOpts): Promise<CaptureResult> {
  const base64 = await fileToBase64(file);
  // Decode under the file's real type so Safari renders HEIC correctly; the
  // canvas pipeline re-encodes to JPEG, which the analysis pipeline already
  // ingests. Browsers that cannot decode HEIC (desktop Chrome) reject in
  // loadBase64Image and surface a clear error instead of a silent failure.
  const sourceMimeLabel = (file.type ?? '').toLowerCase() || 'image/jpeg';
  const mime = inferMimeFromType(file.type ?? '');
  const compressed = await compressIfNeeded(base64, mime, opts, undefined, sourceMimeLabel);
  return {
    imageBase64: compressed.base64,
    mime: compressed.mime,
    capturedAt: new Date().toISOString(),
    deviceClass: 'web',
    width: compressed.width,
    height: compressed.height,
    bytesAfterCompression: compressed.bytes,
  };
}

async function captureWebGallery(opts: NormalizedOpts): Promise<CaptureResult> {
  const file = await pickWebImageFile({ withCaptureAttribute: false });
  try {
    validateSelectedFile(file);
    const result = await fileToCaptureResult(file, opts);
    safeLog.info(LOG_SCOPE, 'nutrivision_upload_selected', {
      component: 'camera-capture',
      action: 'upload_selected',
      file_type: file.type ?? null,
      file_size: file.size ?? null,
      outcome: 'decoded',
    });
    return result;
  } catch (err) {
    safeLog.warn(LOG_SCOPE, 'nutrivision_upload_failed', {
      component: 'camera-capture',
      action: 'upload_failed',
      file_type: file.type ?? null,
      file_size: file.size ?? null,
      outcome: err instanceof Error ? err.name : 'unknown',
    });
    if (err instanceof CaptureUnsupportedError) {
      // Decode failures on library files are a type problem from the user's
      // seat (a HEIC the browser cannot read), not a missing camera.
      throw new CaptureUnsupportedTypeError(
        'This photo format could not be read by your browser. Convert it to JPEG and try again.',
      );
    }
    throw err;
  }
}

// Prompt 190: Photo-path fallback when getUserMedia is denied or
// unavailable. The capture attribute is intentional HERE AND ONLY HERE: it
// forces the native camera, which is what the Photo tile means. Exported
// for the WebCameraPreview unsupported/denied state.
export async function captureCameraFallbackPhoto(
  opts: CaptureOpts = { source: 'camera' },
): Promise<CaptureResult> {
  const normalized = normalizeOpts(opts);
  const file = await pickWebImageFile({ withCaptureAttribute: true });
  validateSelectedFile(file);
  return fileToCaptureResult(file, normalized);
}

// ----------------------------------------------------------------------------
// Prompt 171a: split web camera helpers for the WebCameraPreview UI overlay.
//
// The original captureWebCamera() does headless first-frame capture which gives
// users no chance to frame the photograph. The new flow is:
//
//   1. acquireWebCameraStream(): get the MediaStream so the UI can show a live
//      <video> preview with rear-camera constraints.
//   2. webCameraStreamToJpeg(stream): on user "Capture" tap, drain the current
//      video frame to a JPEG and run it through the same compression pipeline.
//
// captureWebCamera() stays untouched so the legacy single-call path keeps
// working for callers that do not mount the WebCameraPreview overlay.
// ----------------------------------------------------------------------------

export interface AcquireWebCameraOpts {
  facingMode?: 'environment' | 'user';
  // Prompt 231: optional resolution preference, passed as `ideal` so the
  // browser is free to grant less. Omitted entirely when unset, so existing
  // NutriVision callers (no width/height) see identical constraints.
  width?: number;
  height?: number;
}

export async function acquireWebCameraStream(
  opts: AcquireWebCameraOpts = {},
): Promise<MediaStreamLike> {
  if (typeof navigator === 'undefined') {
    throw new CaptureUnsupportedError(CAMERA_UNAVAILABLE_USER_COPY);
  }
  const nav = navigator as unknown as NavigatorWithMedia;
  const md = nav.mediaDevices;
  if (!md || typeof md.getUserMedia !== 'function') {
    throw new CaptureUnsupportedError(CAMERA_UNAVAILABLE_USER_COPY);
  }
  return requestWebCameraStream(md, opts.facingMode ?? 'environment', {
    width: opts.width,
    height: opts.height,
  });
}

// Prompt 231: report the resolution getUserMedia actually granted (the
// `ideal` hint above is not a guarantee). Reads the first video track's
// getSettings(); falls back to 0/0 when the track or getSettings is
// unavailable rather than fabricating a number.
export function getGrantedResolution(stream: MediaStreamLike): { width: number; height: number } {
  const tracks = stream.getTracks();
  const track = tracks.find((t) => t.kind === undefined || t.kind === 'video') ?? tracks[0];
  if (!track || typeof track.getSettings !== 'function') {
    return { width: 0, height: 0 };
  }
  const settings = track.getSettings();
  return {
    width: typeof settings.width === 'number' ? settings.width : 0,
    height: typeof settings.height === 'number' ? settings.height : 0,
  };
}

export async function webCameraStreamToJpeg(
  stream: MediaStreamLike,
  opts: CaptureOpts = { source: 'camera' },
): Promise<CaptureResult> {
  const normalized = normalizeOpts(opts);
  const { base64, width, height } = await drawStreamToJpeg(
    stream,
    normalized.jpegQuality,
  );
  const compressed = await compressIfNeeded(base64, 'image/jpeg', normalized, {
    width,
    height,
  });
  return {
    imageBase64: compressed.base64,
    mime: 'image/jpeg',
    capturedAt: new Date().toISOString(),
    deviceClass: 'web',
    width: compressed.width,
    height: compressed.height,
    bytesAfterCompression: compressed.bytes,
  };
}

export function stopWebCameraStream(stream: MediaStreamLike): void {
  try {
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // benign: tracks may already be stopped
  }
}

async function captureWebCamera(opts: NormalizedOpts): Promise<CaptureResult> {
  if (typeof navigator === 'undefined') {
    throw new CaptureUnsupportedError(CAMERA_UNAVAILABLE_USER_COPY);
  }
  const nav = navigator as unknown as NavigatorWithMedia;
  const md = nav.mediaDevices;
  if (!md || typeof md.getUserMedia !== 'function') {
    throw new CaptureUnsupportedError(CAMERA_UNAVAILABLE_USER_COPY);
  }

  safeLog.info(LOG_SCOPE, 'nutrivision_camera_opened', {
    component: 'camera-capture',
    action: 'web_camera_headless',
    platform: 'web',
  });

  const stream = await requestWebCameraStream(md, 'environment');

  try {
    const { base64, width, height } = await drawStreamToJpeg(stream, opts.jpegQuality);
    const compressed = await compressIfNeeded(base64, 'image/jpeg', opts, { width, height });
    return {
      imageBase64: compressed.base64,
      mime: 'image/jpeg',
      capturedAt: new Date().toISOString(),
      deviceClass: 'web',
      width: compressed.width,
      height: compressed.height,
      bytesAfterCompression: compressed.bytes,
    };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

interface VideoElementLike {
  srcObject: unknown;
  videoWidth: number;
  videoHeight: number;
  play(): Promise<void>;
  addEventListener(event: string, cb: () => void): void;
}

async function drawStreamToJpeg(
  stream: MediaStreamLike,
  quality: number,
): Promise<{ base64: string; width: number; height: number }> {
  if (typeof document === 'undefined') {
    throw new CaptureUnsupportedError('document is not available');
  }
  const video = document.createElement('video') as unknown as VideoElementLike;
  video.srcObject = stream;
  await new Promise<void>((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve());
  });
  await video.play();
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new CaptureUnsupportedError('2D canvas context unavailable');
  ctx.drawImage(video as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', clamp01(quality / 100));
  return {
    base64: stripDataUrlPrefix(dataUrl),
    width: canvas.width,
    height: canvas.height,
  };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new CaptureUnsupportedError('FileReader failed'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new CaptureUnsupportedError('FileReader returned non-string'));
        return;
      }
      resolve(stripDataUrlPrefix(result));
    };
    reader.readAsDataURL(file);
  });
}

function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function inferMimeFromType(type: string): CaptureMime {
  const t = type.toLowerCase();
  if (t === 'image/png') return 'image/png';
  if (t === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

interface CompressResult {
  base64: string;
  mime: CaptureMime;
  width: number;
  height: number;
  bytes: number;
}

// base64 byte length, excluding any data URL prefix.
function base64ByteLength(b64: string): number {
  // RFC 4648 base64: 4 chars encode 3 bytes; subtract padding.
  const len = b64.length;
  if (len === 0) return 0;
  const padding =
    b64.charAt(len - 2) === '=' ? 2 : b64.charAt(len - 1) === '=' ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

async function compressIfNeeded(
  base64: string,
  mime: CaptureMime,
  opts: NormalizedOpts,
  knownDims?: { width: number; height: number },
  // Prompt 190: the decode label can differ from the output mime (HEIC in,
  // JPEG out after the canvas re-encode).
  sourceMimeLabel?: string,
): Promise<CompressResult> {
  const startBytes = base64ByteLength(base64);

  // If we know dims already and we are under threshold, skip re-encode.
  if (knownDims && startBytes <= opts.maxBytes) {
    return {
      base64,
      mime,
      width: knownDims.width,
      height: knownDims.height,
      bytes: startBytes,
    };
  }

  // Browser path: use HTMLImageElement + canvas to scale + re-encode.
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    // Non-browser context (e.g. test environment without canvas). Return as-is
    // with synthetic dims so the caller still gets a CaptureResult shape.
    return {
      base64,
      mime,
      width: knownDims?.width ?? 0,
      height: knownDims?.height ?? 0,
      bytes: startBytes,
    };
  }

  const img = await loadBase64Image(base64, sourceMimeLabel ?? mime);
  const { canvas, width, height } = scaleToCanvas(img, opts.maxEdgePx);
  let quality = opts.jpegQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', clamp01(quality / 100));
  let outBase64 = stripDataUrlPrefix(dataUrl);
  let outBytes = base64ByteLength(outBase64);
  while (outBytes > opts.maxBytes && quality > MIN_JPEG_QUALITY) {
    quality -= QUALITY_STEP;
    dataUrl = canvas.toDataURL('image/jpeg', clamp01(quality / 100));
    outBase64 = stripDataUrlPrefix(dataUrl);
    outBytes = base64ByteLength(outBase64);
  }

  return {
    base64: outBase64,
    mime: 'image/jpeg',
    width,
    height,
    bytes: outBytes,
  };
}

function loadBase64Image(base64: string, mime: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new CaptureUnsupportedError('Image decode failed'));
    img.src = `data:${mime};base64,${base64}`;
  });
}

interface ScaledCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function scaleToCanvas(img: HTMLImageElement, maxEdge: number): ScaledCanvas {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new CaptureUnsupportedError('2D canvas context unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, width, height };
}
