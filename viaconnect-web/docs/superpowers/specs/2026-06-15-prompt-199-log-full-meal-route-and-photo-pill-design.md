# Prompt 199: Re-point "Log a full meal" to the full meal editor + expand the Photo AI affordance

Date: 2026-06-15
Surface: Consumer dashboard Quick Log card ("Log a full meal" button) and the Nutrition Log full meal editor (/nutrition/log-meal).
Type: Routing change + UI restyle (visual). No data, scoring, or copy change beyond the one new pill label.
Branch policy: localhost:3000 review first, then direct push to main, single commit, no PR.

## Request (Gary, 2026-06-15)

The dashboard "Log a full meal" button currently hyperlinks to /nutrition/photo-ai (NutriVision Photo AI). Gary wants it to hyperlink to the full meal editor at /nutrition/log-meal instead (label now matches destination). Both of the button's links change. Separately, on the /nutrition/log-meal page, the small "Use Photo Instead" text link is expanded into a full pill button reading "Use NutriVision Photo AI Instead" so the Photo AI capture path stays one tap away.

Confirmed decisions:
- Destination: /nutrition/log-meal (both the camera-icon link and the text link). This intentionally reverses Prompt 173a, which had re-pointed the button to the Gordon-scored photo-ai hub. Linking to the "frozen" log-meal route does not modify any frozen code.
- Brand casing: "NutriVision" (capital V) per the brand used across the codebase, not the literal "Nutrivision" from the request. Flagged for Gary at the spec-review gate.

## Part A: src/components/dashboard/LogAFullMealButton.tsx

Two `next/link` elements both currently target /nutrition/photo-ai (an aria-hidden camera link at line 58 and the labeled text link at line 68).

Edits:
1. Camera link `href` (line 58): "/nutrition/photo-ai" becomes "/nutrition/log-meal".
2. Text link `href` (line 68): "/nutrition/photo-ai" becomes "/nutrition/log-meal".
3. Text link `aria-label` (line 70): "Log a full meal via Photo AI" becomes "Log a full meal".
4. Comment accuracy: the file header comment (lines 3-9), the inline comment at lines 20-26 ("route destination is unchanged" and the "/nutrition/photo-ai (Photo AI channel...)" mention), and the Prompt 175 audit comment (lines 50-56, "both target /nutrition/photo-ai") are updated so they describe the new /nutrition/log-meal destination and note the Prompt 199 re-point. Functional code (gradient pill, Camera icon, ArrowRight, handlers, disabled handling, responsive classes from Prompt 197) is unchanged.

Nothing else changes: the gradient tokens, the dual-link structure, the camera link's aria-hidden/tabIndex, min-h-[44px], strokeWidth 1.5 icons, and the "Log a full meal" visible copy all stay.

## Part B: src/app/(app)/(consumer)/nutrition/log-meal/page.tsx

Current (lines 233-239): a small teal text Link.

```tsx
<Link
  href="/nutrition/photo-ai"
  className="inline-flex items-center justify-center gap-2 text-xs font-medium text-[#2DA5A0] hover:underline"
>
  <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
  Use Photo Instead
</Link>
```

Target: a full pill button mirroring the adjacent "Analyze Meal" pill's geometry (rounded-xl, px-6 py-3, text-sm font-semibold, min-h-[48px], sm:w-auto w-full) with a secondary teal outline/glass treatment so it reads as secondary to the orange primary.

```tsx
<Link
  href="/nutrition/photo-ai"
  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/60 bg-[#2DA5A0]/10 px-6 py-3 text-sm font-semibold text-[#2DA5A0] transition-all min-h-[48px] hover:bg-[#2DA5A0]/20 sm:w-auto w-full"
>
  <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
  Use NutriVision Photo AI Instead
</Link>
```

The parent row (`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`) is unchanged: the two pills stack full-width on mobile and sit at opposite ends on sm and up. The `href` to /nutrition/photo-ai is preserved so the Photo AI path stays reachable. The `ImagePlus` import already exists.

## Acceptance criteria

- Tapping the dashboard "Log a full meal" button (camera or text) navigates to /nutrition/log-meal.
- The /nutrition/log-meal page shows a full-width-on-mobile, content-width-on-desktop pill button reading "Use NutriVision Photo AI Instead" that navigates to /nutrition/photo-ai.
- The new pill matches the "Analyze Meal" button height (min-h-[48px], 44px+ tap target) and uses only the existing teal token #2DA5A0; no new colors.
- No horizontal scroll, clipping, or overlap from 360px through 1920px on both surfaces.
- No console warnings. No em/en dashes. No emojis.

## Guardrails

- Routing + restyle only. No change to the meal save pipeline, Gordon scoring, the analyze-text flow, or the CAQ.
- Do not modify the frozen /nutrition/log-meal logic beyond the single "Use Photo Instead" affordance restyle.
- Lucide icons at strokeWidth 1.5; tokens #1A2744 / #1E3054 / #2DA5A0 / #B75E18 only.
- Do not modify package.json, Supabase email templates, or any applied migration. No migration needed.
- Keep all other copy byte for byte; the only copy change is "Use Photo Instead" becoming "Use NutriVision Photo AI Instead".

## Note on the 173a reversal

Prompt 173a routed this button to /nutrition/photo-ai so captured meals wrote a Gordon-scored row feeding Today's Meals, Daily Macros, and the dashboard gauge. After this change the button opens the text/voice editor instead; the editor's own Analyze Meal -> review -> save flow is the scoring path from there, and the Photo AI scored-capture path remains reachable via the new pill. This is Gary's product decision, surfaced and confirmed.

## Commit

`feat(nutrition): point "Log a full meal" to the meal editor and add a NutriVision Photo AI pill`
