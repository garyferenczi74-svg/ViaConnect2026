// =============================================================================
// Regional fat distribution: pure, I/O-free service.
// ViaConnect Prompt #169e(a), Sections 4.4 / 4.x. Phase 1 regional composition
// overlay (ADDITIVE on the existing Body Composition Avatar).
// =============================================================================
//
// WHAT THIS DOES
//   Given (1) a distribution PATTERN (male / female / averaged, resolved from
//   biological sex or an explicit user choice), (2) the whole-body fat_mass_kg
//   from the body_scan_composition row, and (3) per-REGION VOLUME, it computes:
//     - per-region ESTIMATED fat mass = regionShare * wholeBodyFatMassKg,
//     - per-region ADIPOSITY DENSITY  = regionFatMass / regionVolume,
//   then maps each region to a color by interpolating Teal (#2DA5A0, lowest) to
//   Orange (#B75E18, highest) in HSL space, interpolated against the USER'S OWN
//   observed min/max region density (so a low-overall-fat user still gets useful
//   internal contrast).
//
// REGION VOLUME SOURCE (honest framing, no SMPL)
//   There are NO SMPL / SMPL-X params in this avatar. The avatar is a custom
//   primitive-parametric mannequin (see avatarMeshGenerator.ts). Region volume is
//   therefore derived from the EXISTING avatar SEGMENT geometry: each segment is
//   an ellipsoid (scaled sphere) or a cylinder, sized from the user's own
//   measurements, and we sum the analytic primitive volumes per region. The
//   cylinder height convention mirrors AvatarThreeScene exactly (a cylinder's
//   radii are [rTop, rBottom, halfLength], so its rendered height = halfLength*2),
//   so the volume used here matches the mesh the user sees.
//
// SEGMENT -> REGION MAP (Section 4.4)
//   torso                 -> trunk
//   head, neck            -> head_neck
//   upper_arm, forearm    -> arms      (hands fold into arms)
//   thigh, calf           -> legs      (feet fold into legs)
//   joint / hand / foot   -> mapped by the nearest owning region (see below)
//
// PURITY: no React, no Three, no Supabase, no DOM. Fully unit-tested.
// =============================================================================

import {
  type BodyRegion,
  type DistributionPattern,
  type RegionalRatioSet,
  BODY_REGIONS,
  ratiosForPattern,
} from './regional-distribution-ratios';

// ---------------------------------------------------------------------------
// Color anchors (Section 4.x). Teal = lowest adiposity density, Orange = highest.
// ---------------------------------------------------------------------------

/** Lowest-density anchor. Teal #2DA5A0. */
export const TEAL_HEX = '#2DA5A0';
/** Highest-density anchor. Orange #B75E18. */
export const ORANGE_HEX = '#B75E18';

// ---------------------------------------------------------------------------
// Minimal segment shape the service needs (a structural subset of
// AvatarSegmentSpec, redeclared here so this pure module does not import the
// Three/React-adjacent avatar module).
// ---------------------------------------------------------------------------

export type SegmentKind =
  | 'head'
  | 'neck'
  | 'torso'
  | 'upper_arm'
  | 'forearm'
  | 'thigh'
  | 'calf'
  | 'hand'
  | 'foot'
  | 'joint';

export interface RegionVolumeSegment {
  kind: SegmentKind;
  /** Ellipsoid radii [rx, ry, rz], or cylinder [rTop, rBottom, halfLength]. */
  radii: [number, number, number];
}

/**
 * Map a segment kind to the region it contributes to. 'joint' is a connective
 * sphere with no single owner; it folds into the trunk (its dominant location is
 * shoulder/hip girdle) so its small volume is never dropped. Hands fold into
 * arms, feet into legs.
 */
export function regionForKind(kind: SegmentKind): BodyRegion {
  switch (kind) {
    case 'torso':
    case 'joint':
      return 'trunk';
    case 'head':
    case 'neck':
      return 'head_neck';
    case 'upper_arm':
    case 'forearm':
    case 'hand':
      return 'arms';
    case 'thigh':
    case 'calf':
    case 'foot':
      return 'legs';
    default:
      return 'trunk';
  }
}

/** The geometric primitive a kind renders as (mirrors AvatarThreeScene). */
function isCylinderKind(kind: SegmentKind): boolean {
  return (
    kind === 'neck' ||
    kind === 'upper_arm' ||
    kind === 'forearm' ||
    kind === 'thigh' ||
    kind === 'calf'
  );
}

/**
 * Analytic volume of one segment primitive, in cubic avatar units. Ellipsoids
 * use V = (4/3) * pi * rx * ry * rz; cylinders use V = pi * rAvg^2 * height,
 * where rAvg averages the top/bottom radii and height = halfLength * 2 (the same
 * `rz * 2` the renderer feeds CylinderGeometry). Negative/NaN radii are treated
 * as 0 so a malformed segment cannot poison the sum.
 */
