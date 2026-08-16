/**
 * Client-safe message id trailer for /api/advisor/chat streams.
 * Kept separate from advisor-stream so the chat UI can import without
 * pulling Anthropic / product-mapper server code into the client bundle.
 */

export const MSG_ID_MARKER_PREFIX = "[[HANNAH_MSG_ID:";
export const MSG_ID_MARKER_SUFFIX = "]]";

export function formatMsgIdMarker(id: string): string {
  return `\n${MSG_ID_MARKER_PREFIX}${id}${MSG_ID_MARKER_SUFFIX}`;
}

export function extractMsgIdMarker(text: string): { clean: string; messageId: string | null } {
  const re = /\[\[HANNAH_MSG_ID:([0-9a-fA-F-]{36})\]\]/;
  const m = text.match(re);
  if (!m) return { clean: text, messageId: null };
  return {
    clean: text.replace(re, "").replace(/\n+$/, ""),
    messageId: m[1],
  };
}
