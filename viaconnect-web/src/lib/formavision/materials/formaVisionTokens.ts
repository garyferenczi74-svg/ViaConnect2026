// FormaVision color tokens (Prompt 210b, task P1-T3).
//
// The single source of truth for the four colors the wireframe glow look is
// allowed to use. Hex strings are the canonical brand values; the linear-space
// THREE.Color objects are what the shader uniforms consume. No other color may
// be introduced into the material system.

import * as THREE from 'three';

// Canonical brand hex values. Do not add to or change these without a token
// decision: the visual identity is locked to exactly these four.
export const FORMA_VISION_HEX = {
  // Deep Navy: the scene canvas and the body fill base.
  navy: '#1A2744',
  // Card: the slightly lighter navy used for surfaces and the fill mid-tone.
  card: '#1E3054',
  // Teal: the primary wireframe glow and fresnel rim.
  teal: '#2DA5A0',
  // Orange: emphasis only (for example a flagged or estimated accent). Not the
  // base wireframe color.
  orange: '#B75E18',
} as const;

export type FormaVisionColorName = keyof typeof FORMA_VISION_HEX;

// Build a THREE.Color from a token hex. Three converts the sRGB hex into its
// working color space on construction, so these are ready to hand straight to a
// uniform.
function tokenColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// Pre-built THREE.Color instances for each token. A fresh object is returned by
// the factory below per material so two materials never share a mutable Color;
// these constants are convenient for tests and read-only callers.
export const FORMA_VISION_COLORS = {
  navy: tokenColor(FORMA_VISION_HEX.navy),
  card: tokenColor(FORMA_VISION_HEX.card),
  teal: tokenColor(FORMA_VISION_HEX.teal),
  orange: tokenColor(FORMA_VISION_HEX.orange),
} as const;

// Factory that yields a brand-new THREE.Color for a token, so each material owns
// its own uniform color object.
export function makeTokenColor(name: FormaVisionColorName): THREE.Color {
  return tokenColor(FORMA_VISION_HEX[name]);
}