export function segmentVolume(seg: RegionVolumeSegment): number {
  const [a, b, c] = seg.radii.map((r) => (Number.isFinite(r) && r > 0 ? r : 0)) as [
    number,
    number,
    number,
  ];
  if (isCylinderKind(seg.kind)) {
    const rAvg = (a + b) / 2;
    const height = c * 2;
    return Math.PI * rAvg * rAvg * height;
  }
  // Ellipsoid (head, torso, hand, foot, joint).
  return (4 / 3) * Math.PI * a * b * c;
}

/** Per-region summed volume map (cubic avatar units). */
export type RegionVolumeMap = Record<BodyRegion, number>;

/** Sum segment volumes into the four regions. */
export function computeRegionVolumes(
  segments: readonly RegionVolumeSegment[],
): RegionVolumeMap {
  const volumes: RegionVolumeMap = {
    trunk: 0,
    arms: 0,
    legs: 0,
    head_neck: 0,
  };
  for (const seg of segments) {
    volumes[regionForKind(seg.kind)] += segmentVolume(seg);
  }
  return volumes;
}

// ---------------------------------------------------------------------------
// Per-region fat mass + density
// ---------------------------------------------------------------------------

export interface RegionDistributionEntry {
  region: BodyRegion;
  /** Share of whole-body fat apportioned to this region (the ratio constant). */
  share: number;
  /** Estimated fat mass in this region, kg (share * wholeBodyFatMassKg). */
  fatMassKg: number;
  /** Region volume in cubic avatar units (from segment geometry). */
  volume: number;
  /** Adiposity density = fatMassKg / volume (0 when volume is 0). */
  density: number;
}

export type RegionDistribution = Record<BodyRegion, RegionDistributionEntry>;

/**
 * Compute per-region estimated fat mass + adiposity density.
 *
 * @param wholeBodyFatMassKg total fat mass from body_scan_composition.fat_mass_kg
 * @param ratios            the sex-banded share set (see ratiosForPattern)
 * @param volumes           per-region volume from computeRegionVolumes
 *
 * Pure + total. A zero/negative/NaN volume yields density 0 for that region
 * (avoids divide-by-zero); a missing/NaN fat mass is treated as 0.
 */
export function computeRegionDistribution(
  wholeBodyFatMassKg: number,
  ratios: RegionalRatioSet,
  volumes: RegionVolumeMap,
): RegionDistribution {
  const totalFat =
    Number.isFinite(wholeBodyFatMassKg) && wholeBodyFatMassKg > 0
      ? wholeBodyFatMassKg
      : 0;

  const out = {} as RegionDistribution;
  for (const region of BODY_REGIONS) {
    const share = ratios[region];
    const fatMassKg = share * totalFat;
    const volume = Number.isFinite(volumes[region]) && volumes[region] > 0 ? volumes[region] : 0;
    const density = volume > 0 ? fatMassKg / volume : 0;
    out[region] = { region, share, fatMassKg, volume, density };
  }
  return out;
}

// ---------------------------------------------------------------------------
// User-own-range color interpolation (Teal -> Orange in HSL)
// ---------------------------------------------------------------------------

interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

