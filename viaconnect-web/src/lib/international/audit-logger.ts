// Prompt #111 — Append-only audit log writer.
// Every state change in the international stack lands here. Writes go through
// the service-role admin client from server-side contexts; the append-only
// trigger rejects any UPDATE/DELETE.

import { createAdminClient } from "@/lib/supabase/admin";
import type { MarketCode, CurrencyCode } from "./types";

export interface AuditEntry {
  actor_user_id?: string | null;
  actor_role?: string | null;
  action_category: string;
  action_verb: string;
  target_table?: string | null;
  target_id?: string | null;
  market_code?: MarketCode | null;
  currency_code?: CurrencyCode | null;
  before_state_json?: unknown;
  after_state_json?: unknown;
  typed_confirmation_text?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function logInternationalAudit(entry: AuditEntry): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("international_audit_log").insert({
    actor_user_id: entry.actor_user_id ?? null,
    actor_role: entry.actor_role ?? null,
    action_category: entry.action_category,
    action_verb: entry.action_verb,
    target_table: entry.target_table ?? null,
    target_id: entry.target_id ?? null,
    market_code: entry.market_code ?? null,
    currency_code: entry.currency_code ?? null,
    before_state_json: entry.before_state_json ?? null,
    after_state_json: entry.after_state_json ?? null,
    typed_confirmation_text: entry.typed_confirmation_text ?? null,
    ip_address: entry.ip_address ?? null,
    user_agent: entry.user_agent ?? null,
  });
  if (error) {
    // Audit failures should be visible in server logs but MUST NOT short-
    // circuit the calling business operation (per prompt §16 acceptance).
    // eslint-disable-next-line no-console
    console.error("[international_audit_log] insert failed:", error.message);
  }
}
