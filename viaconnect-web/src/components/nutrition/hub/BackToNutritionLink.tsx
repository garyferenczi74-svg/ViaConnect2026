// Prompt 183 (2026-06-10): back to My Nutrition hub link.
//
// Drops on top of every Nutrition section page so users can return to the
// bento navigation. Mirrors BackToHubLink in the body-tracker hub: no hooks,
// no client directive, safe in both server and client components.

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function BackToNutritionLink() {
  return (
    <Link
      href="/nutrition"
      className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#1E3054]/35 px-3 py-1.5 text-[12px] font-medium text-white/75 backdrop-blur-sm transition-colors hover:border-white/[0.16] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
    >
      <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
      <span>My Nutrition</span>
    </Link>
  );
}

export default BackToNutritionLink;
