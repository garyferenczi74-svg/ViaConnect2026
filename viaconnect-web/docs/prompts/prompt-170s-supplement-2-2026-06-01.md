# Prompt 170s-supplement-2: Extended Ranges + Location Dedup + 170r Inline + ZDR Outcomes

**Filed:** 2026-06-01
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Q1 2027 (post-170s Phase 1 ship + at least 60 days adoption telemetry).
**Owner agent:** Gordon (location dedup signal + extended-range Vision API cost monitoring + 170r educational inline triggers during review)
**Build agent:** Michelangelo
**UX agent:** Hannah (extended date range selector + advanced bulk operations + Anthropic ZDR copy revision if pursued)
**Co-owners:** Arnold (extended-range cost telemetry + 170g corpus contribution rollups for 90+ day imports), Kelsey (ZDR enrollment outcomes + privacy copy revision)
**Orchestrator:** Jeffery
**Hard-blocked-by:** 170s Phase 1 SHIPPED + at least 60 days adoption telemetry above baseline
**Soft-blocked-by:** 170r Phase 1 SHIPPED (inline surface composes with Learn content cards); 170c ratification (if not yet completed by Phase 1; supplement-2 absorbs the safety mode opt-in path)

## 0. Summary

Supplement-2 layers on top of 170s Phase 1: extended date ranges (180+ day, all-time, custom range), location-based dedup as 3rd signal (gated on user location permission grant), 170r educational content inline surfaces during review (composes with 170r Phase 1 or supplement-2), advanced bulk operations (multi-select with batch portion adjustment + bulk meal-type re-classification), and outcomes of the Anthropic ZDR enrollment decision per Ask #8 (cleaner privacy copy across all Vision API surfaces).

