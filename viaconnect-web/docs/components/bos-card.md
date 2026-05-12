# Bio Optimization Score Card (BOSCard)

The consumer dashboard's hero card. Replaces the legacy
`BioOptimizationGauge` (radial SVG) with a two-axis layout: a numeric
score on top, Hannah's plain-language explanation, then a row of 3
accuracy pills and a row of 6 engagement pills.

Shipped: Prompt #162, 2026-05-12.

## Files

```
src/components/dashboard/
  bos-card.tsx                Server Component shell (re-exports client)
  bos-card-client.tsx         Client island, owns react-query subscription
  bos-card-skeleton.tsx       Loading shimmer
  bos-card-error.tsx          Calm error with retry
  bos-card-empty-state.tsx    Pre-compute treatment (no CAQ yet)
  bos-score-display.tsx       Numeric score with Framer Motion spring
  bos-explanation.tsx         Hannah panel with 200ms fade on text change
  bos-accuracy-pills.tsx      Row of 3 (CAQ, Labs, Genetics)
  bos-engagement-pills.tsx    Row of 6 (lever pills)
  accuracy-pill.tsx           Single accuracy pill state machine
  engagement-pill.tsx         Single engagement pill state machine

src/hooks/
  use-bos-current.ts          TanStack Query hook against /api/bos/current

src/lib/scoring/
  pill-routes.ts              destination_key to URL map (SSOT)
  pill-icons.ts               pill key to Lucide icon map
```

## Data source

`GET /api/bos/current` (Phase D of the #159 + #161 bundle, live since
2026-05-12). Returns `BOSCurrentResponse` from
`src/lib/scoring/types.ts`. The card does NOT import the SSOT compute
module, does NOT import Supabase, does NOT compute anything client
side.

## Refresh policy

react-query with:
- `refetchInterval: 60_000` (60 second background revalidation)
- `refetchOnWindowFocus: true`
- `refetchOnReconnect: true`
- `staleTime: 5_000`
- `retry: 2`

No `localStorage` or `sessionStorage` caching. The provider lives at
`src/lib/providers.tsx`, mounted from the root layout.

## States

| Branch | Trigger | Rendered |
| --- | --- | --- |
| Loading first paint | `isLoading && !data` | `BOSCardSkeleton` |
| Error first paint  | `error && !data`     | `BOSCardError` with retry |
| Pre-compute        | `data.score === null` | `BOSCardEmptyState` with CAQ CTA |
| Populated          | `data.score !== null` | Score + Hannah + pills rows |

## Accessibility

- Focus rings via brand Teal `#2DA5A0` at 2px ring with `#1A2744` offset.
- `aria-live="polite"` on the score number so changes announce without
  interrupting.
- `aria-label` on every pill describing state + confidence delta.
- 44px minimum tap target on all interactive pills via `min-h-[44px]`.
- `aria-disabled="true"` on disabled / Coming Soon pills.

## Responsive

Tailwind utilities only. No `isMobile` JS branching.

- Score + Hannah panel: `flex-col` on mobile, `md:grid-cols-[auto_1fr]`
  on desktop.
- Accuracy row: `grid-cols-3` across all breakpoints.
- Engagement row: `grid-cols-3` on mobile (two rows of 3),
  `sm:grid-cols-6` on tablet and up.

## Animation

Framer Motion only. No bouncing, no confetti.

- Score number: `useSpring` (stiffness 80, damping 16) wraps the
  rendered value; `useTransform` rounds to an integer.
- Hannah explanation: `AnimatePresence` keyed on the explanation
  string, 200ms ease-out fade on change.
- Pill hover: 200ms ease-out translate-y by -1px plus soft shadow.

## Destination route map

See `src/lib/scoring/pill-routes.ts`. Any pill whose `destination_key`
is not present in `PILL_ROUTES` renders disabled with a "Coming Soon"
treatment. Verified routes per dashboard handoff on 2026-05-12:

| destination_key       | Path                          |
| --------------------- | ----------------------------- |
| caq_resume            | /onboarding/i-caq-intro       |
| labs_upload           | /plugins/labs                 |
| genex360_purchase     | /shop/genex360                |
| genex360_status       | /genetics                     |
| nutrition_log         | /nutrition/log-meal           |
| supplements_protocol  | /supplements                  |
| body_tracker          | /body-tracker                 |
| wearable_dashboard    | /wearables                    |
| plug_ins_directory    | /plugins                      |
| helix_challenges      | /helix                        |

## Portal scoping

Mounted only from `src/app/(app)/(consumer)/dashboard/page.tsx`. The
component must not be rendered from the practitioner or naturopath
portals. The Helix engagement pill in particular surfaces consumer
gamification semantics that those portals do not see.

## Testing

Logic-only vitest coverage at:

- `src/lib/scoring/__tests__/pill-routes.test.ts` (7 tests)
- `src/lib/scoring/__tests__/pill-icons.test.ts` (2 tests)
- `src/lib/scoring/__tests__/use-bos-current-fetch.test.ts` (5 tests)

Component-level RTL tests are deferred: the project does not yet wire
`jsdom` into either vitest config, and adding it would require a
`package.json` edit which is locked at this phase.

Playwright specs are deferred for the same reason; the existing
`tests/e2e/` infrastructure does not yet have a dashboard auth fixture.

## Legacy delete

The legacy `BioOptimizationGauge.tsx` is removed in the same patch as
the new card mounts. Two references to the previous component remain
as comments inside `DailyMetricGauge.tsx`; they refer to the visual
design language only and are not executable code.
