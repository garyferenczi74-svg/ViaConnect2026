'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/peptide-protocol', label: 'Monographs', exact: true },
  { href: '/peptide-protocol/converter', label: 'Converter', exact: false },
  {
    href: '/peptide-protocol/literacy',
    label: 'Protocol Literacy',
    exact: false,
    soon: true,
  },
] as const;

export function PeptideEducationTabs() {
  const pathname = usePathname() || '';

  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Peptide Education sections"
      data-testid="peptide-education-tabs"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        if ('soon' in tab && tab.soon) {
          return (
            <span
              key={tab.href}
              className="rounded-xl px-3 py-1.5 text-xs border border-white/10 text-white/35"
              title="Module C ships next"
            >
              {tab.label}
            </span>
          );
        }
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
