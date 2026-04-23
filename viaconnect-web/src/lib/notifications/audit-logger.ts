// Prompt #112 — Audit writers for dispatch + opt-in events.
// Runs with the service-role admin client. Append-only triggers enforce
// UPDATE/DELETE rejection at the DB level.

import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationChannel, NotificationPriority } from "./types";

export interface DispatchAuditInsert {
  event_code: string;
  recipient_practitioner_id: string | null;
  legal_ops_recipient_id: string | null;
  channel: NotificationChannel;
  delivery_status:
    | "pending"
    | "queued_batch"
    | "queued_rate_limit"
    | "queued_quiet_hours"
    | "dispatched"
    | "delivered"
    | "failed"
    | "dropped_phi"
    | "dropped_no_optin"
    | "dropped_unknown_event"
    | "dropped_disabled"
    | "dropped_no_channel";
  external_body_rendered?: string | null;
  priority_resolved?: NotificationPriority | null;
  carrier_message_id?: string | null;
  delivery_receipt_json?: Record<string, unknown> | null;
  retry_count?: number;
  phi_redaction_result?: Record<string, unknown> | null;
  attorney_work_product_bypass?: boolean;
  context_ref: string;
  inbox_id?: string | null;
}

export async function recordDispatch(row: DispatchAuditInsert): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications_dispatched").insert({
    event_code: row.event_code,
    recipient_practitioner_id: row.recipient_practitioner_id,
    legal_ops_recipient_id: row.legal_ops_recipient_id,
    channel: row.channel,
    delivery_status: row.delivery_status,
    external_body_rendered: row.external_body_rendered ?? null,
    priority_resolved: row.priority_resolved ?? null,
    carrier_message_id: row.carrier_message_id ?? null,
    delivery_receipt_json: row.delivery_receipt_json ?? null,
    retry_count: row.retry_count ?? 0,
    phi_redaction_result: row.phi_redaction_result ?? null,
    attorney_work_product_bypass: row.attorney_work_product_bypass ?? false,
    context_ref: row.context_ref,
    inbox_id: row.inbox_id ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[notifications.audit] dispatch insert failed:", error.message);
  }
}

export type OptInAction =
  | "verification_sent"
  | "verification_confirmed"
  | "compliant_opt_in_sent"
  | "opt_in_accepted"
  | "opt_out_received"
  | "reactivation_attempted"
  | "help_sent";

export async function recordOptInAction(params: {
  practitioner_id: string;
  action: OptInAction;
  phone_number: string;
  message_sid?: string;
  message_body_sent?: string;
  reply_body?: string;
  ip_address?: string;
  user_agent?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notification_sms_opt_in_log").insert({
    practitioner_id: params.practitioner_id,
    action: params.action,
    phone_number: params.phone_number,
    message_sid: params.message_sid ?? null,
    message_body_sent: params.message_body_sent ?? null,
    reply_body: params.reply_body ?? null,
    ip_address: params.ip_address ?? null,
    user_agent: params.user_agent ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[notifications.audit] opt-in insert failed:", error.message);
  }
}
