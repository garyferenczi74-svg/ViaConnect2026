import { HeroVariantRenderer } from "@/components/landing/HeroVariantRenderer";
import { TrustBandSection } from "@/components/home/TrustBandSection";
import { SarahScenarioSection } from "@/components/home/SarahScenarioSection";
import { OutcomeTimelineSection } from "@/components/home/OutcomeTimelineSection";
import { StickyHeroWrapper } from "@/components/landing/StickyHeroWrapper";
import { LandingHeroCarousel } from "@/components/landing/LandingHeroCarousel";
import { LandingScrollSections } from "@/components/landing/scroll-sections/LandingScrollSections";

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
    <main className="relative overflow-x-clip">
      <StickyHeroWrapper>
        <HeroVariantRenderer />
      </StickyHeroWrapper>
      <LandingHeroCarousel />
      <TrustBandSection />
      <SarahScenarioSection />
      <OutcomeTimelineSection />
      <LandingScrollSections />
    </main>
  );
}
