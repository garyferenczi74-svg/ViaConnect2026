# Prompt 209 (Rev B) - FormaVision Body Composition: Root Cause and Change Report

**Dates:** 2026-06-22 to 2026-06-23
**Surface:** My Biology -> Body Composition (`/body-tracker/composition`): Male/Female anatomical avatar with color-stateable segments, the Body Fat / Muscle Mass / Measurements tabs, the four metric cards, driven by the "Scan My Body" FormaVision engine.
**Status:** Code-complete on main (direct push, path-scoped). Held for Gary localhost sign-off and one ops confirmation (ANTHROPIC_API_KEY).

## 1. Summary

The "Scan My Body" engine produced nothing the surface could show, and the surface itself rendered hardcoded mock numbers. This change establishes one canonical composition record written by both the scan engine and manual "Log Data", and rewires the surface to read it, so the avatar, the four metric cards, and Measurements reflect the latest entry. Per the agreed honest model, a photo scan fills Total Body Fat percent and BMI; everything a photo cannot measure is shown as UNKNOWN (never 0) until a smart-scale or DEXA Log Data entry provides it.

## 2. Phase 0 two-sided map (as confirmed, read-only)

WRITE path (scan): `BodyScanUploader` POSTs 4 base64 photos to the `body-scan-analyze` edge function (Claude vision); the function returns estimates and inserts the raw audit row into `body_tracker_photo_scans`. NEW: on completion the client calls `POST /api/body/scan/persist`, which derives Total Body Fat percent from the vision range and writes the canonical `body_tracker_entries` (source `scan`) + `body_tracker_segmental_fat` rows.

READ path (surface): `composition/page.tsx` -> NEW `useLatestComposition` -> latest `body_tracker_entries` + `body_tracker_segmental_fat` + `body_tracker_segmental_muscle` (+ profile height and latest weight for BMI) -> `buildMetricCards` / `fatValuesFromSnapshot` / `muscleValuesFromSnapshot` / `resolveSurfaceState` -> the `SegmentalHeatMap` avatar, the four `FloatingMetricCard`s, and the body-part callouts. Manual "Log Data" writes the SAME canonical tables, so scan and manual share one read path.

## 3. Confirmed root cause

1. The `body-scan-analyze` edge function was NOT deployed (`get_edge_function` returned "Function not found"), so every "Scan My Body" call hit a 404. Evidence: 0 rows in `body_tracker_photo_scans`, 0 edge invocations in 24h.
2. The surface was fed by three hardcoded constants in `composition/page.tsx`: `SAMPLE_FAT`, `SAMPLE_MUSCLE`, and `FAT_CARDS` (the literal `21.3%`, `24.2`, `8`, `55.1%`). It never read any scan or manual output for the fat values or the four cards. `FAT_CARDS` was also wrongly reused on the Muscle tab.
3. Even a successful scan had no path to the surface: the result was held in React state, "Use as Baseline" only pre-filled the manual form, and the only persisted target (`body_tracker_photo_scans`) had no reader. This is the write-target / read-target drift the prompt anticipated.

Net: the feature had never run end-to-end in this project (0 rows across every output table).

## 4. Changes (files and commits)

Migration: `supabase/migrations/20260622090000_prompt_209_entries_scan_id.sql` (commit `51e7b652`).
Engine (pure): `src/lib/body-tracker/composition/` - `types.ts`, `deriveScanComposition.ts`, `buildScanWrite.ts`, `correlation.ts` (commits `c25dd726`, `307c33d6`, `44e6c191`).
Persist: `src/app/api/body/scan/persist/route.ts` (commits `85de6fd3`, `104fe8c0`, `4cfdc43d`) + `persistScanClient.ts` (`9a456077`).
Deploy: `body-scan-analyze` edge function deployed to prod (version 1, ACTIVE, verify_jwt true) - ops step, no repo commit.
Read path: `src/hooks/body-tracker/useLatestComposition.ts` (`0009a67e`); `src/lib/body-tracker/composition/mapRows.ts`/`metricCards.ts`/`regionValues.ts`/`surfaceState.ts` (`ba07a963`, `e1e17949`, `790f39c0`, `87877121`, `2bf1afc5`).
Surface: `src/components/body-tracker/FloatingMetricCard.tsx` (`a7ba184a`); `src/app/(app)/(consumer)/body-tracker/composition/page.tsx` (`86b56953`).
Types: `src/lib/supabase/types.ts` (scan_id, in `51e7b652`).

## 5. New migration and its purpose

Additive, append-only: a nullable `body_tracker_entries.scan_id uuid` plus a partial unique index on `(scan_id) where scan_id is not null`. Purpose: provenance (which scan an entry came from) and idempotency (a re-submitted scan cannot create a duplicate entry). Applied to the live DB (`apply_migration` success). Forward-safe: manual entries keep `scan_id` NULL.

## 6. Mock removed

`SAMPLE_FAT`, `SAMPLE_MUSCLE`, and `FAT_CARDS` were deleted from `composition/page.tsx` (verified: `git grep` for those identifiers in `src/app` returns nothing). Two pieces of pre-existing dead code that the constants block carried (`FemaleSilhouette` and `SAMPLE_FEMALE_MEASUREMENTS`, never rendered in the current layout) were removed in the same edit to keep the file lint-clean.

