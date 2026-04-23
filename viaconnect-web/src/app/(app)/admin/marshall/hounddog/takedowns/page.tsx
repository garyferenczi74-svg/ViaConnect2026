import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TakedownsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("takedown_requests")
    .select("id, platform, mechanism, listing_url, status, created_at, submitted_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ id: string; platform: string; mechanism: string; listing_url: string; status: string; created_at: string; submitted_at: string | null }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertOctagon className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Takedowns</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No takedown drafts.</div>}
        {rows.map((t) => (
          <Link key={t.id} href={`/admin/marshall/hounddog/takedowns/${t.id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white">{t.platform}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{t.mechanism}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{t.status}</span>
              <span className="text-[10px] text-white/30 ml-auto">{new Date(t.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1 truncate">{t.listing_url}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
