/**
 * Protocol next-order Soft gate.
 * Default OFF. Additive get_protocol attach only — not Hannah RAG invent.
 */

export const PROTOCOL_NEXT_ORDER_FLAG = "PROTOCOL_NEXT_ORDER_ENABLED" as const;

function parseTruthyFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return ["true", "1", "on", "yes"].includes(normalized);
}

/** Server-only. Missing / garbage env → false (no new get_protocol behavior). */
export function isProtocolNextOrderEnabled(): boolean {
  return parseTruthyFlag(process.env[PROTOCOL_NEXT_ORDER_FLAG]);
}
