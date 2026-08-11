// Prompt 212: WHOOP webhook signature validation.
// WHOOP signs webhooks with HMAC-SHA256 using the client secret.
// Header names can vary by dashboard version; we accept common variants.

import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function validateWhoopWebhookSignature(
  rawBody: string,
  headers: Headers,
  clientSecret: string,
): boolean {
  const signature =
    headers.get("x-whoop-signature") ||
    headers.get("X-WHOOP-Signature") ||
    headers.get("whoop-signature") ||
    headers.get("x-hub-signature-256") ||
    "";

  const timestamp =
    headers.get("x-whoop-signature-timestamp") ||
    headers.get("X-WHOOP-Signature-Timestamp") ||
    headers.get("x-whoop-timestamp") ||
    "";

  if (!signature || !clientSecret) return false;

  // Try timestamp.payload form first (WHOOP v2 style), then payload-only.
  const candidates = timestamp
    ? [`${timestamp}.${rawBody}`, rawBody]
    : [rawBody];

  for (const base of candidates) {
    const expected = createHmac("sha256", clientSecret).update(base).digest("base64");
    const expectedHex = createHmac("sha256", clientSecret).update(base).digest("hex");
    const cleaned = signature.replace(/^sha256=/, "").trim();
    if (safeEqual(cleaned, expected) || safeEqual(cleaned, expectedHex)) {
      return true;
    }
  }
  return false;
}
