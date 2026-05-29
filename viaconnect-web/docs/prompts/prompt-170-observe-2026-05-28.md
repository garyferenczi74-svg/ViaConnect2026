# Prompt 170 OBRA Observe Report

Date: 2026-05-28
Author: Jeffery (orchestrator) + Michelangelo (lead)
Prompt: 170 NutriVision Engine, with 170a delta corrections folded in
Repo: C:\Users\garyf\ViaConnect2026\viaconnect-web
Supabase project: nnhkcufyqjojdbvdrpky (us-east-2)

## Headline
The data model and core scoring infrastructure for NutriVision are already shipped in live Supabase and in the codebase. The remaining work is the production vision pipeline, cooking oil selector, corpus writer, privacy plumbing, 24h photo cleanup, Capacitor capture, pill tab rename, /admin/corpus surface, and tests. One hard package.json gate blocks UI capture work.

## Live Supabase, what already exists
- meal_source enum: quick_log, full_manual, photo_ai, tracker_api, wearable_cgm, nutrivision (170a §3.2 satisfied; legacy photo_ai retained for lazy read-side migration)
- meals table: all 170a §3.5 corrected columns present (bio_opt_delta, bio_opt_copy, meal_confidence, recognition_provider_primary, recognition_provider_secondary, source_photo_blob_id, gordon_version, quality_score, quality_tier, score_breakdown). No redundant nutrivision_meal boolean per 170a §3.6.
- meal_items table: all 31 columns from 170 §6.1 plus the 170a §3.2 augmentations (bounding_box_json, portion_estimation_method, nutrient_source, recognition_provider, recognition_confidence, cuisine_tag, food_language, cooking_method, cooking_oil_json, micronutrients_json, user_modified, position).
- photo_meal_blobs table: all columns from 170 §6.3 (retention_policy default ephemeral_24h, scheduled_deletion_at default now()+24h).
- food_recognition_cache table: SHA-256 + provider + recognition_json + expires_at + phash_64 BIGINT (170a §4.1 satisfied).
- farmceutica_curated_foods table: all per-100g macro and micronutrients_json columns present; 0 rows (seed deferred to 170b Workstream A).
- user_meal_corpus table: user_hash, salt_version (default 1), meal_id, source, cuisine_tag, recognition_payload_json, final_state_json, edit_diff_json, cooking_oil_json, meal_confidence, user_modified, contributed_photo_path (opt-in only).
- user_nutrivision_settings table: photo_retention_policy default ephemeral_24h, corpus_opt_in default false, opt_in_revoked_at, user_id. Powers the settings page from 170 §2.5 and the 7-day grace window from 170a §4.4.
- helix_earning_event_types: nutrivision_meal_logged (5pt), nutrivision_high_confidence (2pt), nutrivision_user_refined (1pt), corpus_contribution (1pt) all inserted with requires_consumer_tier integer 1, is_active true, category tracking/engagement. 170a §3.3 INSERT type drift (text vs integer) was already corrected at insert time.

## Code already in place
- src/lib/gordon: scoreMealForServerInsert canonical entry, MealSource enum, gordon_version stamping
- src/lib/nutrition: gemini-client (parseImageWithGemini, estimateItemWithGemini, GEMINI_MODEL), usda-client (lookupFood), helix-bridge (awardNutritionLogPoints), bos-bridge (recomputeNutritionDimension), meals-insert-schema (Zod), parsed-meal-schema, aggregate, normalize-query, typical-weights, usda-nutrient-ids, checkFoodInteractions
- src/lib/utils/safe-log: structured logger from 140 (covers 170 §3.3)
- src/lib/errors/classify-ai: AIRouteError class
- src/lib/observability: audit-recorder (recordAudit, newRequestId), ai-pricing (estimateCostUsd)
- POST /api/nutrition/analyze-photo: current photo path uses Gemini primary, USDA lookup, scoreMealForServerInsert, awardNutritionLogPoints. This is the predecessor of NutriVision and gets a parallel new route per 170a §3.7 directive (edit existing meals route, leave analyze-photo until cutover).
- POST /api/nutrition/meals: canonical write endpoint with MealsInsertPayloadSchema + Gordon + Helix + BOS + 10s AbortController. Edits required for NutriVision payload extension.
- /nutrition consumer page: TABS array at line 81 with three Link items. Photo AI label + orange B75E18 accent + href /nutrition/photo-ai. Renaming to NutriVision means relabel + recolor to Teal 2DA5A0 + route swap.

