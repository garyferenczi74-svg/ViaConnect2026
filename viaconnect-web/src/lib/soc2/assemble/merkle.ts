// Prompt #122 P2: SHA-256 Merkle tree helpers.
//
// Per spec §8: the packet hash chain is
//   per-file sha256 → per-category Merkle subtree → packet root Merkle.
// All hashes are lowercase hex.
//
// Merkle construction: pair-wise hashing; if the list has an odd count,
// the last element is duplicated (Bitcoin-style convention). This matches
// the behavior of most independent verification tooling an auditor would
// use.

import { createHash } from 'node:crypto';

/**
 * SHA-256 of a byte buffer, lowercase hex.
 */
export function sha256(bytes: Uint8Array | string): string {
  const h = createHash('sha256');
  h.update(typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Buffer.from(bytes));
  return h.digest('hex');
}

/**
 * Combine two hex hashes via SHA-256 of their concatenated bytes.
 */
export function combinePair(leftHex: string, rightHex: string): string {
  const h = createHash('sha256');
  h.update(Buffer.from(leftHex, 'hex'));
  h.update(Buffer.from(rightHex, 'hex'));
  return h.digest('hex');
}

/**
 * Merkle root over a list of hex hashes. Duplicate-last for odd counts.
 * Empty input returns the hash of an empty string (well-defined, auditor-friendly).
 */
export function merkleRoot(hashes: readonly string[]): string {
  if (hashes.length === 0) {
    return sha256('');
  }
  let layer: string[] = hashes.slice();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(combinePair(left, right));
    }
    layer = next;
  }
  return layer[0];
}

/**
 * Per-category Merkle root. Files are alphabetized by path before hashing
 * so the root is deterministic across generators that sort differently.
 */
export function categoryRoot(filesInCategory: ReadonlyArray<{ path: string; sha256: string }>): string {
  const sorted = filesInCategory.slice().sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return merkleRoot(sorted.map((f) => f.sha256));
}

/**
 * Packet root Merkle root over the ordered category hashes. Categories are
 * sorted by category key (e.g. 'CC1-control-environment') before hashing so
 * the root is stable regardless of caller ordering.
 */
export function packetRoot(categoryHashes: Record<string, string>): string {
  const keys = Object.keys(categoryHashes).sort();
  const ordered = keys.map((k) => categoryHashes[k]);
  return merkleRoot(ordered);
}
