// Prompt #113 — Admin compliance Overview (6 KPI tiles per §6.13).

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

async function getCounts() {
  const sb = createClient();
  const c = async (table: string, filter?: (q: ReturnType<typeof sb.from>) => ReturnType<typeof sb.from>) => {
    let q: ReturnType<typeof sb.from> = sb.from(table);
    if (filter) q = filter(q);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await (q as any).select("*", { count: "exact", head: true });
    return (r.count as number | null) ?? 0;
  };
  const [openAlerts, pendingKelsey, blockedWeek, unresolved, approvedClaims, saleableCA] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("regulatory_alerts", (q: any) => q.is("resolved_at", null)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("regulatory_kelsey_reviews", (q: any) => q.eq("verdict", "ESCALATE")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("regulatory_kelsey_reviews", (q: any) => q.eq("verdict", "BLOCKED").gte("reviewed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("regulatory_disclaimer_events", (q: any) => q.eq("suppression_attempt", true).gte("rendered_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("regulatory_claim_library", (q: any) => q.eq("status", "approved")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("regulatory_sku_jurisdiction_status", (q: any) => q.eq("is_saleable", true)),
  ]);
  return { openAlerts, pendingKelsey, blockedWeek, unresolved, approvedClaims, saleableCA };
}

export default async function Page() {
  const k = await getCounts();
  const cards = [
    { label: "Open alerts",           value: k.openAlerts,       href: "/admin/compliance/alerts" },
    { label: "Escalations pending",   value: k.pendingKelsey,    href: "/admin/compliance/audit?action=kelsey.review.escalate" },
    { label: "Blocked (7d)",          value: k.blockedWeek,      href: "/admin/compliance/audit?action=kelsey.review.blocked" },
    { label: "Disclaimer suppression (24h)", value: k.unresolved, href: "/admin/compliance/audit?target_type=disclaimer" },
    { label: "Approved claims",       value: k.approvedClaims,   href: "/admin/compliance/claims" },
    { label: "Saleable SKU rows",     value: k.saleableCA,       href: "/admin/compliance/canada" },
  ];
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className="rounded-2xl border border-slate-700 bg-[#1E3054] p-4 hover:border-[#2DA5A0] hover:bg-slate-900" style={{ borderColor: "rgba(45,165,160,0.15)" }}>
          <div className="text-[11px] uppercase tracking-wider text-[#2DA5A0]/70">{c.label}</div>
          <div className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-100">{c.value.toLocaleString()}</div>
        </Link>
      ))}
    </section>
  );
}
