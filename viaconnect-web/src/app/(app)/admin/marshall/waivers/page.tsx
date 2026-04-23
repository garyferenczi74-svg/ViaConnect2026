import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WaiversPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("compliance_waivers")
    .select("id, rule_id, reason, effective_from, expires_at, revoked, approved_by")
    .order("effective_from", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ id: string; rule_id: string; reason: string; effective_from: string; expires_at: string | null; revoked: boolean; approved_by: string }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Waivers</h1>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No waivers on file.</div>}
        {rows.map(w => (
          <div key={w.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/80">{w.rule_id}</span>
              {w.revoked && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">revoked</span>}
              {w.expires_at && new Date(w.expires_at) < new Date() && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300">expired</span>}
              <span className="text-[10px] text-white/40 ml-auto">approved {new Date(w.effective_from).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-white/60 mt-1">{w.reason}</p>
            {w.expires_at && <p className="text-[10px] text-white/40 mt-1">Expires: {new Date(w.expires_at).toLocaleDateString()}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
