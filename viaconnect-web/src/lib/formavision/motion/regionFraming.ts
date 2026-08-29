// Region to camera-framing map for the FormaVision avatar (Prompt 210b, P2-T3).
//
// When a body part is selected the camera eases to frame that region: it raises or
// lowers its orbit target to the region's height along the body and pulls in to a
// comfortable distance so the region fills the frame. Clearing the selection eases
// back to the full-body framing. This file is the single, pure source of those
// numbers, keyed by the same region ids the geometry rings use (neck, chest, waist,
// hip, thigh, calf, arm), so the camera response stays in step with the body model.
//
// Heights are in the body's own meter space (floor at y = 0, target lifted toward
// the region center). Distances are in the same units the OrbitControls min/max
// clamp uses, and every entry sits inside that clamp so a framing move never fights
// the zoom constraint. An unknown region falls back to FULL_BODY_FRAMING rather than
// crashing, so a future picker that emits an unmapped key degrades gracefully.

export interface CameraFraming {
  // Orbit target height along the body in meters (floor at 0).
  targetY: number;
  // Camera distance from the target, inside the OrbitControls min/max clamp.
  distance: number;
}

// Vertical FOV of the FormaVision perspective camera. Keep this in lockstep with
// `camera={{ fov }}` in FormaVisionCanvas — framing math uses this value.
export const AVATAR_VERTICAL_FOV_DEG = 30;

// World-meters visible vertically at `distance` with the avatar perspective FOV.
export function visibleHeightMeters(
  distance: number,
  fovDeg: number = AVATAR_VERTICAL_FOV_DEG,
): number {
  return 2 * distance * Math.tan((fovDeg * Math.PI) / 360);
}

// Default resting framing: mid-body target, pulled back so a 1.75m male mesh
// (plus head stack) fits head-to-toe with margin. Distance 3.2 at 30° FOV only
// shows ~1.72m — that is a bust crop. Stay well above region close-ups (~2.6).
export const FULL_BODY_FRAMING: CameraFraming = { targetY: 0.88, distance: 4.2 };

// Per-region framing. targetY rises up the body from foot to crown; distance pulls
// in closer than the full-body default so the region reads large. Aliases map the
// picker's likely synonyms onto one canonical entry.
const REGION_FRAMING: Record<string, CameraFraming> = {
  neck: { targetY: 1.45, distance: 2.4 },
  chest: { targetY: 1.25, distance: 2.6 },
  shoulder: { targetY: 1.32, distance: 2.6 },
  waist: { targetY: 1.0, distance: 2.5 },
  navelwaist: { targetY: 1.0, distance: 2.5 },
  lowwaist: { targetY: 0.95, distance: 2.5 },
  hip: { targetY: 0.9, distance: 2.6 },
  glute: { targetY: 0.88, distance: 2.6 },
  thigh: { targetY: 0.65, distance: 2.5 },
  knee: { targetY: 0.5, distance: 2.4 },
  calf: { targetY: 0.35, distance: 2.4 },
  ankle: { targetY: 0.12, distance: 2.3 },
  arm: { targetY: 1.05, distance: 2.6 },
  bicep: { targetY: 1.15, distance: 2.5 },
  forearm: { targetY: 0.95, distance: 2.5 },
};

// Normalize a selection key to a region map key: lowercase, drop a leading side
// prefix (r / l) and common suffixes so 'rThigh', 'lThigh' and 'thigh' all match.
function normalizeRegionKey(region: string): string {
  let key = region.trim().toLowerCase();
  // Strip a single leading side letter when followed by another letter (rThigh).
  if ((key.startsWith('r') || key.startsWith('l')) && key.length > 1) {
    const rest = key.slice(1);
    if (REGION_FRAMING[rest]) {
      key = rest;
    }
  }
  return key;
}

// Resolve a selection to a framing. A null selection or an unknown region returns
// the full-body default so the camera always has a safe place to go.
export function framingForRegion(region: string | null | undefined): CameraFraming {
  if (!region) {
    return FULL_BODY_FRAMING;
  }
  const key = normalizeRegionKey(region);
  return REGION_FRAMING[key] ?? FULL_BODY_FRAMING;
}
