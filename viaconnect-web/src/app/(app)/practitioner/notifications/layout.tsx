// Prompt #112 — Practitioner notification settings layout + navigation.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Bell, MessageSquare, Smartphone, Moon, Send } from "lucide-react";

export default async function PractitionerNotificationLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nav = [
    { href: "/practitioner/notifications/preferences", label: "Preferences", icon: Bell },
    { href: "/practitioner/notifications/sms/setup",   label: "SMS",         icon: MessageSquare },
    { href: "/practitioner/notifications/slack/connect", label: "Slack",     icon: Send },
    { href: "/practitioner/notifications/push/enable", label: "Push",        icon: Smartphone },
    { href: "/practitioner/notifications/quiet-hours", label: "Quiet hours", icon: Moon },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">Manage how ViaConnect reaches you; preferences apply per event type.</p>
        </header>
        <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
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
