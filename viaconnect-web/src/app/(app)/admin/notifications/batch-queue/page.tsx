// Prompt #112 — Pending batch queue viewer.

import { createClient } from "@/lib/supabase/server";

interface Row {
  queue_id: string;
  practitioner_id: string | null;
  event_code: string;
  priority: string;
  defer_reason: string;
  queued_at: string;
  dispatched_at: string | null;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("notification_batch_queue")
    .select("queue_id, practitioner_id, event_code, priority, defer_reason, queued_at, dispatched_at")
    .is("dispatched_at", null).order("queued_at", { ascending: true }).limit(300);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Pending batch queue</h2>
        <p className="text-sm text-slate-400">Events deferred by quiet hours or rate limits; drained every 5 minutes by batch digest cron.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Queued at</th>
              <th className="px-3 py-2">Practitioner</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Defer reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No pending batches.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.queue_id}>
                <td className="px-3 py-2 text-slate-400">{new Date(r.queued_at).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.practitioner_id?.slice(0, 8) ?? "·"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.event_code}</td>
                <td className="px-3 py-2 capitalize">{r.priority}</td>
                <td className="px-3 py-2">{r.defer_reason.replace(/_/g, " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
