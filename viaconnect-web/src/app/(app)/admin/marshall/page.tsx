import Link from "next/link";
import { ShieldCheck, Gavel, Scale, FileWarning, ClipboardCheck, Database, Users, AlertOctagon, TrendingUp, BookOpen, FileText, Radio, Eye, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MarshallBulletinBoard from "@/components/compliance/MarshallBulletinBoard";

export const dynamic = "force-dynamic";

const TILES = [
  { href: "/admin/marshall/findings", label: "Findings", icon: Gavel },
  { href: "/admin/marshall/incidents", label: "Incidents", icon: FileWarning },
  { href: "/admin/marshall/rules", label: "Rules", icon: BookOpen },
  { href: "/admin/marshall/waivers", label: "Waivers", icon: ClipboardCheck },
  { href: "/admin/marshall/audit", label: "Audit log", icon: Database },
  { href: "/admin/marshall/dsar", label: "DSAR", icon: FileText },
  { href: "/admin/marshall/vendors", label: "Vendor BAAs", icon: Users },
  { href: "/admin/marshall/dashboards", label: "Dashboards", icon: TrendingUp },
  { href: "/admin/marshall/hounddog", label: "Hounddog bridge", icon: Radio },
  { href: "/admin/marshall/precheck", label: "Pre-check", icon: Gavel },
  { href: "/admin/marshall/vision", label: "Vision", icon: Eye },
  { href: "/admin/compliance/soc2", label: "SOC 2 exporter", icon: Package },
];

export default async function MarshallLandingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [p0Res, p1Res, openRes, escapesRes] = await Promise.all([
    supabase.from("compliance_findings").select("id", { count: "exact", head: true }).eq("severity", "P0").gte("created_at", since),
    supabase.from("compliance_findings").select("id", { count: "exact", head: true }).eq("severity", "P1").gte("created_at", since),
    supabase.from("compliance_findings").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("compliance_incidents").select("id", { count: "exact", head: true }).eq("dev_side_escape", true).gte("opened_at", since),
  ]);

  const counts = {
    p0: p0Res.count ?? 0,
    p1: p1Res.count ?? 0,
    open: openRes.count ?? 0,
    escapes: escapesRes.count ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Marshall Compliance Center</h1>
            <p className="text-xs text-white/40">Runtime + Claude Code enforcement. Cite. Remediate. Document.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
            <span className="text-xs text-white/60 font-medium">Compliance Officer on duty</span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="P0 (30d)" value={counts.p0} tone="red" icon={AlertOctagon} />
          <StatCard label="P1 (30d)" value={counts.p1} tone="orange" icon={FileWarning} />
          <StatCard label="Open findings" value={counts.open} tone="amber" icon={Gavel} />
          <StatCard label="Dev-side escapes (30d)" value={counts.escapes} tone="blue" icon={TrendingUp} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 hover:bg-white/[0.03] transition-colors flex items-center gap-3"
              >
                <Icon className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-white">{t.label}</span>
              </Link>
            );
          })}
        </div>

        <MarshallBulletinBoard />
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "red" | "orange" | "amber" | "blue"; icon: React.ElementType }) {
  const toneClass = {
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-300 bg-blue-500/10 border-blue-500/20",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
