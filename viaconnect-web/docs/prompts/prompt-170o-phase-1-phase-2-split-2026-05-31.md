# Prompt 170o Phase 1 / Phase 2 Split Spec

**Date:** 2026-05-31
**Owner:** Jeffery (orchestrator)
**Supersedes the single-phase sequencing in:** `project_prompt_170o_filed.md` (Q4 2026 monolithic ship)
**Status:** Split spec drafted. NO build authorization yet.

The single-phase 170o sequencing puts the entire feature behind 170h ratification (late Q3 2026 earliest). This split spec separates the ~70% of 170o that stands alone from the ~30% that hard-depends on 170h, so Phase 1 (standalone hydration tracking) can ship in late June 2026 or as a post-launch fast-follow without waiting for 170h's slow blockers (30-day data floor + Gordon catalog drafting + 30-user pilot).

---

## Phase boundary contract

Phase 1 ships a **complete tracking + targets + dashboard surface**. Phase 2 attaches **insights composition + hydration-aware BOS recompute** when 170h ratifies. The contract between them:

| Surface | Phase 1 lays down | Phase 2 attaches |
|---|---|---|
| `meal_items.hydration_source_kind` + `hydration_ml` | populated on every save | consumed by 170h engine for hydration co-variate |
| `meals.meal_kind = 'hydration_only'` | distinguishes quick-logs from full meals | filters 170h aggregations |
| `hydration_aggregations_daily` materialized view | nightly refresh | new `hydration_total_ml_today` field on 170h insight inputs |
| `GET /api/nutrition/hydration/today` | dashboard data source | unchanged |
| `GET /api/nutrition/hydration/insights` | does NOT exist | NEW Phase 2 endpoint |
| Hydration insight cards on Wellness Analytics > Insights | NOT rendered | NEW Phase 2 surface |
| Bio Optimization Score | hydration registered as 11th source slice with default-neutral output (return null when 170h-driven hydration-component scoring is gated off) | flip `HYDRATION_BIO_SCORE_INPUT_ENABLED=true` once 170h calibrates |

**Phase 1 sets all the data foundations 170h needs.** No Phase 2 migration churn required when it attaches.

---

## Phase 1: Standalone Hydration Tracking

**Mission:** Ship the hydration-as-first-class-signal surfaces that stand alone from the insights engine. Users get visibility, quick-log buttons, personalized targets, and a complete Detail view in the first delivery.

**Owner agent:** Gordon (classification rules + 200-beverage curated test set + NLU augmentation patches); Hannah (UX wireframes for the 7 surfaces); Michelangelo (build)

**Sequencing:** Buildable now. Can ship at-launch or as a post-launch fast-follow in June 2026.

### Phase 1 schema (all append-only)

| Change | Status check |
|---|---|
| `meal_items.hydration_source_kind` enum (9 kinds) + CHECK | NEW |
| `meal_items.hydration_ml NUMERIC(10,2) DEFAULT 0` | NEW |
| `meal_items.portion_volume_ml` | **ALREADY EXISTS from 170 base; verified live earlier. `ADD COLUMN IF NOT EXISTS` is a no-op.** |
| `meals.meal_kind` enum **reduced to two values: `('full_meal', 'hydration_only')`** per pre-build issue #2 | NEW |
| `users.hydration_target_ml_per_day_custom` + `hydration_counting_mode` + `hydration_notifications_enabled` + `hydration_notification_cadence` | NEW (4 cols) |
| `hydration_aggregations_daily` materialized view | NEW |
| `hydration_log_sessions` telemetry table | NEW |
| 5 Helix events (the tracking + engagement set; insights-feedback events deferred to Phase 2) | NEW |

**meal_kind ontology fix:** spec originally proposed `('full_meal', 'hydration_only', 'snack')`. `meals.meal_type` already includes `'snack'` (breakfast/lunch/dinner/snack). Per pre-build issue #2, drop `'snack'` from `meal_kind`. Snack quick-logs continue to use `meal_type='snack'` with `meal_kind='full_meal'`.

### Phase 1 API endpoints (5 of 7)

| Endpoint | Scope |
|---|---|
| `POST /api/nutrition/hydration/quick-log` | Logs a hydration-only meal. Dedup window. |
| `GET /api/nutrition/hydration/today` | Today's summary + events + streak |
| `GET /api/nutrition/hydration/history` | Week + month aggregations |
| `PUT /api/nutrition/hydration/target` | Custom target setter |
| `PUT /api/nutrition/hydration/preferences` | Counting mode + notifications |

`GET /api/nutrition/hydration/insights` deferred to Phase 2.

### Phase 1 UI surfaces (7)

