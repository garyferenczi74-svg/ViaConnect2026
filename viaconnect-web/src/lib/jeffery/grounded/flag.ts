/**
 * Jeffery lock: named kill switch for Stage A grounded chat.
 * Default OFF so today's /api/advisor/chat stream is unchanged until Gary --prod.
 * false = legacy advisor stream (today's Claude). FAQ-only = provider outage /
 * explicit ops kill — not the default-off meaning (HIPAA-OPS §4).
 */

export const LLM_GROUNDED_CHAT_FLAG = "LLM_GROUNDED_CHAT_ENABLED" as const;

function parseFlag(raw: string | undefined): boolean | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (["true", "1", "on", "yes"].includes(normalized)) return true;
  if (["false", "0", "off", "no"].includes(normalized)) return false;
  return null;
}

/** Server-only. Missing / garbage env → false (leave current stream alone). */
export function isLlmGroundedChatEnabled(): boolean {
  const parsed = parseFlag(process.env[LLM_GROUNDED_CHAT_FLAG]);
  return parsed === true;
}
