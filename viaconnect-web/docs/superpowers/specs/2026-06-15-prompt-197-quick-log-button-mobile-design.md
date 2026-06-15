# Prompt 197: Quick Log "Log a full meal" Button Mobile Layout Fix

Date: 2026-06-15
Hub: My Nutrition
Type: UI layout bug fix (visual only, no behavior change)
Scope: Mobile and Desktop (responsive)
Branch policy: localhost:3000 review first, then direct push to main, single commit, no PR

## Problem

On mobile, the "Log a full meal" pill inside the Quick Log card renders broken: the
label wraps across four lines, the camera icon floats inline in the wrapped text, and
the trailing arrow reads as a stray glyph overlapping the description paragraph.

## Root cause (verified against the code, not assumed)

Two files are involved, and the fix differs from the original prompt's sample markup
because that markup conflicts with the actual component and with the prompt's own
"preserve routing, layout-only" constraints.

1. `src/components/dashboard/QuickLogsSurface.tsx` line 114: the card header is
   `flex items-start justify-between gap-3` at every breakpoint. The title plus
   description take the left, the button takes the right column. On mobile there is
   not enough width, so the pill is crushed.
2. `src/components/dashboard/LogAFullMealButton.tsx`: the label span has no
   `whitespace-nowrap` guard, so once the pill is crushed the label hard-wraps word by
   word.

Findings that correct the original prompt:

- There is no tall desktop card. `LogAFullMealButton` is already a compact,
  content-width horizontal gradient pill (`inline-flex`). The prompt's Variant A vs B
  tradeoff is therefore moot; desktop barely changes.
- The pill is a gradient (`from-[#1A2744]/60 to-[#2DA5A0]/30`) wrapping TWO separate
  `next/link` elements (camera link + text link), both routing to `/nutrition/photo-ai`,
  intentional per Prompts #169 and #175. The prompt's sample `<button onClick>` with a
  solid `bg-[#1E3054]/80` fill would break routing and redesign the visual, exceeding
  the stated layout-only scope. Decision (Gary, 2026-06-15): preserve gradient and
  dual-link routing.
- `src/components/dashboard/__tests__/quick-log-gradients.test.ts` asserts WCAG contrast
  on abstract Tailwind palette colors that do not match the component's actual classes;
  it reads no files and does not guard this component. It will not block the change.

## Design (chosen: layout-only, preserve gradient + dual-link)

### File 1: QuickLogsSurface.tsx (header, line 114)

Change the header from an always-row flex to a responsive stack:

- `flex items-start justify-between gap-3`
  becomes
  `flex flex-col gap-4 md:flex-row md:items-start md:justify-between`
- The title/description block gets `min-w-0 md:max-w-[60%]` so the description does not
  crowd the desktop pill.

On mobile the title block and the pill stack vertically; on desktop the side-by-side
layout is restored unchanged.

### File 2: LogAFullMealButton.tsx (internal layout)

- Outer wrapper: `inline-flex` becomes `flex w-full ... md:inline-flex md:w-auto` so the
  pill is full width on mobile and content width on desktop.
- The text `<Link>` gets `flex-1 justify-between md:flex-initial md:justify-start` so on
  mobile the label sits left (immediately right of the camera) and the arrow is pushed to
  the right edge; on desktop label and arrow sit snug at content width.
- The label `<span>` gets `whitespace-nowrap` (the direct fix for the four-line wrap).
- Preserved exactly: the gradient and all color tokens, both `Link` routes to
  `/nutrition/photo-ai`, the camera link's `aria-hidden`/`tabIndex -1`, `min-h-[44px]`,
  `strokeWidth={1.5}` icons, and all hover/focus/disabled states.

## Acceptance criteria

- At 360px and 393px wide: label on a single line, camera anchored immediately to its
  left, arrow pinned to the right edge, no overlap of the description.
- Pill is full width on mobile below the description, compact content width on desktop;
  label never wraps at any width through the md breakpoint.
- Tap target height at least 44px (existing `min-h-[44px]` preserved).
- Hover and focus states intact; arrow nudges right on hover; meal flow still opens.
- No new color values outside the existing token set; no console warnings.

## Guardrails

- Visual/structural only. No change to routing, state, or Gordon scoring wiring.
- Lucide icons only at `strokeWidth={1.5}`; no emojis.
- No em-dashes (U+2014) or en-dashes (U+2013) in any touched file.
- Do not modify package.json, Supabase email templates, or any applied migration.
- Do not touch the unrelated in-flight change to src/lib/caq/complete-caq.ts.
- Keep all copy strings byte for byte.

## Out of scope

Quick Daily Check Ins card, the meal-type quick-log chips, the Daily Schedule card, the
NutriVision flow itself, and any bento/background-media work.

## Commit

`fix(nutrition): repair Quick Log "Log a full meal" button layout on mobile`
