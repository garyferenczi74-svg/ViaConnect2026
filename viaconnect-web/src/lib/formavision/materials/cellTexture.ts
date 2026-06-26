// Procedural cell-grain texture for FormaVision (Prompt 210b, task P1-T3).
//
// makeCellTexture builds a small tiling THREE.DataTexture of a fine cell or dot
// grain that the wireframe material samples in UV space, so the body fill reads
// as a textured surface rather than empty triangles (the ZOZOFIT-style look).
// It is generated entirely in code so there is no external asset to gate, and it
// is tiny (default 64x64) and RepeatWrapping so it tiles across the mesh.

import * as THREE from 'three';

export interface CellTextureOptions {
  // Edge length of the square texture in texels. Kept small; powers of two tile
  // cleanly under RepeatWrapping.
  size?: number;
  // Number of grain cells across one tile. More cells give a finer grain.
  cells?: number;
  // 0..1 luminance of a cell center dot relative to full white.
  dotIntensity?: number;
}

const DEFAULT_SIZE = 64;
const DEFAULT_CELLS = 8;
const DEFAULT_DOT_INTENSITY = 1;

// Single channel grain packed into RGBA so it is portable across renderers. The
// alpha carries the same value as the color so the material can read either.
export function makeCellTexture(opts: CellTextureOptions = {}): THREE.DataTexture {
  const size = opts.size ?? DEFAULT_SIZE;
  const cells = opts.cells ?? DEFAULT_CELLS;
  const dotIntensity = opts.dotIntensity ?? DEFAULT_DOT_INTENSITY;

  const cellSize = size / cells;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Position inside the current cell, centered so the dot sits in the
      // middle. Wraps cleanly because cellSize divides size for power-of-two
      // inputs, which keeps the tile seamless under RepeatWrapping.
      const cx = ((x % cellSize) / cellSize) - 0.5;
      const cy = ((y % cellSize) / cellSize) - 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);

      // Soft radial dot: bright at the cell center, fading to dark at the cell
      // edge. smoothstep gives a clean anti-aliased falloff.
      const edge0 = 0.18;
      const edge1 = 0.42;
      const t = Math.min(Math.max((dist - edge0) / (edge1 - edge0), 0), 1);
      const smooth = t * t * (3 - 2 * t);
      const lum = (1 - smooth) * dotIntensity;

      const value = Math.round(Math.min(Math.max(lum, 0), 1) * 255);
      const i = (y * size + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = value;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