## Gaps to build for 170 ship
1. LogMeal client (primary). API key + env wiring.
2. Claude Vision client (tertiary, 3% capped).
3. Reconcile + detect modules over LogMeal primary + Gemini secondary + Claude tertiary.
4. Open Food Facts client.
5. Resolver with order Curated then USDA then OFF then vision built-in.
6. Recognition cache layer with pHash compute via sharp + Hamming distance lookup + verification fallback.
7. Portion engine: density-table, reference-objects, volume-estimate (Phase 1 vision plus reference-object scaling).
8. Cooking oil suggester (smart default by method plus cuisine, never auto-applied).
9. user_meal_corpus writer + photo-contribution copier.
10. Privacy: PHI redact at vision boundary, salted user-hash with salt_version pickup from current_setting('app.corpus_salt').
11. withTimeout helper (Promise.race) sitting alongside safe-log.
12. Capacitor camera capture abstraction. BLOCKED, see Gate question 1.
13. New POST /api/nutrition/photo/analyze, /recognize, /portion-estimate.
14. New GET /api/nutrition/foods/lookup, /search.
15. Edit POST /api/nutrition/meals/route.ts to accept NutriVision payload shape (per-item cooking_oil_json, recognition_provider_primary/secondary, meal_confidence, source enum value nutrivision).
16. Edge function photo-meal-blob-cleanup, hourly schedule.
17. NutriVisionTab component tree (index plus 13 components plus 3 hooks plus types).
18. Nutrition page edit: rename Photo AI pill to NutriVision, swap accent to Teal 2DA5A0, swap component or route target.
19. /admin/corpus admin surface owned by Arnold per 170a §4.5.
20. Tests: 5 Playwright specs + 6 unit tests + 5-fixture smoke harness.
21. Telemetry events per 170 §15 surfaced in /admin/corpus.

## Gate questions for Gary, blocking code work
1. Capacitor capture plugin. 170a §3.1 stated @capacitor-community/camera-preview was already installed. Verified false. Options: a) Approve installing @capacitor-community/camera-preview and @capacitor/filesystem to package.json (two new deps). b) Approve installing the official @capacitor/camera plugin only. c) Use getUserMedia plus a hidden file input on native (works through Capacitor WebView, no new plugin). Decision pins how CameraCapture.tsx is built.
2. Pill tab pattern. Current /nutrition page uses Link-based routes for the three channels (Log Full Meal, Photo AI, Connect Your App). Spec §10.2 describes an in-page tab with idle state plus capture screen. Options: a) Keep route-based, rewrite /nutrition/photo-ai page into NutriVisionTab tree. b) Convert to in-page tab state and deprecate /nutrition/photo-ai route. Recommendation: a, lower churn against the 168c channel pattern.
3. analyze-photo cutover. Existing POST /api/nutrition/analyze-photo runs Gemini primary today. Options: a) Build POST /api/nutrition/photo/analyze fresh per spec §9.1, leave analyze-photo running until parity, then deprecate. b) Augment analyze-photo in place with LogMeal primary, reconcile, cooking oil, corpus, cache. Recommendation: a, clean spec compliance.
4. LogMeal API key. Spec assumes one exists. Confirm: do we have a LogMeal Food AI account + API key already provisioned for ViaConnect, or is provisioning part of 170 Phase 1 work? If new, supply credentials via env LOGMEAL_API_KEY.

## What does not need rework
- Resilience: safe-log already covers structured logging. Add withTimeout helper alongside it; no need for src/lib/nutrition/resilience/logger.ts duplicate.
- Gordon scoring: scoreMealForServerInsert is the entry point. New work extends it; no parallel gordon-bridge.ts needed under nutrition/.
- BOS recompute and Helix bridge already cascade on meal write. NutriVision saves inherit the crossover for free.

## OBRA next step
Gate decisions then Blueprint deliverables 1 (sequence diagram) and 2 (state diagram). Blueprint deliverables 4 (privacy) and 5 (corpus governance) ship alongside this Observe report. Blueprint deliverable 3 (cost projection) is locked at 170a §4.6. Implementation begins after Blueprint signoff per OBRA gate.