If 170c was NOT ratified by Phase 1 ship (Ask #1 risk acceptance materialized), supplement-2 absorbs the ED safety mode opt-in path that Phase 1 deferred.

Adds 1 kill switch, 0 Helix events, 0 Edge Function crons. Reuses all 4 Phase 1 tables + 1 column addition.

## 1. What it is

Five expansions of 170s Phase 1:

1. **Extended date ranges**: 60 / 90 / 180 / 365 / all-time + custom date picker options in consent flow Step 3 (Phase 1 limited to 7 / 14 / 30 only)
2. **Location-based dedup signal**: GPS EXIF data used as 3rd dedup signal when user grants location permission (separate from photo library access)
3. **170r educational content inline surfaces**: during review, low-protein meal triggers "Learn about protein timing" inline link; iron-rich meal triggers "Learn about iron absorption"; works the same as 170r Phase 1's existing meal save inline surface
4. **Advanced bulk operations**: multi-select batch portion adjustment (apply portion modifier to selected meals); bulk meal-type re-classification (re-categorize selected meals as breakfast/lunch/dinner/snack)
5. **Anthropic ZDR outcomes per Ask #8**: if ZDR pursued + landed, privacy copy across 170 + 170l + 170p + 170r + 170s updates to cleaner "we do not retain your photos at all; Anthropic does not retain them either under our zero-data-retention agreement"

Plus: if 170c slipped past Phase 1 ship per Ask #1 risk, supplement-2 ships the ED safety mode opt-in path that was deferred.

## 2. Why this matters

Phase 1 ships the foundation bounded to 30-day max range. Supplement-2 unlocks the full range that the strategic value thesis requires (90-day imports = 60 meals, 180-day = 100+ meals, all-time = 200+ meals for active photographers).

Location dedup tightens the dedup signal for restaurant scenarios (multiple users at table) and meal-prep scenarios (different angles of same meal in same kitchen). Adds modest accuracy improvement at the cost of an additional permission grant.

170r inline surfaces during import review close the educational loop: as the user reviews their historical meals, they learn about nutrients prominent in those meals.

Advanced bulk operations reduce review friction for power users importing 100+ meals.

Anthropic ZDR (if pursued) is the strategic privacy posture win: ViaConnect's "we don't store" claim becomes precisely true rather than approximately true.

## 3. Data model

Zero new tables. Three column additions on Phase 1 tables (all idempotent):

```sql
-- Track ZDR enrollment status (cross-prompt; affects all Vision API usage)
ALTER TABLE public.photo_library_imports
  ADD COLUMN IF NOT EXISTS anthropic_zdr_status TEXT
  CHECK (anthropic_zdr_status IN ('enrolled', 'not_enrolled', 'pending')) DEFAULT 'not_enrolled';

-- Activate location dedup column population
-- (column exists Phase 1; supplement-2 starts populating)
-- No DDL change; just runtime population.

-- Track 170r inline surface activation
ALTER TABLE public.photo_library_import_candidates
  ADD COLUMN IF NOT EXISTS r170_inline_card_id UUID
  REFERENCES public.content_cards(id) ON DELETE SET NULL;
```

Phase 1 location columns (`exif_latitude`, `exif_longitude`) ship populated NULL; supplement-2 populates them when user grants location permission.

## 4. Extended date ranges

Phase 1 consent flow Step 3 offered: 7 / 14 / 30 day options. Supplement-2 unlocks the full set:

- Last 30 days (default)
- Last 60 days
- Last 90 days (RECOMMENDED for typical users)
- Last 180 days
- Last 365 days
- All photos in library (with warning if > 5,000 photos in range)
- Custom date range (date picker)

Sample size estimator updates: "Approximately 1,200 photos in this range. We expect 80 to 200 to be food photos."

Cost model scales linearly with range:
- 30-day: ~$0.15-0.25/session (Phase 1)
- 90-day: ~$0.35-0.50/session (canonical estimate from original spec)
- 180-day: ~$0.65-0.95/session
- 365-day: ~$1.20-1.80/session
- All-time (assume 2 years): ~$2.50-4.00/session approaching $5 cap

$5 per-session cost cap remains; users with very large libraries may hit cap and run multi-day import series.

## 5. Location-based dedup (3rd signal)

Per spec §5.2 (original). Phase 1 ships 2-signal (temporal + pHash); supplement-2 adds GPS EXIF as 3rd signal:

- 50-meter radius via Haversine distance computation
- Only computed when photo carries GPS EXIF data
- Only used when user has granted location permission (separate from photo library access)
- If location permission denied: signal ignored, falls back to 2-signal Phase 1 behavior

Group formed when 3 of 3 signals agree (more conservative than Phase 1's 2 of 2 with location).

UX additions in supplement-2:
- New consent flow Step 3.5: "Use photo location data for better deduplication?" (Yes / No / Tell me more)
- Settings > Photo Library Import: "Use location data when available" toggle

Per Concern §16.4 (memorial): location data NEVER stored persistently. Used during dedup computation only. Cleared from `photo_library_import_candidates` after dedup completes.

## 6. 170r educational content inline surfaces

Composes with 170r Phase 1 (which ships at Dec 2026 - Jan 2027 per 170r Phase 1 spec). 170s supplement-2 builds on top.

During the review surface (Phase 1's Stage 5):
- Low-protein meal detected → "Learn about protein timing" inline link with chevron CTA
- High-iron meal + user's CAQ Phase 4 iron flag → "Learn about iron absorption" link
- Bioavailability bridge-relevant meal (mineral-rich, fat-soluble vitamin rich, etc.) → relevant bioavailability card link

Implementation pattern matches 170r Phase 1 meal save inline surface architecture (calls `getCardsForSuggestion()` with `context='import_review'` + `meal_canonical_names`).

Capped at 5 inline surfaces per import session to avoid overwhelming. User can dismiss inline; dismissal persists per (user, content card) for 30 days.

## 7. Advanced bulk operations

Three new bulk affordances in review surface:

1. **Bulk portion adjustment**: multi-select photos + apply portion modifier (small / medium / large / 1.5x / 2x) to all selected meals. Useful when user realizes their portion estimates trend low across the batch.

2. **Bulk meal-type re-classification**: multi-select photos + re-categorize selected meals as breakfast / lunch / dinner / snack. Useful for users who didn't capture the meal-type cleanly in the original review.

3. **Bulk cuisine tagging**: multi-select photos + apply cuisine tag (per 170f recipe cuisine vocabulary). Useful for 170h corpus contribution + future 170q meal planning.

UX: long-press multi-select pattern (familiar from iOS/Android photo galleries) + floating bulk action bar at bottom.

## 8. Anthropic ZDR enrollment outcomes (per Ask #8)

If Ask #8 ratifies "Pursue ZDR enrollment for all Vision API usage":

- Privacy copy across 170 + 170l + 170p + 170r + 170s updates to: "We do not retain your photos. Anthropic, our analysis provider, also does not retain them under our zero-data-retention agreement."
- ZDR enrollment status tracked per session in `photo_library_imports.anthropic_zdr_status`
- Pre-launch verification: all Vision API calls confirmed under ZDR account
- 170s supplement-2 audit gate: ZDR coverage confirmed before flag flip

If Ask #8 ratifies "Don't pursue ZDR" or defers:

- Privacy copy preserved from Phase 1 (precise "we do not permanently retain" framing)
- Cross-prompt privacy posture unchanged
- Future re-evaluation possible at 170t or later

## 9. 170c ratification status absorption

Phase 1 risk acceptance per Ask #1: 170c calendared for Q3 2026 ratification before Phase 1 build start. If that commitment held: Phase 1 ships ED safety mode opt-in path.

If 170c slipped past Phase 1 ship:
- Phase 1 shipped with `PHOTO_LIBRARY_IMPORT_SAFETY_MODE_OPT_IN_ENABLED=false` + flag-on path TBD
- Supplement-2 absorbs the ED safety mode opt-in path implementation
- Phase 1 risk-accepted users (non-safety-mode) get Phase 1 unchanged
- Safety-mode users get the feature unlocked in supplement-2 when 170c ratifies

This is the supplement-2 contingency posture per Ask #1 risk acceptance.

## 10. API surface

Supplement-2 adds 1 route:

| Method | Route | Purpose |
|---|---|---|
| PATCH | `/api/photo-library-import/[id]/bulk-update` | Apply bulk portion / meal-type / cuisine update to selected candidate_ids |

Plus extends Phase 1's consent flow to support extended date ranges + location permission negotiation.

## 11. Kill switches

Supplement-2 adds 1:

1. `PHOTO_LIBRARY_IMPORT_LOCATION_DEDUP_ENABLED` (gates 3rd dedup signal)

Phase 1 retained 7 switches. Combined post-supplement-2 ship: 8 switches.

## 12. Composition

### 12.1 With 170s Phase 1

Reuses 4 tables + relevance scoring engine + classifier + review surface + Vercel Pro 300s function. Adds extended ranges + location dedup + 170r inline + advanced bulk + ZDR outcomes + 170c absorption if needed.

### 12.2 With 170c

If 170c ratified by Phase 1: composes ED safety mode opt-in at Phase 1.
If 170c slipped past Phase 1: supplement-2 absorbs ED safety mode opt-in path.

### 12.3 With 170r Phase 1 (educational content)

Inline surfaces during review compose with 170r's `getCardsForSuggestion` contract. 170r Phase 1 has shipped this contract; supplement-2 wires the import review context as a new caller.

### 12.4 With 170g (corpus)

Extended-range imports (180+ days) generate higher corpus contribution per user. Arnold rollup tracks `corpus_contribution_by_range` for 170g training data quality.

### 12.5 With 170h (insights)

Extended-range imports unlock additional insight categories (90+ days enables seasonality patterns + weekday/weekend baseline differentiation + month-over-month progression).

## 13. Phasing within supplement-2

| Slice | Engineer-weeks |
|---|---|
| 13.A Extended date range UX + cost cap revision | 1.5 |
| 13.B Location dedup signal (3rd signal) | 1.5 |
| 13.C 170r educational inline surfaces during review (composes with 170r Phase 1) | 1 |
| 13.D Advanced bulk operations (multi-select + portion + meal-type + cuisine) | 2 |
| 13.E ZDR enrollment outcomes (if pursued): copy revision + verification | 0.5 (conditional) |
| 13.F 170c safety mode absorption (if Phase 1 deferred): full opt-in flow + macros/calories hidden + reduced cap + non-numeric summary | 2 (conditional) |
| 13.G Audit + smoke + ratification | 1.5 |
| **Total engineering** | **8-10 weeks** (depends on conditional 13.E + 13.F) |

With 2 engineers in parallel: ~5-7 calendar weeks engineering. Gordon test set extension (for extended-range cost validation) span 4-6 weeks parallel.

Optimistic ship target: Q3 2027 (Blueprint Q1 2027, build Q2 2027, content authoring Q2 parallel, ship Q3 2027).

## 14. Acceptance criteria

1. Extended date range options render in consent flow Step 3 (7 / 14 / 30 from Phase 1 plus 60 / 90 / 180 / 365 / all-time / custom from supplement-2).
2. Cost cap $5 enforced at all range tiers; warning shown when projected cost > $3.
3. Location dedup signal works when location permission granted; ignored gracefully when denied.
4. Location data cleared from `photo_library_import_candidates` after dedup completes (verified via DB inspection).
5. 170r educational inline surfaces fire during review when triggers met; cap 5 per session; dismissal persists 30 days.
6. Advanced bulk operations: multi-select + portion adjustment + meal-type re-classification + cuisine tagging all functional.
7. If Ask #8 ZDR pursued: privacy copy updated across 170 + 170l + 170p + 170r + 170s; ZDR enrollment status tracked + verified.
8. If 170c was deferred past Phase 1: full ED safety mode opt-in path shipped per Phase 1 §10 acceptance criteria.
9. 1 new kill switch functions correctly.
10. 1 new API route operational with auth + Zod + feature-flag 503.
11. Practitioner test account: no change in visibility for supplement-2 features (same Phase 1 redaction matrix).
12. Hard rules per Phase 1 §17 reaffirmed.

## 15. Open questions for Blueprint

| # | Question | Recommendation |
|---|---|---|
| Q1 | Extended range default: 90-day vs. 30-day to match Phase 1 default | 90-day default per spec §15.1; Phase 1 telemetry informs |
| Q2 | Location dedup permission timing: same flow as photo library OR separate later flow | Separate later flow; lower stakes; opt-in friction lower |
| Q3 | Anthropic ZDR enrollment outcome status at Blueprint | Kelsey reports outcome of Ask #8 decision; supplement-2 plans accordingly |
| Q4 | If 170c not ratified by Phase 1 ship: supplement-2 absorbs OR a separate supplement-2.1 handles? | supplement-2 absorbs (combined Q1 2027 ship) for efficiency |
| Q5 | Bulk portion adjustment granularity: 5 options (sm/md/lg/1.5x/2x) or finer? | 5 options per spec; finer added if Phase 1 telemetry shows demand |
| Q6 | 170r inline cap of 5 per session: too tight or right? | 5 cap aligned with 170r Phase 1 frequency cap pattern; review at supplement-2 ratification |
| Q7 | Cuisine tagging vocabulary: reuse 170f recipe cuisine_tags or independent | Reuse 170f vocabulary verbatim |
| Q8 | Multi-select gesture: long-press only or also checkbox toggle | Both (long-press for native feel + checkboxes for keyboard accessibility) |

## 16. Filed-not-built reaffirmation

Filed 2026-06-01. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Q1 2027 contingent on:
1. 170s Phase 1 SHIPPED with at least 60 days adoption telemetry above baseline
2. 170r Phase 1 SHIPPED (for inline surfaces composition)
3. Ask #8 ZDR decision resolved
4. 170c ratification status known (determines whether supplement-2 absorbs safety mode opt-in)

## 17. Related

- `prompt-170s-filed-2026-06-01.md` (original placeholder + architectural review)
- `prompt-170s-phase-1-spec-2026-06-01.md` (Phase 1 hard prerequisite)
- `project_prompt_170s_filed.md` (memorial)
- `project_prompt_170c_filed.md` (170c ratification absorbed if Phase 1 deferred)
- `project_prompt_170r_filed.md` (170r inline surface composition)
- `project_prompt_170g_filed.md` (extended-range corpus contribution)
- `project_prompt_170h_filed.md` (extended-range insight unlocks)
- `project_prompt_170p_phase_split.md` (analogous phase split precedent)
- `feedback_permanent_protections.md` (package.json lock; supplement-2 adds no new deps)
- `feedback_jeffery_pre_launch_review.md` (audit gate)
