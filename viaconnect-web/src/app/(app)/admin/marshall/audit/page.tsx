import { Database, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const [recent, verify] = await Promise.all([
    supabase.from("compliance_audit_log").select("id, event_type, actor_type, actor_id, created_at").order("id", { ascending: false }).limit(100),
    supabase.rpc("compliance_verify_audit_chain", { p_limit: 10000 }),
  ]);
  const rows = (recent.data ?? []) as Array<{ id: number; event_type: string; actor_type: string; actor_id: string | null; created_at: string }>;
  const chain = (verify.data as Array<{ ok: boolean; first_bad_row: number | null; checked_rows: number }> | null)?.[0];

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Audit log</h1>
        {chain && (
          <span className={`ml-auto flex items-center gap-1 text-xs ${chain.ok ? "text-emerald-400" : "text-red-400"}`}>
            <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
            {chain.ok ? `Chain OK: ${chain.checked_rows} rows` : `Chain broken at row ${chain.first_bad_row}`}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No audit entries yet.</div>}
        {rows.map(r => (
          <div key={r.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-2 flex items-center gap-2 text-xs">
            <span className="text-white/40 font-mono">#{r.id}</span>
            <span className="text-white/70 font-mono truncate">{r.event_type}</span>
            <span className="text-white/40">{r.actor_type}</span>
            {r.actor_id && <span className="text-white/40 truncate">{r.actor_id}</span>}
            <span className="text-white/30 ml-auto">{new Date(r.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
