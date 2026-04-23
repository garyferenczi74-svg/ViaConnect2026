import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GoodFaithEventsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("precheck_good_faith_events")
    .select("id, finding_id, receipt_id, practitioner_id, match_kind, outcome, severity_before, severity_after, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as Array<{ id: string; finding_id: string; receipt_id: string | null; practitioner_id: string; match_kind: string; outcome: string; severity_before: string | null; severity_after: string | null; created_at: string }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Good-faith events</h1>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${r.outcome === "good_faith_credit" ? "bg-emerald-500/15 text-emerald-300" : r.outcome === "bad_faith_penalty" ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/60"}`}>
                {r.outcome.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-white/40">{r.match_kind}</span>
              <span className="text-[10px] text-white/40 font-mono">{r.practitioner_id}</span>
              {r.severity_before && r.severity_after && (
                <span className="text-[10px] text-white/60">{r.severity_before} to {r.severity_after}</span>
              )}
              <span className="text-[10px] text-white/30 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
