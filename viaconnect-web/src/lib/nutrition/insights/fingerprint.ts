// Prompt 192 Task 2: deterministic fact fingerprints for dedup.
//
// A fingerprint identifies WHAT an insight says (type, horizon, and the
// identifying fact fields a detector selects), not when it was generated.
// Detectors bucket noisy continuous values before fingerprinting so a one
// point wiggle does not defeat dedup. Severity is intentionally excluded:
// the rank layer admits a matching fingerprint again when severity rose.

import type { InsightHorizon, InsightType } from './types';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
  );
  return `{${parts.join(',')}}`;
}

// FNV-1a 32 bit, hex encoded. Collision risk is acceptable here: a collision
// only over suppresses one insight for one user for one expiry window.
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function makeFingerprint(
  type: InsightType,
  horizon: InsightHorizon,
  fields: Record<string, unknown>,
): string {
  return `${type}:${horizon}:${fnv1a(stableStringify(fields))}`;
}
