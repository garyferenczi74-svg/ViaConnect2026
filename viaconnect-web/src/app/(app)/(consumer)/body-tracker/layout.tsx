'use client';

import { BodyTrackerTabs } from '@/components/body-tracker/BodyTrackerTabs';
import { BodyTrackerGoldGate } from '@/components/body-tracker/BodyTrackerGoldGate';
import { MobileHeroVideoBackground } from '@/components/ui/MobileHeroVideoBackground';

const HERO_VIDEO =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/body%20tracker%201.mp4';

export default function BodyTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MobileHeroVideoBackground
        src={HERO_VIDEO}
        overlayOpacity={0.55}
        objectPosition="center center"
        flipX
      />
      <div className="relative z-10 min-h-screen text-white">
        {/* Prompt #169f section 3: Body Tracker is Gold and above. The gate wraps
            BOTH the tab navigation and the page content so a Free user sees only
            the upgrade-to-Gold prompt, not a tab bar over empty pages. A Gold or
            above user passes through to the normal surface (and still hits the
            independent Platinum gate on the FormaVision Body Scan entry). */}
        <BodyTrackerGoldGate>
          {/* Tab navigation, transparent so hero shows through */}
          <div className="sticky top-[60px] z-30">
            <BodyTrackerTabs />
          </div>
          {/* Page content */}
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </BodyTrackerGoldGate>
      </div>
    </>
  );
}
