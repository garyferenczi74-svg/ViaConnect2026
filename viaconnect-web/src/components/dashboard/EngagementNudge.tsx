'use client';

// EngagementNudge — translucent nudge card under Daily Scores. Surfaces
// the highest-priority contextual nudge from engagementNudges. Prompt #62d.

import {
  Activity,
  Apple,
  Bed,
  Brain,
  Flame,
  Pill,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type {
  EngagementNudge as Nudge,
  NudgeIconName,
} from '@/lib/scoring/engagementNudges';

const ICON_MAP: Record<NudgeIconName, LucideIcon> = {
  Activity,
  Apple,
  Bed,
  Brain,
  Flame,
  Pill,
  Sparkles,
};

export function EngagementNudge({ nudge }: { nudge: Nudge }) {
  const Icon = ICON_MAP[nudge.iconName] ?? Brain;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10">
          <Icon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/90">{nudge.message}</p>
          <p className="mt-1 text-xs text-[#2DA5A0]">{nudge.pointsReward}</p>
        </div>
      </div>
    </div>
  );
}
