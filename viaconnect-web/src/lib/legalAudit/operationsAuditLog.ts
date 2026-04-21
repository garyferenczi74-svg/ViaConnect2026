// Prompt #104 Phase 2: Operations audit log helper.
//
// Every legal-ops state change writes a row here via the service-role
// client (RLS only allows admin SELECT). The DB trigger enforces
// append-only — UPDATE/DELETE attempts raise P0001.
//
// Shape used by APIs:
//   await writeLegalAudit(supabase, {
//     actor_user_id, actor_role, action_category, action_verb,
//     target_table, target_id, case_id?, before, after, hash_verified?
//   });

export type LegalAuditCategory =
  | 'case'
  | 'evidence'
  | 'counterparty'
  | 'template'
  | 'enforcement_action'
  | 'dmca'
  | 'marketplace_complaint'
  | 'counsel_engagement'
  | 'privileged_comm'
  | 'settlement'
  | 'pii_access'
  | 'privileged_access';

export interface LegalAuditEntry {
  actor_user_id: string | null;
  actor_role: string | null;
  action_category: LegalAuditCategory;
  action_verb: string;
  target_table: string;
  target_id: string | null;
  case_id?: string | null;
  before_state_json?: Record<string, unknown> | null;
  after_state_json?: Record<string, unknown> | null;
  hash_verified?: boolean | null;
  context_json?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function writeLegalAudit(
  supabase: { from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } },
  entry: LegalAuditEntry,
): Promise<void> {
  const { error } = await supabase.from('legal_operations_audit_log').insert({
    actor_user_id: entry.actor_user_id,
    actor_role: entry.actor_role,
    action_category: entry.action_category,
    action_verb: entry.action_verb,
    target_table: entry.target_table,
    target_id: entry.target_id,
    case_id: entry.case_id ?? null,
    before_state_json: entry.before_state_json ?? null,
    after_state_json: entry.after_state_json ?? null,
    hash_verified: entry.hash_verified ?? null,
    context_json: entry.context_json ?? null,
    ip_address: entry.ip_address ?? null,
    user_agent: entry.user_agent ?? null,
  });
  if (error) {
    // Audit log writes must never break the primary path; surface to
    // server logs for follow-up but do not throw.
    // eslint-disable-next-line no-console
    console.warn('[legal-audit] insert failed:', error.message);
  }
}
