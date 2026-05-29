// Prompt #170 Phase 1d: NutriVision recognition cache (sha256 exact + pHash near).
//
// pHash algorithm choice (3-line header per spec):
//   Classic 64-bit DCT pHash. sharp resizes the image to 32x32 greyscale, we run a
//   separable 2D Type-II DCT, take the top-left 8x8 block, compute the median over
//   the 63 non-DC coefficients, and emit a 64-bit fingerprint packed into a bigint.
//
// Per Prompt 170 Phase 1d spec the cache layer offers two tiers of lookup. sha256
// is an exact hit and returns the cached ReconciledRecognition immediately. pHash
// is a near match scored by 64-bit Hamming distance with a default threshold of 6.
// Phase 1 walks the (small) cache table client-side; once the table grows past
// ~5k rows a server-side bit_count RPC should replace the scan (TODO Phase 2).
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ReconciledRecognition, RecognitionProvider } from '../vision/types';

const PHASH_GRID = 32;
const PHASH_BLOCK = 8;
const PHASH_BITS = PHASH_BLOCK * PHASH_BLOCK;
const DEFAULT_MAX_HAMMING_DISTANCE = 6;
const DEFAULT_TTL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CacheHit {
  kind: 'sha256_exact' | 'phash_near';
  recognition: ReconciledRecognition;
  hammingDistance?: number;
}

export interface CacheLookupOpts {
  supabaseAdmin: SupabaseClient;
  imageHashSha256: string;
  pHash64: bigint;
  maxHammingDistance?: number;
  ttlDays?: number;
}

export interface CacheWriteOpts {
  supabaseAdmin: SupabaseClient;
  imageHashSha256: string;
  pHash64: bigint;
  provider: RecognitionProvider;
  recognition: ReconciledRecognition;
  ttlDays?: number;
}

interface CacheRow {
  id?: string;
  image_hash_sha256?: unknown;
  phash_64?: unknown;
  provider?: unknown;
  recognition_json?: unknown;
  created_at?: unknown;
  expires_at?: unknown;
}

/** Stable SHA-256 hex digest of the raw image bytes. Deterministic for identical input. */
export function computeSha256(imageBytes: Buffer): string {
  return createHash('sha256').update(imageBytes).digest('hex');
}

/** Hamming distance over two 64-bit bigints via parity-style popcount of the XOR. */
export function hammingDistance64(a: bigint, b: bigint): number {
  const zero = BigInt(0);
  const one = BigInt(1);
  let x = a ^ b;
  let count = 0;
  while (x !== zero) {
    x &= x - one;
    count++;
  }
  return count;
}

/** Compute a 64-bit perceptual hash from raw image bytes. Returns a bigint. */
export async function computePHash64(imageBytes: Buffer): Promise<bigint> {
  const raw = await sharp(imageBytes)
    .resize(PHASH_GRID, PHASH_GRID, { fit: 'fill' })
    .greyscale()
    .removeAlpha()
    .raw()
    .toBuffer();

  // Sharp returns one byte per pixel for raw greyscale; defensively reject if
  // the buffer is the wrong size (e.g. sharp version drift returning RGBA).
  if (raw.length !== PHASH_GRID * PHASH_GRID) {
    throw new Error(
      `computePHash64: expected ${PHASH_GRID * PHASH_GRID} raw bytes, got ${raw.length}`,
    );
  }

  const pixels = new Float64Array(PHASH_GRID * PHASH_GRID);
  for (let i = 0; i < PHASH_GRID * PHASH_GRID; i++) {
    pixels[i] = raw[i];
  }

  const dct = dct2d(pixels, PHASH_GRID);

  // Take the top-left 8x8 block.
  const top: number[] = [];
  for (let y = 0; y < PHASH_BLOCK; y++) {
    for (let x = 0; x < PHASH_BLOCK; x++) {
      top.push(dct[y * PHASH_GRID + x]);
    }
  }

  // Median of the 63 non-DC coefficients (drop index 0).
  const forMedian = top.slice(1).slice().sort((a, b) => a - b);
  const median = forMedian[Math.floor(forMedian.length / 2)];

  // Pack 64 bits into a bigint, bit 63 first.
  const one = BigInt(1);
  let packed = BigInt(0);
  for (let i = 0; i < PHASH_BITS; i++) {
    packed <<= one;
    if (top[i] >= median) packed |= one;
  }
  return packed;
}

/**
 * Look up cached recognition for an image. Two passes:
 *   1. exact sha256 match (cheap unique index hit).
 *   2. closest pHash within max Hamming distance (client-side scan, Phase 1 only).
 * Returns null if neither finds a fresh row. Expired rows are filtered server-side
 * by gt('expires_at', now).
 *
 * TODO Phase 2: when row count exceeds ~5k rows, swap the client-side pHash scan
 * for a Postgres bit_count RPC against the phash_64 column.
 */
