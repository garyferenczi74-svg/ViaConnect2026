/**
 * src/lib/genetics/lifemetricsWebhookSignature.ts
 *
 * LifeMetrics Platform API v3.2 webhook HMAC-SHA256 verification.
 *
 * LifeMetrics docs (partner comments, tenant 355): the dashboard may send
 * X-LifeMetrics-Signature or X-Webhook-Signature. Both are HMAC-SHA256 of the
 * raw request body with the webhook secret. If both headers appear, accept
 * either valid signature so a dashboard version mismatch does not drop events.
 *
 * Fail closed: missing secret, missing signature, or a bad HMAC is a reject.
 * Compare with timingSafeEqual. Support hex, base64, and a sha256= prefix.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const LIFEMETRICS_SIGNATURE_HEADERS = [
  'x-lifemetrics-signature',
  'x-webhook-signature',
] as const;

function safeEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function cleanSignature(raw: string): string {
  return raw.replace(/^sha256=/i, '').trim();
}

function collectSignatures(headers: Headers): string[] {
  const seen = new Set<string>();
  for (const name of LIFEMETRICS_SIGNATURE_HEADERS) {
    const value = headers.get(name);
    if (!value) continue;
    const cleaned = cleanSignature(value);
    if (cleaned) seen.add(cleaned);
  }
  return [...seen];
}

function expectedDigests(rawBody: string, secret: string): string[] {
  const hmac = createHmac('sha256', secret).update(rawBody);
  const hex = hmac.digest('hex');
  const base64 = createHmac('sha256', secret).update(rawBody).digest('base64');
  return [hex, hex.toUpperCase(), base64];
}

/**
 * Verify a LifeMetrics webhook signature against the raw body.
 * Returns false when the secret is empty, no signature header is present,
 * or none of the presented signatures match.
 */
export function verifyLifemetricsWebhookSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  if (!secret) return false;
  const presented = collectSignatures(headers);
  if (presented.length === 0) return false;
  const expected = expectedDigests(rawBody, secret);
  for (const signature of presented) {
    for (const candidate of expected) {
      if (safeEqual(signature, candidate)) return true;
    }
  }
  return false;
}

export function readLifemetricsWebhookSecret(): string {
  return process.env.LIFEMETRICS_WEBHOOK_SECRET ?? '';
}
