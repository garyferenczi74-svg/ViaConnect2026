import { FileCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReceiptsLedgerPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("precheck_clearance_receipts")
    .select("receipt_id, practitioner_id, draft_hash_sha256, signing_key_id, issued_at, expires_at, revoked, revoked_reason")
    .order("issued_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as Array<{ receipt_id: string; practitioner_id: string; draft_hash_sha256: string; signing_key_id: string; issued_at: string; expires_at: string; revoked: boolean; revoked_reason: string | null }>;
  const now = Date.now();
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <FileCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Receipts ledger</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const expired = Date.parse(r.expires_at) < now;
          return (
            <div key={r.receipt_id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-white/80">{r.receipt_id}</span>
                <span className="text-[10px] text-white/40 font-mono">{r.practitioner_id}</span>
                <span className="text-[10px] text-white/40">{r.signing_key_id}</span>
                {r.revoked && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400">revoked{r.revoked_reason ? `: ${r.revoked_reason}` : ""}</span>}
                {expired && !r.revoked && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300">expired</span>}
                <span className="text-[10px] text-white/30 ml-auto">issued {new Date(r.issued_at).toLocaleDateString()}</span>
              </div>
              <p className="text-[11px] text-white/40 mt-1 font-mono break-all">{r.draft_hash_sha256}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
