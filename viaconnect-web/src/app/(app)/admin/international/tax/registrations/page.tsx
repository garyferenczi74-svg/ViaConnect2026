// Prompt #111 — Tax registrations list with expiration warnings.

import { createClient } from "@/lib/supabase/server";

interface Registration {
  registration_id: string;
  jurisdiction_code: string;
  registration_type: string;
  registration_number: string;
  registered_entity_name: string;
  effective_date: string;
  expiration_date: string | null;
  next_renewal_statement_due: string | null;
  status: string;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((new Date(iso + "T00:00:00Z").getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function badgeFor(status: string, days: number | null) {
  if (status === "suspended" || status === "retired") return "bg-slate-800 text-slate-300";
  if (days !== null && days <= 30) return "bg-rose-900/60 text-rose-200";
  if (days !== null && days <= 90) return "bg-amber-900/60 text-amber-200";
  return "bg-emerald-900/60 text-emerald-200";
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("international_tax_registrations").select("*").order("jurisdiction_code");
  const regs = (data ?? []) as Registration[];
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tax registrations</h2>
          <p className="text-sm text-slate-400">VAT/GST registrations per jurisdiction. T-90/60/30/15/0 cron emits warnings; expired flips status to suspended, hard-halting checkout.</p>
        </div>
        <div className="text-xs text-slate-500">{regs.length} registrations</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Jurisdiction</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Effective</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Renewal Stmt Due</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {regs.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No tax registrations yet. Add via Supabase admin or the tax onboarding flow.</td></tr>
            )}
            {regs.map((r) => {
              const d = daysUntil(r.expiration_date);
              return (
                <tr key={r.registration_id}>
                  <td className="px-3 py-2 font-medium">{r.jurisdiction_code}</td>
                  <td className="px-3 py-2 capitalize">{r.registration_type.replace("_", " ")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.registration_number}</td>
                  <td className="px-3 py-2">{r.registered_entity_name}</td>
                  <td className="px-3 py-2 text-slate-400">{r.effective_date}</td>
                  <td className="px-3 py-2 text-slate-400">{r.expiration_date ?? "·"}</td>
                  <td className="px-3 py-2 text-slate-400">{r.next_renewal_statement_due ?? "·"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${badgeFor(r.status, d)}`}>
                      {r.status}{d !== null ? ` · T${d >= 0 ? "-" : "+"}${Math.abs(d)}` : ""}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
