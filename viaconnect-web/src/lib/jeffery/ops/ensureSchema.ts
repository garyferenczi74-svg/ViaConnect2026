/**
 * Prompt 219H presence check.
 *
 * Schema and pg_cron registration live in supabase/migrations
 * (20260816010000, 20260816120000, and the later cadence seed migration).
 * This function is read-only. It never applies DDL, never opens a direct
 * Postgres connection, and never registers or changes pg_cron jobs.
 *
 * A missing table, a null admin client, or any PostgREST/client error
 * (including PGRST002 and PGRST205) is logged and fails open so the ops
 * tick can continue.
 */

import { safeLog } from "@/lib/utils/safe-log";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

export async function ensureContinuousOpsSchema(): Promise<{
  ok: boolean;
  applied: boolean;
  reason?: string;
}> {
  try {
    const sb = createAdminClientOrNull();
    if (!sb) {
      safeLog.warn("ops.ensureSchema", "presence check failed open", {
        reason: "null_admin_client",
      });
      return { ok: true, applied: false, reason: "fail_open:null_admin_client" };
    }

    const { error } = await sb.from("agent_cadence_jobs").select("job_key").limit(1);
    if (error) {
      const code = error.code || "postgrest_error";
      safeLog.warn("ops.ensureSchema", "presence check failed open", {
        reason: code,
        message: error.message,
      });
      return { ok: true, applied: false, reason: `fail_open:${code}` };
    }

    return { ok: true, applied: false, reason: "tables_present" };
  } catch (err) {
    safeLog.error("ops.ensureSchema", "presence check threw; failed open", {
      error: err,
    });
    return { ok: true, applied: false, reason: "fail_open:threw" };
  }
}
