// Brief 17: unknown /genetics/{slug} values render this app-shell 404.
// Existing genetics chrome (Deep Navy, Lucide 1.5). Not a fake panel.

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BLUEPRINT_ROUTE } from '@/lib/genex360/variantReport.config';

export default function GeneticsNotFound() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <Link
          href="/genetics"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-white/70 no-underline transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          My Genetics
        </Link>

        <h1 className="mt-6 text-2xl font-semibold leading-tight text-white md:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/70 md:text-sm">
          This genetic panel is not in the catalog. Open Your Genetic Blueprint
          to browse the live GeneX360 panels.
        </p>
        <Link
          href={BLUEPRINT_ROUTE}
          className="mt-6 inline-flex min-h-[44px] items-center rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] no-underline transition-colors hover:bg-[#2DA5A0]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          Your Genetic Blueprint
        </Link>
      </div>
    </div>
  );
}
