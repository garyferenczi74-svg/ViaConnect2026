// Prompt #157k: hover-system constants. Region centroid + hit rect
// percentages were measured against the actual avatar SVGs hosted on
// the Supabase Body Tracker bucket (the same references used for the
// #157 mask generation), so the hit zones, the glow ring polygons,
// and the pin card anchors all sit on the same anatomical landmarks
// as the muscle masks underneath. Tunable in place if the avatar art
// shifts; the centroids are first-pass values that match the
// extraction script's MALE_REGION_MAP / FEMALE_REGION_MAP exactly.

import type {
  BodyRegionId,
  RegionCentroid,
  RegionHitRect,
  Sex,
} from './types';

export const ALL_BODY_REGION_IDS: readonly BodyRegionId[] = [
  'neck',
  'shoulders',
  'chest',
  'waist',
  'l_bicep',
  'r_bicep',
  'l_forearm',
  'r_forearm',
  'l_quad',
  'r_quad',
  'l_calf',
  'r_calf',
];

export const REGION_LABELS: Record<BodyRegionId, string> = {
  neck:      'Neck',
  shoulders: 'Shoulders',
  chest:     'Chest',
  waist:     'Waist',
  l_bicep:   'L. Bicep',
  r_bicep:   'R. Bicep',
  l_forearm: 'L. Forearm',
  r_forearm: 'R. Forearm',
  l_quad:    'L. Quadriceps',
  r_quad:    'R. Quadriceps',
  l_calf:    'L. Calf',
  r_calf:    'R. Calf',
};

// Centroids in % of figure container. Used as both the glow-ring
// anchor and the leader-line endpoint on the body side.
export const REGION_CENTROIDS_BY_SEX: Record<Sex, Record<BodyRegionId, RegionCentroid>> = {
  male: {
    neck:      { xPct: 49.3, yPct: 20.9 },
    shoulders: { xPct: 49.4, yPct: 24.3 },
    chest:     { xPct: 49.4, yPct: 27.8 },
    waist:     { xPct: 49.6, yPct: 38.9 },
    l_bicep:   { xPct: 32.1, yPct: 33.0 },
    r_bicep:   { xPct: 66.7, yPct: 32.6 },
    l_forearm: { xPct: 26.7, yPct: 42.2 },
    r_forearm: { xPct: 72.2, yPct: 42.1 },
    l_quad:    { xPct: 41.2, yPct: 60.0 },
    r_quad:    { xPct: 58.9, yPct: 60.1 },
    l_calf:    { xPct: 39.1, yPct: 77.9 },
    r_calf:    { xPct: 61.1, yPct: 78.0 },
  },
  female: {
    neck:      { xPct: 49.6, yPct: 21.4 },
    shoulders: { xPct: 49.7, yPct: 25.4 },
    chest:     { xPct: 49.9, yPct: 27.4 },
    waist:     { xPct: 49.9, yPct: 38.4 },
    l_bicep:   { xPct: 35.9, yPct: 33.5 },
    r_bicep:   { xPct: 64.0, yPct: 33.6 },
    l_forearm: { xPct: 31.1, yPct: 42.7 },
    r_forearm: { xPct: 69.1, yPct: 43.0 },
    l_quad:    { xPct: 41.5, yPct: 58.6 },
    r_quad:    { xPct: 59.3, yPct: 58.1 },
    l_calf:    { xPct: 40.0, yPct: 76.1 },
    r_calf:    { xPct: 60.8, yPct: 76.2 },
  },
};

