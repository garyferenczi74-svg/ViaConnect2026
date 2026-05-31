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

const DEFAULT_MAX_BYTES = 800_000;
const DEFAULT_JPEG_QUALITY = 80;
const DEFAULT_MAX_EDGE_PX = 1920;
const MIN_JPEG_QUALITY = 50;
const QUALITY_STEP = 5;

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
    // @capacitor/camera is an optional native plugin. When the sandbox or web
    // build has not installed it the dynamic import rejects and we surface a
    // CaptureUnsupportedError. TS cannot statically resolve the specifier
    // because the package may be absent from node_modules at typecheck time.
    // @ts-expect-error optional native plugin; resolved at runtime when bundled.
    mod = await import('@capacitor/camera');
  } catch {
    throw new CaptureUnsupportedError('Capacitor camera plugin not bundled');
  }
  if (!isCapacitorCameraModule(mod)) {
    throw new CaptureUnsupportedError('Capacitor camera plugin shape unrecognized');
  }
  const { Camera, CameraResultType, CameraSource } = mod;

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

interface MediaStreamLike {
  getTracks(): Array<{ stop(): void }>;
}

interface MediaDevicesLike {
  getUserMedia?: (constraints: { video: { facingMode: string } }) => Promise<MediaStreamLike>;
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

async function captureWebGallery(opts: NormalizedOpts): Promise<CaptureResult> {
  if (typeof document === 'undefined') {
    throw new CaptureUnsupportedError('document is not available');
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.setAttribute('capture', 'environment');
  input.style.position = 'fixed';
  input.style.left = '-10000px';
  input.style.top = '-10000px';
  document.body.appendChild(input);

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

  const base64 = await fileToBase64(file);
  const mime = inferMimeFromType(file.type);
  const compressed = await compressIfNeeded(base64, mime, opts);
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
}

export async function acquireWebCameraStream(
  opts: AcquireWebCameraOpts = {},
): Promise<MediaStreamLike> {
  if (typeof navigator === 'undefined') {
    throw new CaptureUnsupportedError('navigator is not available');
  }
  const nav = navigator as unknown as NavigatorWithMedia;
  const md = nav.mediaDevices;
  if (!md || typeof md.getUserMedia !== 'function') {
    throw new CaptureUnsupportedError('getUserMedia is not available');
  }
  try {
    return await md.getUserMedia({
      video: { facingMode: opts.facingMode ?? 'environment' },
    });
  } catch (err) {
    if (err instanceof Error && /denied|permission/i.test(err.message)) {
      throw new CaptureCancelledError('Camera permission denied');
    }
    throw new CaptureUnsupportedError(
      err instanceof Error ? err.message : 'getUserMedia rejected',
    );
  }
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
    throw new CaptureUnsupportedError('navigator is not available');
  }
  const nav = navigator as unknown as NavigatorWithMedia;
  const md = nav.mediaDevices;
  if (!md || typeof md.getUserMedia !== 'function') {
    throw new CaptureUnsupportedError('getUserMedia is not available');
  }

  let stream: MediaStreamLike;
  try {
    stream = await md.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (err) {
    if (err instanceof Error && /denied|permission/i.test(err.message)) {
      throw new CaptureCancelledError('Camera permission denied');
    }
    throw new CaptureUnsupportedError(
      err instanceof Error ? err.message : 'getUserMedia rejected',
    );
  }

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

  const img = await loadBase64Image(base64, mime);
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

function loadBase64Image(base64: string, mime: CaptureMime): Promise<HTMLImageElement> {
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
