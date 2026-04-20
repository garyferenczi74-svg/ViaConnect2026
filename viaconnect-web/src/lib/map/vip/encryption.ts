// Prompt #101 Workstream C — sensitive note encryption via pgcrypto.
//
// Application-side wrapper that delegates to Postgres pgcrypto. The
// encryption key is managed server-side via a Supabase Vault secret
// (VIP_SENSITIVE_NOTE_KEY). Client code never handles the key; the
// endpoint or edge function performs the encrypt/decrypt round-trip.
//
// Rationale: keeping the ciphertext round-trip in Postgres means the
// BYTEA at rest is always encrypted even to anyone with read access
// to the raw table. Only callers who can successfully execute the
// encryption functions (gated by RLS + service_role) can decrypt.

import { createHash } from 'crypto';

/** Pure: SHA-256 hash of plaintext for tamper detection. The row
 *  writer includes this alongside the ciphertext; a later reader can
 *  recompute the hash after decryption and compare. */
export function hashSensitiveContent(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

/** Pure: minimum length guard so we don't store trivially-empty notes. */
export function isSensitiveNotePlausible(plaintext: string): boolean {
  return plaintext.trim().length >= 20 && plaintext.trim().length <= 4000;
}

/** Pure: redact a sensitive preview for admin list views (no content,
 *  just length + hash prefix). Callers that shouldn't see the full
 *  content render this summary instead. */
export function redactedNotePreview(contentHash: string, plaintextLength: number): string {
  return `encrypted note (${plaintextLength} chars; hash ${contentHash.slice(0, 8)})`;
}
