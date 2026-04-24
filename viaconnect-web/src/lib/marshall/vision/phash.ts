// Prompt #124 P1: Perceptual hash (pHash) — pure-TS, DCT-based.
//
// Classic 64-bit DCT perceptual hash:
//   1. Sharp resizes the image to 32×32 grayscale.
//   2. Compute 2D Type-II DCT of the 32×32 intensity matrix.
//   3. Take the top-left 8×8 DCT coefficients (drop the DC coefficient).
//   4. Median of the remaining 63 coefficients.
//   5. Build 64 bits: 1 if coefficient >= median else 0.
//   6. Hex-encode the 64-bit hash (16 lowercase hex chars).
//
// Properties:
//   - Robust to minor brightness / scale / JPEG compression changes.
//   - Hamming distance between two hashes ≈ perceptual similarity score.
//   - Deterministic given the same input bytes + Sharp version.

import sharp from 'sharp';

const SIZE = 32;       // DCT input grid
const HASH_SIZE = 8;   // top-left square retained
const BITS = HASH_SIZE * HASH_SIZE; // 64 bits

export interface PhashResult {
  hex: string;
  bits: string; // 64-char '01' string, for ease of debugging
}

/** Compute a 64-bit pHash from raw image bytes. */
export async function computePhash(bytes: Uint8Array): Promise<PhashResult> {
  const raw = await sharp(bytes)
    .resize(SIZE, SIZE, { fit: 'fill' })
    .greyscale()
    .removeAlpha()
    .raw()
    .toBuffer();

  // raw is SIZE*SIZE bytes, one intensity 0..255 per pixel.
  const pixels = new Float64Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    pixels[i] = raw[i];
  }

  const dct = dct2d(pixels, SIZE);

  // Take top-left 8×8 block.
  const top: number[] = [];
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      top.push(dct[y * SIZE + x]);
    }
  }

  // Drop DC coefficient (index 0) for the median calculation — standard pHash recipe.
  const forMedian = top.slice(1).slice().sort((a, b) => a - b);
  const median = forMedian[Math.floor(forMedian.length / 2)];

  let bits = '';
  for (let i = 0; i < BITS; i++) {
    bits += top[i] >= median ? '1' : '0';
  }

  return { hex: bitsToHex(bits), bits };
}

/** Hamming distance between two hex-encoded pHash strings. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) {
    throw new Error(`hamming: length mismatch ${a.length} vs ${b.length}`);
  }
  let d = 0;
  for (let i = 0; i < a.length; i += 2) {
    const byteA = parseInt(a.slice(i, i + 2), 16);
    const byteB = parseInt(b.slice(i, i + 2), 16);
    d += popcount(byteA ^ byteB);
  }
  return d;
}

/** Threshold for "near-duplicate" at 64-bit pHash. Anything under ~10 is a strong visual match. */
export const PHASH_NEAR_DUPLICATE_THRESHOLD = 10;

// ─── Internals ──────────────────────────────────────────────────────────────

/** Standard 2D Type-II DCT. Separable: rows then columns. */
function dct2d(input: Float64Array, N: number): Float64Array {
  const tmp = new Float64Array(N * N);
  const out = new Float64Array(N * N);

  const cos = buildCosTable(N);

  // Row DCT → tmp.
  for (let y = 0; y < N; y++) {
    for (let u = 0; u < N; u++) {
      let s = 0;
      for (let x = 0; x < N; x++) {
        s += input[y * N + x] * cos[u * N + x];
      }
      tmp[y * N + u] = s * alpha(u, N);
    }
  }

  // Column DCT on tmp → out.
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let s = 0;
      for (let y = 0; y < N; y++) {
        s += tmp[y * N + u] * cos[v * N + y];
      }
      out[v * N + u] = s * alpha(v, N);
    }
  }

  return out;
}

function alpha(k: number, N: number): number {
  return k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
}

function buildCosTable(N: number): Float64Array {
  const t = new Float64Array(N * N);
  const factor = Math.PI / (2 * N);
  for (let u = 0; u < N; u++) {
    for (let x = 0; x < N; x++) {
      t[u * N + x] = Math.cos((2 * x + 1) * u * factor);
    }
  }
  return t;
}

function bitsToHex(bits: string): string {
  if (bits.length % 4 !== 0) throw new Error('bits length not multiple of 4');
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}
