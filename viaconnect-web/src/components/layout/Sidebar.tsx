"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ViaConnectLogo, DNAHelixIcon } from "@/components/ui/ViaConnectLogo";
import { isNaturopathLikeCredential } from "@/lib/practitioner/taxonomy";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Dna,
  Pill,
  ShoppingBag,
  Coins,
  MessageSquare,
  User as UserIcon,
  Users,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  FileText,
  Brain,
  BrainCircuit,
  MessageCircleHeart,
  Cpu,
  Settings,
  Leaf,
  Activity,
  Calendar,
  Shield,
  Upload,
  Plug,
  Newspaper,
  Apple,
  BookOpen,
  FlaskConical,
  ChevronLeft,
  ChevronDown,
  LogOut,
  Target,
  GraduationCap,
  CreditCard,
  Sparkles,
  HeartPulse,
  TrendingUp,
} from "lucide-react";

// ─── Naturopath-extras section, surfaced inside the practitioner sidebar
//    when the practitioner's credential_type is nd, dc, or lac.
//    Phase 6 of Prompt #91. The route content lives at
//    /practitioner/naturopath/* (foundation depth; expands post launch).
interface NaturopathExtraItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
const NATUROPATH_EXTRAS: NaturopathExtraItem[] = [
  { href: "/practitioner/naturopath/holistic-advisor",  label: "AI Holistic Advisor", icon: Sparkles },
  { href: "/practitioner/naturopath/botanicals",        label: "Botanicals",          icon: Leaf },
  { href: "/practitioner/naturopath/constitutional",    label: "Constitutional",      icon: HeartPulse },
  { href: "/practitioner/naturopath/natural-protocols", label: "Natural Protocols",   icon: ClipboardList },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: React.ElementType };

type PortalConfig = {
  nav: NavItem[];
  accent: string; // Tailwind color for active bar + highlight
  accentBg: string; // bg-* class for active item
  badge: { label: string; bg: string } | null;
  homeHref: string;
};

// ─── Portal nav configs ──────────────────────────────────────────────────────

const CONSUMER: PortalConfig = {
  nav: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/wellness/advisor", label: "Hannah AI Wellness Assistant", icon: MessageCircleHeart },
    { href: "/nutrition", label: "Nutrition Log", icon: Apple },
    { href: "/supplements", label: "Supplement Protocol", icon: Pill },
    { href: "/body-tracker", label: "Body Tracker", icon: Activity },
    { href: "/wearables", label: "Wearables Data", icon: Activity },
    { href: "/helix", label: "Helix Rewards", icon: Dna },
    { href: "/genetics", label: "Genetics Protocol", icon: Dna },
    { href: "/peptide-protocol", label: "Peptide Protocol", icon: FlaskConical },
    { href: "/plugins", label: "Plugins", icon: Plug },
    { href: "/messages", label: "Connect", icon: MessageSquare },
    { href: "/media-sources", label: "Research Hub", icon: Newspaper },
    { href: "/science", label: "Science & Authorities", icon: BookOpen },
    { href: "/shop", label: "Shop", icon: ShoppingBag },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ],
  accent: "bg-teal",
  accentBg: "bg-teal/10 text-teal-light",
  badge: null,
  homeHref: "/dashboard",
};

const PRACTITIONER: PortalConfig = {
  nav: [
    { href: "/practitioner/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/practitioner/patients", label: "Patients", icon: Users },
    { href: "/practitioner/advisor", label: "AI Clinical Assistant", icon: BrainCircuit },
    { href: "/practitioner/protocols", label: "Protocols", icon: ClipboardList },
    { href: "/practitioner/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/practitioner/genomics", label: "Genomics", icon: Dna },
    { href: "/practitioner/interactions", label: "Interactions", icon: AlertTriangle },
    { href: "/practitioner/scheduler", label: "Scheduler", icon: Calendar },
    { href: "/practitioner/ehr", label: "EHR Hub", icon: FileText },
    { href: "/practitioner/compliance", label: "Compliance", icon: Shield },
    { href: "/practitioner/media-sources", label: "Research Hub", icon: Newspaper },
    { href: "/practitioner/ai", label: "AI Advisor", icon: Brain },
    { href: "/practitioner/shop", label: "Wholesale Shop", icon: ShoppingBag },
    { href: "/practitioner/certification", label: "Certification", icon: GraduationCap },
    { href: "/practitioner/billing", label: "Billing", icon: CreditCard },
    { href: "/practitioner/settings", label: "Settings", icon: Settings },
  ],
  accent: "bg-portal-green",
  accentBg: "bg-portal-green/10 text-portal-green",
  badge: { label: "PRO", bg: "bg-portal-green/20 text-portal-green" },
  homeHref: "/practitioner/dashboard",
};

const NATUROPATH: PortalConfig = {
  nav: [
    { href: "/naturopath/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/naturopath/patients", label: "Patients", icon: Users },
    { href: "/naturopath/advisor", label: "AI Holistic Advisor", icon: Leaf },
    { href: "/naturopath/botanical", label: "Botanical", icon: Leaf },
    { href: "/naturopath/constitutional", label: "Constitutional", icon: Activity },
    { href: "/naturopath/protocols", label: "Protocols", icon: ClipboardList },
    { href: "/naturopath/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/naturopath/scheduler", label: "Scheduler", icon: Calendar },
    { href: "/naturopath/interactions", label: "Interactions", icon: AlertTriangle },
    { href: "/naturopath/compliance", label: "Compliance", icon: Shield },
    { href: "/naturopath/media-sources", label: "Research Hub", icon: Newspaper },
    { href: "/naturopath/ai", label: "AI Advisor", icon: Brain },
    { href: "/naturopath/settings", label: "Settings", icon: Settings },
  ],
  accent: "bg-sage",
  accentBg: "bg-sage/10 text-sage-light",
  badge: { label: "NATURO", bg: "bg-sage/20 text-sage" },
  homeHref: "/naturopath/dashboard",
};

