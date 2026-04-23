import Link from "next/link";
import { Radar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SignalsPage({ searchParams }: { searchParams: Promise<{ status?: string; collector?: string }> }) {
  const params = await searchParams;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const query = supabase
    .from("social_signals")
    .select("id, collector_id, url, author_handle, captured_at, overall_confidence, status, matched_practitioner_id")
    .order("captured_at", { ascending: false })
    .limit(200);
  if (params.status) query.eq("status", params.status);
  if (params.collector) query.eq("collector_id", params.collector);
  const { data } = await query;
  const rows = (data ?? []) as Array<{ id: string; collector_id: string; url: string; author_handle: string; captured_at: string; overall_confidence: number; status: string; matched_practitioner_id: string | null }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Radar className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Signal explorer</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No signals on record yet.</div>}
        {rows.map((s) => (
          <Link key={s.id} href={`/admin/marshall/hounddog/signals/${s.id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/60">{s.collector_id}</span>
              <span className="text-xs font-semibold text-white">{s.author_handle}</span>
              {s.matched_practitioner_id && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300">attributable</span>}
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{s.status}</span>
              <span className="text-[10px] text-white/40">conf {(s.overall_confidence ?? 0).toFixed(2)}</span>
              <span className="text-[10px] text-white/30 ml-auto">{new Date(s.captured_at).toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1 truncate">{s.url}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
