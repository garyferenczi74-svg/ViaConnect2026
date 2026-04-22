// Prompt #111 — Audit log viewer (append-only).

import { createClient } from "@/lib/supabase/server";

interface AuditRow {
  audit_id: string;
  occurred_at: string;
  actor_role: string | null;
  action_category: string;
  action_verb: string;
  target_table: string | null;
  market_code: string | null;
  currency_code: string | null;
  typed_confirmation_text: string | null;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("international_audit_log")
    .select("audit_id, occurred_at, actor_role, action_category, action_verb, target_table, market_code, currency_code, typed_confirmation_text")
    .order("occurred_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as AuditRow[];
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Audit log</h2>
          <p className="text-sm text-slate-400">Append-only. UPDATE/DELETE blocked by trigger. 10-year retention.</p>
        </div>
        <div className="text-xs text-slate-500">Last {rows.length}</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">Currency</th>
              <th className="px-3 py-2">Typed-confirmation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No audit entries yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.audit_id}>
                <td className="px-3 py-2 text-slate-400">{new Date(r.occurred_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.action_category}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.action_verb}</td>
                <td className="px-3 py-2 text-slate-400">{r.target_table ?? "·"}</td>
                <td className="px-3 py-2">{r.market_code ?? "·"}</td>
                <td className="px-3 py-2">{r.currency_code ?? "·"}</td>
                <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{r.typed_confirmation_text ?? "·"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
