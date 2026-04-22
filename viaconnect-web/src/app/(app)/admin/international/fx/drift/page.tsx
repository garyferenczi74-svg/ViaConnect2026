// Prompt #111 — FX drift findings queue.

import { createClient } from "@/lib/supabase/server";

interface Finding {
  finding_id: string;
  sku: string;
  market_code: string;
  us_msrp_cents: number;
  market_msrp_cents: number;
  implied_usd_cents: number;
  drift_pct: number;
  detected_at: string;
  status: string;
}

function d(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb
    .from("international_fx_drift_findings")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(200);
  const findings = (data ?? []) as Finding[];
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">FX drift findings</h2>
          <p className="text-sm text-slate-400">Flagged when implied-USD deviates {">"}±15% from US MSRP. Resolve by repricing or suppressing.</p>
        </div>
        <div className="text-xs text-slate-500">{findings.length} recent</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">US MSRP</th>
              <th className="px-3 py-2">Market MSRP (implied USD)</th>
              <th className="px-3 py-2">Drift</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Detected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {findings.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No drift findings. System is within tolerance.</td></tr>
            )}
            {findings.map((f) => (
              <tr key={f.finding_id}>
                <td className="px-3 py-2 font-mono text-xs text-slate-200">{f.sku}</td>
                <td className="px-3 py-2">{f.market_code}</td>
                <td className="px-3 py-2">{d(f.us_msrp_cents)}</td>
                <td className="px-3 py-2">{d(f.implied_usd_cents)}</td>
                <td className={`px-3 py-2 font-medium ${Math.abs(f.drift_pct) > 15 ? "text-rose-300" : "text-amber-300"}`}>{f.drift_pct.toFixed(2)}%</td>
                <td className="px-3 py-2 capitalize">{f.status}</td>
                <td className="px-3 py-2 text-slate-500">{new Date(f.detected_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
