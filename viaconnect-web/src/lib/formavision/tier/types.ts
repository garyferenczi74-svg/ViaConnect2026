// Shared types for the FormaVision render-tier ladder (Prompt 210b, P7-T1).
//
// The avatar already maps the two 3D tiers to geometry density (TIER_BUILD in
// FormaVisionCanvas). This phase adds the SELECTION of the active tier and a
// runtime step-down that can fall past the two 3D tiers to the existing 2D floor.

// The full ladder the provider walks. '2d' is not a 3D density; it is the handoff
// to the existing 2D SegmentalHeatMap floor (reached via the same fellBack path the
// WebGL gate and the render-error boundary use). cinematic -> lite -> 2d, sticky.
export type RenderTier = 'cinematic' | 'lite' | '2d';

// The two tiers the avatar actually renders in 3D. The capability probe only ever
// returns one of these; 2D is never an initial choice, only a runtime step-down or
// the existing WebGL-unavailable / render-error fallback.
export type RenderTier3D = 'cinematic' | 'lite';

// Device capability signals fed to the pure probe decision. Every field is optional
// because each is read behind a typeof guard and may be absent (older browsers,
// privacy modes, SSR). Absent signals must never force 'lite'.
export interface CapabilitySignals {
  // navigator.deviceMemory, in GiB (coarse, capped at 8 by Chromium). Undefined on
  // browsers that do not expose it.
  deviceMemory?: number;
  // navigator.hardwareConcurrency: logical CPU core count.
  hardwareConcurrency?: number;
  // matchMedia('(pointer: coarse)').matches: a touch-first device (no fine pointer).
  coarsePointer?: boolean;
  // The unmasked WebGL renderer string (WEBGL_debug_renderer_info), if readable.
  // Used only to spot software rasterizers / known very-low-power GPUs.
  rendererString?: string;
}
