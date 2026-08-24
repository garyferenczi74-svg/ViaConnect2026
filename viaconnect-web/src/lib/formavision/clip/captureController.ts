/**
 * src/lib/formavision/clip/captureController.ts
 *
 * Prompt 211a Workstream 1: capture orchestration for the shareable transformation
 * clip (the growth engine).
 *
 * GARY DECISION (governs the encode): NO-DEPENDENCY MediaRecorder(canvas.captureStream())
 * -> WebM on desktop + modern Android. iOS WKWebView + the 2D-floor tier + no-WebGL get
 * a graceful STATIC-CARD fallback (see staticCardFallback.ts). package.json is UNTOUCHED:
 * this uses only browser built-ins (MediaRecorder, HTMLCanvasElement.captureStream), no
 * WASM muxer, no ffmpeg, no new package.
 *
 * HONEST EXECUTION-GATING (same discipline as 210e's GL tier):
 *   The pure capability + planning logic below runs GREEN in the node test runner.
 *   The ACTUAL encode (recordCanvasToWebM) needs a real browser with a live WebGL
 *   canvas and MediaRecorder; it CANNOT run headless here. It is authored and
 *   documented as EXECUTION-GATED, guarded by canSupportOnDeviceEncode() at every
 *   call site. It is NOT claimed to pass in CI.
 *
 * FRAMELOOP CONTRACT (additive, minimal):
 *   The avatar canvas is frameloop="demand" (baseline item 1+2). captureStream()
 *   only emits frames the loop actually paints, so during recording the loop must
 *   run "always". W1 signals this to FormaVisionCanvas via the ADDITIVE optional
 *   prop `frameloopMode` (added on FormaVisionCanvasProps): the clip surface sets it
 *   to 'always' while recording and back to undefined (demand) when done. When the
 *   prop is absent the canvas is byte-identical to before (demand). See
 *   FormaVisionCanvas for the one-line wiring.
 *
 * NO RAW PHOTO CONTRACT: the encode captures the WebGL avatar canvas stream, whose
 * only texture is a procedural cell-grain (baseline item 1+2). No photo is ever read.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any. The pure helpers
 * never throw.
 */

import type { RenderTier } from '@/lib/formavision/tier/types';

// The morph play length. Mirrors JourneyTimeline.PLAY_DURATION_MS so a recorded clip
// is exactly one full journey play (first to latest) at cinematic length.
export const CLIP_PLAY_DURATION_MS = 4000;

// A short tail after the morph completes so the final frame (the latest scan) is held
// on screen before the recorder stops. Keeps the last stat readable in the clip.
export const CLIP_HOLD_TAIL_MS = 800;

// The total wall-clock length of a recording: the play plus the hold tail.
export const CLIP_TOTAL_DURATION_MS = CLIP_PLAY_DURATION_MS + CLIP_HOLD_TAIL_MS;

// captureStream frame rate. 30 fps is smooth for a 4s morph and light on encode cost
// (the frame-budget monitor can trip a step-down on marginal devices under load, so we
// do not ask for 60).
export const CLIP_CAPTURE_FPS = 30;

// ---------------------------------------------------------------------------
// Capability probe (PURE decision + thin browser wrapper).
//
// canSupportOnDeviceEncode() returns true only when ALL hold:
//   1. MediaRecorder exists.
//   2. HTMLCanvasElement.prototype.captureStream exists.
//   3. The active render tier is a 3D tier (not '2d'): the 2D floor has NO canvas
//      to capture (baseline item 1+2), so it must take the static-card fallback.
// When any is false the UI branches to the static-card fallback honestly.
// ---------------------------------------------------------------------------

export interface EncodeCapabilitySignals {
  /** Whether the MediaRecorder constructor is present. */
  hasMediaRecorder: boolean;
  /** Whether HTMLCanvasElement.prototype.captureStream is present. */
  hasCaptureStream: boolean;
  /** The active render tier. '2d' has no canvas and can never encode on-device. */
  tier: RenderTier;
}

/**
 * PURE decision: can this environment encode a clip on-device?
 *
 * Deterministic over the supplied signals. The 2D floor is excluded because it has
 * no WebGL canvas to capture (baseline item 1+2). Exported so the decision is unit
 * tested without touching the browser.
 */
export function decideOnDeviceEncode(signals: EncodeCapabilitySignals): boolean {
  if (signals.tier === '2d') return false;
  return signals.hasMediaRecorder && signals.hasCaptureStream;
}

