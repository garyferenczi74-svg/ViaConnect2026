# Prompt 200: Add a "Progress" navigation tile to the My Nutrition Row 3 triad

Date: 2026-06-15
Surface: My Nutrition hub (NutritionHub.tsx), Row 3 triad.
Type: UI addition (new navigation tile + stub route). No nutrition data logic change.
Branch policy: localhost:3000 review first, then direct push to main, single commit, no PR.

Note on numbering: Gary labeled this "Prompt 199" but a different 199 already shipped today; tracked here as Prompt 200 to avoid a ledger collision.

## Discovery report (Prompt Section 3)

- Component: `src/components/nutrition/hub/NutritionHub.tsx`. The "Save my meal tab row" Gary means is the Row 3 triad (NutritionHub.tsx:484): a `grid grid-cols-1 gap-4 md:grid-cols-3` holding `<SaveMyMealTile>`, `<NutritionGeneticsTile>`, `<NutritionInsightsTile>`. These are bento navigation tiles, not a literal tab strip (the prompt's "tab" = "tile"). Confirmed with Gary 2026-06-15.
- Tab definition: explicit sibling components (not a config array). SaveMyMealTile and NutritionGeneticsTile are inline HubTile-based tiles; NutritionInsightsTile is its own file.
- Navigation mechanism: Next.js `Link` with an `href` to a standalone page (e.g. `/nutrition/saved-meals`, `/nutrition/genetics`). The new tile uses the same `Link` + `href` pattern.
- Styling: each tile is a `HubTile` (shared chrome) with a centered `h3` heading, a description `p`, and a bottom-anchored "Open" pill Link whose Tailwind classes are identical across tiles. No heading icons; the Open pill carries a `ChevronRight` at strokeWidth 1.5.
- Order today (left to right): Save My Meal, Nutrition by Genetics, Nutrition Insights. The new Progress tile is inserted before Save My Meal, so it becomes the first tile.
- Destination: no `/nutrition/progress` route exists. Per Gary, create a static stub. Resolved destination: `/nutrition/progress`.

## Decisions (Gary, 2026-06-15)

- Target: Row 3 triad, add a 4th "Progress" navigation tile before Save My Meal.
- Desktop layout: 4 across on one line (`md:grid-cols-4`). Mobile stays one per row (`grid-cols-1`).
- Destination: create a static `/nutrition/progress` stub.

## Part A: NutritionHub.tsx

1. Add a new tile component `NutritionProgressTile` directly before `function SaveMyMealTile`, mirroring the SaveMyMealTile / NutritionGeneticsTile pattern (HubTile, centered heading block, bottom-anchored Open Link). It is gradient-only (no media descriptor), so it does not add a `NUTRITION_CARD_MEDIA` read.

```tsx
// Prompt 200 (2026-06-15): the Progress Row 3 tile is a navigation card
// mirroring SaveMyMealTile. Its Open is a Next.js Link to the standalone
// /nutrition/progress page (a static stub for now; a future prompt builds the
// view). Inserted before Save My Meal so the triad becomes a four tile row.
function NutritionProgressTile({ gradientClass }: { gradientClass: string }) {
  return (
    <HubTile gradientClass={gradientClass} contentClassName="items-center text-center">
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
          Progress
        </h3>
        <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
          Track your nutrition trends over time.
        </p>
      </div>

      <div className="mt-auto flex pt-4">
        <Link
          href="/nutrition/progress"
          data-analytics-event="nutrition_progress_open"
          className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-1.5 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
        >
          <span>Open</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </HubTile>
  );
}
```

2. In the Row 3 render (NutritionHub.tsx:484), widen the grid to four columns and insert the Progress tile as the first child:

Before:
```tsx
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SaveMyMealTile
```
After:
```tsx
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <NutritionProgressTile gradientClass={MEDIA_TEAL_TL} />
        <SaveMyMealTile
```

`MEDIA_TEAL_TL` is already imported (NutritionHub.tsx:66). `Link` and `ChevronRight` are already imported. No new imports.

## Part B: NutritionHub.test.ts (contract test updates)

The source-as-text contract test must reflect the new 4th tile or it fails:

1. `'183e + Gary: heading blocks sit on the card true vertical center'` (line ~150): `expect(centered.length).toBe(3)` becomes `toBe(4)`. Update the comment list to "Log Your Meal, Progress, Save My Meal, Genetics".
2. `'puts an Open control only on the Row 3 tiles'` (line ~402): `expect(opens.length).toBe(2)` becomes `toBe(3)`. Update the comment to "exactly three" and mention the Progress tile.
3. Add a positive lock after the Save My Meal test:
```tsx
  it('Prompt 200: the Progress tile is a navigation Link inserted before Save My Meal', () => {
    expect(source).toContain('<NutritionProgressTile');
    expect(source).toContain('href="/nutrition/progress"');
    expect(source).toContain('data-analytics-event="nutrition_progress_open"');
    const iProgress = source.indexOf('<NutritionProgressTile');
    const iSaved = source.indexOf('<SaveMyMealTile');
    expect(iProgress).toBeGreaterThan(-1);
    expect(iProgress).toBeLessThan(iSaved);
    expect(source).toContain('md:grid-cols-4');
  });
```

## Part C: new stub route src/app/(app)/(consumer)/nutrition/progress/page.tsx

Mirror the saved-meals page chrome (a static server component, back link, centered container). No data fetch, no hooks.

```tsx
// Prompt 200 (2026-06-15): static stub for the nutrition Progress view, reached
// from the Progress tile on the My Nutrition hub. A future prompt builds the
// real view. Thin host only: a back link plus the page heading and a neutral
// coming soon line. No data path is opened here. The consumer layout paints
// Deep Navy.

import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';

export default function NutritionProgressPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <BackToNutritionLink />
      <h1 className="mt-4 text-xl font-semibold text-white md:text-2xl">Progress</h1>
      <p className="mt-2 text-sm text-white/55">
        Your nutrition progress view is coming soon.
      </p>
    </div>
  );
}
```

## Acceptance criteria

- Row 3 renders 4 tiles; Progress is first, immediately before Save My Meal.
- Progress is a Next.js Link to /nutrition/progress, visually identical to its siblings (same HubTile chrome, same Open pill classes, same focus-visible ring), differing only in heading, description, route, and the gradient seam.
- Desktop shows 4 tiles on one line (md:grid-cols-4); mobile stacks one per row with no overflow or horizontal page scroll.
- /nutrition/progress renders the "Progress" heading and the coming soon line with the standard chrome.
- `NutritionHub.test.ts` passes (the two count updates plus the new lock).
- No new TypeScript errors; no em or en dashes; no emojis; Lucide strokeWidth 1.5.

## Guardrails

- Do not restyle or relocate the existing three tiles beyond the grid column count needed to fit four.
- No change to nutrition data logic, the meals table, Gordon scoring, or any input channel.
- Do not modify package.json, Supabase email templates, or any applied migration. No migration needed.
- Tokens only (#1A2744, #1E3054, #2DA5A0, #B75E18, plus the existing #5B8DEF/#2A4C9E Open-pill values reused verbatim from the sibling tiles). No new colors introduced by this change.

## Out of scope (handled separately)

Section 12 of the prompt (upload the prompt .md and .docx to the Google Drive Prompt Library with a hero video) is a delivery/publishing task, not a code change. It is addressed separately after the code ships, pending confirmation of how the .docx is generated and Drive write access.

## Commit

`feat(my-nutrition): add Progress navigation tile to the Row 3 triad (Prompt 200)`
