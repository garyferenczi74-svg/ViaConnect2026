// Prompt #113 — Regulatory audit log writer.
// Append-only at the DB level (block_audit_mutation trigger). This module
// is the server-side writer; every action should go through here so the
// actor_role/target_type fields stay canonical.

import { createAdminClient } from "@/lib/supabase/admin";

export interface RegulatoryAuditInsert {
  actor_id: string | null;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  before_value?: unknown;
  after_value?: unknown;
  justification?: string | null;
  jurisdiction_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function recordRegulatoryAudit(row: RegulatoryAuditInsert): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("regulatory_audit_log").insert({
    actor_id: row.actor_id,
    actor_role: row.actor_role,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id ?? null,
    before_value: row.before_value ?? null,
    after_value: row.after_value ?? null,
    justification: row.justification ?? null,
    jurisdiction_id: row.jurisdiction_id ?? null,
    ip_address: row.ip_address ?? null,
    user_agent: row.user_agent ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[regulatory_audit_log] insert failed:", error.message);
  }
}
