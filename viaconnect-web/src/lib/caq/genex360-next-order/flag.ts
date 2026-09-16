/**
 * GeneX360 Soft next-order gate.
 * Default OFF. Additive get_protocol attach only — engines SSOT + catalog map.
 * Not Hannah RAG invent. Not Soft-full.
 */

export const GENEX360_NEXT_ORDER_FLAG = "GENEX360_NEXT_ORDER_ENABLED" as const;

function parseTruthyFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return ["true", "1", "on", "yes"].includes(normalized);
}

/** Server-only. Missing / garbage env → false (no new get_protocol behavior). */
export function isGenex360NextOrderEnabled(): boolean {
  return parseTruthyFlag(process.env[GENEX360_NEXT_ORDER_FLAG]);
}
