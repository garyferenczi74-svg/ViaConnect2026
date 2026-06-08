# Prompt #179a: CAQ writes the body_goals trajectory (authority and write-through), Delivery Report

**Project:** ViaConnect Web
**Supabase:** nnhkcufyqjojdbvdrpky (us-east-2)
**Delivery date:** 2026-06-08
**Delivered by:** Claude Opus 4.8 (1M context) under Michelangelo OBRA
**Reviewed by:** Jeffery (orchestrator + final), Michelangelo (senior dev), Arnold (body markers), Gordon (nutrition), Hannah (copy), security-advisor, performance-advisor
**Spec source:** [docs/prompts/prompt-179a-caq-writes-body-goals-2026-06-07.md](./prompt-179a-caq-writes-body-goals-2026-06-07.md)
**Depends on:** #179 (Progress tab, body_goals tables, Gordon goal engine, DD-1 resolver), already shipped 2026-06-08.

---

## TL;DR

- Makes `body_goals` the single WRITE authority for goal weight. The CAQ Weight Goals step now writes through `body_goals` (which projects goal weight + direction into `user_weight_goals`) instead of writing `user_weight_goals` directly. The macro engine and Weight-card READ paths are unchanged.
- The CAQ Weight Goals step gained a pace selector (Gentle 0.5, Steady 1.0, Ambitious 1.5 lb per week, or Pick a target date), defaulting to Steady, hidden for a maintain goal and suppressed in disordered-eating safety mode.
- A member finishes onboarding with a live trajectory and a goal-driven daily target already computed (the CAQ POSTs `/api/body/goals` origin=caq, which fires the initial_plan target).
- Lazy, idempotent backfill seeds an active `body_goals` from `user_weight_goals` on first Progress-tab open for existing members; a `needs_resync` flag pair self-heals a failed projection on the next read.
- **1 append-only migration** applied live: four `body_goals` columns (`origin`, `target_pace_preset`, `needs_resync`, `legacy_synced_at`). All existing columns untouched; `user_weight_goals` schema untouched.
- **116 tests green** (vitest, tests/body-goals + tests/gordon), covering pace mapping (criteria 1, 2), projection self-heal (criterion 6), and backfill idempotency (criterion 5). **0 new TypeScript errors** in the 179a surface. **0 em/en dashes, 0 emojis** across the diff.
- **CAQ canonical structure unchanged:** 7 phases, 16 progress dots, 10 interstitials, single video.
- **`package.json` untouched.** Supabase email templates untouched. `body_goals` namespace kept (no rename).
- Shipped to production at `viaconnectapp.com` (deploy `b7c3fcc6`, READY).

## Architectural choices

| Area | Choice | Why |
|---|---|---|
| Write authority | `body_goals` is the single writer; `user_weight_goals` is written only via an app-layer projection | Single source of truth without a destructive migration. Legacy READ paths (macro engine, Weight card) never change; this is the clean stepping-stone to a future Option-2 consolidation. |
| Shared creation path | One `createBodyGoal` used by the POST route, the CAQ submit, and the backfill | DRY. `requireTarget` splits the behavior: the Goals tab planner surfaces `setup_required`; the CAQ + backfill create the goal even if the target cannot compute yet, so the projection (hence `user_weight_goals`) always runs. |
| Pace mapping | Pure `resolveCaqGoalDriver` (Gentle 0.5 / Steady 1.0 / Ambitious 1.5; custom_date is date driven; maintain is rate 0) | Unit-tested in isolation; the CAQ converts kg to lb at the boundary and passes the driver fields to the route. |
| Self-heal | `projectAndMarkSync` sets `needs_resync` on a failed projection and clears it + stamps `legacy_synced_at` on success; GET `/active` re-projects when the flag is set | The `body_goals` write is authoritative and is never blocked by a projection failure; the next read repairs the mirror. |
| Backfill | Lazy + idempotent on GET `/active`: `getActiveGoal`-first guard plus the one-active-goal partial unique index | No destructive bulk migration; running twice cannot create a second active goal. Seeds from the latest Arnold weight when present, else the `user_weight_goals` current weight; origin `caq_backfill`; fires the initial target. |
| CAQ submit resilience | POST `/api/body/goals` origin=caq, with a legacy `writeWeightGoal` fallback when the request fails | The macro engine is never left without a goal; `user_weight_goals` is always written one way or the other. |
| Migration | Four `ADD COLUMN IF NOT EXISTS` with CHECK constraints that allow NULL | Append-only; the existing #179 rows (created before these columns) stay valid. |