const ADMIN: PortalConfig = {
  nav: [
    { href: "/admin/jeffery", label: "Jeffery™ Command Center", icon: Cpu },
    { href: "/admin/hounddog", label: "Hounddog", icon: Target },
    { href: "/admin/marshall", label: "Marshall", icon: Shield },
    { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
    { href: "/admin/board", label: "Board Metrics", icon: BarChart3 },
    { href: "/admin/analytics", label: "Unit Economics", icon: TrendingUp },
    { href: "/admin/skus", label: "SKU Portfolio", icon: Pill },
    { href: "/admin/alerts", label: "Alerts & Risks", icon: AlertTriangle },
    { href: "/admin/inventory", label: "Inventory", icon: ClipboardList },
    { href: "/profile", label: "Profile", icon: UserIcon },
    { href: "/practitioner/settings", label: "Settings", icon: Settings },
  ],
  accent: "bg-copper",
  accentBg: "bg-copper/10 text-copper",
  badge: { label: "ADMIN", bg: "bg-copper/20 text-copper" },
  homeHref: "/admin",
};

function getPortal(role: string): PortalConfig {
  switch (role) {
    case "admin":
      return ADMIN;
    case "practitioner":
      return PRACTITIONER;
    case "naturopath":
      return NATUROPATH;
    default:
      return CONSUMER;
  }
}

// ─── Sidebar Component ──────────────────────────────────────────────────────

const STORAGE_KEY = "viaconnect-sidebar-collapsed";

export function Sidebar({
  user,
  role,
  onCollapseChange,
}: {
  user: User;
  role: string;
  onCollapseChange?: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const portal = getPortal(role);

  // Persist collapsed state in localStorage
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Phase 6: fetch the practitioner's credential_type to decide whether the
  // naturopath extras (AI Holistic Advisor, Botanicals, Constitutional,
  // Natural Protocols) render in this sidebar.
  const [showNaturopathExtras, setShowNaturopathExtras] = useState(false);
  useEffect(() => {
    if (role !== "practitioner") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await (supabase as any)
          .from("practitioners")
          .select("credential_type")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const cred = (data?.credential_type as string | undefined) ?? "";
        setShowNaturopathExtras(isNaturopathLikeCredential(cred));
      } catch {
        // table may not exist in older environments; silently leave hidden
      }
    })();
    return () => { cancelled = true; };
  }, [role, user.id]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setCollapsed(true);
      onCollapseChange?.(true);
    }
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    onCollapseChange?.(next);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const displayName = user.user_metadata?.full_name ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Don't render with wrong width before hydration
  if (!mounted) {
    return <aside className="hidden lg:block w-[260px] shrink-0" />;
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 flex flex-col shrink-0"
      style={{
        width: collapsed ? 72 : 260,
        transition: "width 200ms ease",
        background: "#0B1120",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Top: Logo + Collapse Toggle ── */}
      <div className="flex items-center h-16 px-4" style={{ justifyContent: collapsed ? "center" : "space-between" }}>
        <Link href={portal.homeHref} className="flex items-center min-w-0">
          {collapsed ? (
            <DNAHelixIcon size={24} />
          ) : (
            <span className="flex items-center gap-2">
              <ViaConnectLogo size="md" />
              {portal.badge && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${portal.badge.bg}`}>
                  {portal.badge.label}
                </span>
              )}
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center text-gray-400 hover:text-white hover:bg-dark-border transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="w-3 h-3 rotate-180" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {portal.nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== portal.homeHref && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors
                ${collapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
                ${isActive ? portal.accentBg : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}
            >
              {/* Active accent bar — animated slide */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full ${portal.accent}`}
                  style={{ height: 20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Phase 6: naturopath extras for nd, dc, lac credentials */}
        {showNaturopathExtras && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            {!collapsed && (
              <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
                Naturopathic Tools
              </p>
            )}
            {NATUROPATH_EXTRAS.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors
                    ${collapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
                    ${isActive
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-emerald-400"
                      style={{ height: 20 }}
                    />
                  )}
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* ── Bottom: User section ── */}
      <div className="border-t border-white/[0.06] p-2" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-full flex items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04]
            ${collapsed ? "justify-center" : ""}`}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-gray-500 capitalize leading-tight">{role}</p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-16 left-2 right-2 rounded-lg border border-dark-border bg-dark-card shadow-xl overflow-hidden"
              style={{ minWidth: collapsed ? 180 : undefined, left: collapsed ? 8 : undefined, right: collapsed ? "auto" : undefined }}
            >
              <Link
                href={role === "consumer" ? "/profile" : `/${role}/settings`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href={role === "consumer" ? "/profile" : `/${role}/settings`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="border-t border-dark-border" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-rose hover:bg-rose/10 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
