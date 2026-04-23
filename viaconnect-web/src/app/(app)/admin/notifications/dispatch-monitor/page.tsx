// Prompt #112 — Real-time dispatch log viewer (admin).

import { createClient } from "@/lib/supabase/server";

interface Row {
  dispatch_id: string;
  occurred_at: string;
  event_code: string;
  channel: string;
  delivery_status: string;
  priority_resolved: string | null;
  context_ref: string;
  attorney_work_product_bypass: boolean;
  carrier_message_id: string | null;
}

function statusTone(s: string): string {
  if (s === "dispatched" || s === "delivered") return "text-emerald-300";
  if (s.startsWith("queued")) return "text-amber-300";
  if (s === "failed") return "text-rose-300";
  if (s.startsWith("dropped")) return "text-slate-400";
  return "text-slate-300";
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("notifications_dispatched")
    .select("dispatch_id, occurred_at, event_code, channel, delivery_status, priority_resolved, context_ref, attorney_work_product_bypass, carrier_message_id")
    .order("occurred_at", { ascending: false }).limit(500);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Dispatch monitor</h2>
        <p className="text-sm text-slate-400">Last {rows.length} events across all channels. Append-only.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2">Carrier ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No dispatches recorded yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.dispatch_id}>
                <td className="px-3 py-2 text-slate-400">{new Date(r.occurred_at).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.event_code}</td>
                <td className="px-3 py-2">{r.channel}</td>
                <td className={`px-3 py-2 font-medium ${statusTone(r.delivery_status)}`}>
                  {r.delivery_status}
                  {r.attorney_work_product_bypass && <span className="ml-1 rounded bg-slate-800 px-1 text-[10px] uppercase">AWP bypass</span>}
                </td>
                <td className="px-3 py-2 capitalize">{r.priority_resolved ?? "·"}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.context_ref}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.carrier_message_id ?? "·"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
