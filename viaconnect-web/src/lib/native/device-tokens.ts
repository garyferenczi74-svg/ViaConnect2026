export const NATIVE_DEVICE_TOKEN_MAX = 8;

export interface StoredDeviceToken {
  token: string;
  platform: "ios" | "android";
  last_seen_at: string;
}

export function isDeviceTokenPlatform(value: unknown): value is "ios" | "android" {
  return value === "ios" || value === "android";
}

export function isAcceptableDeviceToken(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 16 || trimmed.length > 4096) return false;
  return /^[A-Za-z0-9._:+/=-]+$/.test(trimmed);
}

export function parseStoredDeviceTokens(value: unknown): StoredDeviceToken[] {
  if (!Array.isArray(value)) return [];
  const out: StoredDeviceToken[] = [];
  for (const row of value) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    if (!isAcceptableDeviceToken(record.token) || !isDeviceTokenPlatform(record.platform)) continue;
    out.push({
      token: record.token.trim(),
      platform: record.platform,
      last_seen_at: typeof record.last_seen_at === "string" ? record.last_seen_at : "",
    });
  }
  return out;
}

export function mergeDeviceTokens(current: unknown, next: StoredDeviceToken): StoredDeviceToken[] {
  const kept = parseStoredDeviceTokens(current).filter((row) => row.token !== next.token);
  return [...kept, next].slice(-NATIVE_DEVICE_TOKEN_MAX);
}
