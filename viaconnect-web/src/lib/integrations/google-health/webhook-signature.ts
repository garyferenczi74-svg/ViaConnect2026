// Prompt 203: Google Health webhook signature verification.
//
// Google signs the raw webhook JSON body with ECDSA P-256 (SHA-256) using Tink's
// PublicKeySign. The signature arrives base64 in a header; verification uses
// Google's public keyset at the gstatic URL below (a Tink keyset JSON whose keys
// rotate about every 30 days). We parse the EcdsaPublicKey protobuf, handle the
// Tink output-prefix on the signature, normalize DER vs IEEE-P1363, and verify
// with Web Crypto.
//
// Safety: any parsing, fetch, or crypto error returns false (fail closed). The
// function only returns true on a real cryptographic match, so a parsing bug
// cannot forge a pass; it can only fail closed, in which case polling still
// ingests. Exact header name and encoding are still confirmed against the first
// real notification; the candidate set below brute-forces the small space.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { safeLog } from "@/lib/utils/safe-log";
import { withAbortTimeout, isTimeoutError } from "@/lib/utils/with-timeout";

const SCOPE = "lib.integrations.google-health.webhook-signature";
export const GOOGLE_HEALTH_WEBHOOK_KEYSET_URL =
  "https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json";
const KEYSET_TTL_MS = 60 * 60 * 1000; // 1 hour; keys rotate about every 30 days
const FETCH_TIMEOUT_MS = 4000;

interface ParsedKey {
  x: Uint8Array; // 32 bytes
  y: Uint8Array; // 32 bytes
}

let cache: { at: number; keys: ParsedKey[] } | null = null;

