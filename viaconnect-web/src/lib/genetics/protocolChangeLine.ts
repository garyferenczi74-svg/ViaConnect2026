// Brief 6 honesty: a protocol-change line is only honest when a real protocol
// delta exists. Marketing previews have no member protocol, so they pass null
// and render nothing. This helper does not invent SNP math or a protocol.

export interface ProtocolDelta {
  /** True only when a stored protocol actually changed. */
  changed: boolean;
  /** Member-facing summary of that change. Empty is treated as no line. */
  summary: string;
}

/**
 * Return the protocol-change line, or null when there is no real delta.
 * Fail / null / blank summary never become a fabricated change claim.
 */
export function protocolChangeLine(
  delta: ProtocolDelta | null | undefined,
): string | null {
  if (!delta) return null;
  if (delta.changed !== true) return null;
  const summary = delta.summary.trim();
  if (!summary) return null;
  return summary;
}
