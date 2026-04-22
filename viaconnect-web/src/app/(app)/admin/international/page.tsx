// Prompt #111 — International admin overview.
// Counts across pricing + availability + tax + drift + audit tables.

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

async function counts() {
  const sb = createClient();
  const c = async (table: string, filter?: (q: ReturnType<typeof sb.from>) => ReturnType<typeof sb.from>) => {
    let q: ReturnType<typeof sb.from> = sb.from(table);
    if (filter) q = filter(q);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await (q as any).select("*", { count: "exact", head: true });
    return (r.count as number | null) ?? 0;
  };
  const [activePricingUs, activePricingNonUs, availableNonUs, pendingApproval, openDrift, activeRegs, auditToday] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("master_skus_market_pricing", (q: any) => q.eq("status", "active").eq("market_code", "US")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("master_skus_market_pricing", (q: any) => q.eq("status", "active").neq("market_code", "US")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("master_skus_market_pricing", (q: any) => q.eq("is_available_in_market", true).neq("market_code", "US")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("master_skus_market_pricing", (q: any) => q.eq("status", "pending_approval")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("international_fx_drift_findings", (q: any) => q.eq("status", "open")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("international_tax_registrations", (q: any) => q.eq("status", "active")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("international_audit_log", (q: any) => q.gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())),
  ]);
  return { activePricingUs, activePricingNonUs, availableNonUs, pendingApproval, openDrift, activeRegs, auditToday };
}

export default async function Page() {
  const k = await counts();
  const cards = [
    { label: "US active prices",        value: k.activePricingUs,    href: "/admin/international/pricing?market=US",    tone: "emerald" },
    { label: "Non-US active prices",    value: k.activePricingNonUs, href: "/admin/international/pricing?market=EU",    tone: "sky" },
    { label: "Available non-US SKUs",   value: k.availableNonUs,     href: "/admin/international/availability-matrix",  tone: "teal" },
    { label: "Pending approval",        value: k.pendingApproval,    href: "/admin/international/pricing?status=pending_approval", tone: "amber" },
    { label: "Open FX drift",           value: k.openDrift,          href: "/admin/international/fx/drift",              tone: "rose" },
    { label: "Active tax registrations", value: k.activeRegs,        href: "/admin/international/tax/registrations",    tone: "indigo" },
    { label: "Audit events (24h)",      value: k.auditToday,         href: "/admin/international/audit",                tone: "slate" },
  ];
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-teal-400 hover:bg-slate-900">
            <div className="text-xs uppercase tracking-wide text-slate-400">{c.label}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-100">{c.value.toLocaleString()}</div>
          </Link>
        ))}
      </section>
      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-base font-semibold">Quick actions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link className="text-teal-300 hover:underline" href="/admin/international/pricing">Review pricing grid (US / EU / UK / AU)</Link></li>
          <li><Link className="text-teal-300 hover:underline" href="/admin/international/availability-matrix">Availability matrix (SKU × market)</Link></li>
          <li><Link className="text-teal-300 hover:underline" href="/admin/international/fx/drift">FX drift findings queue</Link></li>
          <li><Link className="text-teal-300 hover:underline" href="/admin/international/tax/registrations">Tax registration expirations</Link></li>
        </ul>
      </section>
    </div>
  );
}
