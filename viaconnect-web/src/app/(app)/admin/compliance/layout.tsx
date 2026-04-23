// Prompt #113 — Admin compliance section layout + role gate.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Activity, Beaker, BookMarked, BellRing, ScrollText, Globe2, MessageSquare } from "lucide-react";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["admin", "compliance_admin", "medical"].includes(role)) redirect("/admin");

  const nav = [
    { href: "/admin/compliance",             label: "Overview",    icon: Activity },
    { href: "/admin/compliance/ingredients", label: "Ingredients", icon: Beaker },
    { href: "/admin/compliance/claims",      label: "Claims",      icon: BookMarked },
    { href: "/admin/compliance/alerts",      label: "Alerts",      icon: BellRing },
    { href: "/admin/compliance/canada",      label: "Canada",      icon: Globe2 },
    { href: "/admin/compliance/audit",       label: "Audit",       icon: ScrollText },
    { href: "/admin/compliance/ask-kelsey",  label: "Ask Kelsey",  icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#1A2744] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Regulatory compliance</h1>
          <p className="mt-1 text-sm text-slate-400">FDA DSHEA, FTC truth-in-advertising, Health Canada NHPR. Kelsey reviews every outgoing claim.</p>
        </header>
        <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-[#1E3054] px-3 py-2 text-sm text-slate-200 hover:border-teal-400 hover:bg-slate-900">
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