function readVarint(buf: Uint8Array, pos: number): [number, number] {
  let result = 0;
  let shift = 0;
  let p = pos;
  for (;;) {
    const b = buf[p++];
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [result >>> 0, p];
}

// Minimal protobuf scanner yielding length-delimited and varint fields.
function* protoFields(buf: Uint8Array): Generator<{ field: number; wire: number; bytes?: Uint8Array; value?: number }> {
  let pos = 0;
  while (pos < buf.length) {
    const [tag, p1] = readVarint(buf, pos);
    pos = p1;
    const field = tag >>> 3;
    const wire = tag & 7;
    if (wire === 0) {
      const [value, p2] = readVarint(buf, pos);
      pos = p2;
      yield { field, wire, value };
    } else if (wire === 2) {
      const [len, p2] = readVarint(buf, pos);
      const start = p2;
      pos = p2 + len;
      yield { field, wire, bytes: buf.slice(start, pos) };
    } else if (wire === 5) {
      pos += 4;
    } else if (wire === 1) {
      pos += 8;
    } else {
      throw new Error(`unsupported wire type ${wire}`);
    }
  }
}

function stripLeadingZeros(b: Uint8Array): Uint8Array {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  return b.slice(i);
}

function leftPad32(b: Uint8Array): Uint8Array {
  const stripped = stripLeadingZeros(b);
  if (stripped.length >= 32) return stripped.slice(stripped.length - 32);
  const out = new Uint8Array(32);
  out.set(stripped, 32 - stripped.length);
  return out;
}

// EcdsaPublicKey protobuf: version=1, params=2, x=3 (bytes), y=4 (bytes).
function parseEcdsaPublicKey(value: Uint8Array): ParsedKey | null {
  let x: Uint8Array | null = null;
  let y: Uint8Array | null = null;
  for (const f of protoFields(value)) {
    if (f.field === 3 && f.bytes) x = f.bytes;
    else if (f.field === 4 && f.bytes) y = f.bytes;
  }
  if (!x || !y) return null;
  return { x: leftPad32(x), y: leftPad32(y) };
}

async function loadKeyset(): Promise<ParsedKey[]> {
  if (cache && Date.now() - cache.at < KEYSET_TTL_MS) return cache.keys;
  try {
    const res = await withAbortTimeout(
      (signal) => fetch(GOOGLE_HEALTH_WEBHOOK_KEYSET_URL, { signal }),
      FETCH_TIMEOUT_MS,
      `${SCOPE}.keyset`,
    );
    if (!res.ok) {
      safeLog.warn(SCOPE, "keyset fetch non-2xx", { status: res.status });
      return cache?.keys ?? [];
    }
    const json = (await res.json()) as { key?: Array<{ keyData?: { value?: string } }> };
    const keys: ParsedKey[] = [];
    // Cap the keyset (the gstatic source holds only a handful with 30-day
    // rotation); bounds the verify work per request.
    for (const k of (json.key ?? []).slice(0, 32)) {
      const raw = k.keyData?.value;
      if (!raw) continue;
      try {
        const parsed = parseEcdsaPublicKey(new Uint8Array(Buffer.from(raw, "base64")));
        if (parsed) keys.push(parsed);
      } catch {
        // skip a malformed key
      }
    }
    cache = { at: Date.now(), keys };
    return keys;
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn(SCOPE, "keyset fetch timeout", { error: err });
    else safeLog.warn(SCOPE, "keyset fetch error", { error: err });
    return cache?.keys ?? [];
  }
}

// DER ECDSA signature (SEQUENCE { INTEGER r, INTEGER s }) to IEEE-P1363 (r||s).
function derToP1363(der: Uint8Array): Uint8Array | null {
  try {
    let i = 0;
    if (der[i++] !== 0x30) return null;
    let seqLen = der[i++];
    if (seqLen & 0x80) {
      const n = seqLen & 0x7f;
      seqLen = 0;
      for (let k = 0; k < n; k++) seqLen = (seqLen << 8) | der[i++];
    }
    if (der[i++] !== 0x02) return null;
    const rLen = der[i++];
    const r = der.slice(i, i + rLen);
    i += rLen;
    if (der[i++] !== 0x02) return null;
    const sLen = der[i++];
    const s = der.slice(i, i + sLen);
    const out = new Uint8Array(64);
    out.set(leftPad32(r), 0);
    out.set(leftPad32(s), 32);
    return out;
  } catch {
    return null;
  }
}

async function importKey(k: ParsedKey): Promise<CryptoKey | null> {
  try {
    const point = new Uint8Array(65);
    point[0] = 0x04;
    point.set(k.x, 1);
    point.set(k.y, 33);
    return await crypto.subtle.importKey("raw", point, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  } catch {
    return null;
  }
}

// Verify a base64 signature header over the raw body. Brute-forces the small
// space of Tink-prefix-stripped vs not, and DER vs P1363, against each key.
export async function verifyGoogleHealthWebhook(signatureHeader: string, rawBody: string): Promise<boolean> {
  let sigBytes: Uint8Array;
  try {
    sigBytes = new Uint8Array(Buffer.from(signatureHeader, "base64"));
  } catch {
    return false;
  }
  if (sigBytes.length === 0) return false;

  // Candidate signature byte strings: as-is, and with the 5-byte Tink output
  // prefix removed (1-byte version + 4-byte key id).
  const candidates: Uint8Array[] = [sigBytes];
  if (sigBytes.length > 5) candidates.push(sigBytes.slice(5));

  // For each candidate, derive a P1363 form (raw 64 bytes, or DER converted).
  const p1363Candidates: Uint8Array[] = [];
  for (const c of candidates) {
    if (c.length === 64) p1363Candidates.push(c);
    if (c[0] === 0x30) {
      const conv = derToP1363(c);
      if (conv) p1363Candidates.push(conv);
    }
  }
  if (p1363Candidates.length === 0) return false;

  const keys = await loadKeyset();
  if (keys.length === 0) return false;

  const data = new TextEncoder().encode(rawBody);
  for (const k of keys) {
    const cryptoKey = await importKey(k);
    if (!cryptoKey) continue;
    for (const sig of p1363Candidates) {
      try {
        const ok = await crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          cryptoKey,
          sig as BufferSource,
          data as BufferSource,
        );
        if (ok) return true;
      } catch {
        // try the next candidate
      }
    }
  }
  return false;
}
