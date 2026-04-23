// Prompt #112 — DB-level invariants. Skipped when service-role env missing.

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const run = !!URL && !!KEY;
const d = run ? describe : describe.skip;

let sb: SupabaseClient;
beforeAll(() => {
  if (run) sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
});

d("notifications_dispatched is append-only", () => {
  it("UPDATE raises exception", async () => {
    const { data: row } = await sb.from("notifications_dispatched").select("dispatch_id").limit(1).maybeSingle();
    if (!row) return;
    const { error } = await sb.from("notifications_dispatched").update({ delivery_status: "delivered" }).eq("dispatch_id", (row as { dispatch_id: string }).dispatch_id);
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/immutable|not permitted|append-only/i);
  });
});

d("notification_sms_opt_in_log is append-only", () => {
  it("DELETE raises exception", async () => {
    const { data: row } = await sb.from("notification_sms_opt_in_log").select("log_id").limit(1).maybeSingle();
    if (!row) return;
    const { error } = await sb.from("notification_sms_opt_in_log").delete().eq("log_id", (row as { log_id: string }).log_id);
    expect(error).not.toBeNull();
  });
});
