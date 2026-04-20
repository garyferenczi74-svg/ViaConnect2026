// Prompt #102 Workstream A — domain meta-tag verification (pure logic).

/** Generate a human-readable verification token the practitioner
 *  pastes into their domain's HTML head as
 *  <meta name="viaconnect-channel-verification" content="VC-{token}" />. */
export function generateVerificationToken(): string {
  // Crypto-grade random + VC- prefix so ops can grep server logs later.
  // 16 hex chars = 64 bits of entropy, collision-resistant at the
  // per-practitioner scale.
  const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `VC-${randomHex}`;
}

/** Pure: extract the content value of the verification meta tag from
 *  HTML. Returns null if tag not found or malformed. */
export function extractMetaTagToken(html: string): string | null {
  // Two patterns because HTML attribute order is not fixed.
  const patterns = [
    /<meta\s+name=["']viaconnect-channel-verification["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']viaconnect-channel-verification["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

/** Pure: confirm extracted token matches the issued token. Performs
 *  constant-time-equivalent comparison after length check. */
export function verifyMetaTagToken(foundToken: string | null, issuedToken: string): boolean {
  if (!foundToken) return false;
  if (foundToken.length !== issuedToken.length) return false;
  let diff = 0;
  for (let i = 0; i < foundToken.length; i += 1) {
    diff |= foundToken.charCodeAt(i) ^ issuedToken.charCodeAt(i);
  }
  return diff === 0;
}

/** Pure: the instructions copy practitioners paste. Returns the exact
 *  snippet the UI should show; tests assert this format is stable. */
export function metaTagSnippet(token: string): string {
  return `<meta name="viaconnect-channel-verification" content="${token}" />`;
}
