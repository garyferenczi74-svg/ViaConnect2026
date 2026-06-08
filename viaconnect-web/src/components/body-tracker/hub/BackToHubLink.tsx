'use client';

// Prompt 180 (2026-06-08): back to My Biology hub link.
//
// Drops on top of every section page (dashboard, composition, weight,
// progress, milestones, metabolic) so users can return to the bento
// navigation. Replaces the navigational role the removed pill tab bar
// used to play.

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function BackToHubLink() {
  return (
    <Link
      href="/body-tracker"
      className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#1E3054]/35 px-3 py-1.5 text-[12px] font-medium text-white/75 backdrop-blur-sm transition-colors hover:border-white/[0.16] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
    >
      <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
      <span>My Biology</span>
    </Link>
  );
}

export default BackToHubLink;
