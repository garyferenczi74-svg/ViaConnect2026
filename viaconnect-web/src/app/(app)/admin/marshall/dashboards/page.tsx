import { TrendingUp, Gavel, FileWarning, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [bySeverity, escapes, staleRules, ruleBreakdown] = await Promise.all([
    supabase.from("compliance_findings").select("severity").gte("created_at", since30),
    supabase.from("compliance_incidents").select("id", { count: "exact", head: true }).eq("dev_side_escape", true).gte("opened_at", since30),
    supabase.from("compliance_rules").select("id, last_reviewed"),
    supabase.from("compliance_findings").select("rule_id, severity").gte("created_at", since30),
  ]);

  const sevRows = ((bySeverity.data as Array<{ severity: string }> | null) ?? []);
  const severityCounts: Record<string, number> = {};
  for (const r of sevRows) severityCounts[r.severity] = (severityCounts[r.severity] ?? 0) + 1;

  const ruleRows = ((ruleBreakdown.data as Array<{ rule_id: string; severity: string }> | null) ?? []);
  const ruleCounts: Record<string, number> = {};
  for (const r of ruleRows) ruleCounts[r.rule_id] = (ruleCounts[r.rule_id] ?? 0) + 1;
  const topRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const staleRows = ((staleRules.data as Array<{ id: string; last_reviewed: string }> | null) ?? []);
  const stale = staleRows.filter(r => (Date.now() - Date.parse(r.last_reviewed)) / 86_400_000 > 365);

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Dashboards</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={Gavel} title="Findings by severity (30d)">
          <div className="space-y-2">
            {(["P0","P1","P2","P3","ADVISORY"] as const).map(s => (
              <div key={s} className="flex items-center justify-between text-xs">
                <span className="text-white/60">{s}</span>
                <span className="text-white font-medium">{severityCounts[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card icon={FileWarning} title="Dev-side escapes (30d)">
          <div className="text-3xl font-bold text-white">{escapes.count ?? 0}</div>
          <p className="text-xs text-white/40 mt-1">Quality signal against the Claude Code Marshall Agent.</p>
        </Card>
        <Card icon={Scale} title="Top 10 rules by volume (30d)">
          {topRules.length === 0 && <div className="text-xs text-white/40">No findings.</div>}
          {topRules.map(([rule, count]) => (
            <div key={rule} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
              <span className="text-white/70 font-mono truncate">{rule}</span>
              <span className="text-white font-medium ml-2">{count}</span>
            </div>
          ))}
        </Card>
        <Card icon={TrendingUp} title="Rule freshness">
          <div className="text-3xl font-bold text-white">{stale.length}</div>
          <p className="text-xs text-white/40 mt-1">Rules not reviewed in 12 months.</p>
          {stale.length > 0 && (
            <ul className="mt-2 space-y-1 text-[10px] text-white/60 font-mono max-h-40 overflow-y-auto">
              {stale.slice(0, 10).map(r => <li key={r.id}>{r.id}</li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h3 className="text-xs font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
