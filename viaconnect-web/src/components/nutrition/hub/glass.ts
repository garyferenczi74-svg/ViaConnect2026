// Prompt 191 (2026-06-11): shared blue glass composition for the Today's
// Meals accordion (My Nutrition hub), shipped as named Tailwind class-string
// constants so later audited surfaces can reuse the exact same recipe.
//
// Material rules:
// - Tint is Deep Navy #1A2744 ONLY. Teal and orange stay accents and are
//   never used as a glass tint.
// - Graceful degradation first: every tier leads with an opaque-leaning /85
//   fallback for browsers without backdrop-filter, then upgrades to the
//   translucent tint + blur under supports-[backdrop-filter].
// - Blur ceiling is backdrop-blur-md, never lg. Contrast escalation rule: if
//   the tint fails on the brightest photo asset, raise the TINT in 5 point
//   steps to a /65 ceiling; never raise the blur.
// - Gary (2026-06-11): tints halved from the original /50 and /55 (50 percent
//   more translucent) so the photography reads clearly through the glass. The
//   /85 fallback is NOT halved: it exists for legibility where backdrop-filter
//   is unsupported, not as glass.
// - Tailwind's backdrop-blur utilities emit -webkit-backdrop-filter alongside
//   backdrop-filter, so Safari needs nothing extra here.

// Tier 1: collapsed accordion rows. Material only; geometry (radius, the 4px
// colored left accent edge) stays on the consumer.
export const GLASS_TIER1 =
  'bg-[#1A2744]/85 supports-[backdrop-filter]:bg-[#1A2744]/25 supports-[backdrop-filter]:backdrop-blur-md border border-white/10';

// WHITE glass (Gary 2026-06-11): the COLLAPSED Today's Meals rows and the
// card heading pill render as white translucent glass; the section flips to
// the dark navy tiers above when expanded. The no-backdrop-filter fallback
// deliberately stays Deep Navy /85: white text would be illegible on a solid
// white fallback, and the fallback is a legibility floor, not the design.
// Gary (2026-06-11): white tint halved again (bg-white/[0.08]) so the
// background videos and images read clearly through the pills.
export const GLASS_WHITE =
  'bg-[#1A2744]/85 supports-[backdrop-filter]:bg-white/[0.08] supports-[backdrop-filter]:backdrop-blur-md border border-white/20';

// Tier 2 header strip: the expanded section's name + total + collapse chevron.
export const GLASS_TIER2_HEADER =
  'bg-[#1A2744]/85 supports-[backdrop-filter]:bg-[#1A2744]/[0.28] supports-[backdrop-filter]:backdrop-blur-md border-b border-white/10';

// Tier 2 body panel: ALL remaining expanded content sits inside one of these.
export const GLASS_TIER2_BODY =
  'bg-[#1A2744]/85 supports-[backdrop-filter]:bg-[#1A2744]/25 supports-[backdrop-filter]:backdrop-blur-md border border-white/10 rounded-xl';

// Small kcal / volume chips on the collapsed rows. Tint halved with the
// pills (Gary 2026-06-11) so the media shows through.
export const GLASS_CHIP =
  'bg-white/[0.03] border border-white/10 text-white supports-[backdrop-filter]:backdrop-blur-sm';
