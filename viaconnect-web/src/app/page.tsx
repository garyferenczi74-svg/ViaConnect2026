import { HeroVariantRenderer } from "@/components/landing/HeroVariantRenderer";

// Prompt #138a Phase 4: HeroVariantRenderer wraps HeroSection with the
// variant lifecycle from spec section 5 to section 7. When no test round
// is active (current state until variants are activated), the renderer
// falls back to HeroSection's control copy. Visual non-disruption guarantee
// in spec section 3 holds because HeroSection's structure is preserved.
export default function HomePage() {
  return <HeroVariantRenderer />;
}
