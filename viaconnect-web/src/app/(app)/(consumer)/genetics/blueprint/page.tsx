// Prompt 193a follow-up (2026-06-12): the standalone Your Genetic Blueprint page.
//
// Hosts the GeneX360 panel explorer (the pill tabs, panel description cards, and
// the GeneX-M per SNP deep reports) that Gary moved OFF the /shop/genex360 PLP
// onto its own page. It is reached from the Your Genetic Blueprint hero card on
// /genetics. The buy path is preserved by the Shop GeneX360 CTA below, which
// points back at the shop PLP.
//
// Server component on plain Deep Navy. GeneX360PanelSection is a client island
// that reads window.location.hash (not useSearchParams), so no Suspense boundary
// is required. The nested GeneX-M deep links now resolve here, for example
// /genetics/blueprint#genex-m/mthfr.
//
// Standing rules honored: tokens only (Deep Navy #1A2744, Teal #2DA5A0), Lucide
// strokeWidth 1.5, no emojis, no em or en dashes, Via Cura is the only consumer
// brand named here.

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { GeneX360PanelSection } from '@/components/shop/genex360/GeneX360PanelSection';

export const metadata = {
  title: 'Your Genetic Blueprint | Via Cura',
  description:
    'Explore the six GeneX360 panels marker by marker, including the full GeneX-M per SNP reports.',
};

export default function GeneticBlueprintPage() {
  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        {/* Back to the My Genetics hub. */}
        <Link
          href="/genetics"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-white/70 no-underline transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          My Genetics
        </Link>

        {/* Page header, mirroring the Your Genetic Blueprint hero card that links
            here, plus a Shop GeneX360 CTA that preserves the buy path. */}
        <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2DA5A0]">
              Your DNA, decoded
            </span>
            <h1 className="text-2xl font-semibold leading-tight text-white md:text-3xl">
              Your Genetic Blueprint
            </h1>
            <p className="max-w-xl text-[13px] leading-relaxed text-white/70 md:text-sm">
              Explore the six GeneX360 panels marker by marker, then open any GeneX-M SNP for its
              full report.
            </p>
          </div>
          <Link
            href="/shop/genex360"
            className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] no-underline transition-colors hover:bg-[#2DA5A0]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            Shop GeneX360
            <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </header>

        {/* The panel explorer (pill tabs + panel description cards + GeneX-M deep
            reports), moved here from the shop PLP. */}
        <div className="mt-8">
          <GeneX360PanelSection />
        </div>
      </div>
    </div>
  );
}
