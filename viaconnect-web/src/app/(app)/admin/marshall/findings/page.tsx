import Link from "next/link";
import { Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SEV_STYLE: Record<string, string> = {
  P0: "bg-red-500/15 text-red-400",
  P1: "bg-orange-500/15 text-orange-400",
  P2: "bg-amber-500/15 text-amber-300",
  P3: "bg-blue-500/15 text-blue-300",
  ADVISORY: "bg-white/10 text-white/60",
};

export default async function FindingsPage({ searchParams }: { searchParams: Promise<{ severity?: string; status?: string }> }) {
  const params = await searchParams;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const query = supabase
    .from("compliance_findings")
    .select("id, finding_id, rule_id, severity, surface, source, message, status, created_at, assigned_to")
    .order("created_at", { ascending: false })
    .limit(200);
  if (params.severity) query.eq("severity", params.severity);
  if (params.status) query.eq("status", params.status);
  const { data } = await query;
  const rows = (data ?? []) as Array<{ id: string; finding_id: string; rule_id: string; severity: string; surface: string; source: string; message: string; status: string; created_at: string }>;

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Findings</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {(["P0","P1","P2","P3","ADVISORY"] as const).map(s => (
          <Link key={s} href={`/admin/marshall/findings?severity=${s}`} className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${SEV_STYLE[s]}`}>{s}</Link>
        ))}
        <span className="w-px h-4 bg-white/10 mx-1" />
        {(["open","acknowledged","remediated","waived","escalated","closed"] as const).map(s => (
          <Link key={s} href={`/admin/marshall/findings?status=${s}`} className="px-2 py-1 rounded text-[10px] font-medium bg-white/5 text-white/60 hover:bg-white/10">{s}</Link>
        ))}
        <Link href="/admin/marshall/findings" className="px-2 py-1 rounded text-[10px] font-medium bg-white/10 text-white ml-2">Clear</Link>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No findings match these filters.</div>}
        {rows.map(r => (
          <Link key={r.id} href={`/admin/marshall/findings/${r.finding_id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEV_STYLE[r.severity] ?? SEV_STYLE.ADVISORY}`}>{r.severity}</span>
              <span className="text-xs font-mono text-white/60">{r.finding_id}</span>
              <span className="text-[10px] text-white/40">{r.source === "claude_code" ? "Claude Code" : "Runtime"}</span>
              <span className="text-[10px] text-white/40">status: {r.status}</span>
              <span className="text-[10px] text-white/30 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs text-white/70 mt-1 line-clamp-2">{r.message}</p>
            <p className="text-[10px] text-white/40 mt-1">{r.rule_id}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
