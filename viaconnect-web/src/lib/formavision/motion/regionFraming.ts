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
// Brief 60 / Gary F3 lock: rear hero at 35–40°.
export const AVATAR_VERTICAL_FOV_DEG = 38;

export const BRIEF_60_FOV_MIN_DEG = 35;
export const BRIEF_60_FOV_MAX_DEG = 40;

export function isBrief60AvatarFov(fovDeg: number): boolean {
  return fovDeg >= BRIEF_60_FOV_MIN_DEG && fovDeg <= BRIEF_60_FOV_MAX_DEG;
}

// Orbit distance clamp shared with FormaVisionCanvas OrbitControls.
export const ORBIT_DISTANCE_MIN = 2.2;
export const ORBIT_DISTANCE_MAX = 4.5;

// Body faces +Z. 148° azimuth is a rear three-quarter A-pose (behind-right),
// matching the ZOZO Default Mesh hero crop. Front (θ=0) is out of the hero.
export const FULL_BODY_AZIMUTH_RAD = (148 * Math.PI) / 180;

// World-meters visible vertically at `distance` with the avatar perspective FOV.
export function visibleHeightMeters(
  distance: number,
  fovDeg: number = AVATAR_VERTICAL_FOV_DEG,
): number {
  return 2 * distance * Math.tan((fovDeg * Math.PI) / 360);
}

// Default camera position for the hero: ¾ rear, same height as the orbit target.
export function fullBodyCameraPosition(
  framing: CameraFraming = FULL_BODY_FRAMING,
  azimuthRad: number = FULL_BODY_AZIMUTH_RAD,
): [number, number, number] {
  return [
    Math.sin(azimuthRad) * framing.distance,
    framing.targetY,
    Math.cos(azimuthRad) * framing.distance,
  ];
}

// Brief 60 hero: mid-torso target, pulled in so a 1.75m male mesh crops at
// the ankles at 38° FOV (same visible height as the old 3.42m @ 30° crop).
// Phase 0 4.2m showed empty floor. Stay inside the orbit clamp.
export const FULL_BODY_FRAMING: CameraFraming = { targetY: 1.0, distance: 2.72 };

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
