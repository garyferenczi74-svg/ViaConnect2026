// Prompt #113 — Structure/function claim library.

import { createClient } from "@/lib/supabase/server";

interface Row {
  id: string;
  claim_text: string;
  claim_type: string;
  status: string;
  kelsey_verdict: string | null;
  substantiation_tier: string | null;
  jurisdiction_id: string;
  approved_at: string | null;
  created_at: string;
}

const VERDICT_COLOR: Record<string, string> = {
  APPROVED: "text-emerald-300",
  CONDITIONAL: "text-amber-300",
  BLOCKED: "text-rose-300",
  ESCALATE: "text-sky-300",
};

export default async function Page() {
  const sb = createClient();
  const { data } = await sb
    .from("regulatory_claim_library")
    .select("id, claim_text, claim_type, status, kelsey_verdict, substantiation_tier, jurisdiction_id, approved_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Claim library</h2>
        <p className="text-sm text-slate-400">Versioned S/F claims. Only approved claims render to consumer/practitioner surfaces.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-[#1E3054]">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Claim</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Kelsey</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Jurisdiction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No claims yet. Compose the first one.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 max-w-md">{r.claim_text}</td>
                <td className="px-3 py-2 capitalize text-slate-400">{r.claim_type.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className={`px-3 py-2 font-medium ${r.kelsey_verdict ? VERDICT_COLOR[r.kelsey_verdict] ?? "text-slate-300" : "text-slate-500"}`}>{r.kelsey_verdict ?? "·"}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{r.substantiation_tier?.replace(/tier_\d_/, "") ?? "·"}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{r.jurisdiction_id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
