// Capability probe for the initial render tier (Prompt 210b, P7-T1).
//
// decideInitialTier is a PURE function of device signals; probeRenderTier is the
// thin, SSR-safe wrapper that gathers those signals from the browser. The probe
// only ever returns a 3D tier ('cinematic' | 'lite'); choosing the 2D floor is the
// existing WebGL-unavailable / render-error path (hasWebGL + onRenderError), not a
// probe outcome.
//
// Conservative by design: a wrong 'lite' guess is permanent for the session (the
// runtime ladder never steps UP), whereas a too-optimistic 'cinematic' guess is
// backstopped by the runtime frame-budget monitor (which steps DOWN). So 'lite' is
// chosen only on a strong single low-power signal (software renderer, or very low
// memory) or two corroborating weak ones (a touch device that is also memory- or
// core-constrained). Anything unknown stays 'cinematic'.

import type { CapabilitySignals, RenderTier3D } from './types';

// A device with this much memory (GiB) or less is treated as low-power on its own.
export const LOW_MEMORY_GB_STRONG = 2;
// With a coarse pointer (touch device), this much memory (GiB) or less is low-power.
export const LOW_MEMORY_GB_COMBINED = 4;
// With a coarse pointer (touch device), this many cores or fewer is low-power.
export const LOW_CORE_COUNT_COMBINED = 4;

// Lowercased substrings of WebGL UNMASKED_RENDERER values that denote software
// rasterizers or known very-low-power drivers. Software rendering cannot sustain the
// cinematic geometry, so any match is a strong single signal for 'lite'.
export const LOW_POWER_RENDERER_HINTS: readonly string[] = [
  'swiftshader', // Chromium software WebGL
  'llvmpipe', // Mesa software rasterizer
  'softpipe', // Mesa software rasterizer
  'basic render', // "Microsoft Basic Render Driver"
  'microsoft basic',
];

// Pure decision. Deterministic: identical signals always yield the identical tier.
export function decideInitialTier(signals: CapabilitySignals): RenderTier3D {
  const { deviceMemory, hardwareConcurrency, coarsePointer, rendererString } = signals;

  // Strong single signal: a software / very-low-power renderer.
  if (rendererString) {
    const renderer = rendererString.toLowerCase();
    for (const hint of LOW_POWER_RENDERER_HINTS) {
      if (renderer.includes(hint)) {
        return 'lite';
      }
    }
  }

  // Strong single signal: very little memory.
  if (typeof deviceMemory === 'number' && deviceMemory <= LOW_MEMORY_GB_STRONG) {
    return 'lite';
  }

  // Combined signals: a touch device that is also memory- or core-constrained. A
  // coarse pointer alone is not enough (high-end phones and tablets handle
  // cinematic), so it must be paired with a low memory or core count.
  if (coarsePointer === true) {
    if (typeof deviceMemory === 'number' && deviceMemory <= LOW_MEMORY_GB_COMBINED) {
      return 'lite';
    }
    if (
      typeof hardwareConcurrency === 'number' &&
      hardwareConcurrency <= LOW_CORE_COUNT_COMBINED
    ) {
      return 'lite';
    }
  }

  // Unknown or capable: take the full path; the runtime monitor backstops a bad guess.
  return 'cinematic';
}

// Best-effort, one-time read of the unmasked WebGL renderer string. Builds a
// throwaway canvas / context (like hasWebGL) and releases it via WEBGL_lose_context
// in a finally block (M1 fix, P7-T2) so low-end devices that cap live contexts
// reclaim the slot immediately instead of relying on GC. Any failure (no DOM, no
// context, the debug extension blocked) yields undefined and never throws, so a
// probe failure can never crash the caller.
//
// Exported so the M1 context-release behavior can be unit-tested with a mocked gl.
export function readRendererString(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  let gl: WebGLRenderingContext | null = null;
  try {
    const canvas = document.createElement('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') {
      return undefined;
    }
    gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      return undefined;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) {
      return undefined;
    }
    // getParameter is typed as returning any in the DOM lib; widen to unknown so no
    // any leaks into this module, then narrow to a string.
    const value: unknown = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  } finally {
    // Release the throwaway context immediately so it does not hold a live WebGL
    // slot until the next GC cycle. Low-end devices cap the number of live contexts
    // (commonly 8-16), so freeing proactively prevents a surprise context-lost event
    // on the REAL avatar canvas that mounts shortly after.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

// Gather the capability signals from the current environment. SSR-safe: with no
// navigator (server / node test runner) it returns an empty signal set, which the
// pure decision resolves to the safe 'cinematic' default.
export function readCapabilitySignals(): CapabilitySignals {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const signals: CapabilitySignals = {};

  if (typeof nav.deviceMemory === 'number') {
    signals.deviceMemory = nav.deviceMemory;
  }
  if (typeof nav.hardwareConcurrency === 'number') {
    signals.hardwareConcurrency = nav.hardwareConcurrency;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      signals.coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    } catch {
      // matchMedia can throw on a malformed query in some engines; leave it unset.
    }
  }
  // Do NOT call readRendererString() here. That creates a throwaway WebGL
  // context and immediately loseContext()s it on the same tick the r3f canvas
  // is about to mount. iPhone Safari treats that as a lost-context cooldown
  // and the live FormaVisionCanvas then fails (error boundary -> SVG).
  // Software-renderer lite detection is backstopped by the frame-budget ladder.

  return signals;
}

// The public entry point: probe the environment once and pick the initial 3D tier.
// SSR-safe and fail-safe (unknown signals -> cinematic).
export function probeRenderTier(): RenderTier3D {
  return decideInitialTier(readCapabilitySignals());
}