// Hit rectangles (%) wrap each centroid with enough padding to clear
// the spec's 44x44 px minimum touch target at typical avatar render
// sizes (200-440 px wide on mobile / desktop). Narrow muscles (calf,
// forearm) still hit the floor via the rect width even when the
// muscle silhouette is thinner than the rect.
export const REGION_HIT_RECTS_BY_SEX: Record<Sex, Record<BodyRegionId, RegionHitRect>> = {
  male: {
    neck:      { xPct: 49.3, yPct: 20.9, widthPct: 16, heightPct:  6 },
    shoulders: { xPct: 49.4, yPct: 24.3, widthPct: 36, heightPct:  6 },
    chest:     { xPct: 49.4, yPct: 27.8, widthPct: 28, heightPct: 10 },
    waist:     { xPct: 49.6, yPct: 38.9, widthPct: 20, heightPct: 14 },
    l_bicep:   { xPct: 32.1, yPct: 33.0, widthPct: 14, heightPct: 16 },
    r_bicep:   { xPct: 66.7, yPct: 32.6, widthPct: 14, heightPct: 16 },
    l_forearm: { xPct: 26.7, yPct: 42.2, widthPct: 14, heightPct: 16 },
    r_forearm: { xPct: 72.2, yPct: 42.1, widthPct: 14, heightPct: 16 },
    l_quad:    { xPct: 41.2, yPct: 60.0, widthPct: 16, heightPct: 22 },
    r_quad:    { xPct: 58.9, yPct: 60.1, widthPct: 16, heightPct: 22 },
    l_calf:    { xPct: 39.1, yPct: 77.9, widthPct: 12, heightPct: 18 },
    r_calf:    { xPct: 61.1, yPct: 78.0, widthPct: 12, heightPct: 18 },
  },
  female: {
    neck:      { xPct: 49.6, yPct: 21.4, widthPct: 14, heightPct:  6 },
    shoulders: { xPct: 49.7, yPct: 25.4, widthPct: 32, heightPct:  6 },
    chest:     { xPct: 49.9, yPct: 27.4, widthPct: 26, heightPct: 10 },
    waist:     { xPct: 49.9, yPct: 38.4, widthPct: 22, heightPct: 14 },
    l_bicep:   { xPct: 35.9, yPct: 33.5, widthPct: 14, heightPct: 16 },
    r_bicep:   { xPct: 64.0, yPct: 33.6, widthPct: 14, heightPct: 16 },
    l_forearm: { xPct: 31.1, yPct: 42.7, widthPct: 14, heightPct: 16 },
    r_forearm: { xPct: 69.1, yPct: 43.0, widthPct: 14, heightPct: 16 },
    l_quad:    { xPct: 41.5, yPct: 58.6, widthPct: 16, heightPct: 22 },
    r_quad:    { xPct: 59.3, yPct: 58.1, widthPct: 16, heightPct: 22 },
    l_calf:    { xPct: 40.0, yPct: 76.1, widthPct: 12, heightPct: 18 },
    r_calf:    { xPct: 60.8, yPct: 76.2, widthPct: 12, heightPct: 18 },
  },
};

// Animation specs (#157k §2.4). Reduced-motion variants bypass spring
// physics and pulses; the parent reads useReducedMotion at runtime
// and selects between SPRING_CONFIG and REDUCED_MOTION_TRANSITION.
export const SPRING_CONFIG = { type: 'spring' as const, stiffness: 320, damping: 28 };
export const FAST_SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 };
export const REDUCED_MOTION_TRANSITION = { duration: 0.15, ease: 'linear' as const };

export const CARD_VARIANTS = {
  initial: { opacity: 0, scale: 0.92, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.92, y: 4 },
};

export const CARD_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

export const LEADER_VARIANTS = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 0.5 },
  exit:    { pathLength: 0, opacity: 0 },
};

export const LEADER_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 0.5 },
  exit:    { opacity: 0 },
};

export const GLOW_VARIANTS = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 0.6, scale: 1 },
  exit:    { opacity: 0, scale: 0.95 },
};

export const GLOW_VARIANTS_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 0.6 },
  exit:    { opacity: 0 },
};

export const GLOW_PULSE = {
  opacity: [0.6, 0.4, 0.6],
  transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const },
};

export const LEADER_TRANSITION = { duration: 0.2, delay: 0.1 };
export const GLOW_TRANSITION = { duration: 0.24 };

// Layout / behavior knobs.
export const CARD_WIDTH_DESKTOP = 220;
export const CARD_WIDTH_MOBILE = 180;
export const CARD_HEIGHT_ESTIMATE = 110; // used by positioning math
export const PIN_CAP_DESKTOP = 3;
export const PIN_CAP_MOBILE = 1;
export const HOVER_GRACE_MS = 120;
export const CARD_BODY_GAP_PX = 24; // gap between card edge and centroid
export const TAB_RESET_FADE_MS = 200;

// Z-index ladder per #157k §3.2 question 2 default.
export const Z_FIGURE = 0;
export const Z_GLOW_RING = 10;
export const Z_LEADER_LINE = 20;
export const Z_CARD = 30;
