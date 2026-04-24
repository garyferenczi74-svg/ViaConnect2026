// Prompt #122 P2: ES256 signing + verification via node:crypto.
//
// Signing payload: the manifest serialized via manifestSigningBytes() in
// manifest.ts (i.e., stable JSON with the signature field stripped).
//
// Output: JWT compact serialization
//   base64url(header) || '.' || base64url(payload) || '.' || base64url(signature)
//
// Header always: { "alg": "ES256", "kid": <signingKeyId> }
//
// The private key never leaves the server; it's loaded from Supabase Vault
// at packet-generation time. The public key is published via the JWKS
// endpoint at /.well-known/soc2-packet-jwks.json.

import {
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  type KeyObject,
} from 'node:crypto';

export interface SignOptions {
  signingKeyId: string;
  privateKeyPem: string;
}

/**
 * Sign a canonical payload and return a JWT compact serialization.
 */
export function signPayload(payloadBytes: Buffer, opts: SignOptions): string {
  const headerJson = JSON.stringify({ alg: 'ES256', kid: opts.signingKeyId });
  const headerB64 = base64UrlEncode(Buffer.from(headerJson, 'utf8'));
  const payloadB64 = base64UrlEncode(payloadBytes);
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');

  const privKey = createPrivateKey({ key: opts.privateKeyPem, format: 'pem' });
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  // DER-encoded ECDSA signature, convert to JOSE (raw r||s, each 32 bytes).
  const derSig = signer.sign(privKey);
  const joseSig = derToJose(derSig, 32);
  const sigB64 = base64UrlEncode(joseSig);

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

export interface VerifyResult {
  ok: boolean;
  kid?: string;
  reason?: 'malformed' | 'unknown_kid' | 'bad_signature' | 'payload_mismatch';
}

/**
 * Verify a JWT compact signature against a public key (PEM).
 * Returns ok=true iff the signature validates against the given payload.
 */
export function verifyJwtCompact(
  jwtCompact: string,
  expectedPayloadBytes: Buffer,
  publicKeyPemByKid: Record<string, string>,
): VerifyResult {
  const parts = jwtCompact.split('.');
  if (parts.length !== 3) {
    return { ok: false, reason: 'malformed' };
  }
  const [headerB64, payloadB64, sigB64] = parts;
  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (header.alg !== 'ES256' || !header.kid) {
    return { ok: false, reason: 'malformed' };
  }
  const publicKeyPem = publicKeyPemByKid[header.kid];
  if (!publicKeyPem) {
    return { ok: false, kid: header.kid, reason: 'unknown_kid' };
  }

  // Payload byte equality — we sign the canonical manifest, caller passes
  // the same bytes. If they differ, refuse even if the signature math
  // happens to validate against a different payload (shouldn't, but
  // defense-in-depth).
  const embeddedPayload = base64UrlDecode(payloadB64);
  if (!bufferEquals(embeddedPayload, expectedPayloadBytes)) {
    return { ok: false, kid: header.kid, reason: 'payload_mismatch' };
  }

  const joseSig = base64UrlDecode(sigB64);
  const derSig = joseToDer(joseSig);
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  const verifier = createVerify('SHA256');
  verifier.update(signingInput);
  verifier.end();
  const ok = verifier.verify(createPublicKey({ key: publicKeyPem, format: 'pem' }), derSig);

  return ok ? { ok: true, kid: header.kid } : { ok: false, kid: header.kid, reason: 'bad_signature' };
}

/**
 * Generate a fresh ES256 (P-256) keypair. Returns PEM encodings.
 * The private key PEM is expected to land in Supabase Vault; the public key
 * PEM lands in soc2_signing_keys.public_key_pem.
 */
export function generateEs256Keypair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }) as string;
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
  return { publicKeyPem, privateKeyPem };
}

// ─── base64url + DER/JOSE helpers ──────────────────────────────────────────

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(s: string): Buffer {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s + '='.repeat(padLen);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function bufferEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Convert DER-encoded ECDSA signature (from node:crypto.sign) to JOSE
 * raw r||s encoding for JWT. Each of r and s is zero-padded to `intLen` bytes.
 * For P-256 intLen = 32.
 */
function derToJose(der: Buffer, intLen: number): Buffer {
  // DER: 0x30 LEN 0x02 LEN_R R 0x02 LEN_S S
  let p = 0;
  if (der[p++] !== 0x30) throw new Error('invalid DER signature');
  const totalLen = readLen();
  if (p + totalLen !== der.length) throw new Error('DER length mismatch');
  if (der[p++] !== 0x02) throw new Error('invalid DER R marker');
  const rLen = readLen();
  const r = der.subarray(p, p + rLen);
  p += rLen;
  if (der[p++] !== 0x02) throw new Error('invalid DER S marker');
  const sLen = readLen();
  const s = der.subarray(p, p + sLen);

  return Buffer.concat([padLeft(stripLeadingZero(r), intLen), padLeft(stripLeadingZero(s), intLen)]);

  function readLen(): number {
    const first = der[p++];
    if ((first & 0x80) === 0) return first;
    const nBytes = first & 0x7f;
    let len = 0;
    for (let i = 0; i < nBytes; i++) {
      len = (len << 8) | der[p++];
    }
    return len;
  }
}

function joseToDer(jose: Buffer): Buffer {
  const half = jose.length / 2;
  const r = prepForDer(jose.subarray(0, half));
  const s = prepForDer(jose.subarray(half));
  const seqLen = 2 + r.length + 2 + s.length;
  const out = Buffer.alloc(2 + seqLen);
  out[0] = 0x30;
  out[1] = seqLen;
  out[2] = 0x02;
  out[3] = r.length;
  r.copy(out, 4);
  out[4 + r.length] = 0x02;
  out[5 + r.length] = s.length;
  s.copy(out, 6 + r.length);
  return out;
}

function prepForDer(buf: Buffer): Buffer {
  // Strip leading zero bytes, then re-add a single 0x00 prefix if top bit is set.
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0x00) i++;
  const stripped = buf.subarray(i);
  if ((stripped[0] & 0x80) !== 0) {
    return Buffer.concat([Buffer.from([0x00]), stripped]);
  }
  return stripped;
}

function stripLeadingZero(buf: Buffer): Buffer {
  // DER adds a single 0x00 prefix when the next byte's MSB is set (so a
  // positive integer isn't misread as negative). We strip that one byte
  // only; leading zeros that are real data stay.
  if (buf.length > 1 && buf[0] === 0x00 && (buf[1] & 0x80) !== 0) {
    return buf.subarray(1);
  }
  return buf;
}

function padLeft(buf: Buffer, len: number): Buffer {
  if (buf.length >= len) return buf;
  const out = Buffer.alloc(len);
  buf.copy(out, len - buf.length);
  return out;
}

// Exported for use by JWKS module (converts PEM to KeyObject for JWK export).
export function publicKeyObjectFromPem(pem: string): KeyObject {
  return createPublicKey({ key: pem, format: 'pem' });
}
