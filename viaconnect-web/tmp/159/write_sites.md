# Prompt 159 — App-Layer BOS Write Site Catalog (Inheritance for Prompt 160)

Generated 2026-05-11 from filesystem grep — independent of live DB reachability.

This catalogs every place application code writes to a BOS-related table or
column. Prompt 160 will replace each direct write with a call to the
`project_bio_optimization_score(...)` SECURITY DEFINER RPC introduced in
this migration. Items marked READ are not write sites and are listed for
completeness; Prompt 160 leaves reads in place.

## A. `bio_optimization_history` writes

| File | Line | Op | Notes |
|------|------|----|-------|
| src/app/api/ai/calculate-bio-optimization/route.ts | 116 | `.upsert(` | Primary BOS recomputation endpoint. THIS IS THE CANONICAL WRITER per current code. |
| src/lib/ai/engine-registry.ts | 10 | declared write | `writes: ["profiles.bio_optimization_score", "bio_optimization_history", ...]` — engine-registry descriptor only, not a runtime write. Update text after 160. |
| src/lib/ai/engine-registry.ts | 66 | declared write | Same — descriptor in a second registry entry. |
| supabase/functions/compute-engagement-scores/index.ts | (grep hit, line unverified at this layer) | — | Edge Function. Verify if it actually writes bio_optimization_history or only reads. |
| supabase/functions/ultrathink-outcome-collector/index.ts | (grep hit) | — | Edge Function. Verify writer status. |

### `bio_optimization_history` reads (left alone by Prompt 160)
- src/hooks/useUserDashboardData.ts:136 — `.from('bio_optimization_history')` select
- src/lib/engagement/score-engine.ts:225 — select
- src/lib/ultrathink/buildContext.ts:42 — select latest score+breakdown
- src/lib/ai/unified-context.ts:96 — select last 90 days
- src/app/api/ai/generate-protocol/route.ts:28 — select latest score
- src/components/dashboard/DailyScoresGrid.tsx:32 — reads via hook
- src/components/dashboard/DailyScoresCarousel.tsx:4 — reads via hook
- src/lib/supabase/types.ts:518 — TYPE only (regenerate after migration)

## B. `profiles.bio_optimization_score` writes

| File | Line range | Op | Notes |
|------|-----------|----|-------|
| src/app/api/ai/calculate-bio-optimization/route.ts | (grep hit, ~118-130) | `.update(` profile row | Paired with the bio_optimization_history upsert at line 116. |
| src/app/api/recommendations/generate/route.ts | (grep hit) | needs file-level read to confirm write vs read | |
| src/app/api/ai/generate-wellness-analytics/route.ts | (grep hit) | needs read | |
| src/app/api/ai/generate-symptom-profile/route.ts | (grep hit) | needs read | |
| src/lib/recommendation-engine.ts | (grep hit) | needs read | |
| src/lib/hooks/useCAQCompletion.ts | (grep hit) | needs read | |
| supabase/functions/ultrathink-outcome-collector/index.ts | (grep hit) | needs read | |

### `profiles.bio_optimization_score` reads (left alone by Prompt 160)
- src/app/(app)/(consumer)/dashboard/page.tsx
- src/app/(app)/(consumer)/onboarding/[step]/page.tsx
- src/app/(app)/practitioner/analytics/cohorts/page.tsx
- src/lib/practitioner-analytics/queries-client.ts
- src/lib/practitioner-analytics/constants.ts
- src/lib/practitioner-analytics/sherlock-stub.ts
- src/app/(app)/(consumer)/analytics/page.tsx
- src/lib/ai/unified-context.ts
- src/utils/protocolShareAccess.ts
- src/hooks/useUserDashboardData.ts
- src/components/provider/SharedPatientProtocol.tsx
- src/components/consumer/ShareProtocolModal.tsx
- src/app/(app)/naturopath/patients/page.tsx
- src/app/(app)/(consumer)/settings/shared-access/page.tsx
- src/lib/ultrathink/buildContext.ts
- src/lib/ai/engine-registry.ts
- supabase/migrations/20260420000001_practitioner_analytics_mvs_phase_2a.sql (materialized view)

## C. `health_scores` writes
NONE detected by grep. The 7 hit files are all reads or schema/type references:
- src/lib/analytics/load-consumer-analytics.ts:80 — `.select(score, created_at)`
- src/app/(app)/(consumer)/analytics/page.tsx:314 — `.select(score, created_at)`
- src/app/(app)/(consumer)/profile/assessment/page.tsx:230 — `.select(*)`
- src/app/(app)/(consumer)/plugins/apps/page.tsx:84 — string literal in dataTypes array
- src/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useAnalyticsRealtime.ts:10 — realtime channel subscription (read)
- src/lib/supabase/types.ts:5369 — TYPE only

CONSEQUENCE: If `health_scores` has no app writers and the table's purpose
is purely a read-side projection from `bio_optimization_history`, the spec's
§6.5 projection-write trigger IS the correct design — but only if the table's
shape matches the spec. Live shape (per types.ts) has no `score_type` column,
so the spec's `on conflict (user_id, score_type, recorded_at)` will fail
compile. See preflight.txt Inspection 3.

## D. `daily_scores` writes

| File | Line | Op | Notes |
|------|------|----|-------|
| src/app/actions/dailyScores.ts | (grep hit, exact line via file read) | server action: write | This is THE canonical daily_scores writer. |
| src/lib/helix/engagement-score.ts | (grep hit) | needs read | |
| src/lib/ai/emit-event.ts | (grep hit) | needs read | |
| src/lib/ai/event-cascade.ts | (grep hit) | needs read | |
| src/lib/ai/engine-registry.ts:66 | declared write | `writes: [..., "daily_scores", "bio_optimization_history"]` |
| src/app/api/ai/generate-wellness-analytics/route.ts | (grep hit) | needs read | |

CONSEQUENCE: `daily_scores.overall_score` is the user-facing daily gauge —
projecting BOS into it MUST coordinate with the existing `dailyScores.ts`
writer to avoid race conditions or stale overwrites. Gary decision needed
on whether BOS projection writes a sentinel row (e.g., `data_mode = 'bos_projection'`)
or merges into the existing combined daily row.

### `daily_scores` reads
- src/components/dashboard/DailyScoresPanel.tsx
- src/components/dashboard/QuickMealLogWidget.tsx
- src/lib/ai/unified-context.ts
- src/hooks/useCheckinCard.ts
- src/lib/analytics/load-consumer-analytics.ts
- src/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/*
- supabase/migrations/20260413000020_daily_scores_rebuild.sql (table create)

## Net Inheritance for Prompt 160
- Confirmed write sites to bio_optimization_history: 1 primary (calculate-bio-optimization/route.ts) + up to 2 edge functions pending verification.
- Confirmed write sites to profiles.bio_optimization_score: 1 primary + 6 unverified.
- Confirmed write sites to health_scores: 0.
- Confirmed write sites to daily_scores: 1 primary + 5 unverified.

Prompt 160 must:
  1. Replace the calculate-bio-optimization/route.ts upsert+update pair with a
     single `supabase.rpc('project_bio_optimization_score', {...})` call.
  2. Verify the 13 "needs read" files and convert any actual writers to the RPC.
  3. Add a `forbid-direct-bos-writes.ts` ESLint rule (or pre-commit grep) so
     future code cannot regress.
  4. Update engine-registry.ts descriptors to reflect RPC-only writes.

This catalog is FILESYSTEM-derived. Live DB confirmation of additional
writers (e.g., pg triggers, edge functions invoked from cron) is still
required before Prompt 160 closes.
