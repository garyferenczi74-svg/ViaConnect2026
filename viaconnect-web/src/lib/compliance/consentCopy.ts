/**
 * Consent version copy for Marshall + Jeffery.
 * Never print `vundefined`. Missing / blank / literal "undefined" → "none".
 */

export function formatConsentVersion(version: unknown): string {
  if (typeof version !== "string") return "none";
  const trimmed = version.trim();
  if (!trimmed || trimmed === "undefined") return "none";
  return trimmed;
}

/** Required-version side: `v2.0` when known, otherwise `none` (not `vnone`). */
export function formatRequiredConsentPhrase(version: unknown): string {
  const v = formatConsentVersion(version);
  return v === "none" ? "none" : `v${v}`;
}

/** Display-only rewrite for stored rows that already baked `vundefined`. */
export function sanitizeConsentCopy(text: string): string {
  if (!text) return text;
  return text.replace(/vundefined/gi, "none");
}
