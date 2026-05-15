# Prompt #161 Phase B Pre-Flight (live Supabase, project nnhkcufyqjojdbvdrpky)
Run: 2026-05-11

Phase B authors 9 source modules + cooldown + queue + telemetry TypeScript modules. Each source module reads from a specific Supabase table to gather a user's slice of the BOS input bundle. Below is the live schema reality for each source, including the gaps that require graceful-empty-state handling.

---

## Diagnostic Foundation (Tier sources, axis A)

### CAQ source -> `caq_assessment_versions`
20 columns, 0 rows currently.
Canonical CAQ data store. Per-user, per-version. Each row holds the full CAQ snapshot in jsonb.

Key columns for the source module:
- `user_id uuid NOT NULL`
- `version_number integer NOT NULL`
- `status text NOT NULL` -- check this for completion (likely 'completed' / 'in_progress' / 'abandoned')
- `started_at timestamptz`, `completed_at timestamptz`
- `is_retake boolean`
- 7 jsonb phase columns: demographics, health_concerns, physical_symptoms, neuro_symptoms, emotional_symptoms, medications, supplements, allergies, lifestyle
- `previous_version_id uuid`, `changes_from_previous jsonb` (version chain)

CAQ baseline derivation: read the latest completed row (status = 'completed') for the user, parse the 7 jsonb phases into the BOS baseline algorithm (Hannah's job in Phase C). For Phase B's source module, just expose `{ completed: bool, completed_at: timestamptz | null, baseline_score: number | null (deferred to Hannah compute), version_number: int, phases: { demographics, health_concerns, ... } }`.

`assessment_results` (7 rows, 6 cols: id, user_id, phase int, data jsonb, created_at, updated_at) is the per-phase progress tracker used by the in-progress CAQ flow. Phase B's source module reads `caq_assessment_versions` (the consolidated final), NOT `assessment_results` (the in-progress draft).

`clinical_assessments` (0 rows, 20 cols of flat columns like height_cm, weight_kg, primary_goals[], current_conditions[]) is legacy. Ignore.

### Labs source -> NO BACKING TABLE EXISTS
No `lab_results`, `lab_uploads`, `biomarker_panel`, `blood_test`, `test_results`, or analogous table in the live schema.

The `/plugins/labs/page.tsx` route exists but is fully static: cards for Upload PDF, Quest Diagnostics, Labcorp, all toast "Connection flow coming soon" with note "Terra API integration in progress". No write paths, no read paths.

**Phase B implication**: the Labs source module returns a hardcoded empty shape: `{ present: false, uploaded_at: null, panel_count: 0 }`. Tier 2 confidence (86 percent) is unreachable until labs integration ships. Document this in the source module's leading comment. Hannah's prompt will see labs.present = false and never promote tier above 1 (unless Genetics is present, which is the only other tier source).

A follow-on prompt will need to land the labs table + ingestion before Tier 2 is meaningful. Out of scope for #161.

### Genetics source -> `genex360_purchases` + `genetic_profiles`
Two tables work together:

**`genex360_purchases`** (22 cols, 0 rows) tracks the kit purchase lifecycle:
- `user_id uuid NOT NULL`, `product_id text NOT NULL`
- `payment_status text NOT NULL`, `lifecycle_status text NOT NULL`
- `kit_shipped_at`, `sample_received_at`, `lab_processing_started_at`, `test_results_delivered_at` (timestamptz, all nullable)
- `family_member_id`, `gift_membership_id`, `gift_starts_at`, `gift_ends_at` (gift / family flow)

**`genetic_profiles`** (9 cols, 0 rows) holds the actual results:
- `user_id uuid NOT NULL`
- `cyp2d6_status text`, `mthfr_status text`, `comt_status text`
- `additional_genes jsonb` (extension panel)
- `source_lab text`, `report_date date`

**Phase B implication**: source module returns `{ present: bool, processed_at: timestamptz | null, panel: 'genex360_v1' | null }`. Derivation:
- present = TRUE if a row exists in `genetic_profiles` for the user with non-null cyp2d6_status / mthfr_status / comt_status, OR if `genex360_purchases.test_results_delivered_at` is non-null for the user
- processed_at = `genetic_profiles.report_date` (cast to timestamptz) OR `genex360_purchases.test_results_delivered_at`, whichever is most recent
- panel = 'genex360_v1' if `genex360_purchases.product_id` is set

For the destination key resolution in #161 §6.10:
- No purchase row AND no profile row -> destination_key = 'genex360_purchase'
- Purchase row exists but `test_results_delivered_at IS NULL` -> destination_key = 'genex360_status'
- Profile row exists -> Genetics pill state = 'complete'

---

## Engagement Sources (6 levers, axis B)

### Nutrition source -> `meal_logs`
21 columns, 2 rows currently. Active table.

Key columns:
- `user_id uuid NOT NULL`
- `meal_type text NOT NULL`, `log_method text NOT NULL` (the 4 input modalities live here: quick / description / photo / plugin)
- `meal_date date NOT NULL`, `logged_at timestamptz`
- `description text`, `photo_url text`, `ai_analysis jsonb`
- `calories integer`, `protein_g numeric`, `carbs_g numeric`, `fat_g numeric`
- `quality_rating integer`, `meal_score integer`, `macro_sliders jsonb`
- `source_app text`, `external_id text`, `sync_connection_id uuid` (plug-in attribution)
- `genetics_guide_flags jsonb`, `created_at timestamptz`

**Source module signal**:
- `last_engaged_at` = MAX(logged_at) for user
- `recent_events_7d` = COUNT(*) for user WHERE meal_date >= current_date - 7
- `recent_events_30d` = COUNT(*) for user WHERE meal_date >= current_date - 30
- `source_specific` = { calorie_avg_7d, log_method_distribution, has_photo_uploads }

### Supplements source -> `supplement_adherence`
12 columns, 0 rows currently.

Key columns:
- `user_id uuid NOT NULL`
- `supplement_name text NOT NULL`, `supplement_type text`, `category text`
- `recommended_dosage text`, `recommended_frequency text`
- `adherence_percent numeric`, `streak_days integer`, `total_doses_logged integer`
- `started_at timestamptz`, `status text`

**Source module signal**:
- `last_engaged_at` = MAX(started_at) for user OR a separate dose-log table -- TODO verify if there's a dose-log table or if total_doses_logged is just a counter
- `recent_events_7d` = SUM(adherence_percent * 7 / 100) approximation OR an actual dose-log query if a dose table exists
- `recent_events_30d` = analogous
- `source_specific` = { avg_adherence_percent, active_supplement_count, longest_streak }

Note: there are also `user_supplements` (30 cols, 0 rows) and `user_current_supplements` (15 cols, 0 rows) tables. Phase B inspects whether dose-event rows live in either; if so, prefer the most granular for last_engaged_at.

### Body Tracker source -> `body_tracker_entries`
14 columns, 2 rows currently. Active.

Key columns:
- `user_id uuid NOT NULL`
- `entry_date date NOT NULL`
- `source text NOT NULL` (manual / device / photo / scan)
- `device_name text`, `manual_source_id text`, `manual_source_tier text`
- `confidence numeric`, `scan_photo_url text`, `condition_context text`
- `time_of_day text`, `notes text`
- `created_at timestamptz NOT NULL`, `updated_at timestamptz NOT NULL`

Related tables (Arnold's expanded body tracker schema): body_tracker_journeys (1 row), body_tracker_journey_events (1 row), body_tracker_user_state (2 rows), body_tracker_weight (2 rows), plus 14 other 0-row tables. Body Tracker is the most complex source with many ancillary tables, but for engagement signal the main table is `body_tracker_entries`.

**Source module signal**:
- `last_engaged_at` = MAX(created_at) from body_tracker_entries for user
- `recent_events_7d` = COUNT(*) WHERE entry_date >= current_date - 7
- `recent_events_30d` = COUNT(*) WHERE entry_date >= current_date - 30
- `source_specific` = { source_distribution (manual vs device vs photo), has_photo_scans, latest_weight (join body_tracker_weight) }

### Wearable source -> `wearable_integrations` + `daily_scores`
**`wearable_integrations`** (7 cols, 0 rows) is configuration:
- `user_id uuid NOT NULL`, `device_type text NOT NULL`, `device_name text`
- `last_sync_date timestamptz`, `is_active boolean`, `connected_at timestamptz`

The actual wearable data flows into `daily_scores` (data_source = 'wearable' or 'mixed') with recovery_score, sleep_hours, steps_count, recovery_hrv, strain_value columns.

**Source module signal**:
- `last_engaged_at` = MAX(last_sync_date) from wearable_integrations where is_active = true OR MAX(updated_at) from daily_scores where data_source IN ('wearable', 'mixed') -- whichever is more recent
- `recent_events_7d` = COUNT(*) from daily_scores WHERE date >= current_date - 7 AND data_source IN ('wearable', 'mixed')
- `recent_events_30d` = analogous
- `source_specific` = { active_integration_count, device_types[], latest_hrv, latest_sleep_hours }

### Plug Ins source -> `wearable_integrations` (only real integration table)
Live schema reality: the only "plug-in integration" table that backs real data is `wearable_integrations`. The other plug-in surfaces (`/plugins/apps`, `/plugins/labs`) are static intake/marketing pages.

There is NO `plugin_requests` table in the DB despite the `/plugins/page.tsx` referencing it at line 125 (`.from('plugin_requests').insert(...)`). That write site is dead.

**Source module signal**:
- `last_engaged_at` = MAX(connected_at) from wearable_integrations for user (most recent plug-in added)
- `recent_events_7d` = COUNT(*) from wearable_integrations where connected_at >= now() - 7 days AND user_id = X
- `recent_events_30d` = analogous
- `source_specific` = { active_count, device_types[] }

Document in source module's leading comment that this source is currently a near-duplicate of the Wearable source, because Plug Ins infrastructure for non-wearable integrations is not built yet. When Apps / Labs integration ships, this source will diverge.

### Helix Challenges source -> `helix_challenge_participants` + `helix_challenges`
**`helix_challenge_participants`** (9 cols, 0 rows):
- `user_id uuid`, `challenge_id uuid` (both NULLABLE per current schema -- unusual)
- `status text`, `current_progress numeric`, `target_value numeric`
- `completion_date timestamptz`, `tokens_awarded integer`, `joined_at timestamptz`

**`helix_challenges`** (14 cols, 0 rows): the challenge catalog.

**Source module signal**:
- `last_engaged_at` = MAX(joined_at) from helix_challenge_participants for user
- `recent_events_7d` = COUNT(*) WHERE joined_at >= now() - 7 days OR completion_date >= now() - 7 days
- `recent_events_30d` = analogous
- `source_specific` = { active_count (status = 'active'), completed_count (status = 'completed'), tokens_earned_30d }

---

## Cooldown module -> reads `bio_optimization_history`
Single canonical query:
```sql
SELECT MAX(computed_at) FROM bio_optimization_history WHERE user_id = $1;
```
The 30-min cooldown logic in TypeScript: if (now - last_computed_at) < 30 min AND trigger.bypass_cooldown is false AND trigger.source is NOT in ('caq', 'labs', 'genetics') -> throw BOSCooldownError.

## Queue module -> `bos_compute_queue` (created in Phase A migration)
Schema is set. Functions to author:
- enqueueBOSCompute (insert one row)
- fetchUnprocessedEventsGroupedByUser (group by user_id where processed_at IS NULL, return Map)
- markEventsProcessed (UPDATE SET processed_at = now() WHERE id = ANY)
- markEventsErrored (UPDATE SET processing_error = $msg, retry_count = retry_count + 1 WHERE id = ANY)

## Telemetry module -> `bos_write_telemetry` (created in Phase A migration)
Schema is set. Single function: logBOSWrite (INSERT one row, swallow errors).

---

## Summary of gaps and graceful-empty-state strategy

| Source | Live data state | Phase B behavior |
|---|---|---|
| CAQ | Canonical table exists, 0 rows live | Return empty shape; baseline_score = null until Hannah computes |
| Labs | NO TABLE EXISTS | Hardcoded `{ present: false }`; document Tier 2 unreachable for now |
| Genetics | Tables exist, 0 rows | Return empty unless rows present |
| Nutrition | Active, 2 rows | Real query |
| Supplements | Table exists, 0 rows | Real query, returns empties |
| Body Tracker | Active, 2 entries | Real query |
| Wearable | Tables exist, 0 rows | Real query, returns empties |
| Plug Ins | wearable_integrations is only real backing | Real query, returns empties; document scope |
| Helix Challenges | Tables exist, 0 rows | Real query, returns empties |

The compute module's tier derivation:
- tier = 3 if CAQ completed AND Labs present AND Genetics present (unreachable until Labs ships)
- tier = 2 if CAQ completed AND (Labs present XOR Genetics present)
- tier = 1 if CAQ completed only (default state for all current users)
- throw BOSPreflightError if !CAQ.completed (Hannah cannot compute without baseline)

## Existing `/plugins` consumer routes (filesystem)
- `/plugins/page.tsx` -- intake page with broken `plugin_requests` insert
- `/plugins/apps/page.tsx` -- static cards (MyFitnessPal, Cronometer, Strava, Peloton, 23andMe, etc.)
- `/plugins/labs/page.tsx` -- static cards (Upload PDF / Quest / Labcorp), all toast "coming soon"
- `/plugins/wearables/page.tsx` -- static cards (Apple Watch, Oura, Garmin, WHOOP, Fitbit, Hume)
- `/plugins/manage/page.tsx` -- mock data only
- `/plugins/layout.tsx` -- shared layout

Phase B's Plug Ins source module reads ONLY from `wearable_integrations`. The above routes are out of scope for #161 (per Gary's do-not-touch dashboard rule, similar restraint applies to UI surfaces).
