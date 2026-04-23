// Prompt #112 — APNS (iOS) adapter stub.
// Mobile-app-existence is an open question (§19 Q2). When the app ships,
// this file wires APNS via HTTP/2 with a JWT signed by the .p8 key stored
// in Supabase Vault. Until then, isConfigured() returns false.

export interface ApnsSendResult { ok: boolean; error?: string; token_invalidated?: boolean }

export function isConfigured(): boolean {
  return !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_P8_VAULT_REF);
}

export async function sendApns(_token: string, _title: string, _body: string, _data: Record<string, unknown>): Promise<ApnsSendResult> {
  if (!isConfigured()) return { ok: false, error: "apns_not_configured" };
  // Activation task: load .p8 from Vault, sign ES256 JWT with APNS audience,
  // POST via HTTP/2 to api.push.apple.com, parse Unregistered response.
  return { ok: false, error: "apns_activation_pending" };
}
