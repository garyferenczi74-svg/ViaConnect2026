import Link from "next/link";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SessionsHistoryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("precheck_sessions")
    .select("id, session_id, status, target_platform, cleared_at, created_at, final_findings_summary")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ id: string; session_id: string; status: string; target_platform: string | null; cleared_at: string | null; created_at: string; final_findings_summary: Record<string, number> | null }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Pre-check sessions</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No sessions yet. Use the workspace to get started.</div>}
        {rows.map((r) => (
          <Link key={r.id} href={`/practitioner/marshall/precheck/sessions/${r.id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/80">{r.session_id}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{r.status}</span>
              {r.target_platform && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/60">{r.target_platform}</span>}
              <span className="text-[10px] text-white/30 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            {r.final_findings_summary && (
              <p className="text-[10px] text-white/40 mt-1">
                P0 {r.final_findings_summary.p0 ?? 0} · P1 {r.final_findings_summary.p1 ?? 0} · P2 {r.final_findings_summary.p2 ?? 0} · P3 {r.final_findings_summary.p3 ?? 0} · adv {r.final_findings_summary.advisory ?? 0}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
