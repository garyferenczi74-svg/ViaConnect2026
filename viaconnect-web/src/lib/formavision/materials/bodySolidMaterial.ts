// Optional solid volume — ghost / compare overlays only.
//
// #188 used this as the Ready anti-shards stamp. Brief 60 supersedes Ready
// success to makeBodyHolographicMaterial (designed F3 grid). Keep this factory
// so overlays can still request an opaque human volume without Picasso shards.

import * as THREE from 'three';
import type { BodyWireframeMaterial } from './bodyWireframeMaterial';
import { FORMA_VISION_COLORS, makeTokenColor } from './formaVisionTokens';

export const BODY_SOLID_DEFAULTS = {
  roughness: 0.58,
  metalness: 0.08,
  fillOpacity: 1,
  lineIntensity: 0,
  rimIntensity: 0.28,
} as const;

export const FORMAVISION_SOLID_LOOK = 'solid-human' as const;

type WipeShader = {
  uniforms: Record<string, THREE.IUniform>;
  fragmentShader: string;
};

export function isPicassoWireframeDrawMode(material: THREE.Material): boolean {
  if ('wireframe' in material && material.wireframe === true) {
    return true;
  }
  return material.blending === THREE.AdditiveBlending;
}

export function isSolidHumanDrawMode(material: THREE.Material): boolean {
  return (
    material instanceof THREE.MeshStandardMaterial &&
    material.wireframe === false &&
    material.blending === THREE.NormalBlending &&
    material.depthWrite === true &&
    material.side === THREE.FrontSide
  );
}

function applySolidWipe(shader: WipeShader, uniforms: Record<string, THREE.IUniform>): void {
  shader.uniforms.uWipeMode = uniforms.uWipeMode;
  shader.uniforms.uWipeT = uniforms.uWipeT;
  shader.uniforms.uViewportWidth = uniforms.uViewportWidth;
  shader.fragmentShader = `uniform float uWipeMode;
uniform float uWipeT;
uniform float uViewportWidth;
${shader.fragmentShader}`.replace(
    '#include <clipping_planes_fragment>',
    `#include <clipping_planes_fragment>
      if (uWipeMode > 0.5) {
        float nx = gl_FragCoord.x / max(uViewportWidth, 1.0);
        if (uWipeMode < 1.5) {
          if (nx > uWipeT) discard;
        } else {
          if (nx < uWipeT) discard;
        }
      }`,
  );
}

export function makeBodySolidMaterial(): BodyWireframeMaterial {
  const color = makeTokenColor('teal');
  // Keep the brand teal, but sit it on the navy card so the volume reads as
  // flesh-and-form instead of a neon shard field. No new token hex.
  color.lerp(makeTokenColor('card'), 0.28);
  const restColor = color.clone();

  const uniforms: Record<string, THREE.IUniform> = {
    uTeal: { value: makeTokenColor('teal') },
    uNavy: { value: makeTokenColor('navy') },
    uCard: { value: makeTokenColor('card') },
    uCellTexture: { value: null },
    uCellRepeat: { value: 1 },
    uLineIntensity: { value: BODY_SOLID_DEFAULTS.lineIntensity },
    uRimIntensity: { value: BODY_SOLID_DEFAULTS.rimIntensity },
    uFillOpacity: { value: BODY_SOLID_DEFAULTS.fillOpacity },
    uEdgeWidth: { value: 0 },
    uScanY: { value: -1 },
    uMorph: { value: 1 },
    uHighlightY: { value: -1 },
    uHighlightRange: { value: 0.07 },
    uHighlightIntensity: { value: 0 },
    uSegmentTint: {
      value: [
        makeTokenColor('navy'),
        makeTokenColor('navy'),
        makeTokenColor('navy'),
        makeTokenColor('navy'),
        makeTokenColor('navy'),
      ],
    },
    uOverlayMix: { value: 0 },
    uWipeMode: { value: 0 },
    uWipeT: { value: 0.5 },
    uViewportWidth: { value: 1 },
    uBoundsMin: { value: new THREE.Vector3(0, -1, 0) },
    uBoundsMax: { value: new THREE.Vector3(0, 1, 0) },
  };

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: BODY_SOLID_DEFAULTS.roughness,
    metalness: BODY_SOLID_DEFAULTS.metalness,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    wireframe: false,
    blending: THREE.NormalBlending,
    emissive: makeTokenColor('navy'),
    emissiveIntensity: 0,
  });
  material.userData.formavisionLook = FORMAVISION_SOLID_LOOK;
  material.customProgramCacheKey = () => 'formavision-solid-human';
  material.onBeforeCompile = (shader) => {
    applySolidWipe(shader, uniforms);
  };

  function setScan(yN: number): void {
    uniforms.uScanY.value = yN;
  }

  function setMorph(t: number): void {
    // Solid Ready mesh is always fully revealed. Hiding via uMorph=0 was the
    // #187 phone FAIL: the intro primed an invisible body and WebKit never
    // played the demand sweep.
    uniforms.uMorph.value = Math.min(Math.max(t, 0), 1);
  }

  function setHighlight(yN: number, intensity = 0, range?: number): void {
    uniforms.uHighlightY.value = yN;
    uniforms.uHighlightIntensity.value = Math.max(intensity, 0);
    if (range !== undefined) {
      uniforms.uHighlightRange.value = Math.max(range, 1e-4);
    }
    material.emissive.copy(FORMA_VISION_COLORS.teal);
    material.emissiveIntensity = Math.max(intensity, 0) * 0.22;
  }

  function setSegmentTints(colors: (THREE.Color | null)[]): void {
    const tints = uniforms.uSegmentTint.value as THREE.Color[];
    for (let i = 0; i < tints.length; i += 1) {
      const next = colors[i];
      if (next) {
        tints[i].copy(next);
      } else {
        tints[i].copy(FORMA_VISION_COLORS.navy);
      }
    }
  }

  function setOverlayMix(mix: number): void {
    const clamped = Math.min(Math.max(mix, 0), 1);
    uniforms.uOverlayMix.value = clamped;
    material.color.copy(restColor).lerp(FORMA_VISION_COLORS.teal, clamped * 0.4);
  }

  function setWipe(mode: 0 | 1 | 2, t: number, viewportWidth: number): void {
    uniforms.uWipeMode.value = mode;
    uniforms.uWipeT.value = Number.isFinite(t) ? Math.min(Math.max(t, 0), 1) : 0.5;
    uniforms.uViewportWidth.value = Number.isFinite(viewportWidth)
      ? Math.max(viewportWidth, 1)
      : 1;
    material.needsUpdate = true;
  }

  function dispose(): void {
    material.dispose();
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
