// Prompt 201b: at-rest encryption for Google Health OAuth tokens.
//
// The prompt requires access and refresh tokens stored encrypted server-side.
// The pre-existing integrations pipeline stores third-party tokens as plaintext
// in data_source_connections; rather than rewrite that shared path, the Google
// Health connector encrypts its own tokens at the application layer before they
// touch the table, and decrypts on read. AES-256-GCM with a server-only key.
//
// The key is GOOGLE_HEALTH_TOKEN_KEY: 32 bytes, supplied base64 or hex. If it is
// absent the connector treats itself as not configured (the Connect control
// reports not configured); we never silently store a plaintext token.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "ghx1"; // versioned envelope tag: Google Health encryption v1
const ALGO = "aes-256-gcm";

function loadKey(): Buffer | null {
  const raw = process.env.GOOGLE_HEALTH_TOKEN_KEY;
  if (!raw) return null;
  const trimmed = raw.trim();
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, "hex");
  } else {
    try {
      key = Buffer.from(trimmed, "base64");
    } catch {
      return null;
    }
  }
  return key.length === 32 ? key : null;
}

export function isTokenEncryptionConfigured(): boolean {
  return loadKey() !== null;
}

// Presence-only diagnostic for the token key: lengths, never the value. A valid
// key is rawLen 64 (hex) or 44 (base64) and decodedLen 32. rawLen 66 usually
// means the value was wrapped in quotes; decodedLen other than 32 means wrong
// length or a non-hex 64-char value falling back to base64.
export function tokenKeyDiagnostics(): {
  present: boolean;
  rawLen: number;
  decodedLen: number;
  valid: boolean;
} {
  const raw = process.env.GOOGLE_HEALTH_TOKEN_KEY;
  if (!raw) return { present: false, rawLen: 0, decodedLen: 0, valid: false };
  const trimmed = raw.trim();
  let decodedLen = -1;
  try {
    decodedLen = /^[0-9a-fA-F]{64}$/.test(trimmed)
      ? Buffer.from(trimmed, "hex").length
      : Buffer.from(trimmed, "base64").length;
  } catch {
    decodedLen = -1;
  }
  return { present: true, rawLen: trimmed.length, decodedLen, valid: decodedLen === 32 };
}

// Encrypt a token. Throws if the key is missing or invalid: callers must check
// isTokenEncryptionConfigured first and refuse to connect without it.
export function encryptToken(plaintext: string): string {
  const key = loadKey();
  if (!key) throw new Error("GOOGLE_HEALTH_TOKEN_KEY missing or not 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

// Decrypt a token. Throws on a malformed envelope, missing key, or auth-tag
// mismatch. Use tryDecryptToken when a failure should be soft.
export function decryptToken(payload: string): string {
  const key = loadKey();
  if (!key) throw new Error("GOOGLE_HEALTH_TOKEN_KEY missing or not 32 bytes");
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("malformed encrypted token envelope");
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX + ":");
}

// Soft decrypt: returns null instead of throwing, for read paths that must
// fail open and mark a connection for re-auth rather than crash.
export function tryDecryptToken(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decryptToken(payload);
  } catch {
    return null;
  }
}
