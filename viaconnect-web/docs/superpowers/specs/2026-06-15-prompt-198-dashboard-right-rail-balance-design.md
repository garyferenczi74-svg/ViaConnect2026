# Prompt 198: Desktop Dashboard Right Rail Balance (Relocate Update CAQ)

Date: 2026-06-15
Surface: Consumer dashboard ("Your Personal Wellness Journey"), the two-column section under the Bio Optimization score.
Type: Layout / DOM-ordering change only (no data, copy, scoring, routing, or CAQ-flow change).
Scope: Desktop and mobile verified together. The rendered change is desktop-only (see below).
Branch policy: localhost:3000 review first, then direct push to main, single commit, no PR.
Approach: Minimal, goal-faithful (Gary, 2026-06-15). Spec-literal full reorder was declined.

## Reconciliation with the original Prompt 198 text

The original spec's "current state" does not match the live code in `src/app/(app)/(consumer)/dashboard/page.tsx`. Verified actual structure of the `lg:grid-cols-[1.4fr_1fr]` grid (line 274):

- Left column: TodaysProtocol (the "Daily Schedule" card, wrapped in `flex min-w-0 flex-1 flex-col`), then the Update CAQ card (`DashboardLinkCard title="Update Your Assessment"`).
- Right rail, top to bottom: Wellness Snapshot (`hidden lg:block`, desktop-only), Helix Rewards, Wearables (ConnectCard type="wearable"), Apps (ConnectCard type="app").
- Daily Insights (`DailyInsightsCard`) is a full-width card BELOW the grid, not in either column.
- Helix Rewards exists in the rail; the original spec did not mention it.

So the original spec had the rail order reversed, omitted Helix Rewards, and assumed Daily Insights sat in the left column. Gary chose the minimal approach that honors the two hard asks (Update CAQ into the rail directly above Wellness Snapshot; close the trailing gap) while leaving every other card exactly where it is.

## Design

Single file: `src/app/(app)/(consumer)/dashboard/page.tsx`.

Move the Update CAQ block (the `<DashboardLinkCard ... title="Update Your Assessment" ... />`, currently lines 281-290 inside the left column) to be the FIRST child of the right rail container (`<div className="flex h-full min-w-0 flex-col gap-5">` at line 292), immediately before the `<div className="hidden lg:block"><WellnessSnapshot .../></div>` at line 294.

Every prop on the moved card is preserved verbatim: `eyebrow="Health Profile"`, `eyebrowIcon={FileQuestion}`, `title="Update Your Assessment"`, the description string, `icon={RefreshCw}`, `accent="#B75E18"`, `href="/onboarding/i-caq-intro"`, `cta="Update Assessment"`.

After the move:
- Left column has a single child: the `flex min-w-0 flex-1 flex-col` wrapper holding TodaysProtocol. Its `flex-1` makes it fill the grid row height. No empty wrapper or stray spacer remains in the left column.
- Right rail (desktop, lg+) top to bottom: Update CAQ, Wellness Snapshot, Helix Rewards, Wearables, Apps.

### Why this closes the gap

The grid already uses `items-stretch`, so both columns share the taller column's height. Moving one card out of the left and into the rail makes the rail the taller (or equal) column; the left's `flex-1` protocol card then stretches to match, so the two columns finish on the same line and the trailing gap below the rail is eliminated. No fixed pixel heights are introduced. The shared `gap-5` token is reused for rail spacing (the moved card inherits it as a sibling, no per-card spacing).

### Mobile

The rendered mobile output is unchanged. On mobile the grid collapses to one column; DOM order is left-children then right-children. Before: TodaysProtocol, UpdateCAQ, [WellnessSnapshot hidden], Helix, Wearables, Apps. After: TodaysProtocol, UpdateCAQ, [WellnessSnapshot hidden], Helix, Wearables, Apps. Identical, because Update CAQ already rendered immediately after the protocol card. Wellness Snapshot stays desktop-only (`hidden lg:block`) per the chosen approach, so the mobile stack keeps even rhythm with no orphaned or doubled gaps.

## Acceptance criteria

- Update CAQ no longer renders in the left column; it renders as the first card of the right rail, directly above Wellness Snapshot (desktop).
- The moved card keeps every prop, handler, route, icon, gradient, copy string, and the orange accent exactly.
- Desktop (lg+): right rail and the left Daily Schedule column finish on the same vertical line; the previous gap below the rail is gone.
- Rail spacing uses the existing shared `gap-5` token; no one-off pixel value, no fixed card height.
- No horizontal scroll, clipped corners, or overlap at any width 360px through 1920px.
- Glassmorphism / translucent treatment on the moved card is preserved (it is the same component instance, unchanged).

## Watch item for the localhost review

Because the left column is now a single stretched protocol card against a 5-card rail, confirm the left does not read as sparse when the protocol list is short. If it does, the remedy is the declined option B (pull Daily Insights up into the left column) and is a separate decision for Gary, not part of this change.

## Guardrails

- Layout / ordering only. No change to data wiring, scoring, copy, the CAQ flow (7 phases, 16 dots, 10 interstitials, single DNA HD.mp4), routes, or icons.
- Colors stay within the token set (#1A2744, #1E3054, #2DA5A0, #B75E18). No new colors. Lucide icons at strokeWidth 1.5 unchanged.
- No em-dashes or en-dashes anywhere in touched code or comments. No emojis.
- Do not modify package.json, Supabase email templates, or any applied migration. No migration is needed.
- Do not touch the unrelated parallel work elsewhere in the tree.

## Commit

`fix(dashboard): move Update CAQ card into the right rail to balance the desktop columns`
