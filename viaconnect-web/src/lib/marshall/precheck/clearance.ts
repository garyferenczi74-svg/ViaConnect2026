/**
 * ES256 clearance receipt sign + verify, hand-rolled on Node crypto.
 * No `jose` or `jsonwebtoken` dep; works against the stdlib.
 *
 * JWS compact form: base64url(header).base64url(payload).base64url(signature)
 * Signature is raw R||S (64 bytes for P-256), NOT DER. Node produces DER by
 * default, so we convert. Same for verify in reverse.
 */

import {
  createSign,
  createVerify,
  createPrivateKey,
  createPublicKey,
  randomUUID,
  type KeyObject,
} from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClearanceReceiptDto, Jwks, JwkEc, ReceiptPayload } from "./types";
import { RECEIPT_TTL_SECONDS } from "./types";

// ── base64url helpers ───────────────────────────────────────────────────────
function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4 || 4);
  const padded = input + "=".repeat(pad % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// ── DER <-> raw signature conversion (P-256) ────────────────────────────────
// Node's crypto.sign outputs a DER-encoded ECDSA signature (SEQUENCE of two
// INTEGER). JWS requires concatenated R || S, each left-padded to 32 bytes.
function derToRaw(der: Buffer, componentBytes: number = 32): Buffer {
  // Minimal DER parser for ECDSA-Sig-Value ::= SEQUENCE { r INTEGER, s INTEGER }
  if (der[0] !== 0x30) throw new Error("derToRaw: not a SEQUENCE");
  let offset = 2;
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f); // long-form length
  if (der[offset] !== 0x02) throw new Error("derToRaw: expected INTEGER r");
  const rLen = der[offset + 1];
  let r = der.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error("derToRaw: expected INTEGER s");
  const sLen = der[offset + 1];
  let s = der.subarray(offset + 2, offset + 2 + sLen);
  // Strip leading zero padding byte if present, then left-pad to componentBytes
  if (r.length > componentBytes && r[0] === 0x00) r = r.subarray(1);
  if (s.length > componentBytes && s[0] === 0x00) s = s.subarray(1);
  const rOut = Buffer.concat([Buffer.alloc(componentBytes - r.length, 0), r]);
  const sOut = Buffer.concat([Buffer.alloc(componentBytes - s.length, 0), s]);
  return Buffer.concat([rOut, sOut]);
}

function rawToDer(raw: Buffer, componentBytes: number = 32): Buffer {
  if (raw.length !== componentBytes * 2) throw new Error("rawToDer: wrong length");
  const r = trimLeadingZeros(raw.subarray(0, componentBytes));
  const s = trimLeadingZeros(raw.subarray(componentBytes));
  const rDer = Buffer.concat([Buffer.from([0x02, r.length]), r]);
  const sDer = Buffer.concat([Buffer.from([0x02, s.length]), s]);
  const seq = Buffer.concat([rDer, sDer]);
  return Buffer.concat([Buffer.from([0x30, seq.length]), seq]);
}
function trimLeadingZeros(buf: Buffer): Buffer {
  let out = buf;
  while (out.length > 1 && out[0] === 0x00 && (out[1] & 0x80) === 0) out = out.subarray(1);
  // If top bit is set, prepend a zero so the integer stays positive
  if (out[0] & 0x80) out = Buffer.concat([Buffer.from([0x00]), out]);
  return out;
}

// ── Key loading ─────────────────────────────────────────────────────────────
interface SigningKeyMaterial {
  kid: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
  jwk: JwkEc;
}

let cachedSigner: SigningKeyMaterial | null = null;

function loadActiveSigner(): SigningKeyMaterial {
  if (cachedSigner) return cachedSigner;
  const privPem = process.env.MARSHALL_PRECHECK_SIGNING_KEY_PEM;
  const kid = process.env.MARSHALL_PRECHECK_SIGNING_KID ?? "marshall-precheck-k1";
  if (!privPem) throw new Error("MARSHALL_PRECHECK_SIGNING_KEY_PEM env not set");
  const privateKey = createPrivateKey({ key: privPem, format: "pem" });
  const publicKey = createPublicKey(privateKey);
  const jwkExport = publicKey.export({ format: "jwk" }) as Record<string, string>;
  const jwk: JwkEc = {
    kty: "EC",
    crv: "P-256",
    x: jwkExport.x,
    y: jwkExport.y,
    kid,
    alg: "ES256",
    use: "sig",
  };
  cachedSigner = { kid, privateKey, publicKey, jwk };
  return cachedSigner;
}

