// Prompt #113 — Regulatory alerts feed (FDA / HC / FTC).

import { createClient } from "@/lib/supabase/server";

interface Row {
  id: string;
  source: string;
  url: string;
  title: string;
  effective_date: string;
  kelsey_severity: number | null;
  resolved_at: string | null;
  created_at: string;
}

const SOURCE_LABEL: Record<string, string> = {
  FDA_warning_letter: "FDA warning",
  FDA_recall: "FDA recall",
  FDA_import_alert: "FDA import alert",
  HC_recall: "HC recall",
  HC_advisory: "HC advisory",
  FTC_action: "FTC action",
  NDI_response: "NDI response",
};

export default async function Page() {
  const sb = createClient();
  const { data } = await sb
    .from("regulatory_alerts")
    .select("id, source, url, title, effective_date, kelsey_severity, resolved_at, created_at")
    .order("effective_date", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Regulatory alerts</h2>
        <p className="text-sm text-slate-400">Daily sync at 02:00 ET from FDA, Health Canada, FTC. Unresolved alerts first.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-[#1E3054]">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No alerts synced yet. Run the daily sync.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-slate-400">{r.effective_date}</td>
                <td className="px-3 py-2 text-xs">{SOURCE_LABEL[r.source] ?? r.source}</td>
                <td className="px-3 py-2 max-w-md"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[#2DA5A0] hover:underline">{r.title}</a></td>
                <td className="px-3 py-2">{r.kelsey_severity ? <span className="rounded bg-rose-900/60 px-2 py-0.5 text-xs text-rose-200">{r.kelsey_severity}</span> : <span className="text-slate-500">·</span>}</td>
                <td className="px-3 py-2">{r.resolved_at ? <span className="text-slate-500">resolved</span> : <span className="text-amber-300">open</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
