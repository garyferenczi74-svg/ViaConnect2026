'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Apple, LayoutDashboard, Dna, Pill, ShoppingBag, Coins, MessageSquare,
  User as UserIcon, Users, ClipboardList, BarChart3, AlertTriangle,
  FileText, Brain, Settings, Leaf, Activity, Calendar, Shield, Upload,
  Plug, Newspaper, BookOpen, FlaskConical, ChevronLeft, ChevronRight,
  MessageCircleHeart,
} from 'lucide-react';
import { useRef } from 'react';
import type { IconType } from '@/types/icon';

type NavItem = { href: string; label: string; icon: IconType };

const PORTAL_NAV: Record<string, NavItem[]> = {
  consumer: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/wellness/advisor', label: 'Hannah AI', icon: MessageCircleHeart },
    { href: '/nutrition', label: 'My Nutrition', icon: Apple },
    { href: '/supplements', label: 'My Supplements', icon: Pill },
    { href: '/body-tracker', label: 'My Biology', icon: Activity },
    { href: '/wearables', label: 'Wearables Data', icon: Activity },
    { href: '/helix', label: 'Helix Rewards', icon: Dna },
    { href: '/genetics', label: 'My Genetics', icon: Dna },
    { href: '/peptide-protocol', label: 'Peptide Education', icon: FlaskConical },
    { href: '/plugins', label: 'Plugins', icon: Plug },
    { href: '/messages', label: 'Connect', icon: MessageSquare },
    { href: '/media-sources', label: 'Research Hub', icon: Newspaper },
    { href: '/science', label: 'Science', icon: BookOpen },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ],
  practitioner: [
    { href: '/practitioner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/practitioner/patients', label: 'Patients', icon: Users },
    { href: '/practitioner/protocols', label: 'Protocols', icon: ClipboardList },
    { href: '/practitioner/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/practitioner/genomics', label: 'Genomics', icon: Dna },
    { href: '/practitioner/interactions', label: 'Interactions', icon: AlertTriangle },
    { href: '/practitioner/scheduler', label: 'Scheduler', icon: Calendar },
    { href: '/practitioner/ehr', label: 'EHR', icon: FileText },
    { href: '/practitioner/media-sources', label: 'Research', icon: Newspaper },
    { href: '/practitioner/ai', label: 'AI', icon: Brain },
    { href: '/practitioner/settings', label: 'Settings', icon: Settings },
  ],
  naturopath: [
    { href: '/naturopath/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/naturopath/patients', label: 'Patients', icon: Users },
    { href: '/naturopath/botanical', label: 'Botanical', icon: Leaf },
    { href: '/naturopath/protocols', label: 'Protocols', icon: ClipboardList },
    { href: '/naturopath/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/naturopath/interactions', label: 'Interactions', icon: AlertTriangle },
    { href: '/naturopath/media-sources', label: 'Research', icon: Newspaper },
    { href: '/naturopath/ai', label: 'AI', icon: Brain },
    { href: '/naturopath/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { href: '/admin', label: 'Admin', icon: LayoutDashboard },
    { href: '/admin/marshall', label: 'Marshall', icon: Shield },
    { href: '/admin/board', label: 'Board', icon: BarChart3 },
    { href: '/admin/skus', label: 'SKUs', icon: Pill },
    { href: '/admin/alerts', label: 'Alerts', icon: AlertTriangle },
    { href: '/admin/inventory', label: 'Inventory', icon: ClipboardList },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ],
};

export function MobileNavBar({ role }: { role: string }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const nav = PORTAL_NAV[role] || PORTAL_NAV.consumer;

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
    }
  };

  return (
    // 167 followup: split sticky from backdrop-filter onto separate
    // elements. iOS Safari sometimes fails to engage sticky when
    // backdrop-filter creates a stacking context on the same node
    // (the body-tracker sticky pattern at layout.tsx:24 uses a plain
    // sticky wrapper with styled inner content for this reason).
    <nav
      data-prompt-167="section-sub-nav"
      aria-label="Section navigation"
      className="sticky top-0 z-40 lg:hidden md:relative md:top-auto md:z-20"
    >
      <div className="bg-[#1E3054]/45 backdrop-blur-md border-b border-white/10 md:bg-[#0D1520] md:backdrop-blur-none md:border-white/[0.06]">
      <div className="relative flex items-center">
        {/* Left fade + scroll button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 h-full px-1 bg-gradient-to-r from-[#0d1520] to-transparent"
          aria-label="Scroll left"
        >
          <ChevronLeft size={14} strokeWidth={1.5} className="text-white/40" />
        </button>

        {/* Scrollable nav items */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar px-7 py-2"
        >
          {nav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' &&
               item.href !== '/admin' &&
               pathname.startsWith(item.href + '/'));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border border-[rgba(45,165,160,0.3)]'
                    : 'text-white hover:bg-[#1A2744]/80 border border-transparent'
                }`}
              >
                <Icon size={14} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right fade + scroll button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 h-full px-1 bg-gradient-to-l from-[#0d1520] to-transparent"
          aria-label="Scroll right"
        >
          <ChevronRight size={14} strokeWidth={1.5} className="text-white/40" />
        </button>
      </div>
      </div>
    </nav>
  );
}
