"use client";

// /account layout — Prompt #55 sidebar shell shared by every Account
// child route. Desktop renders a fixed 240px left rail; mobile renders a
// horizontal pill nav that scrolls if needed.
//
// Active link uses the teal accent + left-border treatment. The
// "Notifications" item gets an unread-count badge from user_notifications.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package,
  MapPin,
  Share2,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: "notifications";
}

const NAV: NavItem[] = [
  { label: "My Orders",     href: "/account/orders",        icon: Package },
  { label: "Addresses",     href: "/account/addresses",     icon: MapPin },
  { label: "Shared Access", href: "/settings/shared-access", icon: Share2 },
  { label: "Notifications", href: "/account/notifications", icon: Bell, badgeKey: "notifications" },
  { label: "Profile",       href: "/account/profile",       icon: Settings },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [displayName, setDisplayName] = useState<string>("Account");
  const [email, setEmail] = useState<string>("");

  // Pull display name + unread count once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      setEmail(user.email ?? "");

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const fullName = (profile?.full_name as string | null) ?? null;
      if (fullName && fullName.trim()) {
        setDisplayName(fullName);
      } else if (user.email) {
        setDisplayName(user.email.split("@")[0]);
      }

      const { count } = await (supabase as any)
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("is_dismissed", false);
      if (cancelled) return;
      setUnread(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function isActive(href: string) {
    if (href === "/account/orders") {
      return pathname === href || pathname.startsWith("/account/orders/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Account</h1>
          <p className="text-sm text-white/55 mt-1">
            {displayName}
            {email && <span className="text-white/35"> · {email}</span>}
          </p>
        </div>

        {/* Mobile pill nav */}
        <nav
          aria-label="Account navigation"
          className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-5 [&::-webkit-scrollbar]:hidden"
        >
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border min-h-[36px] flex-shrink-0 transition-all ${
                  active
                    ? "bg-[#2DA5A0]/15 border-[#2DA5A0]/40 text-[#2DA5A0]"
                    : "bg-white/[0.04] border-white/[0.08] text-white/55 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {item.label}
                {item.badgeKey === "notifications" && unread > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold rounded-full bg-[#B75E18] text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border bg-white/[0.04] border-white/[0.08] text-white/55 hover:text-white hover:bg-white/[0.08] transition-all min-h-[36px] flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            Sign Out
          </button>
        </nav>

        {/* Desktop layout: sidebar + content */}
        <div className="lg:flex lg:gap-8">
          <aside className="hidden lg:block w-[240px] flex-shrink-0">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="flex items-center gap-3 px-3 py-3 border-b border-white/[0.06] mb-2">
                <div className="w-9 h-9 rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  {email && (
                    <p className="text-[10px] text-white/45 truncate">{email}</p>
                  )}
                </div>
              </div>
              <ul className="space-y-1">
                {NAV.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all border-l-2 ${
                          active
                            ? "bg-white/[0.05] border-[#2DA5A0] text-white font-semibold"
                            : "border-transparent text-white/65 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            active ? "text-[#2DA5A0]" : "text-white/45"
                          }`}
                          strokeWidth={1.5}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badgeKey === "notifications" && unread > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-[#B75E18] text-white">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
                <li className="pt-2 mt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/65 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    <LogOut
                      className="w-4 h-4 flex-shrink-0 text-white/45"
                      strokeWidth={1.5}
                    />
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