## Integration with the My Biology hub (#180)

Main carried prompt #180, which replaced the Body Tracker pill-tab navigation with the My Biology bento hub and pre-staged the Progress card and a placeholder page for #179b. The #179 merge replaced that placeholder with the real Progress surface and adopted the hub's `BackToHubLink`; #179a builds on that. The pill-tab `BODY_TRACKER_TABS` and `BodyTrackerTabs` are now harmless dead leftovers (the hub does not render them).

## Build incident and resolution (no production impact)

The first 179a production build (`0b607cf5`) failed compiling `progress/page.tsx` with the 180b placeholder content (`export const metadata` under `'use client'`, a Next.js build error). The committed file at that SHA is the correct six-section page with no metadata export; Vercel's `.next` build cache had recompiled a stale module that 180b's failed build had poisoned. Production was never at risk: the failed build was not promoted, so prod stayed on the working #179 deploy. A one-line content change to the file (`b7c3fcc6`) busted the cache and the rebuild compiled the committed file cleanly. A comment now documents the no-`metadata`-under-`'use client'` gotcha. Lesson: if a Vercel build fails on content that is not in the committed file, suspect a stale build cache and bust it with a content change.

## Verification

- 116 vitest tests pass (tests/body-goals, tests/gordon). New: `pace.test.ts`, `projectAndMarkSync.test.ts`, `backfill.test.ts`; `recalibrate.test.ts` updated for the new columns.
- `tsc --noEmit` clean for every 179a-touched file. (Repo-wide tsc has pre-existing errors in unrelated surfaces; none in 179a.)
- ESLint clean on the 179a additions; the onboarding page's 26 errors are pre-existing (from #177i), all outside the 179a hunks.
- 0 non-ASCII (no em/en dashes, no emojis) across the diff. Tokens only. Lucide strokeWidth 1.5.
- CAQ canonical counts verified unchanged: `CAQ_TOTAL_DOTS = 16`, `CAQ_FORM_PHASE_IDS` length 7, 10 interstitials.
- Jeffery agent-team audit: SHIP / PASS, zero blockers, all six domains.

## Acceptance criteria

1. CAQ lose + Steady creates an active `body_goals` (origin caq, rate ~1.0), projects goal weight + direction, fires the initial target. Covered by `resolveCaqGoalDriver` + `createBodyGoal` + the CAQ handler; pace mapping unit-tested.
2. CAQ maintain stores rate driver at 0 (target equals maintenance, no deficit). Pace mapping + the engine's maintain path unit-tested.
3. Weight-tab card write-through. Vacuously satisfied: the Weight page is display-only on main (no goal-edit UI to redirect).
4. Macro engine + Weight-card READ paths unchanged. Verified: `readWeightGoal` and the macro read are untouched; the projection still writes `user_weight_goals`.
5. Backfill idempotent (origin caq_backfill); a second run creates no second goal. Unit-tested.
6. Projection throw sets `needs_resync`; next read self-heals. Unit-tested.
7. CAQ structure unchanged. Verified.
8. No emojis, no em/en dashes, Lucide 1.5, tokens only. Verified.

## Files

- New: `src/lib/body-goals/pace.ts`, `createGoal.ts`, `backfill.ts`; tests `pace.test.ts`, `projectAndMarkSync.test.ts`, `backfill.test.ts`.
- Modified: `src/lib/body-goals/types.ts`, `projectWeightGoal.ts`; `src/app/api/body/goals/route.ts`, `active/route.ts`; `src/components/caq/WeightGoalsSection.tsx`; `src/app/(auth)/onboarding/[step]/page.tsx` (handleNext case "3"); `src/app/(app)/(consumer)/body-tracker/progress/page.tsx` (cache-bust comment); `tests/body-goals/recalibrate.test.ts`.
- Migration: `supabase/migrations/20260608030000_prompt_179a_body_goals_caq_columns.sql`.
- Commits on `origin/main`: `cd69ac00`, `4e82d6a3`, `0b607cf5`, `b7c3fcc6`.

## Deploy

`origin/main` fast-forwarded to `b7c3fcc6`; Vercel production deploy `dpl_BVpZx1eajUUxJxnh88Q1B3enDSix` READY, aliased to viaconnectapp.com. Migration applied live and verified.

## Open items

- Paired `.docx` for the Prompt Library not produced (no pandoc or python-docx available, package.json locked; the library has been `.md`-only in practice).
- The Option-2 mass migration (deprecate `user_weight_goals`, flip all readers to `body_goals`) remains a future prompt per the 179a out-of-scope.
