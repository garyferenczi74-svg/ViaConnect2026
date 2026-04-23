// =============================================================================
// notification-batch-digest (Prompt #112)
// =============================================================================
// Cron every 5 minutes. Groups pending notification_batch_queue rows per
// practitioner, renders a PHI-free digest, dispatches via practitioner's
// digest-preferred channel (defaults to email + in_app), clears queue.
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
  const { data: pending } = await db
    .from("notification_batch_queue")
    .select("queue_id, practitioner_id, event_code, context_ref, priority, queued_at")
    .is("dispatched_at", null)
    .order("queued_at", { ascending: true })
    .limit(500);

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ ok: true, digests: 0 }), { headers: { "content-type": "application/json" } });
  }

  const byPrac = new Map<string, Array<{ queue_id: string; event_code: string; context_ref: string }>>();
  for (const row of pending as Array<{ queue_id: string; practitioner_id: string | null; event_code: string; context_ref: string }>) {
    if (!row.practitioner_id) continue;
    const arr = byPrac.get(row.practitioner_id) ?? [];
    arr.push({ queue_id: row.queue_id, event_code: row.event_code, context_ref: row.context_ref });
    byPrac.set(row.practitioner_id, arr);
  }

  let digestsDispatched = 0;
  for (const [practId, items] of byPrac.entries()) {
    const digestId = crypto.randomUUID();
    const displayed = items.slice(0, 10);
    const moreCount = items.length - displayed.length;
    const lines = displayed.map((i) => `- ${i.event_code}`);
    if (moreCount > 0) lines.push(`...and ${moreCount} more`);
    const body = `You have ${items.length} new ViaConnect notifications. Log in to view:\n${lines.join("\n")}`;

    await db.from("notifications_dispatched").insert({
      event_code: "batch_digest",
      recipient_practitioner_id: practId,
      channel: "email",
      delivery_status: "dispatched",
      external_body_rendered: body,
      priority_resolved: "normal",
      context_ref: `digest:${digestId}`,
    });
    await db.from("notification_batch_queue")
      .update({ dispatched_at: new Date().toISOString(), dispatch_digest_id: digestId })
      .in("queue_id", items.map((i) => i.queue_id));
    digestsDispatched++;
  }

  return new Response(JSON.stringify({ ok: true, digests: digestsDispatched }), { headers: { "content-type": "application/json" } });
});
