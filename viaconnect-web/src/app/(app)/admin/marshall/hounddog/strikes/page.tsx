import { Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StrikesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("practitioner_strikes")
    .select("id, practitioner_id, strike_number, applied_at, expires_at, reversed, notes")
    .eq("reversed", false)
    .gt("expires_at", now)
    .order("applied_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ id: string; practitioner_id: string; strike_number: number; applied_at: string; expires_at: string; notes: string | null }>;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Active strikes</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-center text-white/30 text-sm py-12">No active strikes.</div>}
        {rows.map((s) => (
          <div key={s.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white">Strike #{s.strike_number}</span>
              <span className="text-xs font-mono text-white/60">{s.practitioner_id}</span>
              <span className="text-[10px] text-white/40 ml-auto">rolloff {new Date(s.expires_at).toLocaleDateString()}</span>
            </div>
            {s.notes && <p className="text-[11px] text-white/50 mt-1">{s.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
