// Prompt #112 — Event registry browser.

import { createClient } from "@/lib/supabase/server";

interface Row {
  event_code: string;
  display_name: string;
  source_prompt: string | null;
  default_priority: string;
  default_channels: string[];
  legal_ops_scope: boolean;
  attorney_work_product: boolean;
  default_enabled: boolean;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("notification_event_registry")
    .select("event_code, display_name, source_prompt, default_priority, default_channels, legal_ops_scope, attorney_work_product, default_enabled")
    .order("source_prompt").order("event_code");
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Event registry</h2>
        <p className="text-sm text-slate-400">{rows.length} events catalogued. Rows with default_enabled=false are foreshadowed for future prompts.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Event code</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Channels</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Enabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => (
              <tr key={r.event_code}>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">{r.event_code}</div>
                  <div className="text-[11px] text-slate-500">{r.display_name}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{r.source_prompt ?? "·"}</td>
                <td className="px-3 py-2 capitalize">{r.default_priority}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{(r.default_channels ?? []).join(", ")}</td>
                <td className="px-3 py-2 text-[10px]">
                  {r.legal_ops_scope && <span className="mr-1 rounded bg-indigo-900/60 px-1 text-indigo-200">legal-ops</span>}
                  {r.attorney_work_product && <span className="mr-1 rounded bg-amber-900/60 px-1 text-amber-200">AWP</span>}
                </td>
                <td className="px-3 py-2">
                  {r.default_enabled
                    ? <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-200">yes</span>
                    : <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">stub</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
