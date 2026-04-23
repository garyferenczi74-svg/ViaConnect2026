// =============================================================================
// notification-push-token-hygiene (Prompt #112)
// =============================================================================
// Weekly cron (Sunday 02:00 UTC). Prunes push subscriptions marked
// status='invalid' whose last_seen_at is older than 30 days. Also prunes
// FCM/APNS tokens similarly when those adapters activate.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

serve(async (_req: Request) => {
  const db = admin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("notification_channel_credentials")
    .select("credential_id, push_subscriptions");
  if (!data) return new Response(JSON.stringify({ ok: true, pruned: 0 }), { headers: { "content-type": "application/json" } });
  let pruned = 0;
  for (const row of data as Array<{ credential_id: string; push_subscriptions: Array<{ endpoint: string; status?: string; last_seen_at?: string }> }>) {
    const original = row.push_subscriptions ?? [];
    const kept = original.filter((s) => !(s.status === "invalid" && s.last_seen_at && s.last_seen_at < cutoff));
    if (kept.length !== original.length) {
      pruned += original.length - kept.length;
      await db
        .from("notification_channel_credentials")
        .update({ push_subscriptions: kept, updated_at: new Date().toISOString() })
        .eq("credential_id", row.credential_id);
    }
  }
  return new Response(JSON.stringify({ ok: true, pruned }), { headers: { "content-type": "application/json" } });
});
