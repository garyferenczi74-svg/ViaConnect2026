import { HeroVariantRenderer } from "@/components/landing/HeroVariantRenderer";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TrustBandSection } from "@/components/home/TrustBandSection";
import { SarahScenarioSection } from "@/components/home/SarahScenarioSection";
import { OutcomeTimelineSection } from "@/components/home/OutcomeTimelineSection";
import { LandingNav } from "@/components/landing/LandingNav";
import { StickyHeroWrapper } from "@/components/landing/StickyHeroWrapper";
import { LandingHeroCarousel } from "@/components/landing/LandingHeroCarousel";
import { LandingScrollSections } from "@/components/landing/scroll-sections/LandingScrollSections";

// TrustBand reads cookies for A/B; keep home dynamic to avoid static-gen thrash.
export const dynamic = "force-dynamic";

// Prompt #139: landing scroll consolidation.
// Hero is sticky; subsequent sections scroll over it with semi-transparent
// backgrounds so the hero video stays visible throughout.
// LandingHeroCarousel sits OUTSIDE StickyHeroWrapper so it stays locked to
// the first viewport and scrolls away as the user moves into TrustBand.
// `relative` on main is required for the carousel's absolute positioning.
// TrustBand / SarahScenario / OutcomeTimeline preserved verbatim from #138.
// LandingScrollSections appends Features, Process, Genomics, About, Final CTA.
// overflow-x-clip on main keeps sticky parent compatible (overflow-x-hidden
// would create a containing block and break sticky descendants).
export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main className="relative overflow-x-clip">
        <StickyHeroWrapper>
          <HeroVariantRenderer />
        </StickyHeroWrapper>
        {/* Mobile-only buffer below the sticky hero so TrustBand doesn't immediately
            cover the bottom CTA buttons (Practitioner/Naturopath) as the user scrolls.
            Without this, TrustBand starts entering the viewport at ~14px scroll and
            covers the third button before it can be tapped. */}
        <div aria-hidden="true" className="sm:hidden h-[280px]" />
        <LandingHeroCarousel />
        <TrustBandSection />
        <SarahScenarioSection />
        <OutcomeTimelineSection />
        <LandingScrollSections />
      </main>
      {/* relative z-10 lifts the footer above the hero's fixed inset-0 backdrop,
          which paints as part of StickyHeroWrapper's z-0 stacking context and
          otherwise covers a static footer. Matches the scroll sections' z-10. */}
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </>
  );
}
