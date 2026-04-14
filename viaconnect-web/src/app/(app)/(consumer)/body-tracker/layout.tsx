'use client';

import { BodyTrackerTabs } from '@/components/body-tracker/BodyTrackerTabs';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';

const HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%201.png';

export default function BodyTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MobileHeroBackground src={HERO_IMAGE} overlayOpacity={0.55} objectPosition="center center" priority />
      <div className="relative z-10 min-h-screen text-white">
        {/* Tab navigation */}
        <div className="sticky top-[60px] z-30 border-b border-white/[0.08] bg-[#1A2744]/90 backdrop-blur-md">
          <BodyTrackerTabs />
        </div>
        {/* Page content */}
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
    </>
  );
}
