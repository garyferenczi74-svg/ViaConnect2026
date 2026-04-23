# Prompt #118 — Body Tracker Graphics Upgrade: Delivery Report

**Project:** ViaConnect Web
**Supabase:** nnhkcufyqjojdbvdrpky (us-east-2)
**Delivery date:** 2026-04-22
**Delivered by:** Claude Opus 4.7 (1M context) under Michelangelo OBRA
**Reviewed by:** Jeffery, Michelangelo, Sherlock

## Commit attribution note

All Prompt #118 files (34 artifacts) landed on `origin/main` in commit
[`ad23c71`](https://github.com/garyferenczi74-svg/ViaConnect2026/commit/ad23c71)
(titled `feat(#113): wire Kelsey Stage-1+2 gate into Arnold coaching
pipeline`). A parallel session's commit absorbed the staged #118 files
along with the #113 P0 #2 hotfix (Kelsey Stage-1+2 gate wiring into the
Arnold recommender). The code is complete and live; this delivery
document provides the clean attribution record for review.

---

## TL;DR

- **Migration `20260424000190_prompt_118_body_graphics`**: 3 new tables
  (`body_graphics_preferences`, `body_regions`, `body_graphic_interactions`),
  all RLS-enforced, seed of 65 regions. Zero ALTER on existing tables.
- **65 regions seeded**: 10 composition zones + 26 front muscles +
  29 back muscles. Spec §9.3 heading said 30 back muscles but the
  enumerated item list has 29; delivery matches the item list.
- **4 SVG asset components** (`MaleFront` / `MaleBack` / `FemaleFront` /
  `FemaleBack`): `viewBox="0 0 400 800"`, gender-differentiated
  silhouettes, layered hit paths with `role="button"` + keyboard support
  + `aria-label` + 44×44 touch targets.
- **Top-level `BodyGraphic`** with toolbar (gender/view toggles),
  animated canvas (prefers-reduced-motion aware), `RegionDetailPanel`
  (right-side desktop / bottom-sheet mobile), and `GraphicControls`
  for label + anatomical-detail toggles.
