import Link from "next/link";
import { Radar, History, FileCheck, ClipboardCheck, KeyRound, MessageSquareWarning, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TILES = [
  { href: "/admin/marshall/precheck/sessions", label: "Sessions", icon: History },
  { href: "/admin/marshall/precheck/receipts", label: "Receipts ledger", icon: FileCheck },
  { href: "/admin/marshall/precheck/good-faith-events", label: "Good-faith events", icon: ClipboardCheck },
  { href: "/admin/marshall/precheck/keys", label: "Signing keys", icon: KeyRound },
  { href: "/admin/marshall/precheck/disputes", label: "Disputes", icon: MessageSquareWarning },
  { href: "/admin/marshall/precheck/drift", label: "Drift pattern watch", icon: Activity },
];

export default async function PrecheckOverviewPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [sessionsRes, receiptsRes, goodFaithRes, badFaithRes, disputesRes] = await Promise.all([
    supabase.from("precheck_sessions").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("precheck_clearance_receipts").select("id", { count: "exact", head: true }).gte("issued_at", since),
    supabase.from("precheck_good_faith_events").select("id", { count: "exact", head: true }).eq("outcome", "good_faith_credit").gte("created_at", since),
    supabase.from("precheck_good_faith_events").select("id", { count: "exact", head: true }).eq("outcome", "bad_faith_penalty").gte("created_at", since),
    supabase.from("precheck_findings").select("id", { count: "exact", head: true }).eq("remediation_kind", "user_disputed"),
  ]);

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Radar className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Pre-check overview</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Sessions (7d)" value={sessionsRes.count ?? 0} />
        <Stat label="Receipts (7d)" value={receiptsRes.count ?? 0} />
        <Stat label="Good-faith credits (7d)" value={goodFaithRes.count ?? 0} tone="green" />
        <Stat label="Bad-faith penalties (7d)" value={badFaithRes.count ?? 0} tone="red" />
        <Stat label="Disputes" value={disputesRes.count ?? 0} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 hover:bg-white/[0.03] flex items-center gap-3">
              <Icon className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
              <span className="text-sm font-medium text-white">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" }) {
  const toneClass = tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-400" : "text-white";
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="text-[10px] text-white/40 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
