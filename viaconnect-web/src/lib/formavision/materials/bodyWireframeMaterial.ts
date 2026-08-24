// FormaVision wireframe glow material (Prompt 210b, task P1-T3).
//
// makeBodyWireframeMaterial returns a THREE.ShaderMaterial that turns the
// parametric body geometry into the signature look: a dim translucent navy
// solid with a fine cell grain, overlaid with additive teal wireframe edges, a
// view-dependent teal fresnel rim, and a sweepable horizontal scan-line band.
//
// Lighting is deliberately emissive, not lit: there is no light rig. The glow is
// faked entirely inside this one fragment shader (additive lines plus fresnel)
// because the project's package.json is locked and postprocessing bloom is not
// available. The seam where a real bloom pass would attach is marked below.
//
// Wireframe approach: a per-vertex barycentric attribute drives a clean,
// resolution-independent edge factor in the fragment shader (using fwidth so the
// line stays one screen pixel wide at any zoom). This avoids a second wireframe
// geometry pass and avoids depending on UVs for the edges. The geometry from the
// builder stream does not carry the attribute, so addBarycentricAttribute is
// provided to bake it onto a non-indexed clone before this material is used.

import * as THREE from 'three';
import { makeTokenColor, FORMA_VISION_COLORS } from './formaVisionTokens';
import { makeCellTexture } from './cellTexture';

export interface BodyWireframeOptions {
  // Optional pre-built grain texture. When omitted the material builds and owns
  // its own, and dispose() will dispose it. When supplied, the caller owns it.
  cellTexture?: THREE.DataTexture;
  // Tiling of the grain across the UV space.
  cellRepeat?: number;
  // Brightness multiplier on the additive wireframe lines (the fake-bloom knob).
  lineIntensity?: number;
  // Strength of the fresnel rim at the silhouette.
  rimIntensity?: number;
  // Opacity of the dark navy body fill.
  fillOpacity?: number;
}

export interface BodyWireframeMaterial {
  material: THREE.ShaderMaterial;
  uniforms: Record<string, THREE.IUniform>;
  // Move the scan-line band to normalized height yN (0 bottom, 1 top). Pass a
  // value outside 0..1 (the default -1) to hide the band.
  setScan(yN: number): void;
  // Drive a 0..1 reveal or morph progress for the intro animation.
  setMorph(t: number): void;
  // Set the selected-region highlight band: yN is the region's normalized level
  // (pass a value outside 0..1, default -1, to clear it), intensity is the
  // brightening amount, and range is the optional half-height of the soft band.
  setHighlight(yN: number, intensity?: number, range?: number): void;
  // Set the 5 per-segment overlay tints in SEGMENT_INDEX order (right_arm, left_arm,
  // trunk, right_leg, left_leg). Pass the status color for a segment, or null for
  // UNKNOWN, which is neutralized to navy (no guessed tint, no visible shift). Only
  // visible when overlay mix is above 0. Colors are copied into the uniform array.
  setSegmentTints(colors: (THREE.Color | null)[]): void;
  // Cross-fade the overlay in (1) or out (0). At 0 the wireframe is pure teal.
  setOverlayMix(mix: number): void;
  // Screen-space A/B wipe (Brief 2). mode 0 is off (byte-identical to today).
  // mode 1 keeps fragments left of t (baseline); mode 2 keeps fragments right
  // of t (current). viewportWidth is drawing-buffer pixels so gl_FragCoord.x
  // lines up on retina. t is 0..1 from the left edge.
  setWipe(mode: 0 | 1 | 2, t: number, viewportWidth: number): void;
  dispose(): void;
}

const DEFAULT_CELL_REPEAT = 18;
const DEFAULT_LINE_INTENSITY = 1.6;
const DEFAULT_RIM_INTENSITY = 1.0;
const DEFAULT_FILL_OPACITY = 0.55;