export async function lookupCache(opts: CacheLookupOpts): Promise<CacheHit | null> {
  const nowIso = new Date().toISOString();
  const maxDist = opts.maxHammingDistance ?? DEFAULT_MAX_HAMMING_DISTANCE;

  // Pass 1: exact sha256 hit. The unique index on (image_hash_sha256, provider)
  // means there can be multiple rows per sha256 for distinct providers; pick any
  // fresh one, the cached ReconciledRecognition already encodes provider chain.
  const exactRes = await opts.supabaseAdmin
    .from('food_recognition_cache')
    .select('*')
    .eq('image_hash_sha256', opts.imageHashSha256)
    .gt('expires_at', nowIso)
    .limit(1);

  if (exactRes.error) {
    throw new Error(`lookupCache sha256 query failed: ${exactRes.error.message}`);
  }
  const exactRows = (exactRes.data ?? []) as ReadonlyArray<CacheRow>;
  if (exactRows.length > 0) {
    const recognition = parseRecognition(exactRows[0].recognition_json);
    if (recognition !== null) {
      return { kind: 'sha256_exact', recognition };
    }
  }

  // Pass 2: pHash near match. Walk all fresh rows, score Hamming distance, keep
  // the closest within the threshold. Phase 1 only; see TODO above.
  const phashRes = await opts.supabaseAdmin
    .from('food_recognition_cache')
    .select('*')
    .gt('expires_at', nowIso);

  if (phashRes.error) {
    throw new Error(`lookupCache phash query failed: ${phashRes.error.message}`);
  }
  const phashRows = (phashRes.data ?? []) as ReadonlyArray<CacheRow>;

  let bestRecognition: ReconciledRecognition | null = null;
  let bestDistance = maxDist + 1;

  for (const row of phashRows) {
    const rowPhash = parsePhash64(row.phash_64);
    if (rowPhash === null) continue;
    const d = hammingDistance64(opts.pHash64, rowPhash);
    if (d < bestDistance) {
      const recognition = parseRecognition(row.recognition_json);
      if (recognition !== null) {
        bestRecognition = recognition;
        bestDistance = d;
      }
    }
  }

  if (bestRecognition !== null && bestDistance <= maxDist) {
    return {
      kind: 'phash_near',
      recognition: bestRecognition,
      hammingDistance: bestDistance,
    };
  }
  return null;
}

/** Upsert a recognition row keyed by (image_hash_sha256, provider). */
export async function writeCache(opts: CacheWriteOpts): Promise<void> {
  const ttlDays = opts.ttlDays ?? DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * MS_PER_DAY).toISOString();
  const phashString = opts.pHash64.toString();

  const upsertRes = await opts.supabaseAdmin
    .from('food_recognition_cache')
    .upsert(
      {
        image_hash_sha256: opts.imageHashSha256,
        phash_64: phashString,
        provider: opts.provider,
        recognition_json: opts.recognition,
        expires_at: expiresAt,
      },
      { onConflict: 'image_hash_sha256, provider' },
    );

  if (upsertRes.error) {
    throw new Error(`writeCache upsert failed: ${upsertRes.error.message}`);
  }
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

function parsePhash64(raw: unknown): bigint | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'bigint') return raw;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    try { return BigInt(Math.trunc(raw)); } catch { return null; }
  }
  if (typeof raw === 'string' && raw.length > 0) {
    try { return BigInt(raw); } catch { return null; }
  }
  return null;
}

function parseRecognition(raw: unknown): ReconciledRecognition | null {
  // The recognition_json column stores a serialized ReconciledRecognition;
  // shape-check only the discriminating fields before trusting the row.
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.items)) return null;
  if (typeof r.providerPrimary !== 'string') return null;
  if (typeof r.mealConfidence !== 'number') return null;
  return raw as ReconciledRecognition;
}

/** Standard 2D Type-II DCT. Separable: rows then columns. */
function dct2d(input: Float64Array, n: number): Float64Array {
  const tmp = new Float64Array(n * n);
  const out = new Float64Array(n * n);
  const cos = buildCosTable(n);

  // Row DCT into tmp.
  for (let y = 0; y < n; y++) {
    for (let u = 0; u < n; u++) {
      let s = 0;
      for (let x = 0; x < n; x++) {
        s += input[y * n + x] * cos[u * n + x];
      }
      tmp[y * n + u] = s * alpha(u, n);
    }
  }

  // Column DCT on tmp into out.
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      let s = 0;
      for (let y = 0; y < n; y++) {
        s += tmp[y * n + u] * cos[v * n + y];
      }
      out[v * n + u] = s * alpha(v, n);
    }
  }
  return out;
}

function alpha(k: number, n: number): number {
  return k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n);
}

function buildCosTable(n: number): Float64Array {
  const t = new Float64Array(n * n);
  const factor = Math.PI / (2 * n);
  for (let u = 0; u < n; u++) {
    for (let x = 0; x < n; x++) {
      t[u * n + x] = Math.cos((2 * x + 1) * u * factor);
    }
  }
  return t;
}
