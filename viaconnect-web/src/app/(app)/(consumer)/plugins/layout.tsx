'use client';

import { usePathname } from 'next/navigation';

// Connected Sources section layout. The index (/plugins) is a full hub-width
// bento that must line up with My Biology / My Genetics / My Nutrition, so it
// uses the same container as body-tracker/layout.tsx: mx-auto max-w-7xl with the
// standard px-4 md:px-6 gutters. The connect detail pages (/plugins/wearables,
// /plugins/apps, /plugins/labs, /plugins/manage) are simple connect lists that
// read better in a narrower column, so they keep max-w-3xl. One shared layout,
// not a per-page fork. The gradient background is applied once here (the index
// page no longer wraps itself), so there is no double background.
export default function PluginsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === '/plugins';
  return (
    <div
      className="min-h-screen font-[Instrument_Sans]"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className={`mx-auto px-4 py-6 md:px-6 md:py-8 ${isIndex ? 'max-w-7xl' : 'max-w-3xl'}`}>
        {children}
      </div>
    </div>
  );
}
