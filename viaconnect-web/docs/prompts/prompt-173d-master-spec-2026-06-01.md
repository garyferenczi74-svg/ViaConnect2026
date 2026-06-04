# Prompt 173d: Interstitial 8 Second Switch and Glass Continue Buttons

**Filed:** 2026-06-04 (spec dated 2026-06-01)
**Owner:** Gary
**Status:** LOCKED. Amends Prompt 173c Part A. No open decision points.

Replaces the 173c reading-time-aware delay with a fixed 8 second switch and restyles the Continue button as compact white frosted glass. Every accessibility safeguard from 173c is preserved.

## Stack

Next.js 14+, TypeScript, Tailwind, Supabase, Capacitor, Vercel to viaconnectapp.com. WCAG 2.2 AA throughout. No em-dashes or en-dashes. Tokens: Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`, Instrument Sans, Lucide React strokeWidth 1.5.

## 1. Fixed 8 second switch

- Single constant `interstitial_auto_advance_ms = 8000` in the same config module.
- REMOVE `base_ms`, `words_per_second`, `min_ms`, `max_ms` and their computeAdvanceDelayMs / countInterstitialWords helpers.
- Everything else from 173c §1.2 stands: tap to advance, progress fill, pause on interaction, prefers-reduced-motion, settings toggle, screen-reader handling.

## 2. Compact Continue button

- Hugs its label. `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium`.
- Optional Lucide ChevronRight at strokeWidth 1.5.
- Visual can be compact but the tappable area stays at least 44 by 44 CSS pixels on mobile (extend with padding or invisible inset).
- One shared button component used everywhere Continue renders.

## 3. White glass translucent styling

- Base: `bg-white/45 backdrop-blur-md border border-white/40 shadow-sm`.
- Label color: Deep Navy `#1A2744`.
- Focus: visible `focus-visible:ring-2 focus-visible:ring-[#2DA5A0]`.
- Contrast floor (Kelsey verifies): navy label >= 4.5:1 against darkest hero video frame. Tint opacity is ONE tunable constant; raise if any frame fails.
- Backdrop-filter fallback: `supports-[backdrop-filter]:bg-white/45` with base `bg-white/80`.
- Reduce-transparency / `prefers-contrast: more`: raise to ~`bg-white/90` + drop blur.
- Glass applies to Continue button ONLY. Interstitial card + hero video unchanged.

## 4. Acceptance criteria

1. Auto-advance is fixed 8 s driven by ONE constant. Old formula constants removed.
2. Tap to advance + progress fill + pause + reduced-motion + settings toggle + screen-reader behavior all still work.
3. Continue hugs its label, compact, mobile tappable area >= 44x44 px.
4. Glass + backdrop blur visible behind button.
5. Navy label >= 4.5:1 contrast against bright and dark video frames; tint is one tunable constant.
6. Backdrop-filter unsupported -> opaque fallback.
7. Reduce-transparency or contrast-more -> near-opaque tint + no blur.
8. Teal focus ring visible on Desktop + Mobile.
9. ONE shared button component.
10. No em-dashes/en-dashes. No new dependency. No package.json edit. No applied-migration edits. Supabase email templates untouched.

## 5. Out of scope

- No interstitial copy changes (173b). No Quick/Complete logic changes (173c B). No CAQ question changes. No macro engine changes.

## 6. Build sequence

1. Replace 173c delay formula with 8000 ms constant.
2. Update shared Continue button to hug-content + 44 px touch target.
3. Apply glass styling + contrast floor + fallback + reduce-transparency / contrast-more handling.
4. Kelsey verifies contrast. Michelangelo tests green.
5. Push to main.
