/**
 * MediSearch CAQ-compare kill switch.
 * Default OFF. Not a Hannah RAG / grounded Sources flag.
 * Live SSE fetch is PR B — this file only reads env.
 */

export const CAQ_MEDISEARCH_FLAG = "CAQ_MEDISEARCH_ENABLED" as const;
export const MEDISEARCH_API_KEY_ENV = "MEDISEARCH_API_KEY" as const;

function parseTruthyFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return ["true", "1", "on", "yes"].includes(normalized);
}

/** Server-only. Missing / garbage env → false. */
export function isCaqMedisearchEnabled(): boolean {
  return parseTruthyFlag(process.env[CAQ_MEDISEARCH_FLAG]);
}

/** Presence only. Never log the key value. */
export function hasMedisearchApiKey(): boolean {
  const key = process.env[MEDISEARCH_API_KEY_ENV];
  return typeof key === "string" && key.trim().length > 0;
}
