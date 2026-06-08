'use client';

// Prompt 180 (2026-06-08): top level pill tab bar removed. The new
// BodyTrackerHub at /body-tracker is the bento navigation; section
// pages each carry a back to My Biology link so users can return to
// the hub.
//
// Prompt 180a (2026-06-08): outer container widened from max-w-5xl
// (1024px) to max-w-7xl (1280px) so the My Biology hub footprint
// matches the Dashboard and Shop sibling pages. Horizontal padding
// (px-4 md:px-6) stays aligned with those siblings. Section pages
// inherit the wider container; tablet and mobile breakpoints are
// unchanged because both siblings use the same px values.
//
// Prompt 180b (2026-06-08): hero background video is suppressed on
// the My Biology hub route (/body-tracker) only. Section routes
// (/body-tracker/<surface>) keep the hero so the existing tab pages
// still get the cinematic body tracker backdrop they shipped with.
// Path check via usePathname avoids editing the shared
// MobileHeroVideoBackground component or each section page.

import { usePathname } from 'next/navigation';
import { MobileHeroVideoBackground } from '@/components/ui/MobileHeroVideoBackground';

const HERO_VIDEO =
  'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/body%20tracker%201.mp4';

export default function BodyTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The My Biology hub sits at /body-tracker exactly. Any deeper path
  // is a section page that keeps the hero. Trailing slashes are
  // tolerated for the rare router configurations that emit them.
  const isHub = pathname === '/body-tracker' || pathname === '/body-tracker/';

  return (
    <>
      {isHub ? null : (
        <MobileHeroVideoBackground
          src={HERO_VIDEO}
          overlayOpacity={0.55}
          objectPosition="center center"
          flipX
        />
      )}
      <div className="relative z-10 min-h-screen text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
    </>
  );
}