| Surface | Path |
|---|---|
| Dashboard hydration widget (circular ring + 3 quick-log buttons) | `src/app/(app)/(consumer)/dashboard/components/HydrationWidget.tsx` |
| NutriVision tab hydration card (below the 4-button row from 170n) | `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/HydrationCard.tsx` |
| Floating action button (Dashboard + Wellness Analytics) | `src/app/(app)/(consumer)/dashboard/components/HydrationFloatingActionButton.tsx` |
| Hydration Detail view (`/wellness-analytics/hydration`): Today timeline + weekly chart + monthly heatmap + settings link | `src/app/(app)/(consumer)/wellness-analytics/hydration/page.tsx` |
| Hydration edit panel (volume slider + beverage type) | `src/app/(app)/(consumer)/wellness-analytics/hydration/components/HydrationLogEditPanel.tsx` |
| Settings > NutriVision > Hydration (counting mode + custom target + notifications + tutorial replay) | `src/app/(app)/(consumer)/settings/nutrivision/components/HydrationSettingsSection.tsx` |
| First-time tutorial on first widget or card tap | `src/app/(app)/(consumer)/dashboard/components/HydrationFirstTimeTutorial.tsx` |

### Phase 1 composition with shipped prompts

| Composes with | Phase 1 action |
|---|---|
| 170l barcode (shipped 2026-05-30) | Branded beverages auto-populate `hydration_source_kind` from OFF categories. No code change in 170l. |
| 170m Quick Log (shipped 2026-05-31) | **Follow-up patch:** `src/lib/nutrition/quick-log/haiku-system-prompt.ts` v1.0.0 → v1.1.0 adds hydration recognition per §11.6 (a glass of water 240 ml + a cup of coffee 240 ml + a bottle 500 ml + a can 355 ml + a pint 473 ml). PARSER_VERSION rev for telemetry rollover. |
| 170n voice-native (shipped 2026-05-31) | Same: `src/lib/nutrition/voice-native/haiku-system-prompt.ts` v1.0.0 → v1.1.0. Hannah-revised quantifier table from OQ3 stays as-is; the addendum extends Section 7 brand list with bottled water brands and adds hydration source kind to the output schema. |
| 170j voice-edit (shipped 2026-05-30) | Existing `modify_item_portion` + `add_item` + `remove_item` operations handle hydration adjustments. No new operation kinds. |
| 171b BOS caffeine timing (shipped 2026-05-31) | **Hydration as 11th source slice.** Per pre-build issue #3, the `weighted_sum` framing in spec §8.1 is architecturally wrong; the shipped BOS uses 10 Hannah-AI-pipeline source slices (caffeine timing being the 10th). Phase 1 registers hydration as the 11th slice with default-neutral output (returns `null` for the hydration component until 170h calibrates the scoring math in Phase 2). |

### Phase 1 target personalization

| Adjustment | Phase 1 status |
|---|---|
| Body weight × 33 default | ✓ ships |
| 64 oz fallback when body weight absent | ✓ ships |
| Activity multiplier (sedentary 1.0x → intense 1.4x) | **Conditional:** verify the Activity tracking surface exists with sufficient API. If not, file as Phase 1.1 supplement. |
| Climate multiplier (cool 1.0x → hot 1.2x) | ✓ ships when location opt-in; ignored otherwise |
| Pregnancy +300 ml/day | ✓ ships when CAQ Phase 1 pregnancy flag present |
| Lactation +700 ml/day | ✓ ships when CAQ Phase 1 lactation flag present |
| Custom user target (500-6000 ml) | ✓ ships |
| ED safety mode adjusted framing | ✓ ships with feature-flag fallback if 170c not ratified |

### Phase 1 conservative vs adjusted counting

Spec §3.1 nine-kind classification ships in full. Default conservative (pure_water only). Opt-in adjusted (all beverages at ratios 1.00 / 1.00 / 0.85 / 0.90 / 0.80 / 0.95 / 0.50 / 0.95 / variable). Toggle in Settings.

### Phase 1 deduplication

5-minute window per spec §3.4 ships. Env var `HYDRATION_DEDUP_WINDOW_SECONDS` (default 300) for post-launch tuning.

### Phase 1 Helix events (5 of 7)

| Event | Points |
|---|---|
| `hydration_logged` | 1 (capped 10/day) |
| `hydration_target_reached` | 5 |
| `hydration_streak_3_days` | 3 |
| `hydration_streak_7_days` | 5 |
| `hydration_streak_30_days` | 10 |
| `hydration_target_personalized` | 2 |
| `hydration_adjusted_counting_enabled` | 1 |

`pattern_acted_on_hydration_insight` deferred to Phase 2.

### Phase 1 kill switches (4 of 5)

