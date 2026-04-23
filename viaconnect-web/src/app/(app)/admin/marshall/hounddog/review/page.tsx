import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("social_review_queue")
    .select("id, signal_id, suggested_rule_ids, confidence, reason, status, created_at")
    .in("status", ["open", "in_review"])
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ id: string; signal_id: string; suggested_rule_ids: string[]; confidence: number; reason: string; status: string; created_at: string }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Review queue</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">Nothing pending review.</div>}
        {rows.map((r) => (
          <Link key={r.id} href={`/admin/marshall/hounddog/review/${r.id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/70">{r.reason}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{r.status}</span>
              <span className="text-[10px] text-white/40">conf {r.confidence.toFixed(2)}</span>
              <span className="text-[10px] text-white/30 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">Suggested rules: {r.suggested_rule_ids.join(", ") || "(none)"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
