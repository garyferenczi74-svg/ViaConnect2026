'use client';

// Prompt 224: My Biology Dashboard bento redesign.
// Hub (/body-tracker) is intentionally untouched.

import Link from 'next/link';
import { ArrowRight, Dumbbell, TrendingDown } from 'lucide-react';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import { DashboardBento } from '@/components/body-tracker/dashboard/DashboardBento';
import { useCurrentUser } from '@/components/body-tracker/manual-input';
import { useUserJourney } from '@/hooks/body-tracker/useUserJourney';

export default function BodyTrackerDashboard() {
  const { id: userId } = useCurrentUser();
  const { activeJourney, loading: journeyLoading } = useUserJourney(userId);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <BackToHubLink />

      {!journeyLoading && (
        activeJourney ? (
          <Link
            href="/body-tracker/journey"
            className="flex min-h-[44px] items-center justify-between rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-sm transition-all hover:bg-[#1E3054]/45"
          >
            <div className="flex items-center gap-3">
              {activeJourney === 'weight_loss' ? (
                <TrendingDown className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
              ) : (
                <Dumbbell className="h-5 w-5 text-[#B75E18]" strokeWidth={1.5} />
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Active journey</p>
                <p className="text-sm font-semibold text-white">
                  {activeJourney === 'weight_loss' ? 'Weight Loss' : 'Muscle Building'}
                </p>
              </div>
            </div>
            <span className="text-xs text-white/50">Switch</span>
          </Link>
        ) : (
          <Link
            href="/body-tracker/journey"
            className="flex min-h-[44px] items-center justify-between rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-4 backdrop-blur-sm transition-all hover:bg-[#2DA5A0]/15"
          >
            <div>
              <p className="text-sm font-semibold text-[#2DA5A0]">Set your journey</p>
              <p className="text-xs text-white/60">
                Pick Weight Loss or Muscle Building so Arnold can tailor everything to your goal.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          </Link>
        )
      )}

      <DashboardBento userId={userId} />
    </div>
  );
}
