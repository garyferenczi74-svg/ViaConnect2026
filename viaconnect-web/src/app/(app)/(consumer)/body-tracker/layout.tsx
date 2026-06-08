'use client';

// Prompt 180 (2026-06-08): top level pill tab bar removed. The new
// BodyTrackerHub at /body-tracker is the bento navigation; section
// pages each carry a back to My Biology link so users can return to
// the hub. The hero video background is preserved.

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
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
    </>
  );
}
