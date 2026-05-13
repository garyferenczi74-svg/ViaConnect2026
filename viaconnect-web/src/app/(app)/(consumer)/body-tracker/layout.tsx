'use client';

import { BodyTrackerTabs } from '@/components/body-tracker/BodyTrackerTabs';
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
        {/* Tab navigation, transparent so hero shows through */}
        <div className="sticky top-[120px] z-30 md:top-[60px]">
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
