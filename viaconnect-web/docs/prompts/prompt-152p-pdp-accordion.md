# Prompt 152p: Canonical PDP Accordion Component

**Shipped:** 2026-05-05 (commit `f862c4b`, branch `main`)
**Files:**
- New: `src/components/shop/Accordion.tsx`
- Modified: `src/components/shop/PdpRightRail.tsx`
- Deleted: `src/components/shop/pdp/PdpDesktopTabs.tsx` (orphaned by this prompt; empty `pdp/` directory also removed)

This document captures the design rationale and locked decisions for the canonical PDP collapsible-disclosure component. Future prompts that touch PDP layout should consult this doc before introducing alternative collapsibles or re-litigating the decisions below.

---

## Why this component exists

Pre-152p the codebase had no shared accordion:
- #144 v2 introduced `FormulationDropdown` for catalog cards (still used in `PlpProductGrid`); the PDP version was deprecated in #148.
- #148 moved PDP Description and Formulation to always-visible inline blocks.
- #151 added a horizontal tab strip (`PdpDesktopTabs`) for the supplement variant on the lg+ breakpoint, leaving inline branches behind `lg:hidden` for mobile/tablet.
- A native `<details>` element was inserted ad-hoc in `PdpRightRail` to give the structured-description case a collapsible affordance.

152p consolidated PDP collapsible UX into one shared component that handles SSR-safe hydrate-collapse, `prefers-reduced-motion` honoring, keyboard accessibility, focus-visible Teal styling, and Framer Motion height-auto transitions. Adding any second collapsible component would re-fragment what 152p just unified.

---

## Component contract

```ts
interface AccordionProps {
  heading: string                  // trigger button text (rendered uppercase tracking-wide)
  children: ReactNode              // collapsible body content
  id?: string                      // stable id for SSR/test selectors + aria wiring
  defaultExpandedSSR?: boolean     // default true; SSR renders expanded for SEO + JS-disabled access
  ariaLabel?: string               // optional override for the trigger's aria-label (defaults to heading)
}
```

Usage:

```tsx
import { Accordion } from '@/components/shop/Accordion'

<Accordion heading="Full Description" id="pdp-description">
  {description ? renderStructuredDescription(description) : <Fallback />}
</Accordion>
```

Two adjacent Accordions stack cleanly via `border-b border-white/10 last:border-b-0`. No wrapper required beyond a flex column or single parent div.

---

## Implementation pattern: SSR-expanded then hydrate-collapse

The Accordion starts EXPANDED on the server and during the initial client paint, then a `useEffect` runs once on first mount and collapses it.

Rationale:
1. Content is in the SSR HTML for SEO indexing.
2. Content remains visible if JavaScript fails to hydrate.
3. No localStorage/cookie read required to compute initial state, so no first-paint cookie flash.

Tradeoff: a brief expanded-then-snap-collapse on the very first paint after hydration. Acceptable for a once-per-page-load event. If a future product surface requires zero flash, override with `defaultExpandedSSR={false}` and document the SEO + JS-disabled tradeoff in that prompt.

State machine:

| Phase | `hasHydrated` | `isExpanded` | Render branch |
|---|---|---|---|
| SSR | `false` | `true` | Plain `<div>` with content visible |
| First client paint (matches SSR) | `false` | `true` | Plain `<div>` with content visible |
| After mount effect fires | `true` | `false` | AnimatePresence branch, panel hidden |
| User clicks heading | `true` | flipped | AnimatePresence height-auto transition |

The dual-branch render (pre-hydrate plain `<div>` vs post-hydrate AnimatePresence) keeps the SSR HTML and first client render byte-identical, avoiding React hydration-mismatch warnings.

---

## Locked design decisions (do not re-litigate per-prompt)

