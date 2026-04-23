/**
 * Convenience wrapper for audit writes from anywhere in the server tree.
 */

import { createClient } from "@supabase/supabase-js";
import { AuditLogger, type AuditEvent } from "@/lib/compliance/engine/AuditLogger";

let cached: AuditLogger | null = null;

function get(): AuditLogger {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env for audit logger");
  cached = new AuditLogger(createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }));
  return cached;
}

export async function auditWrite(event: AuditEvent): Promise<void> {
  await get().write(event);
}

export async function auditVerify(limit: number = 10000) {
  return get().verifyChain(limit);
}
