import Link from "next/link";
import { Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SEV_STYLE: Record<string, string> = {
  P0: "bg-red-500/15 text-red-400",
  P1: "bg-orange-500/15 text-orange-400",
  P2: "bg-amber-500/15 text-amber-300",
  P3: "bg-blue-500/15 text-blue-300",
  ADVISORY: "bg-white/10 text-white/60",
};

export default async function NoticesListPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("practitioner_notices")
    .select("id, notice_id, severity, status, remediation_due_at, created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Array<{ id: string; notice_id: string; severity: string; status: string; remediation_due_at: string; created_at: string }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Compliance notices</h1>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No notices on record.</div>}
        {rows.map((n) => (
          <Link key={n.id} href={`/practitioner/compliance/notices/${n.id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEV_STYLE[n.severity] ?? SEV_STYLE.ADVISORY}`}>{n.severity}</span>
              <span className="text-xs font-mono text-white/60">{n.notice_id}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{n.status}</span>
              <span className="text-[10px] text-white/30 ml-auto">remediate by {new Date(n.remediation_due_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
