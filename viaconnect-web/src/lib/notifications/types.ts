// Prompt #112 — Notification hub type surface.

export type NotificationPriority = "urgent" | "high" | "normal" | "low";
export type NotificationChannel = "sms" | "slack" | "push" | "email" | "in_app";

export const ALL_CHANNELS: readonly NotificationChannel[] = ["sms", "slack", "push", "email", "in_app"] as const;
export const ALL_PRIORITIES: readonly NotificationPriority[] = ["urgent", "high", "normal", "low"] as const;

export interface RegistryEntry {
  event_code: string;
  display_name: string;
  description: string;
  source_prompt: string | null;
  default_priority: NotificationPriority;
  default_channels: NotificationChannel[];
  external_body_template: string;
  in_app_body_template: string | null;
  sms_body_template: string | null;
  push_title_template: string | null;
  push_body_template: string | null;
  slack_blocks_template: Record<string, unknown> | null;
  deep_link_path_template: string | null;
  legal_ops_scope: boolean;
  attorney_work_product: boolean;
  organizational_compliance_required: boolean;
  default_enabled: boolean;
  phi_redaction_rules: Record<string, unknown>;
  rate_limit_override: number | null;
  emission_source: string | null;
  reemission_allowed: boolean;
}

export interface InboxRow {
  inbox_id: string;
  event_code: string;
  practitioner_ids: string[];
  legal_ops: boolean;
  context_ref: string;
  context_data: Record<string, unknown>;
  priority_override: NotificationPriority | null;
  emitted_at: string;
  processed_at: string | null;
  processing_started_at: string | null;
  processing_attempts: number;
  last_error: string | null;
}

export interface PhiViolation {
  rule: string;
  match: string;
  position: number;
}

export interface PhiCheckResult {
  passed: boolean;
  violations: PhiViolation[];
}

export interface DispatchContext {
  event_code: string;
  recipient_practitioner_id: string | null;
  legal_ops_recipient_id: string | null;
  channel: NotificationChannel;
  priority_resolved: NotificationPriority;
  context_ref: string;
  inbox_id: string | null;
  attorney_work_product_bypass?: boolean;
}