| Switch | Default |
|---|---|
| `HYDRATION_TRACKING_ENABLED` (master) | false until Phase 1 ratifies |
| `HYDRATION_DASHBOARD_WIDGET_ENABLED` | true |
| `HYDRATION_NOTIFICATIONS_ENABLED` | true |
| `HYDRATION_ADJUSTED_COUNTING_ENABLED` | true |
| `HYDRATION_BIO_SCORE_INPUT_ENABLED` | **false** (Phase 2 flip; Gary explicitly enables after 170h-calibrated audit) |

### Phase 1 acceptance criteria (subset of original §21)

Items 1-13 + 16-31 from spec §21 EXCEPT: items 12 (hydration insights from 170h-composed engine), 13 (Bio Optimization Score hydration component contributes) are deferred to Phase 2. Item 14 (ED safety mode) ships with feature-flag fallback.

### Phase 1 path-length estimate

| Step | Days |
|---|---|
| Phase A migrations + 5 Helix events | 1 |
| Source classifier + hydration-ml computer + target personalizer + deduplication checker | 2-3 |
| 5 API endpoints | 1-2 |
| 7 UI surfaces | 3-5 |
| NLU augmentation patches to shipped 170m + 170n (parser v1.0.0 → v1.1.0) | 1-2 |
| Tests + Jeffery pre-launch audit + localhost smoke | 2-3 |
| **Phase 1 total** | **~2-3 weeks of focused build** |

---

## Phase 2: Insights Composition + 170h Integration

**Mission:** Attach hydration as the third co-variate in the 170h pattern engine and calibrate Bio Optimization Score's hydration component scoring.

**Owner agent:** Gordon (insights composition rules + plausibility list extension); Hannah (insight card design for hydration variants); Michelangelo (build); Kelsey (FDA-adapted disclaimer + clinical-claim linter for hydration insights)

**Sequencing:** Blocked on 170h ratification. Buildable when 170h ships (late Q3 2026 earliest given the 30-day data floor + Gordon catalog drafting + 30-user pilot).

### Phase 2 schema (minimal)

No new tables. Phase 1's `meal_items.hydration_source_kind` + `hydration_ml` + `hydration_aggregations_daily` matview are the inputs. Phase 2 may add columns to `analytics_insights` (170h's main table) to tag insight kind as hydration-related; defer that detail to the 170h Blueprint that Phase 2 inherits from.

### Phase 2 API endpoints (2 of 7)

| Endpoint | Scope |
|---|---|
| `GET /api/nutrition/hydration/insights` | Composed with 170h: hydration-symptom + hydration-medication + hydration-trend insights |
| `POST /api/nutrition/hydration/insights/feedback` | Helpful / Not helpful / Dismiss with reason (extends 170h feedback pattern) |

### Phase 2 UI surfaces

- Hydration insight cards on Wellness Analytics > Insights tab (alongside existing 170h insights, distinguished by Droplet icon)
- Inline hydration insight callout at the bottom of the Hydration Detail view (before the Settings link)

### Phase 2 BOS calibration

