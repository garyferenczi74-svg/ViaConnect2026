// Prompt #112 — TCPA opt-in log viewer.

import { createClient } from "@/lib/supabase/server";

interface Row {
  log_id: string;
  occurred_at: string;
  practitioner_id: string;
  action: string;
  phone_number: string;
  message_sid: string | null;
  reply_body: string | null;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("notification_sms_opt_in_log")
    .select("log_id, occurred_at, practitioner_id, action, phone_number, message_sid, reply_body")
    .order("occurred_at", { ascending: false }).limit(500);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">TCPA opt-in log</h2>
        <p className="text-sm text-slate-400">Append-only. 10-year retention. Available for legal defense via PDF export.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Practitioner</th>
              <th className="px-3 py-2">Message SID</th>
              <th className="px-3 py-2">Reply</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No opt-in events recorded.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.log_id}>
                <td className="px-3 py-2 text-slate-400">{new Date(r.occurred_at).toLocaleString()}</td>
                <td className="px-3 py-2 capitalize">{r.action.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.phone_number}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.practitioner_id.slice(0, 8)}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.message_sid ?? "·"}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-300 max-w-xs truncate">{r.reply_body ?? "·"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