// Bake a barycentric coordinate attribute onto a geometry so the fragment shader
// can measure distance to the nearest triangle edge. The geometry must be
// non-indexed (one set of three vertices per triangle); call toNonIndexed first
// if needed. Returns the same geometry for chaining.
export function addBarycentricAttribute(
  geometry: THREE.BufferGeometry,
): THREE.BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const bary = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    // Each triangle's three vertices get (1,0,0), (0,1,0), (0,0,1) in turn.
    const corner = i % 3;
    bary[i * 3 + corner] = 1;
  }
  geometry.setAttribute('aBary', new THREE.BufferAttribute(bary, 3));
  return geometry;
}

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 aBary;
  attribute float segment;

  varying vec3 vBary;
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  varying float vHeightN;
  varying float vSegment;

  uniform vec3 uBoundsMin;
  uniform vec3 uBoundsMax;

  void main() {
    vBary = aBary;
    vUv = uv;
    // All three vertices of a triangle share one segment, so a normal varying
    // interpolates to the same constant value across the face; the fragment rounds
    // it back to an integer index. This avoids needing a flat varying (GLSL ES 3).
    vSegment = segment;
    vViewNormal = normalize(normalMatrix * normal);

    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = viewPos.xyz;

    // Normalized height of this vertex within the model bounds, used by the
    // scan line band. Guard against a zero height range.
    float range = max(uBoundsMax.y - uBoundsMin.y, 1e-5);
    vHeightN = (position.y - uBoundsMin.y) / range;

    gl_Position = projectionMatrix * viewPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec3 vBary;
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  varying float vHeightN;
  varying float vSegment;

  uniform vec3 uTeal;
  uniform vec3 uNavy;
  uniform vec3 uCard;
  uniform sampler2D uCellTexture;
  uniform float uCellRepeat;
  uniform float uLineIntensity;
  uniform float uRimIntensity;
  uniform float uFillOpacity;
  uniform float uScanY;
  uniform float uMorph;
  uniform float uHighlightY;
  uniform float uHighlightRange;
  uniform float uHighlightIntensity;
  uniform vec3 uSegmentTint[5];
  uniform float uOverlayMix;
  uniform float uWipeMode;
  uniform float uWipeT;
  uniform float uViewportWidth;

  // Pick this fragment's segment tint from the 5-entry array by its rounded segment
  // index. GLSL ES 1 forbids dynamic array indexing, so select with a small chain.
  vec3 segmentTint(float segIndex) {
    int s = int(segIndex + 0.5);
    if (s <= 0) return uSegmentTint[0];
    if (s == 1) return uSegmentTint[1];
    if (s == 2) return uSegmentTint[2];
    if (s == 3) return uSegmentTint[3];
    return uSegmentTint[4];
  }

  // Edge factor from the barycentric coordinate. fwidth keeps the line a
  // constant width in screen space regardless of zoom, so edges stay crisp.
  float edgeFactor() {
    vec3 d = fwidth(vBary);
    vec3 a = smoothstep(vec3(0.0), d * 1.5, vBary);
    return 1.0 - min(min(a.x, a.y), a.z);
  }

  void main() {
    // Screen-space A/B wipe. Off when uWipeMode is 0 so the current-body path
    // is unchanged. Baseline (mode 1) keeps the left; current (mode 2) keeps
    // the right. Discard is honest: no blend across the split, no fabricated
    // in-between body.
    if (uWipeMode > 0.5) {
      float nx = gl_FragCoord.x / max(uViewportWidth, 1.0);
      if (uWipeMode < 1.5) {
        if (nx > uWipeT) discard;
      } else {
        if (nx < uWipeT) discard;
      }
    }

    // View direction for fresnel. In view space the eye sits at the origin, so
    // the direction from the surface to the eye is the negated position.
    vec3 viewDir = normalize(-vViewPos);
    vec3 normal = normalize(vViewNormal);
    float facing = abs(dot(normal, viewDir));

    // Dark translucent navy fill, lifted slightly toward the card tone where the
    // surface faces away, so the form reads with depth rather than flat.
    vec3 fill = mix(uNavy, uCard, 1.0 - facing);

    // Cell grain sampled in UV space. It modulates the fill so the body looks
    // like a textured panel instead of empty triangles.
    float grain = texture2D(uCellTexture, vUv * uCellRepeat).r;
    fill += uTeal * grain * 0.06;

    // Additive wireframe edges. The line intensity is the fake-bloom knob: pushing
    // it above 1 lets the lines bloom out toward white at the core. The overlay
    // blends the segment's status tint into the line base by uOverlayMix on the line
    // mask only, so at mix 0 the lines are pure teal (the look is unchanged). A
    // neutral (navy) tint produces no visible shift even at mix 1.
    float edge = edgeFactor();
    vec3 lineBase = mix(uTeal, segmentTint(vSegment), clamp(uOverlayMix, 0.0, 1.0));
    vec3 line = lineBase * edge * uLineIntensity;

    // Teal fresnel rim: brightens at the silhouette where facing approaches 0,
    // so the body separates cleanly from the navy canvas.
    float fresnel = pow(1.0 - facing, 3.0) * uRimIntensity;
    vec3 rim = uTeal * fresnel;

    // Scan line accent: a thin bright horizontal band at normalized height
    // uScanY. When uScanY is outside 0..1 the band contributes nothing.
    float bandWidth = 0.012;
    float band = 0.0;
    if (uScanY >= 0.0 && uScanY <= 1.0) {
      band = smoothstep(bandWidth, 0.0, abs(vHeightN - uScanY));
    }
    vec3 scan = uTeal * band * 1.5;

    // Selected-region highlight: a soft, broad additive teal emphasis centered on
    // uHighlightY (the selected region's normalized level). Wider and gentler than
    // the scan band so it reads as a subtle brightening of the region rather than a
    // line. Off when uHighlightY is outside 0..1 or the intensity is zero. It rides
    // on the wireframe edges so only the lines brighten, keeping it tasteful.
    float highlight = 0.0;
    if (uHighlightY >= 0.0 && uHighlightY <= 1.0) {
      float range = max(uHighlightRange, 1e-4);
      highlight = smoothstep(range, 0.0, abs(vHeightN - uHighlightY)) * uHighlightIntensity;
    }
    vec3 emphasis = uTeal * highlight * (0.6 + edge);

    // Morph reveal: gate the whole body in from the bottom up so the intro can
    // sweep the form into existence. uMorph of 1 reveals everything.
    float reveal = smoothstep(vHeightN - 0.08, vHeightN + 0.02, uMorph);

    vec3 color = fill + line + rim + scan + emphasis;
    float alpha = clamp(uFillOpacity + edge + fresnel + band + highlight * 0.5, 0.0, 1.0);

    color *= reveal;
    alpha *= reveal;

    // BLOOM SEAM: with postprocessing locked, the bright additive lines and the
    // fresnel rim are the only glow. When real bloom is approved later, render
    // this material to an HDR target and add an UnrealBloomPass keyed off the
    // line and rim luminance written here. No code change is needed in this
    // shader to feed that pass.
    gl_FragColor = vec4(color, alpha);
  }
`;

export function makeBodyWireframeMaterial(
  opts: BodyWireframeOptions = {},
): BodyWireframeMaterial {
  const ownsTexture = opts.cellTexture === undefined;
  const cellTexture = opts.cellTexture ?? makeCellTexture();

  const uniforms: Record<string, THREE.IUniform> = {
    uTeal: { value: makeTokenColor('teal') },
    uNavy: { value: makeTokenColor('navy') },
    uCard: { value: makeTokenColor('card') },
    uCellTexture: { value: cellTexture },
    uCellRepeat: { value: opts.cellRepeat ?? DEFAULT_CELL_REPEAT },
    uLineIntensity: { value: opts.lineIntensity ?? DEFAULT_LINE_INTENSITY },
    uRimIntensity: { value: opts.rimIntensity ?? DEFAULT_RIM_INTENSITY },
    uFillOpacity: { value: opts.fillOpacity ?? DEFAULT_FILL_OPACITY },
    // Hidden by default (outside 0..1) so there is no band until a sweep starts.
    uScanY: { value: -1 },
    // Fully revealed by default; the intro lowers this and animates up to 1.
    uMorph: { value: 1 },
    // Selected-region highlight, off by default (uHighlightY outside 0..1). The
    // scene sets the level on selection; range is the half-height of the soft band
    // and intensity is the brightening amount (a steady value, or pulsed by motion).
    uHighlightY: { value: -1 },
    uHighlightRange: { value: 0.07 },
    uHighlightIntensity: { value: 0 },
    // Per-segment overlay tints (5 in SEGMENT_INDEX order), all neutral navy by
    // default so the overlay shows nothing until OV-T2/T3 feed real status colors.
    uSegmentTint: {
      value: [
        makeTokenColor('navy'),
        makeTokenColor('navy'),
        makeTokenColor('navy'),
        makeTokenColor('navy'),
        makeTokenColor('navy'),
      ],
    },
    // Overlay cross-fade, 0 by default (no tint, pure teal wireframe).
    uOverlayMix: { value: 0 },
    // A/B wipe, off by default (mode 0). t 0.5 is a centered split when enabled.
    uWipeMode: { value: 0 },
    uWipeT: { value: 0.5 },
    uViewportWidth: { value: 1 },
    // Model-space bounds, filled by the scene once the geometry is known so the
    // height normalization and scan band line up with the real mesh extent.
    uBoundsMin: { value: new THREE.Vector3(0, -1, 0) },
    uBoundsMax: { value: new THREE.Vector3(0, 1, 0) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    // Additive lines and rim glow read best blended onto the dark canvas while
    // the dim fill still gives the form body. depthWrite off prevents the
    // translucent fill from culling its own far side.
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  function setScan(yN: number): void {
    uniforms.uScanY.value = yN;
  }

  function setMorph(t: number): void {
    uniforms.uMorph.value = Math.min(Math.max(t, 0), 1);
  }

  function setHighlight(yN: number, intensity = 0, range?: number): void {
    uniforms.uHighlightY.value = yN;
    uniforms.uHighlightIntensity.value = Math.max(intensity, 0);
    if (range !== undefined) {
      uniforms.uHighlightRange.value = Math.max(range, 1e-4);
    }
  }

  function setSegmentTints(colors: (THREE.Color | null)[]): void {
    const tints = uniforms.uSegmentTint.value as THREE.Color[];
    for (let i = 0; i < tints.length; i += 1) {
      // Copy into the existing uniform Color so the array reference is stable; fall
      // back to neutral navy for any missing or null entry (UNKNOWN, no guessed tint).
      const next = colors[i];
      if (next) {
        tints[i].copy(next);
      } else {
        tints[i].copy(FORMA_VISION_COLORS.navy);
      }
    }
  }

  function setOverlayMix(mix: number): void {
    uniforms.uOverlayMix.value = Math.min(Math.max(mix, 0), 1);
  }

  function setWipe(mode: 0 | 1 | 2, t: number, viewportWidth: number): void {
    uniforms.uWipeMode.value = mode;
    const clampedT = Number.isFinite(t) ? Math.min(Math.max(t, 0), 1) : 0.5;
    uniforms.uWipeT.value = clampedT;
    uniforms.uViewportWidth.value = Number.isFinite(viewportWidth)
      ? Math.max(viewportWidth, 1)
      : 1;
  }

  function dispose(): void {
    material.dispose();
    if (ownsTexture) {
      cellTexture.dispose();
    }
  }

  return {
    material,
    uniforms,
    setScan,
    setMorph,
    setHighlight,
    setSegmentTints,
    setOverlayMix,
    setWipe,
    dispose,
  };
}
