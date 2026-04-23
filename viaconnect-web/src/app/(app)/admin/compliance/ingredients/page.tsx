// Prompt #113 — Ingredient registry table (admin).

import { createClient } from "@/lib/supabase/server";

interface Row {
  id: string;
  ingredient_id: string;
  jurisdiction_id: string;
  status: string;
  ndi_number: string | null;
  monograph_ref: string | null;
  dose_min_mg_day: number | null;
  dose_max_mg_day: number | null;
  last_verified_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  approved: "bg-emerald-900/60 text-emerald-200",
  gras: "bg-emerald-900/60 text-emerald-200",
  pre_dshea: "bg-teal-900/60 text-teal-200",
  restricted: "bg-amber-900/60 text-amber-200",
  requires_ndi: "bg-amber-900/60 text-amber-200",
  under_review: "bg-amber-900/60 text-amber-200",
  novel: "bg-slate-800 text-slate-200",
  banned: "bg-rose-900/60 text-rose-200",
};

export default async function Page() {
  const sb = createClient();
  const { data } = await sb
    .from("regulatory_ingredients")
    .select("id, ingredient_id, jurisdiction_id, status, ndi_number, monograph_ref, dose_min_mg_day, dose_max_mg_day, last_verified_at")
    .order("last_verified_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Ingredients registry</h2>
        <p className="text-sm text-slate-400">DSHEA pre-1994 + NDI + GRAS for US; NHPID monographs for Canada. {rows.length} rows.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-[#1E3054]">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Ingredient</th>
              <th className="px-3 py-2">Jurisdiction</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">NDI / Monograph</th>
              <th className="px-3 py-2">Dose (mg/day)</th>
              <th className="px-3 py-2">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No ingredient registry rows yet. Add via compliance admin.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{r.ingredient_id.slice(0, 8)}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{r.jurisdiction_id.slice(0, 8)}</td>
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[r.status] ?? "bg-slate-800 text-slate-200"}`}>{r.status}</span></td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.ndi_number ?? r.monograph_ref ?? "·"}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.dose_min_mg_day ?? "·"} - {r.dose_max_mg_day ?? "·"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{new Date(r.last_verified_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
