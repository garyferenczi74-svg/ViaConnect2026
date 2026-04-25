/**
 * Deterministic A/B variant assignment (Prompt #138a §6.1).
 *
 * SHA-256 of (visitor_id || test_id), first 8 bytes as integer, modulo
 * number-of-active-variants. Same visitor + same test → same variant
 * across sessions (variant assignment is not allowed to drift mid-test
 * because that pollutes the test with within-visitor variance).
 *
 * Edge-runtime compatible: uses crypto.subtle which is available in
 * Node 18+ runtime, Edge runtime, and the browser. No package.json change.
 */

export interface AssignVariantArgs {
  /** Stable visitor identifier from cookie. Required. */
  visitorId: string;
  /** Test identifier (uniquely identifies the rotation; e.g., 'hero_2026q2'). */
  testId: string;
  /** Active variant slot IDs in stable order. */
  activeSlotIds: readonly string[];
}

/**
 * Returns the slot_id assigned to the visitor for this test, or null when
 * no variants are active. Deterministic — calling repeatedly with the same
 * inputs returns the same result.
 */
export async function assignVariant(args: AssignVariantArgs): Promise<string | null> {
  const { visitorId, testId, activeSlotIds } = args;
  if (!visitorId || activeSlotIds.length === 0) return null;
  const idx = await hashIndex(`${visitorId}||${testId}`, activeSlotIds.length);
  return activeSlotIds[idx];
}

/**
 * SHA-256 the input, take the first 8 bytes as a big-endian unsigned
 * 64-bit integer, return integer modulo bucketCount. Bucketing is uniform
 * because SHA-256's output distribution is uniform.
 */
export async function hashIndex(input: string, bucketCount: number): Promise<number> {
  if (bucketCount <= 0) return 0;
  const enc = new TextEncoder();
  const buf = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  // Big-endian unsigned 64-bit integer from first 8 bytes.
  let n = 0n;
  for (let i = 0; i < 8; i += 1) {
    n = (n << 8n) | BigInt(bytes[i]);
  }
  return Number(n % BigInt(bucketCount));
}

/**
 * Generate a fresh visitor ID for first-time visitors. Uses crypto.randomUUID
 * which is available in all supported runtimes.
 */
export function generateVisitorId(): string {
  return crypto.randomUUID();
}
