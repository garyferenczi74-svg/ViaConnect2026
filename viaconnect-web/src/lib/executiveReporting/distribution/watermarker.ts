// Prompt #105 Workstream C — watermark token generation + validation.
// Tokens are NOT secrets — their value IS the identifier. Uniqueness
// enforced by DB UNIQUE constraint on board_pack_distributions.watermark_token.

/** Pure: generate a 22-char URL-safe random token from 16 bytes of
 *  crypto randomness. base64url (RFC 4648) without trailing '='. */
export function generateWatermarkToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Pure: validate the shape of a presented watermark token. The caller
 *  must still confirm DB-side that the token maps to an un-revoked
 *  distribution row — this is only a cheap format guard. */
export function isValidWatermarkTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{22}$/.test(token);
}

/** Pure: build the footer-watermark text per §5.2. */
export interface WatermarkFooterInput {
  recipientName: string;
  recipientEmail: string;
  distributedAtISO: string;
  token: string;
}

export function buildWatermarkFooterText(input: WatermarkFooterInput): string {
  const shortToken = input.token.slice(0, 8);
  return `CONFIDENTIAL — ${input.recipientName} — ${input.recipientEmail} — Distributed ${input.distributedAtISO} — Token ${shortToken}`;
}

/** Pure: constant-time token comparison (same pattern as channel
 *  verification tokens from #102). Returns false for any shape mismatch. */
export function tokensMatch(presented: string, stored: string): boolean {
  if (presented.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < presented.length; i += 1) {
    diff |= presented.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return diff === 0;
}