/**
 * Reads the encode-capability signals from the current environment. SSR-safe: with
 * no window / no HTMLCanvasElement it reports both browser signals false, so the
 * pure decision resolves to the static-card fallback. Never throws.
 *
 * @param tier - the active render tier from useRenderTier.
 */
export function readEncodeCapabilitySignals(tier: RenderTier): EncodeCapabilitySignals {
  const hasMediaRecorder =
    typeof window !== 'undefined' && typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder === 'function';
  const hasCaptureStream =
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream ===
      'function';
  return { hasMediaRecorder, hasCaptureStream, tier };
}

/**
 * The public capability entry point: probe the environment and decide whether the
 * on-device WebM encode is supported, or the static-card fallback must be served.
 *
 * SSR-safe and fail-safe: unknown / server environments and the 2D floor resolve to
 * false (fallback). Never throws.
 *
 * @param tier - the active render tier from useRenderTier.
 */
export function canSupportOnDeviceEncode(tier: RenderTier): boolean {
  return decideOnDeviceEncode(readEncodeCapabilitySignals(tier));
}

// ---------------------------------------------------------------------------
// MIME selection (PURE): the preferred WebM codec chain for MediaRecorder. WebM is
// the zero-dependency target (baseline item 1+2: desktop + modern Android). VP9 is
// preferred for quality, VP8 as a broad fallback, then bare webm.
// ---------------------------------------------------------------------------

export const WEBM_MIME_PREFERENCES: readonly string[] = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

/**
 * PURE: picks the first supported WebM mime type from the preference chain, given a
 * type-support predicate (MediaRecorder.isTypeSupported in the browser; injected in
 * tests). Returns null when none are supported (the caller then serves the fallback).
 */
