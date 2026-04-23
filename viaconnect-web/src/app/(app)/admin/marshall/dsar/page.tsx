import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DsarPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from("dsar_requests")
    .select("id, email, request_type, jurisdiction, opened_at, sla_due_at, completed_at, status")
    .order("opened_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ id: string; email: string; request_type: string; jurisdiction: string; opened_at: string; sla_due_at: string; completed_at: string | null; status: string }>;
  const now = Date.now();

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">DSAR queue</h1>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No DSAR requests.</div>}
        {rows.map(r => {
          const dueSoon = !r.completed_at && Date.parse(r.sla_due_at) - now < 48 * 60 * 60 * 1000;
          const overdue = !r.completed_at && Date.parse(r.sla_due_at) < now;
          return (
            <div key={r.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-white">{r.email}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{r.request_type}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{r.jurisdiction.toUpperCase()}</span>
                {overdue && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">overdue</span>}
                {dueSoon && !overdue && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300">due soon</span>}
                <span className="text-[10px] text-white/40 ml-auto">{r.status}</span>
              </div>
              <p className="text-[10px] text-white/40 mt-1">
                Opened {new Date(r.opened_at).toLocaleDateString()} · SLA {new Date(r.sla_due_at).toLocaleDateString()}
                {r.completed_at && ` · Completed ${new Date(r.completed_at).toLocaleDateString()}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
