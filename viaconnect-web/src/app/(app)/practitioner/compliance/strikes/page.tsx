import { Gavel, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function standingLabel(active: number): { label: string; tone: "green" | "amber" | "orange" | "red" } {
  if (active === 0) return { label: "Good standing", tone: "green" };
  if (active === 1) return { label: "1 active warning", tone: "amber" };
  if (active === 2) return { label: "2 active warnings", tone: "orange" };
  return { label: "Review hold", tone: "red" };
}

const TONE_CLASS: Record<"green" | "amber" | "orange" | "red", string> = {
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  red: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default async function StrikesStandingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("practitioner_strikes")
    .select("id, strike_number, applied_at, expires_at, notes")
    .eq("reversed", false)
    .gt("expires_at", now)
    .order("applied_at", { ascending: false });
  const rows = (data ?? []) as Array<{ id: string; strike_number: number; applied_at: string; expires_at: string; notes: string | null }>;
  const active = rows.length;
  const standing = standingLabel(active);
  const nextRolloff = rows[rows.length - 1]?.expires_at;
  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Compliance standing</h1>
      </div>
      <div className={`rounded-xl border p-4 ${TONE_CLASS[standing.tone]}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-lg font-bold">{standing.label}</span>
        </div>
        <p className="text-xs opacity-80 mt-2">
          Active strikes: {active} of 3. Strikes roll off automatically after 180 days.
          {nextRolloff && ` Next rolloff: ${new Date(nextRolloff).toLocaleDateString()}.`}
        </p>
      </div>
      {rows.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold text-white/80">Active strikes</h3>
          {rows.map((s) => (
            <div key={s.id} className="bg-[#1E3054] rounded-lg border border-white/[0.08] p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">Strike #{s.strike_number}</span>
                <span className="text-[10px] text-white/40">applied {new Date(s.applied_at).toLocaleDateString()}</span>
                <span className="text-[10px] text-white/40 ml-auto">rolls off {new Date(s.expires_at).toLocaleDateString()}</span>
              </div>
              {s.notes && <p className="text-[11px] text-white/50 mt-1">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <h3 className="text-xs font-semibold text-white mb-2">About strikes</h3>
        <p className="text-xs text-white/60">
          Strikes apply only to P0 and P1 findings that are not successfully remediated within the cure
          window. Strike 1 is an informal warning. Strike 2 adds temporary restrictions on new consumer
          acquisition links. Strike 3 requires a human decision by Steve Rica and CFO Domenic Romeo;
          Marshall never auto-terminates an account.
        </p>
      </div>
    </div>
  );
}
