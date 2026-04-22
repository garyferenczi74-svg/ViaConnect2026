'use client';

import { BodyTrackerTabs } from '@/components/body-tracker/BodyTrackerTabs';
import { MobileHeroBackground } from '@/components/ui/MobileHeroBackground';

const HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2027.png';
const HERO_IMAGE_MOBILE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Athlete%2027%20Mobile.png';

export default function BodyTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MobileHeroBackground
        src={HERO_IMAGE}
        mobileSrc={HERO_IMAGE_MOBILE}
        overlayOpacity={0.55}
        objectPosition="center center"
        priority
        flipX
      />
      <div className="relative z-10 min-h-screen text-white">
        {/* Tab navigation — transparent so hero shows through */}
        <div className="sticky top-[60px] z-30">
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
