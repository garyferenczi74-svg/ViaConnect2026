"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Leaf,
  Pill,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/naturopath/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/naturopath/clients", label: "Clients", icon: Users },
  { href: "/naturopath/protocols", label: "Protocols", icon: Leaf },
  { href: "/naturopath/peptide-iq", label: "PeptideIQ", icon: Pill },
  { href: "/naturopath/settings", label: "Settings", icon: Settings },
];

export function NaturopathNav({ user }: { user: User }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/naturopath/dashboard"
              className="flex items-center gap-1"
            >
              <span className="text-lg font-bold text-copper">Via</span>
              <span className="text-lg font-bold text-white">Connect</span>
              <span className="text-xs bg-sage/20 text-sage px-2 py-0.5 rounded-full ml-2">
                NATURO
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              {user.user_metadata?.full_name ?? user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
