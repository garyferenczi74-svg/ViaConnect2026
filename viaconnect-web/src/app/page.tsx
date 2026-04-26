import { HeroVariantRenderer } from "@/components/landing/HeroVariantRenderer";
import { TrustBandSection } from "@/components/home/TrustBandSection";
import { OutcomeTimelineSection } from "@/components/home/OutcomeTimelineSection";

// Conversion stack composition (top to bottom):
//   #138a Hero  variant-tested headline + subhead + CTA
//   #138c Trust Band  regulatory paragraph, clinician card, trust chips
//   #138e Outcome Timeline  30/60/90 categorical future-state framing
//
// Each section renders null when its content is not active in the DB,
// so the homepage stays clean during Phase A operational rollout when
// nothing has been activated yet. Visual non-disruption guarantee from
// #138 section 3 holds across all three sections; each is additive.
export default function HomePage() {
  return (
    <>
      <HeroVariantRenderer />
      <TrustBandSection />
      <OutcomeTimelineSection />
    </>
  );
}
