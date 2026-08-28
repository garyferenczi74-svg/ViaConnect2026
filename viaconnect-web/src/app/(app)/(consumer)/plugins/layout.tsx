'use client';

import { usePathname } from 'next/navigation';

// /plugins uses the same max-w-7xl (1280) chrome gutter as the hubs at 390 and
// 1280. Subroutes stay max-w-3xl. Existing AppShell logo is unchanged.
export default function PluginsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === '/plugins';
  const isHeroRoute = pathname === '/plugins' || pathname === '/plugins/apps';
  return (
    <div
      className="min-h-screen font-[Instrument_Sans]"
      style={{ background: isHeroRoute ? 'transparent' : 'var(--gradient-hero)' }}
    >
      <div className={`mx-auto px-4 py-6 md:px-6 md:py-8 ${isIndex ? 'max-w-7xl' : 'max-w-3xl'}`}>
        {children}
      </div>
    </div>
  );
}
