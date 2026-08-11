// Prompt 212: AES-256-GCM token encryption for wearable OAuth tokens.
// Uses WEARABLE_TOKEN_KEY (32 bytes, hex or base64). Tokens never logged.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "wvx1";
const ALGO = "aes-256-gcm";

function loadKey(): Buffer | null {
  const raw = process.env.WEARABLE_TOKEN_KEY;
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

export function isWearableTokenKeyConfigured(): boolean {
  return loadKey() !== null;
}

export function encryptWearableToken(plaintext: string): string {
  const key = loadKey();
  if (!key) throw new Error("WEARABLE_TOKEN_KEY missing or not 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptWearableToken(payload: string): string {
  const key = loadKey();
  if (!key) throw new Error("WEARABLE_TOKEN_KEY missing or not 32 bytes");
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("malformed wearable token envelope");
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function tryDecryptWearableToken(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decryptWearableToken(payload);
  } catch {
    return null;
  }
}
