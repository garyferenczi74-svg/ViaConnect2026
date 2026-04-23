import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HandlesAdminPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("practitioner_social_handles")
    .select("id, practitioner_id, platform, handle, verification_method, verified_at, active")
    .order("platform")
    .order("handle");
  const rows = (data ?? []) as Array<{ id: string; practitioner_id: string; platform: string; handle: string; verification_method: string; verified_at: string | null; active: boolean }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Handle registry</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No handles registered.</div>}
        {rows.map((h) => (
          <div key={h.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white">{h.platform}</span>
              <span className="text-xs font-mono text-white/80">{h.handle}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{h.verification_method}</span>
              {!h.verified_at && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300">pending</span>}
              {!h.active && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400">inactive</span>}
              <span className="text-[10px] text-white/30 font-mono ml-auto">{h.practitioner_id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
