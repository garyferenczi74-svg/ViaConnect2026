"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Dna,
  FlaskConical,
  Coins,
  ShoppingBag,
  User as UserIcon,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/genetics", label: "Genetics", icon: Dna },
  { href: "/formulations", label: "Formulations", icon: FlaskConical },
  { href: "/tokens", label: "ViaTokens", icon: Coins },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
];

export function ConsumerNav({ user }: { user: User }) {
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
            <Link href="/dashboard" className="flex items-center gap-1">
              <span className="text-lg font-bold text-burnt-copper">Via</span>
              <span className="text-lg font-bold text-white">Connect</span>
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
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">
                {user.user_metadata?.full_name ?? user.email}
              </span>
            </Link>
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
