'use client';

import { BodyTrackerTabs } from '@/components/body-tracker/BodyTrackerTabs';

const HERO_IMAGE =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%201.png';

export default function BodyTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-scroll text-white md:bg-fixed"
      style={{ backgroundImage: `url('${HERO_IMAGE}')`, backgroundColor: '#1A2744' }}
    >
      <div className="min-h-screen bg-gradient-to-b from-[rgba(10,15,35,0.45)] via-[rgba(26,39,68,0.75)] to-[rgba(26,39,68,0.97)]">
        {/* Tab navigation */}
        <div className="sticky top-[60px] z-30 border-b border-white/[0.08] bg-[#1A2744]/90 backdrop-blur-md">
          <BodyTrackerTabs />
        </div>
        {/* Page content */}
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
