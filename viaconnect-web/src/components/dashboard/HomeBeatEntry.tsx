'use client';

// Slim Home entry (Brief 50). Not a score widget. Brief 28 glass chrome.

import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export type HomeBeatEntryId = 'connections' | 'command-center';

export interface HomeBeatEntryProps {
  beat: HomeBeatEntryId;
  href: string;
  label: string;
  cta: string;
  icon: LucideIcon;
}

export function HomeBeatEntry({
  beat,
  href,
  label,
  cta,
  icon: Icon,
}: HomeBeatEntryProps) {
  return (
    <Link
      data-home-beat={beat}
      href={href}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1E3054]/60 px-4 py-3 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
    >
      <Icon className="h-5 w-5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
      <span className="min-w-0 flex-1 text-sm font-semibold text-white">{label}</span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2DA5A0]">
        {cta}
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </span>
    </Link>
  );
}
