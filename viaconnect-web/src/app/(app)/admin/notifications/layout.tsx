// Prompt #112 — Admin notifications section layout + role gate.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Activity, AlertTriangle, BookText, FileClock, ListChecks, Shield } from "lucide-react";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["admin", "compliance_admin"].includes(role)) redirect("/admin");

  const nav = [
    { href: "/admin/notifications",                  label: "Overview",         icon: Activity },
    { href: "/admin/notifications/dispatch-monitor", label: "Dispatch",         icon: Activity },
    { href: "/admin/notifications/event-registry",   label: "Event registry",   icon: BookText },
    { href: "/admin/notifications/batch-queue",      label: "Batch queue",      icon: ListChecks },
    { href: "/admin/notifications/compliance/opt-in-log", label: "Opt-in log",  icon: Shield },
    { href: "/admin/notifications/compliance/phi-failures", label: "PHI failures", icon: AlertTriangle },
    { href: "/admin/notifications/legal-ops",        label: "Legal-ops",        icon: FileClock },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Notifications · Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Dispatch monitoring, TCPA compliance, PHI-redaction forensics.</p>
        </header>
        <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 hover:border-teal-400 hover:bg-slate-900">
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
