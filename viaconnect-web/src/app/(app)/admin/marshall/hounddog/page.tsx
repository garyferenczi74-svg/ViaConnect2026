import Link from "next/link";
import { Radio, Gavel, Radar, ClipboardCheck, Users, Package, ShieldCheck, AlertOctagon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TILES = [
  { href: "/admin/marshall/hounddog/signals", label: "Signal explorer", icon: Radar },
  { href: "/admin/marshall/hounddog/review", label: "Review queue", icon: ClipboardCheck },
  { href: "/admin/marshall/hounddog/takedowns", label: "Takedowns", icon: AlertOctagon },
  { href: "/admin/marshall/hounddog/strikes", label: "Strike ledger", icon: Gavel },
  { href: "/admin/marshall/hounddog/handles", label: "Handle registry", icon: Users },
  { href: "/admin/marshall/hounddog/collectors", label: "Collectors", icon: Radio },
];

export default async function HounddogBridgeLanding() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [signalsRes, reviewRes, takedownRes, handlesRes, strikesRes] = await Promise.all([
    supabase.from("social_signals").select("id", { count: "exact", head: true }).gte("captured_at", since),
    supabase.from("social_review_queue").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("takedown_requests").select("id", { count: "exact", head: true }).eq("status", "drafted"),
    supabase.from("practitioner_social_handles").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("practitioner_strikes").select("id", { count: "exact", head: true }).eq("reversed", false).gt("expires_at", new Date().toISOString()),
  ]);

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center">
          <Radio className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white">Hounddog Bridge</h1>
          <p className="text-xs text-white/40">External-web signals feeding Marshall. Collectors are feature-flagged pending dep approval.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
          <span className="text-xs text-white/60 font-medium">Shadow mode</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Signals (7d)" value={signalsRes.count ?? 0} icon={Radar} />
        <Stat label="Review open" value={reviewRes.count ?? 0} icon={ClipboardCheck} />
        <Stat label="Takedowns drafted" value={takedownRes.count ?? 0} icon={AlertOctagon} />
        <Stat label="Verified handles" value={handlesRes.count ?? 0} icon={Users} />
        <Stat label="Active strikes" value={strikesRes.count ?? 0} icon={Gavel} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 hover:bg-white/[0.03] transition-colors flex items-center gap-3">
              <Icon className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
              <span className="text-sm font-medium text-white">{t.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Dependency status</h3>
        </div>
        <p className="text-xs text-white/60">
          Collectors for all 14 platforms are scaffolded as stubs. Each refuses to collect until its SDK
          and API credentials are provisioned. Evidence archiver is operational in stub mode (manifest hash
          verifiable); Playwright, OCR, ASR, and Wayback submission remain disabled. Flip real collectors
          on by updating hounddog_collector_state.enabled and landing the SDK dep in a follow-up prompt.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
