// Prompt #111 — Daily settlement reconciliation.

import { createClient } from "@/lib/supabase/server";

interface Report {
  report_id: string;
  report_date: string;
  per_currency_json: Record<string, { count: number; total_cents: number; usd_equivalent_cents: number }>;
  total_usd_settled_cents: number;
  total_fx_spread_impact_cents: number;
  discrepancy_flag: boolean;
}

const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AUD: "A$" };
function money(cents: number, currency: string) {
  return `${SYM[currency] ?? ""}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("international_settlement_daily_reports").select("*").order("report_date", { ascending: false }).limit(30);
  const reports = (data ?? []) as Report[];
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Daily settlement</h2>
          <p className="text-sm text-slate-400">Cron-generated 04:00 UTC. USD totals at ViaConnect-recorded FX; Stripe reconciliation diff surfaces FX spread impact.</p>
        </div>
        <div className="text-xs text-slate-500">{reports.length} days</div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {reports.length === 0 && <div className="col-span-full text-slate-500">No settlement reports yet.</div>}
        {reports.map((r) => (
          <div key={r.report_id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{r.report_date}</div>
              {r.discrepancy_flag && <span className="rounded bg-rose-900/60 px-2 py-0.5 text-xs text-rose-200">discrepancy</span>}
            </div>
            <div className="mt-2 text-xl font-semibold">{money(r.total_usd_settled_cents, "USD")}</div>
            <div className="text-xs text-slate-500">FX spread: {money(r.total_fx_spread_impact_cents, "USD")}</div>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              {Object.entries(r.per_currency_json ?? {}).map(([cur, b]) => (
                <div key={cur} className="flex items-center justify-between">
                  <span>{cur} · {b.count} orders</span>
                  <span>{money(b.total_cents, cur)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
