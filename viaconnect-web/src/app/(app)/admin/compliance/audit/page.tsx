// Prompt #113 — Regulatory audit log viewer (append-only).

import { createClient } from "@/lib/supabase/server";

interface Row {
  id: number;
  created_at: string;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  justification: string | null;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb
    .from("regulatory_audit_log")
    .select("id, created_at, actor_role, action, target_type, target_id, justification")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Audit log</h2>
        <p className="text-sm text-slate-400">Append-only. UPDATE/DELETE rejected at trigger. 10-year retention.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-[#1E3054]">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No audit entries yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">{r.actor_role ?? "·"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.target_type}{r.target_id ? ` · ${r.target_id.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
