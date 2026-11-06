import { HeroVariantRenderer } from "@/components/landing/HeroVariantRenderer";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TrustBandSection } from "@/components/home/TrustBandSection";
import { SarahScenarioSection } from "@/components/home/SarahScenarioSection";
import { OutcomeTimelineSection } from "@/components/home/OutcomeTimelineSection";
import { LandingNav } from "@/components/landing/LandingNav";
import { StickyHeroWrapper } from "@/components/landing/StickyHeroWrapper";
import { LandingScrollSections } from "@/components/landing/scroll-sections/LandingScrollSections";

// TrustBand reads cookies for A/B; keep home dynamic to avoid static-gen thrash.
export const dynamic = "force-dynamic";

// Prompt #139: landing scroll consolidation.
// From 1000px the hero is an in-flow 100svh/100dvh block. Later sections
// start after it, with their own top padding, and do not paint over it.
// TrustBand / SarahScenario / OutcomeTimeline preserved verbatim from #138.
// LandingScrollSections appends one Features / Process / Genomics / About /
// Membership / Final CTA tree (Brief 45: no dual desktop+mobile SSR).
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
