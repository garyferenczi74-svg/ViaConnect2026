// Prompt #104 Phase 1: Evidence chain-of-custody hashing.
//
// Web Crypto SHA-256. Used at evidence capture (compute hash, store
// alongside artifact metadata) and on every read (recompute hash,
// compare; mismatch raises a critical alert).

export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer to satisfy crypto.subtle's strict
  // BufferSource contract (rejects SharedArrayBuffer-backed views).
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = new ArrayBuffer(view.byteLength);
  new Uint8Array(copy).set(view);
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface HashVerificationResult {
  ok: boolean;
  expected: string;
  actual: string;
  mismatch: boolean;
}

export async function verifyEvidenceHash(args: {
  bytes: ArrayBuffer | Uint8Array;
  expected_sha256: string;
}): Promise<HashVerificationResult> {
  const actual = await sha256Hex(args.bytes);
  const expected = args.expected_sha256.toLowerCase();
  const mismatch = actual.toLowerCase() !== expected;
  return { ok: !mismatch, expected, actual, mismatch };
}
