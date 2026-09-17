/**
 * Labs Soft next-order gate.
 * Default OFF. Additive get_protocol attach only — engines/labs SSOT.
 * Honesty empty when zero on-file lab→SKU pairs. Not Hannah RAG invent. Not Soft-full.
 */

export const LABS_NEXT_ORDER_FLAG = "LABS_NEXT_ORDER_ENABLED" as const;

function parseTruthyFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return ["true", "1", "on", "yes"].includes(normalized);
}

/** Server-only. Missing / garbage env → false (no new get_protocol behavior). */
export function isLabsNextOrderEnabled(): boolean {
  return parseTruthyFlag(process.env[LABS_NEXT_ORDER_FLAG]);
}
