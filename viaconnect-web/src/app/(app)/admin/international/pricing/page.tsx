// Prompt #111 — Pricing grid across US / EU / UK / AU markets.

import { createClient } from "@/lib/supabase/server";

interface Row {
  sku: string;
  market_code: "US" | "EU" | "UK" | "AU";
  currency_code: string;
  msrp_cents: number;
  is_available_in_market: boolean;
  status: string;
  tax_code: string;
}

const SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AUD: "A$" };

function fmt(cents: number, currency: string) {
  return `${SYMBOL[currency] ?? ""}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb
    .from("master_skus_market_pricing")
    .select("sku, market_code, currency_code, msrp_cents, is_available_in_market, status, tax_code")
    .order("sku")
    .order("market_code");
  const rows = (data ?? []) as Row[];
  const bySku = new Map<string, Record<string, Row>>();
  for (const r of rows) {
    const m = bySku.get(r.sku) ?? {};
    m[r.market_code] = r;
    bySku.set(r.sku, m);
  }
  const skus = Array.from(bySku.keys());

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Per-market pricing</h2>
          <p className="text-sm text-slate-400">One active row per (SKU × market). .88 endings enforced via trigger when enforce_88_ending=TRUE.</p>
        </div>
        <div className="text-xs text-slate-500">{skus.length} SKUs · {rows.length} pricing rows</div>
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
              const m = bySku.get(sku)!;
              return (
                <tr key={sku} className="text-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{sku}</td>
                  {(["US", "EU", "UK", "AU"] as const).map((mk) => {
                    const r = m[mk];
                    if (!r) return <td key={mk} className="px-3 py-2 text-slate-600">·</td>;
                    const tone = r.status === "active" ? (r.is_available_in_market ? "text-emerald-300" : "text-slate-300") : "text-amber-300";
                    return (
                      <td key={mk} className={`px-3 py-2 ${tone}`}>
                        <div className="font-medium">{fmt(r.msrp_cents, r.currency_code)}</div>
                        <div className="text-[11px] text-slate-500">{r.status} · {r.is_available_in_market ? "available" : "hidden"}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
