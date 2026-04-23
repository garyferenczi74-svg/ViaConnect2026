// Prompt #112 — FCM (Android) adapter stub.
// Mobile-app-existence is an open question (§19 Q2). If the app ships, this
// file wires up HTTP v1 API (https://fcm.googleapis.com/v1/projects/{id}/messages:send)
// using a service-account JWT. Until then, isConfigured() returns false and
// the dispatcher silently skips FCM.

export interface FcmSendResult { ok: boolean; error?: string; token_invalidated?: boolean }

export function isConfigured(): boolean {
  return !!(process.env.FCM_PROJECT_ID && process.env.FCM_SERVICE_ACCOUNT_JSON_VAULT_REF);
}

export async function sendFcm(_token: string, _title: string, _body: string, _data: Record<string, unknown>): Promise<FcmSendResult> {
  if (!isConfigured()) return { ok: false, error: "fcm_not_configured" };
  // Activation task: load service account from Vault, sign JWT with scope
  // https://www.googleapis.com/auth/firebase.messaging, POST to FCM endpoint,
  // parse UNREGISTERED / INVALID_REGISTRATION → token_invalidated=true.
  return { ok: false, error: "fcm_activation_pending" };
}
