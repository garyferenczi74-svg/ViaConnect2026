// Prompt #122 P1: HMAC-SHA256 deterministic-per-packet pseudonymizer.
//
// pseudonym(realId, packetUuid, context) =
//   HMAC-SHA256(
//     key = per-packet HMAC key from Vault,
//     data = packetUuid || ':' || context || ':' || realId
//   )
//   first 16 bytes, base32 encoded (uppercase, unpadded)
//
// Properties:
//   - Within a packet: same real ID + context → same pseudonym (auditor can
//     trace a user across multiple evidence files)
//   - Across packets: same real ID → different pseudonym (auditor cannot
//     correlate the same user across quarterly packets without explicit
//     re-identification via the dual-approval procedure)
//   - Irreversible without the Vault-held key; once a packet's key is
//     destroyed (after retention), re-identification is cryptographically
//     impossible.

import { createHmac, randomBytes } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PSEUDONYM_BYTES = 16; // 128 bits — collision-resistant for any real-world packet size

export interface PseudonymizeInput {
  packetUuid: string;
  context: string;
  realId: string;
  key: Buffer;
}

/**
 * Compute the pseudonym for a single real ID in a single packet + context.
 * Deterministic: same inputs always produce the same output.
 */
export function pseudonymize(input: PseudonymizeInput): string {
  if (!input.packetUuid || input.packetUuid.length === 0) {
    throw new Error('packetUuid is required');
  }
  if (!input.context || input.context.length === 0) {
    throw new Error('context is required');
  }
  if (!input.key || input.key.length === 0) {
    throw new Error('key is required');
  }
  // realId can be empty (e.g., nullable FK) — in that case return a sentinel.
  if (input.realId === '' || input.realId === null || input.realId === undefined) {
    return '';
  }

  const hmac = createHmac('sha256', input.key);
  hmac.update(input.packetUuid);
  hmac.update(':');
  hmac.update(input.context);
  hmac.update(':');
  hmac.update(String(input.realId));
  const digest = hmac.digest();
  const truncated = digest.subarray(0, PSEUDONYM_BYTES);
  return base32Encode(truncated);
}

/**
 * Generate a new per-packet HMAC key. 256 bits of CSPRNG output.
 * Called once at packet creation; the key is stored in Supabase Vault
 * referenced by soc2_pseudonym_keys.key_ref.
 */
export function generatePacketHmacKey(): Buffer {
  return randomBytes(32);
}

/**
 * Unpadded base32 (RFC 4648 alphabet) for URL-safe, caseless pseudonyms.
 * Input 16 bytes → output 26 characters (no padding).
 */
function base32Encode(buf: Buffer): string {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}
