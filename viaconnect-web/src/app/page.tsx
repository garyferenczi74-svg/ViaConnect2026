import { HeroVariantRenderer } from "@/components/landing/HeroVariantRenderer";
import { TrustBandSection } from "@/components/home/TrustBandSection";

// Prompt #138a Phase 4: HeroVariantRenderer wraps HeroSection with the
// variant lifecycle. Falls back to HeroSection's control copy when no
// test round is active. Visual non-disruption guarantee section 3 holds.
//
// Prompt #138c: TrustBandSection renders below the hero. Returns null
// when no trust band content is active, so the page stays unchanged
// during Phase A operational rollout. Visual non-disruption inherited
// from #138 section 3: the band is a new section, not a modification.
export default function HomePage() {
  return (
    <>
      <HeroVariantRenderer />
      <TrustBandSection />
    </>
  );
}
