import Link from "next/link";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("compliance_rules")
    .select("id, pillar, severity, enabled, last_reviewed, description")
    .order("pillar")
    .order("id");
  const rows = (data ?? []) as Array<{ id: string; pillar: string; severity: string; enabled: boolean; last_reviewed: string; description: string }>;
  const byPillar = rows.reduce<Record<string, typeof rows>>((acc, r) => { (acc[r.pillar] ||= []).push(r); return acc; }, {});
  const todayMs = Date.now();
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Rule registry</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length} rules</span>
      </div>
      <div className="space-y-6">
        {Object.entries(byPillar).map(([pillar, pillarRows]) => (
          <div key={pillar} className="space-y-2">
            <h2 className="text-sm font-semibold text-white/80">Pillar: {pillar}</h2>
            {pillarRows.map(r => {
              const stale = (todayMs - Date.parse(r.last_reviewed)) / 86_400_000 > 365;
              return (
                <Link key={r.id} href={`/admin/marshall/rules/${encodeURIComponent(r.id)}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-white/80">{r.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-white/70">{r.severity}</span>
                    {!r.enabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/40">disabled</span>}
                    {stale && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">review overdue</span>}
                    <span className="text-[10px] text-white/30 ml-auto">reviewed {r.last_reviewed}</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">{r.description}</p>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
