// Prompt #112 — Web Push adapter (VAPID).
// The actual cryptographic dispatch (ECDH + HKDF + AES128-GCM payload
// encryption) runs in the edge function side via web-push from esm.sh to
// keep package.json locked. This lib-side module handles Next.js API route
// responsibilities: subscription validation + storage, VAPID public key
// retrieval, and invalid-token pruning helpers.

import { createAdminClient } from "@/lib/supabase/admin";

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_agent?: string;
  device_label?: string;
  last_seen_at?: string;
  status?: "active" | "invalid";
}

export const PUSH_PAYLOAD_MAX_BYTES = 4096;
export const PUSH_TITLE_MAX_CHARS = 50;
export const PUSH_BODY_MAX_CHARS = 120;

export function isValidSubscription(s: unknown): s is WebPushSubscription {
  if (typeof s !== "object" || s === null) return false;
  const obj = s as Record<string, unknown>;
  if (typeof obj.endpoint !== "string" || !obj.endpoint.startsWith("https://")) return false;
  const keys = obj.keys as Record<string, unknown> | undefined;
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return false;
  return true;
}

export function encodePayload(title: string, body: string, data: Record<string, unknown>): string {
  const safeTitle = title.slice(0, PUSH_TITLE_MAX_CHARS);
  const safeBody = body.slice(0, PUSH_BODY_MAX_CHARS);
  const payload = JSON.stringify({ title: safeTitle, body: safeBody, data });
  if (payload.length > PUSH_PAYLOAD_MAX_BYTES) {
    return JSON.stringify({ title: safeTitle, body: safeBody.slice(0, 60), data: { deep_link: data.deep_link } });
  }
  return payload;
}

export async function addSubscription(practitionerId: string, sub: WebPushSubscription): Promise<boolean> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("notification_channel_credentials")
    .select("credential_id, push_subscriptions")
    .eq("practitioner_id", practitionerId)
    .maybeSingle();
  const current: WebPushSubscription[] = existing
    ? ((existing as { push_subscriptions?: WebPushSubscription[] }).push_subscriptions ?? [])
    : [];
  const filtered = current.filter((s) => s.endpoint !== sub.endpoint);
  const next = [...filtered, { ...sub, status: "active", last_seen_at: new Date().toISOString() }];
  if (existing) {
    const { error } = await admin
      .from("notification_channel_credentials")
      .update({ push_subscriptions: next, updated_at: new Date().toISOString() })
      .eq("practitioner_id", practitionerId);
    return !error;
  }
  const { error } = await admin.from("notification_channel_credentials").insert({
    practitioner_id: practitionerId,
    push_subscriptions: next,
  });
  return !error;
}

export async function markSubscriptionInvalid(practitionerId: string, endpoint: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_channel_credentials")
    .select("push_subscriptions")
    .eq("practitioner_id", practitionerId)
    .maybeSingle();
  if (!data) return;
  const subs = ((data as { push_subscriptions?: WebPushSubscription[] }).push_subscriptions ?? [])
    .map((s) => (s.endpoint === endpoint ? { ...s, status: "invalid" as const } : s));
  await admin
    .from("notification_channel_credentials")
    .update({ push_subscriptions: subs, updated_at: new Date().toISOString() })
    .eq("practitioner_id", practitionerId);
}
