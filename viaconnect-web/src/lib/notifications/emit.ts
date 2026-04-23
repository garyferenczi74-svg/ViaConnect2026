// Prompt #112 — emitPractitionerNotificationEvent.
// The sole public entry point for emitting notifications from business code.
// Pull-architecture: this inserts into notification_events_inbox, and the
// dispatcher cron drains and dispatches out-of-band.

import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPriority } from "./types";

export interface EmitPayload {
  practitioner_id?: string;
  practitioner_ids?: string[];
  legal_ops?: boolean;
  context_ref: string;
  context_data?: Record<string, unknown>;
  priority_override?: NotificationPriority;
  source_prompt?: string;
}

/**
 * Enqueue a notification event. Returns the inbox_id if successful, or null
 * if the insert failed. Callers should log-but-not-fail on null return:
 * notification emission is non-critical to business flow (audit log on the
 * DB side records the business event separately).
 */
export async function emitPractitionerNotificationEvent(
  eventCode: string,
  payload: EmitPayload,
): Promise<string | null> {
  const admin = createAdminClient();
  const ids: string[] =
    payload.practitioner_id ? [payload.practitioner_id] : (payload.practitioner_ids ?? []);

  const { data, error } = await admin
    .from("notification_events_inbox")
    .insert({
      event_code: eventCode,
      practitioner_ids: ids,
      legal_ops: !!payload.legal_ops,
      context_ref: payload.context_ref,
      context_data: payload.context_data ?? {},
      priority_override: payload.priority_override ?? null,
      source_prompt_of_emitter: payload.source_prompt ?? null,
    })
    .select("inbox_id")
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error("[notifications.emit] inbox insert failed:", error?.message);
    return null;
  }
  return (data as { inbox_id: string }).inbox_id;
}
