'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Scale, Dumbbell, Trophy, HeartPulse } from 'lucide-react';
import { BODY_TRACKER_TABS } from '@/lib/body-tracker/constants';

const ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  composition: Users,
  weight: Scale,
  muscle: Dumbbell,
  milestones: Trophy,
  metabolic: HeartPulse,
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
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
              isActive
                ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/20 text-[#2DA5A0]'
                : 'border-white/12 bg-white/[0.07] text-white/65 hover:bg-white/12 hover:text-white/90'
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
