import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PublicIncidentsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("compliance_findings")
    .select("rule_id, severity, created_at")
    .gte("created_at", since);

  const rows = (data ?? []) as Array<{ rule_id: string; severity: string; created_at: string }>;

  const byPillarMonth: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const pillar = r.rule_id.split(".")[1] ?? "UNKNOWN";
    const month = new Date(r.created_at).toISOString().slice(0, 7);
    byPillarMonth[pillar] ||= {};
    byPillarMonth[pillar][month] = (byPillarMonth[pillar][month] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <Link href="/trust-compliance" className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center">
            <FileWarning className="w-6 h-6 text-[#B75E18]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Incident history</h1>
            <p className="text-sm text-white/50">Findings by category, last 12 months. Counts only; content is redacted.</p>
          </div>
        </div>

        <div className="space-y-3">
          {Object.keys(byPillarMonth).length === 0 && (
            <div className="text-center text-white/40 text-sm py-12">
              No findings in the last 12 months. Marshall is on duty.
            </div>
          )}
          {Object.entries(byPillarMonth).map(([pillar, months]) => (
            <div key={pillar} className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Pillar: {pillar}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => (
                  <div key={month} className="bg-[#0F172A] rounded-lg p-2 flex items-center justify-between">
                    <span className="text-xs text-white/60">{month}</span>
                    <span className="text-xs text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
