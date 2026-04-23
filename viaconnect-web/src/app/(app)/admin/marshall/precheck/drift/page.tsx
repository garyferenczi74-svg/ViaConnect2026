import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 60;
const THRESHOLD = 3;

export default async function DriftPatternPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await supabase
    .from("precheck_good_faith_events")
    .select("practitioner_id")
    .eq("outcome", "bad_faith_penalty")
    .gte("created_at", since);
  const rows = (data ?? []) as Array<{ practitioner_id: string }>;
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.practitioner_id] = (counts[r.practitioner_id] ?? 0) + 1;
  const watch = Object.entries(counts).filter(([, c]) => c >= THRESHOLD - 1).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Clearance drift watch</h1>
      </div>
      <p className="text-xs text-white/50 mb-4">Practitioners with ≥{THRESHOLD - 1} bad-faith events in the last {WINDOW_DAYS} days. {THRESHOLD}+ triggers MARSHALL.PRECHECK.CLEARANCE_DRIFT_PATTERN.</p>
      <div className="space-y-2">
        {watch.length === 0 && <div className="text-xs text-white/40">No practitioners approaching the threshold.</div>}
        {watch.map(([practId, count]) => (
          <div key={practId} className={`bg-[#1E3054] rounded-lg border p-3 ${count >= THRESHOLD ? "border-red-500/30" : "border-amber-500/30"}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/80">{practId}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${count >= THRESHOLD ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-300"}`}>{count} bad-faith / {WINDOW_DAYS}d</span>
              {count >= THRESHOLD && <span className="text-[10px] text-red-300 ml-auto">threshold crossed; escalate to Steve Rica</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
