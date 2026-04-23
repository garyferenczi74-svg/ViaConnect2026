/// <reference types="chrome" />
/**
 * Thin API client used by the service worker to dispatch scans and fetch
 * receipt verification. No retries or caching here; sw.ts owns that.
 */

const BASE = "https://via-connect2026.vercel.app";

export async function scanDraft(token: string, text: string, platform?: string): Promise<unknown> {
  const r = await fetch(`${BASE}/api/marshall/precheck/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text, targetPlatform: platform, source: "extension" }),
  });
  if (!r.ok) throw new Error(`scan ${r.status}`);
  return r.json();
}

export async function fetchJwks(): Promise<unknown> {
  const r = await fetch(`${BASE}/.well-known/marshall-clearance-jwks.json`);
  if (!r.ok) throw new Error(`jwks ${r.status}`);
  return r.json();
}