// ── Public API ──────────────────────────────────────────────────────────────
export function signReceipt(payload: Omit<ReceiptPayload, "iat" | "exp" | "iss" | "jti">, ttlSeconds: number = RECEIPT_TTL_SECONDS): {
  jwt: string;
  receiptId: string;
  signingKeyId: string;
  issuedAt: string;
  expiresAt: string;
} {
  const signer = loadActiveSigner();
  const now = Math.floor(Date.now() / 1000);
  const jti = randomUUID();
  const fullPayload: ReceiptPayload = {
    iss: "marshall.viaconnect",
    iat: now,
    exp: now + ttlSeconds,
    jti,
    ...payload,
  };
  const header = { alg: "ES256", typ: "JWT", kid: signer.kid };
  const encHeader = b64urlEncode(JSON.stringify(header));
  const encPayload = b64urlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encHeader}.${encPayload}`;
  const der = createSign("sha256").update(signingInput).sign(signer.privateKey);
  const raw = derToRaw(der, 32);
  const encSig = b64urlEncode(raw);
  const jwt = `${signingInput}.${encSig}`;
  return {
    jwt,
    receiptId: jti,
    signingKeyId: signer.kid,
    issuedAt: new Date(fullPayload.iat * 1000).toISOString(),
    expiresAt: new Date(fullPayload.exp * 1000).toISOString(),
  };
}

export function verifyReceipt(jwt: string, publicKeyPem?: string): { valid: boolean; payload?: ReceiptPayload; reason?: string } {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { valid: false, reason: "malformed" };
  const [encHeader, encPayload, encSig] = parts;
  const header = JSON.parse(b64urlDecode(encHeader).toString("utf8")) as { alg: string; kid?: string };
  if (header.alg !== "ES256") return { valid: false, reason: "unsupported_alg" };
  const payload = JSON.parse(b64urlDecode(encPayload).toString("utf8")) as ReceiptPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { valid: false, reason: "expired", payload };
  const pubKey = publicKeyPem ? createPublicKey({ key: publicKeyPem, format: "pem" }) : loadActiveSigner().publicKey;
  const raw = b64urlDecode(encSig);
  const der = rawToDer(raw, 32);
  const ok = createVerify("sha256").update(`${encHeader}.${encPayload}`).verify(pubKey, der);
  return ok ? { valid: true, payload } : { valid: false, reason: "bad_signature", payload };
}

export interface IssueReceiptInput {
  sessionId: string;
  practitionerId: string;
  draftHashSha256: string;
  rulesRun: string[];
  findingsFinal: { p0: number; p1: number; p2: number; p3: number; advisory: number };
  publicSessionId: string;
}

export async function issueReceipt(input: IssueReceiptInput, db: SupabaseClient): Promise<ClearanceReceiptDto> {
  const { jwt, receiptId, signingKeyId, issuedAt, expiresAt } = signReceipt({
    sub: `practitioner:${input.practitionerId}`,
    draftHashSha256: input.draftHashSha256,
    normalizationVersion: "v1.0.0",
    ruleRegistryVersion: "v4.3.7",
    rulesRun: input.rulesRun,
    findingsFinal: input.findingsFinal,
    sessionId: input.publicSessionId,
  });

  const { error } = await db.from("precheck_clearance_receipts").insert({
    receipt_id: receiptId,
    session_id: input.sessionId,
    practitioner_id: input.practitionerId,
    draft_hash_sha256: input.draftHashSha256,
    jwt_compact: jwt,
    signing_key_id: signingKeyId,
    issued_at: issuedAt,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`receipt persist failed: ${error.message}`);

  return {
    receiptId,
    jwt,
    issuedAt,
    expiresAt,
    signingKeyId,
    draftHashSha256: input.draftHashSha256,
    rulesRun: input.rulesRun,
    findingsFinal: input.findingsFinal,
  };
}

export function getJwks(): Jwks {
  try {
    const signer = loadActiveSigner();
    return { keys: [signer.jwk] };
  } catch {
    return { keys: [] };
  }
}

export function jaccardSimilarity(a: string, b: string): number {
  const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const tA = tokens(a);
  const tB = tokens(b);
  if (tA.size === 0 && tB.size === 0) return 1;
  let intersect = 0;
  for (const t of tA) if (tB.has(t)) intersect++;
  const union = tA.size + tB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}
