import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CollectorsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("hounddog_collector_state")
    .select("id, enabled, last_tick_at, last_cursor, rate_limit_requests, rate_limit_per_seconds, tos_version_pinned, provider_kind, notes")
    .order("id");
  const rows = (data ?? []) as Array<{ id: string; enabled: boolean; last_tick_at: string | null; rate_limit_requests: number; rate_limit_per_seconds: number; tos_version_pinned: string | null; provider_kind: string; notes: string | null }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Collectors</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white">{c.id}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{c.provider_kind}</span>
              {c.enabled ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300">enabled</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/50">disabled</span>
              )}
              <span className="text-[10px] text-white/40">{c.rate_limit_requests} req / {c.rate_limit_per_seconds}s</span>
              {c.tos_version_pinned && <span className="text-[10px] text-white/40 font-mono">TOS {c.tos_version_pinned.slice(0, 8)}</span>}
              <span className="text-[10px] text-white/30 ml-auto">
                {c.last_tick_at ? `last tick ${new Date(c.last_tick_at).toLocaleString()}` : "never ticked"}
              </span>
            </div>
            {c.notes && <p className="text-[11px] text-white/50 mt-1">{c.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
