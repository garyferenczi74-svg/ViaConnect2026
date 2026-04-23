import Link from "next/link";
import { FileCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReceiptsListPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("precheck_clearance_receipts")
    .select("receipt_id, draft_hash_sha256, issued_at, expires_at, revoked")
    .order("issued_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ receipt_id: string; draft_hash_sha256: string; issued_at: string; expires_at: string; revoked: boolean }>;
  const now = Date.now();
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <FileCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Clearance receipts</h1>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No receipts yet.</div>}
        {rows.map((r) => {
          const expired = Date.parse(r.expires_at) < now;
          return (
            <Link key={r.receipt_id} href={`/practitioner/marshall/precheck/receipts/${r.receipt_id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-white/80">{r.receipt_id}</span>
                {r.revoked && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400">revoked</span>}
                {expired && !r.revoked && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300">expired</span>}
                <span className="text-[10px] text-white/30 ml-auto">issued {new Date(r.issued_at).toLocaleDateString()}</span>
              </div>
              <p className="text-[11px] text-white/50 font-mono mt-1 break-all">{r.draft_hash_sha256}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
