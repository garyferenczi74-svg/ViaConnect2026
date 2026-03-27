'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelixBalance } from '@/components/helix-rewards/HelixBalance';

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

const NAV_ITEMS = [
  { label: 'Arena', href: '/helix/arena' },
  { label: 'Challenges', href: '/helix/challenges' },
  { label: 'Earn', href: '/helix/earn' },
  { label: 'Redeem', href: '/helix/redeem' },
  { label: 'Refer', href: '/helix/refer' },
  { label: 'Research', href: '/helix/research' },
] as const;

export default function HelixLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen px-4 lg:px-6 py-6"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Hero Balance */}
        <div className={`${GLASS} p-6`}>
          <HelixBalance
            balance={2847}
            streak={14}
            level={4}
            levelName="Vitality Champion"
            lifetimeEarned={3500}
            xpCurrent={3500}
            xpToNextLevel={7000}
            nextLevelName="Bio-Optimizer"
          />
        </div>

        {/* Nav Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2DA5A0]/15 text-[#2DA5A0] border border-[#2DA5A0]/40'
                    : `${GLASS} text-secondary hover:text-white`
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Sub-page Content */}
        {children}
      </div>
    </div>
  );
}
