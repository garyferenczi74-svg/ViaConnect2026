// Prompt #111 — Admin international section layout with role gate.
// Matches the existing admin/shop layout pattern: redirect non-admins.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Globe, DollarSign, MapPin, FileText, TrendingUp, Receipt, RefreshCw, ScrollText } from "lucide-react";

export default async function InternationalAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["admin", "finance_admin", "compliance_admin"].includes(role)) {
    redirect("/admin");
  }

  const nav = [
    { href: "/admin/international",                      label: "Overview",          icon: Globe },
    { href: "/admin/international/pricing",              label: "Pricing",           icon: DollarSign },
    { href: "/admin/international/availability-matrix",  label: "Availability",      icon: MapPin },
    { href: "/admin/international/tax/registrations",    label: "Tax Registrations", icon: FileText },
    { href: "/admin/international/fx/drift",             label: "FX Drift",          icon: TrendingUp },
    { href: "/admin/international/tax/invoices",         label: "VAT Invoices",      icon: Receipt },
    { href: "/admin/international/settlement",           label: "Settlement",        icon: RefreshCw },
    { href: "/admin/international/audit",                label: "Audit Log",         icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">International · Multi-currency</h1>
          <p className="mt-1 text-sm text-slate-400">Prompt #111 · Settlement, VAT/GST, per-market pricing, FX reconciliation.</p>
        </header>
        <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 hover:border-teal-400 hover:bg-slate-900"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
