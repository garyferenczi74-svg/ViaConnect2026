// Prompt #105 §3.5 — audit writer for executive_reporting_audit_log.
// Mirrors the #102 practitioner_operations_audit_log shape. Append-only
// enforced at the trigger level via shared block_audit_mutation.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ExecAuditCategory =
  | 'aggregation_snapshot'
  | 'kpi_library'
  | 'template'
  | 'pack'
  | 'mdna_draft'
  | 'board_member'
  | 'distribution'
  | 'download'
  | 'ai_prompt_version'
  | 'access_revocation';

export interface ExecAuditEntry {
  actionCategory: ExecAuditCategory;
  actionVerb: string;
  targetTable: string;
  targetId?: string | null;
  packId?: string | null;
  memberId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  beforeStateJson?: Record<string, unknown> | null;
  afterStateJson?: Record<string, unknown> | null;
  contextJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function writeExecAuditLog(
  supabase: SupabaseClient,
  entry: ExecAuditEntry,
): Promise<void> {
  const loose = supabase as unknown as Loose;
  await loose.from('executive_reporting_audit_log').insert({
    action_category: entry.actionCategory,
    action_verb: entry.actionVerb,
    target_table: entry.targetTable,
    target_id: entry.targetId ?? null,
    pack_id: entry.packId ?? null,
    member_id: entry.memberId ?? null,
    actor_user_id: entry.actorUserId ?? null,
    actor_role: entry.actorRole ?? null,
    before_state_json: entry.beforeStateJson ?? null,
    after_state_json: entry.afterStateJson ?? null,
    context_json: entry.contextJson ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
  });
}

/** Pure: action_verb naming convention. Kept alongside writer so callers
 *  can import a single source of truth and grep the log later. */
export const EXEC_AUDIT_VERBS = {
  // Aggregation
  AGG_SNAPSHOT_CREATED: 'aggregation_snapshot.created',
  AGG_SNAPSHOT_COMPUTATION_STARTED: 'aggregation_snapshot.computation_started',
  AGG_SNAPSHOT_COMPUTED: 'aggregation_snapshot.computed',
  AGG_SNAPSHOT_CFO_APPROVED: 'aggregation_snapshot.cfo_approved',
  AGG_SNAPSHOT_LOCKED: 'aggregation_snapshot.locked',
  KPI_SNAPSHOT_INSERTED: 'aggregation_snapshot.kpi_inserted',

  // KPI library
  KPI_CREATED: 'kpi_library.created',
  KPI_VERSION_BUMPED: 'kpi_library.version_bumped',
  KPI_RETIRED: 'kpi_library.retired',

  // Templates + AI prompts
  TEMPLATE_CREATED: 'template.created',
  TEMPLATE_COUNSEL_REVIEWED: 'template.counsel_reviewed',
  TEMPLATE_RETIRED: 'template.retired',
  AI_PROMPT_CREATED: 'ai_prompt_version.created',
  AI_PROMPT_CFO_REVIEWED: 'ai_prompt_version.cfo_reviewed',

  // Packs + MD&A
  PACK_DRAFTED: 'pack.drafted',
  PACK_MDNA_DRAFTED: 'mdna_draft.drafted',
  PACK_MDNA_CFO_APPROVED: 'mdna_draft.cfo_approved',
  PACK_CFO_APPROVED: 'pack.cfo_approved',
  PACK_CEO_ISSUED: 'pack.ceo_issued',
  PACK_ERRATUM_ISSUED: 'pack.erratum_issued',
  PACK_ARCHIVED: 'pack.archived',

  // Board members
  BM_ADDED: 'board_member.added',
  BM_NDA_SUBMITTED: 'board_member.nda_submitted',
  BM_NDA_APPROVED: 'board_member.nda_approved',
  BM_ROLE_CHANGED: 'board_member.role_changed',
  BM_DEPARTED: 'board_member.departed',

  // Distribution + downloads
  DIST_GRANTED: 'distribution.granted',
  DIST_EMAIL_SENT: 'distribution.email_sent',
  DIST_DOWNLOADED: 'download.completed',
  DIST_WATERMARK_VALIDATED: 'download.watermark_validated',
  DIST_WATERMARK_FAILED: 'download.watermark_failed',

  // Access revocation
  ACCESS_REVOKED_CRON: 'access_revocation.cron_revoked',
  ACCESS_REVOKED_ADMIN: 'access_revocation.admin_revoked',
} as const;
