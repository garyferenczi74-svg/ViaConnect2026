'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDisplayName } from '@/lib/getDisplayName';

const TABS = [
  { href: '/peptide-protocol', label: 'Home', exact: true },
  { href: '/peptide-protocol/browse', label: 'Search', exact: false },
  { href: '/peptide-protocol/suggestions', label: getDisplayName('hannahai'), exact: false },
  { href: '/peptide-protocol/converter', label: 'Calculator', exact: false },
  {
    href: '/peptide-protocol/literacy',
    label: 'Literacy',
    exact: false,
  },
  {
    href: '/peptide-protocol/my-protocols',
    label: 'My Protocols',
    exact: false,
  },
] as const;

export function PeptideEducationTabs() {
  const pathname = usePathname() || '';

  return (
    <nav
      className="mb-5 flex flex-wrap gap-2"
      aria-label="Peptide Education sections"
      data-testid="peptide-education-tabs"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : tab.href === '/peptide-protocol/browse'
            ? pathname.startsWith(tab.href) ||
              pathname.startsWith('/peptide-protocol/peptide')
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-3 py-1.5 text-xs border transition-colors ${
              active
                ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-white'
                : 'border-white/10 bg-[#1E3054]/50 text-white/60 hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
