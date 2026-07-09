// =============================================================================
// src/lib/waitlist/unsubscribe-token.ts
// =============================================================================
// Prompt 210f Task F4b. Pure unsubscribe token module: sign + verify with
// HMAC-SHA256 and a constant-time signature comparison. This is the CANONICAL
// definition of the token format; the practitioner waitlist mailer
// (supabase/functions/practitioner-waitlist-mailer/index.ts) carries a Deno
// crypto.subtle signer mirror that must produce byte-identical tokens, and
// GET /api/waitlist/unsubscribe verifies with this module.
//
// Token contract (pinned by src/lib/waitlist/__tests__/unsubscribe-token.test.ts):
//   token       = <waitlistId>.<signature>
//   waitlistId  = lowercase UUID: the practitioner_waitlist row's existing
//                 unique id (no new column, no PII in the token)
//   signature   = 64 lowercase hex chars, HMAC-SHA256(secret, waitlistId)
//   secret      = UNSUBSCRIBE_TOKEN_SECRET. Gary sets it at arming, in the
//                 Vercel env (route verify side) AND as a Supabase function
//                 secret (mailer sign side), same value. Missing secret:
//                 sign throws (mailer must fail loud), verify fails closed
//                 (and the route 503s before even calling verify).
//
// PURITY CONSTRAINTS: node:crypto only. No env reads, no I/O, no Supabase.
// Tokens carry no email address and no name; forging one requires the
// secret, so the endpoint does not become an enumeration or mass-
// unsubscribe oracle. Verification is idempotent by design downstream
// (single-row update keyed by the unique id).
//
// Rules: zero any, no em dashes, no en dashes, no emojis.
// =============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Lowercase UUID shape of practitioner_waitlist.id. Strict: no case folding. */
const WAITLIST_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 64 lowercase hex chars = 32-byte HMAC-SHA256 digest. Strict lowercase. */
const SIGNATURE_RE = /^[0-9a-f]{64}$/;

/** Hard ceiling on accepted token length: uuid(36) + '.'(1) + hex(64). */
const TOKEN_LENGTH = 101;

export type UnsubscribeTokenVerification =
  | { valid: true; waitlistId: string }
  | { valid: false };

function hmacHex(waitlistId: string, secret: string): string {
  return createHmac('sha256', secret).update(waitlistId).digest('hex');
}

/**
 * Signs a waitlist row id into an unsubscribe token.
 *
 * Fails LOUD (throws) on an empty secret or a malformed id: the caller is
 * our own mailer, and a misconfiguration there must surface as an error,
 * never as an email carrying a broken unsubscribe link.
 */
export function signUnsubscribeToken(waitlistId: string, secret: string): string {
  if (!secret) {
    throw new Error('signUnsubscribeToken: secret is required (UNSUBSCRIBE_TOKEN_SECRET unset)');
  }
  if (!WAITLIST_ID_RE.test(waitlistId)) {
    throw new Error('signUnsubscribeToken: waitlistId must be a lowercase UUID');
  }
  return `${waitlistId}.${hmacHex(waitlistId, secret)}`;
}

/**
 * Verifies an unsubscribe token. NEVER throws: any malformed, tampered,
 * cross-secret, or over-length input, and any missing secret, returns
 * { valid: false } (fail closed). Structure is checked before any HMAC
 * work; the signature comparison is constant-time (timingSafeEqual) so the
 * endpoint leaks no timing signal about partial matches.
 */
export function verifyUnsubscribeToken(
  token: string | null | undefined,
  secret: string | null | undefined,
): UnsubscribeTokenVerification {
  if (!secret) return { valid: false };
  if (typeof token !== 'string' || token.length !== TOKEN_LENGTH) {
    return { valid: false };
  }

  const separatorIndex = token.indexOf('.');
  if (separatorIndex === -1) return { valid: false };
  const waitlistId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!WAITLIST_ID_RE.test(waitlistId)) return { valid: false };
  if (!SIGNATURE_RE.test(signature)) return { valid: false };

  const expected = Buffer.from(hmacHex(waitlistId, secret), 'hex');
  const provided = Buffer.from(signature, 'hex');
  if (expected.length !== provided.length) return { valid: false };
  if (!timingSafeEqual(expected, provided)) return { valid: false };

  return { valid: true, waitlistId };
}