| Concern | Decision |
|---|---|
| Scope | Both Description AND Formulation become collapsible; each independent (opening one doesn't affect the other) |
| Default state | Collapsed on first PDP load on both desktop AND mobile |
| Implementation strategy | Custom Tailwind + Framer Motion. Zero new dependencies. ~120 lines. |
| SSR rendering | Expanded server-side, collapsed on hydrate (preserves SEO + JS-disabled access) |
| JS-disabled fallback | Content remains visible if Framer Motion JS does not hydrate |
| Persistence | None. No localStorage, no cookies. Each PDP load defaults collapsed. Per-session expansion state is React-local only. |
| Iconography in headings | None. Heading text + chevron only. (No FileText for Description, no FlaskConical for Formulation. Icons live in PdpFormulationTable + testing-meta SectionHeadings, not in the Accordion trigger.) |
| Reduced-motion | `useReducedMotion` honored: chevron rotate, height transition, opacity transition all collapse to instant when `prefers-reduced-motion: reduce`. |
| Mutually exclusive expansion | Not implemented. Both accordions can be open simultaneously. |
| Different defaults for desktop vs mobile | Not implemented. Same default everywhere. |
| Other PDP sections (Bio Optimization Score, Helix Rewards, Genetic Targets, testing-meta) | Untouched in 152p. Future prompts may extend the Accordion to those sections. |

---

## Visual + styling specs

| Token | Value |
|---|---|
| Heading button padding | `py-4` mobile / `py-5` desktop (md+) |
| Panel padding | `pb-4` mobile / `pb-6` desktop (md+) |
| Heading typography | `text-base font-medium uppercase tracking-wide text-white` mobile / `md:text-lg` desktop |
| Heading hover + focus-visible | `text-[#2DA5A0]` (brand Teal, 5.42:1 contrast on Deep Navy `#0F1A2E`) |
| Chevron color | `text-[#2DA5A0]` (same brand Teal) |
| Chevron size | 20 px, `strokeWidth={1.5}` |
| Chevron rotation | 180deg from `0` to `180`, 250 ms easeOut |
| Panel height transition | `height: 0` ↔ `height: 'auto'`, 300 ms easeOut |
| Panel opacity transition | `opacity: 0` ↔ `opacity: 1`, 200 ms easeOut |
| Section divider | `border-b border-white/10 last:border-b-0` (top border lives on the parent wrapper if needed) |
| Focus outline | None (`focus-visible:outline-none`); the Teal text-color shift IS the visible focus indicator (WCAG 2.4.7 satisfied via color shift, not outline) |

---

## Accessibility

| Attribute | Where | Value |
|---|---|---|
| `aria-expanded` | trigger button | `true` when panel visible, `false` when collapsed |
| `aria-controls` | trigger button | references panel `id` |
| `id` | trigger button | `${id}-heading` |
| `id` | panel | `${id}-panel` |
| `role` | panel | `region` |
| `aria-labelledby` | panel | references trigger `${id}-heading` |
| `aria-hidden` | chevron | `true` (decorative) |
| `aria-label` | trigger | falls back to `heading` text if not overridden |
| Keyboard activation | trigger | native button gives Space + Enter for free |
| Tab order | trigger | natural document order, no `tabIndex` overrides |

WAI-ARIA disclosure pattern compliant. Native `<button>` over `<div role="button">` for keyboard + focus-visible + accessibility-tree benefits.

---

## What 152p explicitly does NOT do

- Does not modify any product copy or run any data migration. The 152 a-o-rev2 series handles paragraph hydration; 152p only wraps the existing render path.
- Does not introduce a markdown library. The existing `renderStructuredDescription` + `renderDescriptionWithEmphasis` helpers in `PdpRightRail.tsx` render the body content (Lane e from Codex's 152c-rev2 discovery).
- Does not wrap Bio Optimization Score, Helix Rewards, Genetic Targets, or the testing-meta sections.
- Does not add iconography to the Accordion trigger.
- Does not persist expansion state across sessions (per-load only).
- Does not change Evidence + FAQ TabPills `lg:hidden` gating; that surface remains exactly as #148 + #151 left it.

---

## Scope-adjacent calls baked into 152p (per Jeffery review fix-and-reship)

Two changes that the spec didn't explicitly require but were necessary to satisfy AC #7 ("behave identically on desktop and mobile") + Verification step 1 ("Both Description and Formulation headings render with chevron icons"):

1. **Removed the `<PdpDesktopTabs>` invocation entirely from `PdpRightRail.tsx`.** Without this, the supplement-variant lg+ breakpoint would have continued to render a horizontal tab strip while smaller breakpoints rendered accordions, failing AC #7. PdpDesktopTabs.tsx itself was deleted because 152p orphaned it.

2. **Restored `lg:hidden` on the TabPills section** after an initial overreach during implementation. Evidence + FAQ TabPills remain mobile-only per #148 + #151 design intent. 152p touches Description + Formulation only.

Three accessibility / correctness fixes also applied per Jeffery review:

3. `useReducedMotion` honored at the chevron rotate transition + the panel height/opacity transitions.
4. `PdpRightRail.tsx` file header docstring rewritten to reflect 152p reality (was stale post-#148 + #151 + 152p).
5. Brand-footer caption (#152b text "Via Cura | Built For Your Biology" white/60 italic) preserved verbatim and relocated outside both accordions per spec layout intent. NOT reverted to the 152a "Built For Your Biology · Your Genetics · Your Protocol" Orange italic.

---

## How to extend the Accordion to additional PDP sections

If a future prompt wants to wrap, e.g., Bio Optimization Score in the Accordion:

```tsx
<Accordion heading="Bio Optimization Score" id="pdp-bio-optimization">
  <BioOptimizationScoreCard product={product} />
</Accordion>
```

Considerations:
1. Pass the existing component as the Accordion's child. Do not inline content into the Accordion call site; preserve component boundaries.
2. The new section will inherit the canonical styling automatically.
3. The `id` should be unique per Accordion instance on the same page so aria-controls + aria-labelledby resolve correctly.
4. If the section needs to render server-side collapsed (no SEO concerns, e.g., a personalized panel), pass `defaultExpandedSSR={false}` and document the SEO + JS-disabled tradeoff in the prompt.
5. Two adjacent Accordions stack via `border-b last:border-b-0`. If the new Accordion is the last sibling in its parent, no bottom border. If it's followed by another section that already has a top border, that's fine — `last:border-b-0` handles it.

Anti-patterns to avoid:
- Don't import Radix `Accordion` or shadcn `Accordion` as an alternative; we have one canonical pattern in this repo.
- Don't fork `Accordion.tsx` to add per-section styling variants. Use the props or extend with a CSS variable.
- Don't wrap an Accordion inside another Accordion. Nested disclosures are an anti-pattern for product surfaces; if you need hierarchy, use heading levels and indentation, not nested collapsibles.

---

## Known tradeoffs (documented for posterity)

1. **First-paint expand-then-collapse flash.** On hydration, users see content briefly expanded before the `useEffect` collapses it. Intentional to keep content in the SSR HTML for SEO + JS-disabled access. Flash duration <100 ms on modern devices.
2. **No persistence across sessions.** Each PDP load starts collapsed. If a user expands sections frequently, this is repetitive. Defer localStorage to a future prompt only if user feedback requests it.
3. **Long bullet lists may animate slowly on low-end mobile.** The Framer Motion height-auto pattern measures content height on every transition. Products with 25+ ingredients (e.g., Amino Acid Matrix+ in some rev2 forms) may have slightly slower animations. If this becomes a complaint, swap to a CSS-only `max-height` transition or virtualize the bullet list.
4. **No keyboard `Home`/`End` cross-accordion navigation.** WAI-ARIA APG patterns sometimes implement Home/End to jump between accordions. Two-accordion PDP doesn't justify the complexity; Tab cost is trivial.
5. **No animated chevron color change on expand.** Chevron stays Teal in both states. If a future prompt wants Orange-on-expand to signal active state, that's a one-line `animate.color` addition.
