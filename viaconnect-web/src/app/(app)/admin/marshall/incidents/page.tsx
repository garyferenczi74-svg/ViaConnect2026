import Link from "next/link";
import { FileWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("compliance_incidents")
    .select("id, incident_id, title, severity, opened_by, opened_at, closed_at, dev_side_escape")
    .order("opened_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Array<{ id: string; incident_id: string; title: string; severity: string; opened_by: string; opened_at: string; closed_at: string | null; dev_side_escape: boolean }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <FileWarning className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Incidents</h1>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No incidents on record.</div>}
        {rows.map(r => (
          <Link key={r.id} href={`/admin/marshall/incidents/${r.incident_id}`} className="block bg-[#1E3054] rounded-lg border border-white/[0.08] p-3 hover:bg-white/[0.03]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-white/60">{r.incident_id}</span>
              <span className="text-xs font-semibold text-white">{r.title}</span>
              {r.dev_side_escape && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/15 text-red-400">Dev Escape</span>}
              <span className="text-[10px] text-white/40">{r.severity}</span>
              <span className="text-[10px] text-white/30 ml-auto">{new Date(r.opened_at).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
