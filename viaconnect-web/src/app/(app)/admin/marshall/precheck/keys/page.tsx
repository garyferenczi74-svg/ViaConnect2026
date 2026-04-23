import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SigningKeysPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("precheck_signing_keys")
    .select("id, alg, active, rotation_of, created_at, retired_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Array<{ id: string; alg: string; active: boolean; rotation_of: string | null; created_at: string; retired_at: string | null }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Signing keys</h1>
      </div>
      <p className="text-xs text-white/50 mb-4">Rotation requires superadmin + two-person confirmation. Retired keys remain verifiable for 365 days.</p>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-xs text-white/40">No keys registered yet. The ES256 signer reads from env (MARSHALL_PRECHECK_SIGNING_KEY_PEM) by default; register here to enable rotation.</div>}
        {rows.map((k) => (
          <div key={k.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/80">{k.id}</span>
              <span className="text-[10px] text-white/40">{k.alg}</span>
              {k.active && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300">active</span>}
              {k.retired_at && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/50">retired</span>}
              {k.rotation_of && <span className="text-[10px] text-white/40">rotation of {k.rotation_of}</span>}
              <span className="text-[10px] text-white/30 ml-auto">{new Date(k.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
