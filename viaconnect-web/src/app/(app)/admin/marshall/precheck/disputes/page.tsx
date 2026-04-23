import { MessageSquareWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("precheck_findings")
    .select("id, session_id, rule_id, severity, remediation_kind, created_at")
    .eq("remediation_kind", "user_disputed")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ id: string; session_id: string; rule_id: string; severity: string; created_at: string }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareWarning className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Practitioner disputes</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No disputes recorded.</div>}
        {rows.map((r) => (
          <div key={r.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{r.severity}</span>
              <span className="text-xs font-mono text-white/80">{r.rule_id}</span>
              <span className="text-[10px] text-white/40 font-mono">session {r.session_id.slice(0, 8)}</span>
              <span className="text-[10px] text-white/30 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
