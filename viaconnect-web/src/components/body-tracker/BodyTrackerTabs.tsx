'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Scale, Dumbbell, Trophy, HeartPulse, Link2, Camera } from 'lucide-react';
import { BODY_TRACKER_TABS } from '@/lib/body-tracker/constants';

const ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  composition: Users,
  weight: Scale,
  muscle: Dumbbell,
  milestones: Trophy,
  metabolic: HeartPulse,
  photos: Camera,
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
                ? 'border-[#27AE60]/60 bg-[#27AE60]/25 text-[#27AE60]'
                : 'border-white/40 bg-white/25 text-[#1A2744] hover:bg-white/40'
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
