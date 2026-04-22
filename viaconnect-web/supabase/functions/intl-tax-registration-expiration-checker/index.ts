// =============================================================================
// intl-tax-registration-expiration-checker (Prompt #111)
// =============================================================================
// Scans international_tax_registrations for upcoming expirations + renewal-
// statement windows. Raises T-90/60/30/15/0 warnings via audit log. At T-0,
// flips status to 'suspended' which causes checkout to hard-halt in that
// jurisdiction (application-layer enforcement uses tax_registrations.status).
// Cron: 03:15 UTC daily.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface RegRow {
  registration_id: string;
  jurisdiction_code: string;
  registration_type: string;
  expiration_date: string | null;
  next_renewal_statement_due: string | null;
  status: string;
}

function daysUntil(iso: string): number {
  const then = new Date(iso + "T00:00:00Z").getTime();
  const now = Date.now();
  return Math.floor((then - now) / (1000 * 60 * 60 * 24));
}

serve(async (_req: Request) => {
  const db = admin();
  const today = new Date().toISOString().slice(0, 10);
  const { data: regs, error } = await db
    .from("international_tax_registrations")
    .select("registration_id, jurisdiction_code, registration_type, expiration_date, next_renewal_statement_due, status")
    .in("status", ["active", "pending"]);
  if (error || !regs) {
    return new Response(JSON.stringify({ ok: false, error: error?.message ?? "no rows" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }

  const audits: Array<Record<string, unknown>> = [];
  let suspended = 0;
  for (const r of regs as RegRow[]) {
    const targets: Array<{ kind: string; date: string }> = [];
    if (r.expiration_date) targets.push({ kind: "expiration", date: r.expiration_date });
    if (r.next_renewal_statement_due) targets.push({ kind: "renewal_statement", date: r.next_renewal_statement_due });
    for (const t of targets) {
      const d = daysUntil(t.date);
      if (d <= 0 && t.kind === "expiration" && r.status === "active") {
        await db
          .from("international_tax_registrations")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("registration_id", r.registration_id);
        suspended++;
        audits.push({
          action_category: "tax_registration",
          action_verb: "registration.suspended_on_expiration",
          target_table: "international_tax_registrations",
          target_id: r.registration_id,
          after_state_json: { jurisdiction: r.jurisdiction_code, expired_on: t.date },
        });
      } else if ([90, 60, 30, 15].includes(d)) {
        audits.push({
          action_category: "tax_registration",
          action_verb: `warning.T_minus_${d}_${t.kind}`,
          target_table: "international_tax_registrations",
          target_id: r.registration_id,
          after_state_json: { jurisdiction: r.jurisdiction_code, kind: t.kind, target_date: t.date },
        });
      }
    }
  }
  if (audits.length > 0) {
    await db.from("international_audit_log").insert(audits);
  }
  return new Response(JSON.stringify({ ok: true, scanned: regs.length, audits_written: audits.length, suspended, today }), {
    headers: { "content-type": "application/json" },
  });
});