/** Parse a #rrggbb hex string to HSL. */
export function hexToHsl(hex: string): HSL {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

const TEAL_HSL = hexToHsl(TEAL_HEX);
const ORANGE_HSL = hexToHsl(ORANGE_HEX);

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate Teal -> Orange in HSL by a normalized t in [0, 1]. t=0 returns
 * exactly the Teal anchor, t=1 the Orange anchor. Hue is interpolated along the
 * short arc; for the teal(~177deg) -> orange(~26deg) anchors that is the direct
 * descending path through green/yellow, matching the existing heatmap's warm
 * ramp. Returns an `hsl(...)` string (ASCII only).
 */
export function lerpTealToOrange(t: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  // Short-arc hue interpolation.
  let dh = ORANGE_HSL.h - TEAL_HSL.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  let h = TEAL_HSL.h + dh * clamped;
  if (h < 0) h += 360;
  if (h >= 360) h -= 360;
  const s = lerp(TEAL_HSL.s, ORANGE_HSL.s, clamped);
  const l = lerp(TEAL_HSL.l, ORANGE_HSL.l, clamped);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Normalize one value against an observed [min, max] range to [0, 1].
 *
 * DEGENERATE RANGE SAFETY: when max <= min (every region identical, a single
 * region, or zeroed volumes), there is no internal contrast to show, so every
 * region maps to the MIDPOINT (0.5) rather than slamming all to Teal or Orange.
 * A midpoint reads as "no meaningful regional difference detected", which is the
 * honest signal for a degenerate range.
 */
export function normalizeToOwnRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0.5;
  if (max <= min) return 0.5;
  const t = (value - min) / (max - min);
  return Math.max(0, Math.min(1, t));
}

/** Per-region color map the avatar consumes (CSS hsl strings). */
export type RegionColorMap = Record<BodyRegion, string>;

/**
 * Build the per-region color map from a computed distribution, interpolating
 * each region's density against the USER'S OWN min/max region density. The
 * lowest-density region is Teal, the highest is Orange, midpoints blend.
 */
export function regionColorsFromDistribution(dist: RegionDistribution): RegionColorMap {
  const densities = BODY_REGIONS.map((r) => dist[r].density);
  const min = Math.min(...densities);
  const max = Math.max(...densities);
  const out = {} as RegionColorMap;
  for (const region of BODY_REGIONS) {
    const t = normalizeToOwnRange(dist[region].density, min, max);
    out[region] = lerpTealToOrange(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// End-to-end convenience: segments + composition + pattern -> result
// ---------------------------------------------------------------------------

export interface RegionalOverlayResult {
  pattern: DistributionPattern;
  distribution: RegionDistribution;
  colors: RegionColorMap;
}

/**
 * Full pipeline used by the avatar overlay: resolve ratios for the pattern, sum
 * region volumes from the avatar segments, compute per-region fat mass + density,
 * and derive the user-own-range color map. Pure + total.
 */
export function computeRegionalOverlay(params: {
  pattern: DistributionPattern;
  wholeBodyFatMassKg: number;
  segments: readonly RegionVolumeSegment[];
}): RegionalOverlayResult {
  const ratios = ratiosForPattern(params.pattern);
  const volumes = computeRegionVolumes(params.segments);
  const distribution = computeRegionDistribution(params.wholeBodyFatMassKg, ratios, volumes);
  const colors = regionColorsFromDistribution(distribution);
  return { pattern: params.pattern, distribution, colors };
}

// ---------------------------------------------------------------------------
// Pattern selection (Section 5.1)
// ---------------------------------------------------------------------------

export type SexInput = 'male' | 'female';

/**
 * The distribution pattern a user's overlay should use, given (a) any explicit
 * user choice (the non-binary / intersex / prefer-not-to-say pattern picker, or
 * the transgender-HRT picker), and (b) their resolved biological sex.
 *
 * Resolution order:
 *   1. an explicit chosen pattern wins (male / female / averaged),
 *   2. else the biological sex maps to its sex-typical pattern,
 *   3. else 'averaged' (the sex-neutral default).
 *
 * Pure + total. This never reads or writes anything; the caller supplies the
 * already-resolved sex + stored choice.
 */
export function resolveDistributionPattern(params: {
  chosenPattern?: DistributionPattern | null;
  sex?: SexInput | null;
}): DistributionPattern {
  if (
    params.chosenPattern === 'male' ||
    params.chosenPattern === 'female' ||
    params.chosenPattern === 'averaged'
  ) {
    return params.chosenPattern;
  }
  if (params.sex === 'male') return 'male';
  if (params.sex === 'female') return 'female';
  return 'averaged';
}

// ---------------------------------------------------------------------------
// Overlay suppression decision (Section 5)
// ---------------------------------------------------------------------------

/**
 * The body-image safeguard posture the overlay respects (Section 5.4). Mirrors
 * the disordered-eating response semantics: a CURRENT history hides the overlay
 * by default (opt-in), a PAST history shows it by default (with a disable
 * option), and everything else shows it normally.
 */
export type SafeguardMode = 'current_de_history' | 'past_de_history' | 'none';

export interface OverlaySuppressionInput {
  /** False when the whole-body composition is missing or low-confidence (5.6). */
  hasReliableComposition: boolean;
  /** True during pregnancy / within 6 months postpartum (5.3). */
  isPregnancyWindow?: boolean;
  /** True when the user has explicitly opted INTO the overlay (5.3 / 5.4). */
  userOptedIn?: boolean;
  /** Body-image safeguard posture (5.4). */
  safeguardMode?: SafeguardMode;
}

/** Why the overlay is suppressed (for UI copy + analytics, never user-blaming). */
export type SuppressionReason =
  | null
  | 'missing_composition'
  | 'pregnancy_window'
  | 'safeguard_current_de';

export interface OverlaySuppressionResult {
  /** Whether the overlay may render its colors at all. */
  suppressed: boolean;
  reason: SuppressionReason;
  /** Whether an opt-in affordance should be offered for this suppression. */
  offerOptIn: boolean;
}

/**
 * Decide whether the regional overlay is suppressed for a given scan + user, and
 * why. Precedence (most protective first):
 *   1. missing / low-confidence whole-body composition -> HARD suppress, no
 *      opt-in (there is no reliable fat mass to apportion; 5.6),
 *   2. pregnancy window -> suppress unless the user opted in (5.3),
 *   3. current disordered-eating history -> suppress unless the user opted in
 *      (5.4),
 *   4. otherwise -> shown (past history shows by default with a disable option,
 *      which is the normal "shown" state plus the always-available toggle).
 *
 * Pure + total. Fail-safe: unknown safeguard values are treated as 'none'.
 */
export function decideOverlaySuppression(
  input: OverlaySuppressionInput,
): OverlaySuppressionResult {
  if (!input.hasReliableComposition) {
    return { suppressed: true, reason: 'missing_composition', offerOptIn: false };
  }
  if (input.isPregnancyWindow && !input.userOptedIn) {
    return { suppressed: true, reason: 'pregnancy_window', offerOptIn: true };
  }
  if (input.safeguardMode === 'current_de_history' && !input.userOptedIn) {
    return { suppressed: true, reason: 'safeguard_current_de', offerOptIn: true };
  }
  return { suppressed: false, reason: null, offerOptIn: false };
}
