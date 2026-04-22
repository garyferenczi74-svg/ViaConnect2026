// Prompt #111 — SKU × market availability matrix.
// Cells: ✓ active+available; ✗ active+hidden; ⏳ pending; — missing.
// Activation requires typed-confirmation through the intl-market-availability-activator edge function.

import { createClient } from "@/lib/supabase/server";
import { Check, X, Clock, Minus } from "lucide-react";

interface Row {
  sku: string;
  market_code: "US" | "EU" | "UK" | "AU";
  status: string;
  is_available_in_market: boolean;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb
    .from("master_skus_market_pricing")
    .select("sku, market_code, status, is_available_in_market")
    .order("sku")
    .order("market_code");
  const rows = (data ?? []) as Row[];
  const grid = new Map<string, Record<string, Row>>();
  for (const r of rows) {
    const m = grid.get(r.sku) ?? {};
    m[r.market_code] = r;
    grid.set(r.sku, m);
  }
  const skus = Array.from(grid.keys());

  const cell = (r?: Row) => {
    if (!r) return <span className="inline-flex items-center gap-1 text-slate-600"><Minus className="h-3 w-3" strokeWidth={1.5}/><span className="sr-only">none</span></span>;
    if (r.status !== "active") return <span className="inline-flex items-center gap-1 text-amber-300"><Clock className="h-3 w-3" strokeWidth={1.5}/>{r.status}</span>;
    if (r.is_available_in_market) return <span className="inline-flex items-center gap-1 text-emerald-300"><Check className="h-3 w-3" strokeWidth={1.5}/>on</span>;
    return <span className="inline-flex items-center gap-1 text-rose-300"><X className="h-3 w-3" strokeWidth={1.5}/>off</span>;
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Availability matrix</h2>
          <p className="text-sm text-slate-400">Defaults conservative; activation per (SKU × market) requires typed-confirmation.</p>
        </div>
        <div className="text-xs text-slate-500">{skus.length} SKUs · 4 markets</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">US</th>
              <th className="px-3 py-2">EU</th>
              <th className="px-3 py-2">UK</th>
              <th className="px-3 py-2">AU</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {skus.map((sku) => {
              const m = grid.get(sku)!;
              return (
                <tr key={sku}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-200">{sku}</td>
                  <td className="px-3 py-2">{cell(m.US)}</td>
                  <td className="px-3 py-2">{cell(m.EU)}</td>
                  <td className="px-3 py-2">{cell(m.UK)}</td>
                  <td className="px-3 py-2">{cell(m.AU)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