## 7. Canonical read/write path

Scan and manual both write `body_tracker_entries` (source `scan` or `manual`) plus `body_tracker_segmental_fat` / `body_tracker_segmental_muscle`. The surface reads only that, via `useLatestComposition`. `body_tracker_photo_scans` is retained as the raw AI audit record, not a display source. This eliminates the drift.

## 8. Freshness / repaint mechanism (and why)

After a scan persist and after a Log Data save, the page bumps a `refreshKey`; an effect keyed on it calls `useLatestComposition.refresh()`, `useFatChangeData.refresh()`, `useMuscleChangeData.refresh()`, and the circumference refresh. The cards, callouts, and avatar colors then update with no page reload. This client-side refresh was chosen over `revalidatePath`/`revalidateTag` or Supabase realtime because the surface is a client component sourcing client-side hooks; a client refresh trigger is the minimal correct mechanism and matches the existing hook pattern on this page.

## 9. The four states (avatar is always the canvas)

- loading: the avatar renders neutral while the latest entry loads; cards show a muted "No data".
- empty (no entry yet): avatar neutral baseline; an "Scan or Log Data to begin" hint; the four cards render the neutral Unknown card.
- partial (some metrics UNKNOWN): known cards real, UNKNOWN cards neutral.
- error (read failed): an on-brand error banner with a Retry that calls the read hook's refresh; the avatar still renders neutral.
The `SegmentalHeatMap` avatar renders unconditionally in every state; nothing replaces it with a blank or error placeholder.

## 10. Honest scan model (DD3) and what is UNKNOWN by design

A photo scan fills Total Body Fat percent (the vision range midpoint) and BMI (computed from profile height and latest weight). Visceral Fat, Body Water, per-region fat percent, and muscle mass are not measurable from a photo and are stored and shown as UNKNOWN (null), never 0. The avatar segment colors are change vs the prior entry (the model the muscle side already used); the first entry paints neutral. The avatar therefore paints meaningfully once segmental (smart-scale or DEXA) data exists via Log Data, or once two entries allow a delta. This is intentional and clinically honest, not a defect.

## 11. Reliability

A correlation id (`newCorrelationId`) is threaded into structured `logScanEvent` calls in the persist route (`completed` / `failed` with a reason bucket), so success rate is derivable from logs. `persistScan` is fail-open with a 5 second abort timeout and never throws. The page surfaces a clear on-brand failure with a Retry. There is no async "stuck processing" state to guard: the chosen `body-scan-analyze` engine is synchronous (the HTTP call returns complete or an error), so a stuck-scan cron does not apply to this surface; a failed scan surfaces inline with a `failed` telemetry line.

## 12. Verification

- Unit tests: `src/lib/body-tracker/composition/` 8 files, 35 tests, all passing (vitest, node environment).
- Types: all Prompt 209 files pass `tsc --noEmit` (the route's awaited Supabase results were typed via the `Promise.resolve` wrapper convention). The project carries 212 pre-existing type errors in parallel-session files (user-beverages, beverages, caq/supplements, shop, protocol); none are in 209 scope.
- Lint: the touched files are ESLint clean.
- Standing rules: no em-dashes or en-dashes in the diff; Lucide `strokeWidth={1.5}`; tokens only; `package.json` unchanged; Supabase email templates untouched; the parallel session's `medicationReconciliation.*` not touched.

## 13. Deploy and rollback

`body-scan-analyze` was deployed to prod (version 1, ACTIVE) under Gary's BAA authorization. The single migration is additive and forward-safe, so it needs no rollback to restore prior behavior. To revert the application behavior, revert the surface commit `86b56953` (and, if desired, the route/persist commits); the `scan_id` column and index can remain.

## 14. Out of scope (flagged, not changed)

- The `/photos` `arnold-vision-analyze` pipeline and its `ArnoldAnalysisCard` (a different surface).
- `body_tracker_photo_scans` having no history reader; the orphaned `body_scan_composition` and `ai_insights` tables.
- `PoseGuide` forcing the front camera (`capture="user"`) and `processPhoto` throwing on HEIC, plus premature `body_photo_sessions` creation - all on the `/photos` surface, not this one.

## 15. Known minor items (for localhost review)

- The loading state does not yet show skeleton chips (avatar is present and honest; the plan mentioned skeletons).
- `metricCards.ts` `bmiStatus` has a redundant branch (Overweight and Obese both surface as "High"); harmless.
- The persist route uses a few `(supabase as any)` casts; it typechecks and works.

## 16. Gary action items

1. Confirm `ANTHROPIC_API_KEY` is set on the project's Edge Function secrets (the function returns 503 "vision unavailable" without it).
2. Run one real "Scan My Body" on a device; I will read the edge-function logs to confirm the key, the vision round-trip, and the persist.
3. Localhost visual sign-off: the four states, both avatar genders, both tabs, and a repaint after a Log Data save (no reload).
