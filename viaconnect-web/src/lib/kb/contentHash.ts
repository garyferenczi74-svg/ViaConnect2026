/**
 * Prompt 221: corpus-wide content_hash (sha256 of normalized content).
 * UNKNOWN never invented; empty normalized payload still hashes deterministically.
 */

import { createHash } from "node:crypto";

/** Collapse whitespace, lowercase, strip common punctuation noise. */
export function normalizeForHash(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2013\u2014\u2010\u2011]/g, "-") // normalize dash variants to hyphen then strip
    .replace(/[-–—]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a stable hash input from structured fields (order-independent keys sorted).
 */
export function contentHashFromParts(
  parts: Record<string, string | number | boolean | null | undefined>
): string {
  const keys = Object.keys(parts).sort();
  const body = keys
    .map((k) => {
      const v = parts[k];
      if (v === null || v === undefined) return `${k}=`;
      return `${k}=${normalizeForHash(String(v))}`;
    })
    .join("|");
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function contentHashFromText(text: string): string {
  return createHash("sha256")
    .update(normalizeForHash(text), "utf8")
    .digest("hex");
}