`HYDRATION_BIO_SCORE_INPUT_ENABLED` flips true. Hydration component output stops being null; computes per the §8.1 formula (60% today's percentage + 30% 7-day average + 10% 30-day variance inverse). Initial weighting 10% of total BOS; Gordon tunes after telemetry.

### Phase 2 composition with 170h

| 170h surface | Phase 2 hydration addition |
|---|---|
| Pattern engine (retrospective weekly batch) | Hydration co-variate enters the pattern detection. New insight types: "Hydration on workout days averages 1.8 L; rest days 1.4 L" (descriptive), "Days with 2+ L of hydration correlate with 30% higher protein target adherence" (cross-pattern) |
| Conflict engine (prospective real-time at meal save) | If user on lithium / specific diuretics / specific chemotherapy with hydration requirement: surface educational nudge per spec §7.2 hydration-medication category |
| Tip engine (catalog-based) | Add ~5 hydration-specific catalog tips ("Cold water can support metabolism", etc.) with PubMed citations |
| Goal engine (retrospective milestone) | Hydration streak goal type added |

### Phase 2 Helix events (2 of 7)

| Event | Points |
|---|---|
| `hydration_insight_shared_with_practitioner` | 3 |
| `pattern_acted_on_hydration_insight` | 2 |

### Phase 2 ED safety mode coordination

Confirm with 170c team (when ratified) that hydration UI adjustments per spec §15 align with the platform-wide safety mode flag. Phase 2 inherits 170h's clinical-claim linter (§13.5) for hydration insight templates.

### Phase 2 acceptance criteria (the deferred items from §21)

Items 12-13 from spec §21:
- Hydration insights from the 170h-composed engine surface on Wellness Analytics > Insights with Droplet icon
- Hydration component contributes to Bio Optimization Score with the calibrated weighting

Plus the practitioner-share-via-170i variant for hydration insights specifically.

### Phase 2 path-length estimate

Once 170h ratifies, Phase 2 is ~1-2 weeks for insights composition + insight card UI + BOS calibration + tests. The bottleneck is 170h, not Phase 2's own scope.

---

## Migration sequencing

| Wave | Files | When |
|---|---|---|
| Phase 1 wave | 7 migrations (meal_items hydration cols + meals.meal_kind 2-value enum + users hydration prefs + aggregations matview + log_sessions telemetry + helix events + nutrition_photo_jobs.analyze_kind which is moot per 170m §11.1 phantom) | Phase 1 ship |
| Phase 2 wave | ≤1 migration (analytics_insights column or row tag for hydration insight kind, defined by 170h Blueprint) | After 170h ratifies |

All append-only. Phase 1 migrations never need rollback for Phase 2 to attach.

---

## Test coverage split

| Test suite | Phase 1 | Phase 2 |
|---|---|---|
| Unit: source-classifier, hydration-ml-computer, target-personalizer, deduplication-checker | ✓ ships | unchanged |
| Unit: insights-composer, bio-score-integrator | stub returning null | ✓ ships |
| Unit: safety-mode-adjuster | ✓ ships (feature-flag fallback if 170c not ratified) | reviewed for 170h coordination |
| Playwright: widget + card + FAB + Detail view + edit + Settings + tutorial + accessibility | ✓ ships | unchanged |
| Integration: end-to-end widget log + meal log with beverage + dedup window + matview refresh + composition with 170m / 170n / 170l / 170j | ✓ ships | unchanged |
| Integration: composition with 170h insights + bio_optimization_score hydration component | stub | ✓ ships |
| Integration: practitioner redaction on hydration | basic in Phase 1 (aggregate + detailed scope split) | extended in Phase 2 for insight share scope |
| Integration: safety-mode hydration adjustments | ✓ ships (feature-flag fallback) | extended |
| Integration: kill-switch hierarchy (5 switches) | 4 switches verified Phase 1; 5th verified in Phase 2 | full |

---

## Issues from the pre-build review (incorporated)

| # | Issue | Phase 1 resolution |
|---|---|---|
| 1 | `portion_volume_ml` already exists on meal_items | Migration uses `ADD COLUMN IF NOT EXISTS` (idempotent; was already in spec text but flagged for clarity) |
| 2 | `meal_kind` overlaps with `meal_type` snack | `meal_kind` reduced to 2 values: `('full_meal', 'hydration_only')` |
| 3 | BOS integration mental model mismatch with shipped 171b | Hydration as 11th source slice (NOT weighted_sum top-level component). Phase 1 registers slice with null output. Phase 2 calibrates. |
| 4 | Activity multiplier dependency | Verify Activity tracking surface exists with sufficient API at Phase 1 Blueprint; if not, file as Phase 1.1 supplement |
| 5 | NLU augmentation requires follow-up commits to shipped 170m + 170n parsers | Phase 1 includes the patches. PARSER_VERSION bump for telemetry rollover. |
| 6 | 7 Helix events review | 5 in Phase 1 (tracking + engagement) + 2 in Phase 2 (insight share + insight act-on). Per-day cap on `hydration_logged` at app layer. |
| 7 | Kill switch stratification | 4 in Phase 1; `HYDRATION_BIO_SCORE_INPUT_ENABLED` defaults false until Phase 2 audit. Verified posture. |
| 8 | Zero new package.json deps | Verified per spec §22. Sixth pre-launch-clean prompt after 170m + 170n + 171b + 170l + 170o Phase 1. |

---

## Decision summary

Phase 1 is the buildable-now portion. Ships ~70% of 170o by surface area (the high-behavioral-value tracking + targets + dashboard surfaces). Phase 2 attaches the 170h-gated ~30% (insights composition + BOS calibration) as a follow-up commit when 170h ratifies in Q3 2026.

This split lets you:

1. **Ship hydration tracking at-launch or as a June post-launch fast-follow** — the surfaces users will engage with most are not blocked on 170h's calendar wait + Gordon catalog drafting + 30-user pilot
2. **Avoid Phase 2 schema migration churn** — Phase 1 lays down all the data foundations 170h needs
3. **Maintain the trivial-data-model claim** — Phase 1 migrations are append-only, 7 files, no destructive ALTERs
4. **Resolve the 8 pre-build issues at Phase 1 build time** — meal_kind ontology fix + BOS 11th-slice fix + activity multiplier dep verification + NLU patches all happen in Phase 1

Hold for explicit instruction on whether to proceed to Phase 1 Blueprint dispatches (Gordon classification + Hannah wireframes + Kelsey FDA disclaimer) or park pending other priorities.
