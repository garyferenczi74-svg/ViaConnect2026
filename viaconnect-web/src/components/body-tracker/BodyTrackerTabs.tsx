'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Scale, Dumbbell, Trophy, TrendingUp, HeartPulse, Link2, Box } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BODY_TRACKER_TABS } from '@/lib/body-tracker/constants';

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  composition: Users,
  formavision: Box,
  weight: Scale,
  muscle: Dumbbell,
  milestones: Trophy,
  progress: TrendingUp,
  metabolic: HeartPulse,
  connections: Link2,
};

export function BodyTrackerTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-3 md:px-6">
      {BODY_TRACKER_TABS.map((tab) => {
        const Icon = ICONS[tab.id] ?? LayoutDashboard;
        const isActive =
          pathname === tab.href ||
          (tab.id !== 'dashboard' && pathname?.startsWith(tab.href));
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium backdrop-blur-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#27AE60]/50 focus-visible:ring-offset-0 [-webkit-tap-highlight-color:transparent] ${
              isActive
                ? 'border-[#27AE60]/60 bg-[#27AE60]/10 text-white'
                : 'border-white/30 bg-white/[0.06] text-white hover:bg-white/15'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