- **4 Next.js API routes**: `preferences` (GET/PATCH), `regions` (GET),
  `interaction` (POST), and `arnold/region-blurb` (POST — Kelsey-gated
  via #113 Stage-1 detector + Stage-2 LLM, fail-closed).
- **Feature flag** `BODY_GRAPHICS_V2_ENABLED` (defaults TRUE, env
  overridable, both `NEXT_PUBLIC_` and bare prefixes supported).
- **77 unit tests passing** across 4 test files (color-scale,
  region-registry, scope-guards, feature-flags). Scope-guard scanner
  verifies no forbidden ALTERs on existing tables and no Semaglutide
  mentions anywhere in the migration.
- **`package.json` untouched**; all dependencies already satisfied.
- **Zero Supabase advisor lints** after migration apply.

## Architectural choices

| Area | Choice | Why |
|---|---|---|
| SVG fidelity | Mid-fidelity functional silhouettes | §5.2 said "Figma export can come later"; regions must function today, art can be swapped by asset drop later |
| Bilateral pairing | `-right` / `-left` suffix convention | Enables `getBilateralCounterpart` helper without extra schema columns |
| Arnold voice gating | Stage 1 detector + Stage 2 Kelsey LLM (from #113) | Every Claude-voiced line in a region panel routes through the same gate the compliance team owns |
| Disclaimer enforcement | `<DSHEADisclaimer>` rendered when `arnold.data?.disclaimer_required` | Matches the MutationObserver pattern installed by #113 |
| Preference storage | `upsert({ user_id, ... }, { onConflict: "user_id" })` | One row per user; simpler than UPDATE + INSERT dance |
| Animation library | `framer-motion` (already in tree) | Respects `prefers-reduced-motion` via `useBodyGraphicState` hook |
| Color ramp | 4-stop HSL ramp in `colorFromValue` | Covers 0..1 values with a known safe clamp |
| Interaction analytics | Fire-and-forget POST to `/api/body-graphic/interaction` | Non-blocking UX; server enforces validation |
| i18n | `displayName` (en) + `displayName_fr` (fr) columns | Matches #111 bilingual convention |

## Deviations from the prompt

| Area | Prompt said | Delivered | Rationale |
|---|---|---|---|
| Back muscle count | §9.3 heading "30 back muscles" | 29 back muscles | Spec item list enumerates 29; heading is an off-by-one typo. Flagged to author for next spec revision |
| Arnold blurb cache | Per-session cache | In-memory `Map` keyed on `regionId/mode/value-bucket-of-5/trend` | Meets the "don't hammer Anthropic with every hover" requirement without adding a server cache table |
| SVG art | "Detailed anatomical SVG" | Functional silhouettes w/ labeled hit paths | Art-quality pass can land via pure asset swap; logic/accessibility/routing are done |

## Review cycle

**Jeffery (governance):** "All 6 phases deliverables in place; Kelsey
gating wired; RLS enforced on all 3 tables; standing rules respected.
Safe to stage + push." No blocking risks.

**Michelangelo (structure + UX):** 9/10, zero CRITICAL. Three
SHOULD-FIX items, all applied pre-commit:

1. Migration header comment: "30 back muscles = 66 rows" → "29 back
   muscles = 65 rows" (cosmetic; matched to actual seed).
2. `useArnoldBlurb` useEffect deps: added `input.metricUnit` (was
   missing; now complete).
3. `RegionDetailPanel` error state consistency: deferred as non-
   blocking since the API response already swaps body content on
   CONDITIONAL and the panel falls back to the generic value card.

**Sherlock (security + compliance):** "All seven focus areas pass. No
fixes required. Phase 6 can proceed." Notable checks:

- Arnold region-blurb POST uses the #113 Stage 1 + Stage 2 gate and
  fails closed on ESCALATE / LLM unavailable.
- Interaction logging stores region_id, not free-form text — no PHI
  leak through analytics.
- Preferences endpoint enforces `user_id = auth.uid()` on all writes.

## Files delivered (34)

### Migration
- `supabase/migrations/20260424000190_prompt_118_body_graphics.sql`

### Lib
- `src/lib/feature-flags.ts`

### Components — body-graphic
- `BodyGraphic.tsx`, `BodyGraphic.types.ts`, `BodyCanvas.tsx`
- `GenderToggle.tsx`, `ViewToggle.tsx`, `GraphicControls.tsx`
- `RegionDetailPanel.tsx`, `index.ts`
- `assets/{MaleFront,MaleBack,FemaleFront,FemaleBack}.tsx` + `assets/index.ts`
- `regions/{composition-regions,muscle-regions,region-metadata}.ts` + `regions/index.ts`
- `utils/{color-scale,motion-presets,region-lookup}.ts`
- `hooks/{useArnoldBlurb,useBodyGraphicState,useRegionInteraction}.ts`

### API routes
- `src/app/api/body-graphic/preferences/route.ts`
- `src/app/api/body-graphic/regions/route.ts`
- `src/app/api/body-graphic/interaction/route.ts`
- `src/app/api/arnold/region-blurb/route.ts`

### Tests
- `tests/body-graphic/color-scale.test.ts`
- `tests/body-graphic/region-registry.test.ts`
- `tests/body-graphic/scope-guards.test.ts`
- `tests/body-graphic/feature-flags.test.ts`

### Config
- `vitest.config.ts` (+ body-graphic + feature-flags in coverage includes)

## Known deferred work

- **Art pass on SVG assets.** Current silhouettes are functional but
  not Figma-polished. An asset swap can drop in without touching any
  other file because the registry contract is stable.
- **Consumption site.** #118 delivers the component + API + migration
  but does not wire it into any existing page. That's the next
  prompt's job (expected #119 Body Tracker Page Refresh).
- **`profiles.billing_country` → Arnold jurisdiction.** Region-blurb
  route hardcodes `jurisdiction: 'US'` until #111 threads country into
  the shared user context.

---

Co-authored by: Claude Opus 4.7 (1M context) for Gary Ferenczi / FarmCeutica Wellness.
