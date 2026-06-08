'use client';

// Progress surface placeholder: the 179b weight trajectory tab is in
// flight on a separate branch. This stub ensures the My Biology hub's
// Progress card has a real route to navigate to. When 179b lands it
// replaces this file with the full TrajectoryPlanner + TrajectoryChart
// + DailyTargetsPanel + AdaptiveRecalibrationPanel + Adherence +
// SafetyDisclaimer surface. The hub config does not need to change.

import { TrendingUp } from 'lucide-react';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';

export const metadata = {
  title: 'Progress',
};

export default function ProgressComingSoonPage() {
  return (
    <div className="space-y-6">
      <BackToHubLink />
      <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-6 backdrop-blur-md md:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm">
            <TrendingUp className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </span>
          <h1 className="text-lg font-semibold text-white md:text-xl">Progress</h1>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/[0.62] md:text-base">
          Progress is your whole journey in one place: CAQ targets, nutrition, supplements, training, and AI body composition. The full view is coming next; the foundation is being built right now.
        </p>
        <p className="mt-4 max-w-xl text-[12px] leading-relaxed text-white/45 md:text-[13px]">
          In the meantime, your Dashboard tracks today and your Body Composition tab tracks segmental change.
        </p>
      </section>
    </div>
  );
}
