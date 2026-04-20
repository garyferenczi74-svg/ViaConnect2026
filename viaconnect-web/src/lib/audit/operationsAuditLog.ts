// Prompt #102 — audit log writer shape.
//
// Every state-change in Workstream A + B writes one row here. Schema
// is in migration _104. This module centralises the writer so callers
// can't accidentally skip the log, and tests can assert shape stability.

import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditCategory =
  | 'channel'
  | 'tax_info'
  | 'payout_method'
  | 'payout_batch'
  | 'dispute'
  | 'pii_access';

export interface AuditLogEntry {
  actionCategory: AuditCategory;
  actionVerb: string;
  targetTable: string;
  targetId?: string | null;
  practitionerId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  beforeStateJson?: Record<string, unknown> | null;
  afterStateJson?: Record<string, unknown> | null;
  contextJson?: Record<string, unknown> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry,
): Promise<void> {
  const loose = supabase as unknown as Loose;
  await loose.from('practitioner_operations_audit_log').insert({
    action_category: entry.actionCategory,
    action_verb: entry.actionVerb,
    target_table: entry.targetTable,
    target_id: entry.targetId ?? null,
    practitioner_id: entry.practitionerId ?? null,
    actor_user_id: entry.actorUserId ?? null,
    actor_role: entry.actorRole ?? null,
    before_state_json: entry.beforeStateJson ?? null,
    after_state_json: entry.afterStateJson ?? null,
    context_json: entry.contextJson ?? null,
  });
}

/** Pure: action_verb naming convention: `<object>.<state_change>`.
 *  Helps grep the log and keeps action names consistent across
 *  call sites. */
export const AUDIT_VERBS = {
  CHANNEL_CREATED: 'channel.created',
  CHANNEL_VERIFIED: 'channel.verified',
  CHANNEL_VERIFICATION_FAILED: 'channel.verification_failed',
  CHANNEL_LAPSED: 'channel.verification_lapsed',
  CHANNEL_VOLUME_FLAGGED: 'channel.volume_flagged',
  CHANNEL_SUSPENDED: 'channel.suspended',
  CHANNEL_REMOVED: 'channel.removed',

  TAX_INFO_SUBMITTED: 'tax_info.submitted',
  TAX_INFO_APPROVED: 'tax_info.approved',
  TAX_INFO_REJECTED: 'tax_info.rejected',

  PAYOUT_METHOD_ADDED: 'payout_method.added',
  PAYOUT_METHOD_VERIFIED: 'payout_method.verified',
  PAYOUT_METHOD_REVOKED: 'payout_method.revoked',

  PAYOUT_BATCH_CREATED: 'payout_batch.created',
  PAYOUT_BATCH_LINE_APPROVED: 'payout_batch.line_approved',
  PAYOUT_BATCH_LINE_HELD: 'payout_batch.line_held',
  PAYOUT_BATCH_EXECUTED: 'payout_batch.executed',
  PAYOUT_BATCH_LINE_FAILED: 'payout_batch.line_failed',

  DISPUTE_OPENED: 'dispute.opened',
  DISPUTE_APPROVED: 'dispute.approved',
  DISPUTE_REJECTED: 'dispute.rejected',
  DISPUTE_PARTIAL: 'dispute.partially_approved',

  PII_ACCESSED: 'pii_access.read',
} as const;
