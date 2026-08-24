// Oura webhook signature validation. HMAC-SHA256 with the client secret.
// Header names vary; accept common variants. No secrets are hardcoded.

import { createHmac, timingSafeEqual } from 'crypto';

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

export function validateOuraWebhookSignature(
  rawBody: string,
  headers: Headers,
  clientSecret: string,
): boolean {
  const signature =
    headers.get('x-oura-signature') ||
    headers.get('X-Oura-Signature') ||
    headers.get('x-hub-signature-256') ||
    headers.get('x-oura-hmac-sha256') ||
    '';

  if (!signature || !clientSecret) return false;

  const cleaned = signature.replace(/^sha256=/, '').trim();
  const expected = createHmac('sha256', clientSecret).update(rawBody).digest('hex');
  const expectedB64 = createHmac('sha256', clientSecret).update(rawBody).digest('base64');
  return safeEqual(cleaned, expected) || safeEqual(cleaned, expectedB64);
}
