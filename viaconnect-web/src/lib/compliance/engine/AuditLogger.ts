/**
 * Marshall AuditLogger — write-only, hash-chained append to compliance_audit_log.
 * The chain trigger is on the DB side; this class just does the INSERT.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEvent {
  event_type: string;
  actor_type: "user" | "system" | "marshall" | "claude_code_marshall";
  actor_id?: string | null;
  payload?: Record<string, unknown>;
}

export class AuditLogger {
  constructor(private readonly db: SupabaseClient) {}

  async write(event: AuditEvent): Promise<void> {
    const { error } = await this.db.from("compliance_audit_log").insert({
      event_type: event.event_type,
      actor_type: event.actor_type,
      actor_id: event.actor_id ?? null,
      payload: event.payload ?? {},
    });
    if (error) {
      // Audit write failures should not block the caller, but they must be loud.
      console.warn(`[marshall] audit write failed: ${error.message}`);
    }
  }

  async verifyChain(limit: number = 10000): Promise<{ ok: boolean; firstBadRow: number | null; checkedRows: number }> {
    const { data, error } = await this.db.rpc("compliance_verify_audit_chain", { p_limit: limit });
    if (error) throw error;
    const row = (data as Array<{ ok: boolean; first_bad_row: number | null; checked_rows: number }>)?.[0];
    if (!row) return { ok: false, firstBadRow: null, checkedRows: 0 };
    return { ok: row.ok, firstBadRow: row.first_bad_row, checkedRows: row.checked_rows };
  }
}