export function pickWebmMimeType(isSupported: (mime: string) => boolean): string | null {
  for (const mime of WEBM_MIME_PREFERENCES) {
    try {
      if (isSupported(mime)) return mime;
    } catch {
      // A throwing predicate is treated as "unsupported" for that mime.
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Capture plan (PURE): the recording schedule, derived once and handed to the driver.
// Keeping this pure lets the timing + range be unit tested with no browser.
// ---------------------------------------------------------------------------

export interface CaptureRange {
  /** Index of the first scan in the chosen range (inclusive), oldest first. */
  startIndex: number;
  /** Index of the latest scan in the chosen range (inclusive). */
  endIndex: number;
}

export interface CapturePlan {
  /** The chosen scan range (validated + clamped). */
  range: CaptureRange;
  /** Frame rate to request from captureStream. */
  fps: number;
  /** Morph play length in ms. */
  playDurationMs: number;
  /** Hold-tail length in ms after the morph completes. */
  holdTailMs: number;
  /** Total recording length in ms (play + hold tail). */
  totalDurationMs: number;
  /** True when the range is valid (at least two scans, ordered, in bounds). */
  valid: boolean;
}

/**
 * PURE: builds and validates a capture plan for a chosen scan range over a history of
 * `scanCount` scans (oldest first). A clip needs at least two scans to show a morph;
 * a single-scan or out-of-bounds range yields valid=false so the UI can disable
 * recording honestly (never a fake one-frame video). Deterministic; never throws.
 */
export function buildCapturePlan(range: CaptureRange, scanCount: number): CapturePlan {
  const startIndex = Math.max(0, Math.min(range.startIndex, Math.max(0, scanCount - 1)));
  const endIndex = Math.max(0, Math.min(range.endIndex, Math.max(0, scanCount - 1)));
  const ordered = endIndex > startIndex;
  const enoughScans = scanCount >= 2;
  const valid = ordered && enoughScans;
  return {
    range: { startIndex, endIndex },
    fps: CLIP_CAPTURE_FPS,
    playDurationMs: CLIP_PLAY_DURATION_MS,
    holdTailMs: CLIP_HOLD_TAIL_MS,
    totalDurationMs: CLIP_TOTAL_DURATION_MS,
    valid,
  };
}

/**
 * PURE: the number of scans spanned by a range (endIndex - startIndex + 1), used as
 * the coarse `range_length` telemetry field. Returns 0 for an invalid (unordered)
 * range. Deterministic; never throws.
 */
export function rangeLength(range: CaptureRange): number {
  if (range.endIndex < range.startIndex) return 0;
  return range.endIndex - range.startIndex + 1;
}

// ===========================================================================
// EXECUTION-GATED BROWSER ENCODE (NOT claimed-passing in CI).
//
// Everything below needs a real browser with a live WebGL canvas + MediaRecorder.
// It is authored and documented to the same discipline as 210e's GL tier: guarded
// by canSupportOnDeviceEncode(), never asserted green headless. The pure helpers
// above (decideOnDeviceEncode, pickWebmMimeType, buildCapturePlan, rangeLength) ARE
// unit-tested; the recorder wiring is validated on-device only.
// ===========================================================================

// The narrow slice of the browser MediaRecorder we depend on, typed locally so this
// module never hard-imports a MediaRecorder type (keeps zero-dependency + node-safe).
interface MinimalMediaRecorder {
  start(timesliceMs?: number): void;
  stop(): void;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  readonly state: string;
}

type MediaRecorderCtor = new (
  stream: MediaStream,
  options?: { mimeType?: string; videoBitsPerSecond?: number },
) => MinimalMediaRecorder;

export interface RecordCanvasOptions {
  /** The live avatar canvas (data-testid formavision-avatar-canvas). */
  canvas: HTMLCanvasElement;
  /** Drive the morph play (JourneyTimeline PLAY, 4s) over the chosen range. */
  playMorph: () => void;
  /** The validated capture plan (buildCapturePlan). */
  plan: CapturePlan;
  /**
   * Signal FormaVisionCanvas to switch frameloop to "always" for the duration of the
   * recording (additive prop wiring) and back to demand when done. The clip surface
   * implements this by flipping the frameloopMode prop.
   */
  setFrameloopAlways: (always: boolean) => void;
}

export interface RecordCanvasResult {
  /** The encoded WebM blob (video/webm). */
  blob: Blob;
  /** The mime type actually used. */
  mimeType: string;
}

/**
 * EXECUTION-GATED: records the live avatar canvas to a WebM blob via
 * MediaRecorder(canvas.captureStream()).
 *
 * Caller MUST have checked canSupportOnDeviceEncode(tier) === true first; otherwise it
 * rejects (never fabricates a blob). No dependency: uses only window.MediaRecorder and
 * HTMLCanvasElement.captureStream.
 *
 * Flow:
 *   1. Flip frameloop to "always" so captureStream emits every painted frame.
 *   2. captureStream(fps) -> MediaRecorder with the first supported WebM mime.
 *   3. Start the recorder, drive the morph play, hold the tail, then stop.
 *   4. Assemble the chunks into a video/webm Blob and restore frameloop to demand.
 *
 * This function is NOT covered by the node test suite (it needs a real GL canvas +
 * MediaRecorder). It is validated on a real desktop / Android device.
 */
export async function recordCanvasToWebM(
  options: RecordCanvasOptions,
): Promise<RecordCanvasResult> {
  const { canvas, playMorph, plan, setFrameloopAlways } = options;

  const win = window as unknown as {
    MediaRecorder?: MediaRecorderCtor & { isTypeSupported?: (m: string) => boolean };
  };
  const RecorderCtor = win.MediaRecorder;
  if (typeof RecorderCtor !== 'function') {
    throw new Error('MediaRecorder is unavailable; caller must serve the static-card fallback.');
  }

  const isSupported =
    typeof RecorderCtor.isTypeSupported === 'function'
      ? (m: string) => RecorderCtor.isTypeSupported!(m)
      : () => true;
  const mimeType = pickWebmMimeType(isSupported);
  if (!mimeType) {
    throw new Error('No supported WebM mime type; caller must serve the static-card fallback.');
  }

  const captureCapable = canvas as unknown as {
    captureStream?: (fps?: number) => MediaStream;
  };
  if (typeof captureCapable.captureStream !== 'function') {
    throw new Error('canvas.captureStream is unavailable; caller must serve the static-card fallback.');
  }

  const stream = captureCapable.captureStream(plan.fps);
  const recorder = new RecorderCtor(stream, { mimeType });
  const chunks: Blob[] = [];

  return new Promise<RecordCanvasResult>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) => {
      setFrameloopAlways(false);
      reject(event instanceof Error ? event : new Error('MediaRecorder error during clip encode.'));
    };
    recorder.onstop = () => {
      setFrameloopAlways(false);
      resolve({ blob: new Blob(chunks, { type: 'video/webm' }), mimeType });
    };

    try {
      // 1. Force a continuous frameloop so captureStream emits every morph frame.
      setFrameloopAlways(true);
      // 2. Start recording, then drive the morph play (the existing PLAY path).
      recorder.start();
      playMorph();
      // 3. Stop after the full play plus the hold tail. A single timer (not a frame
      //    loop) keeps this deterministic relative to the known play length.
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, plan.totalDurationMs);
    } catch (err) {
      setFrameloopAlways(false);
      reject(err instanceof Error ? err : new Error('Failed to start the clip encode.'));
    }
  });
}
