# Prompt 170s Phase 1: Photo Library Historical Import Foundation

**Filed:** 2026-06-01 (launch +0)
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Sep 2026 (post-launch + 60 days) contingent on 170c ratification committed to Q3 2026 per Ask #1.
**Supersedes:** Monolithic single-phase framing of original spec per Option B ratification 2026-06-01.
**Owner agent:** Gordon (food-vs-non-food pre-classifier system prompt + 1000-photo curated test set + basic dedup thresholds)
**Build agent:** Michelangelo
**UX agent:** Hannah (post-FULL-CAQ onboarding offer + 5-step consent flow + review surface + accessibility)
**Co-owners:** Arnold (per-import cost monitoring + corpus contribution telemetry), Kelsey (privacy copy review at Blueprint + ED safety mode opt-in path validation when 170c ratified)
**Orchestrator:** Jeffery
**Hard-blocked-by:** 170c ratification (calendared Q3 2026 per Ask #1)
**Hard-blocked-by:** Capacitor photo library plugin selection + security review (Blueprint formal evaluation per Ask #2)
**Soft-dep:** 170 base in stable production with 60+ days telemetry (already met by launch + adoption)
**Provides for supplement-2:** Schema + plugin + pre-classifier + basic dedup + review surface; supplement-2 layers extended ranges + location dedup + 170r inline + advanced bulk

## 0. Summary

Phase 1 ships the smallest shippable photo library historical import: 5-stage pipeline (permission + pre-classifier + basic dedup + batch process + review-and-confirm) bounded to 30-day max import range, with EXIF capture dates preserved as `meals.captured_at`. New user opt-in is offered AFTER full CAQ completion (post-CAQ Phase 5+ per Ask #3) so safety mode determination is final before any import.

Four new Supabase tables (full schema; supplement-2 adds zero tables), 5 Helix events, 7 kill switches, 7 admin rollups, 1 new Vercel Pro 300s function. The Capacitor photo library plugin is the only new package.json dependency in the post-launch 170-series; selection deferred to Phase 1 Blueprint formal evaluation with explicit Gary approval (per Ask #2 + `[[feedback_permanent_protections]]`).

Headline value metric at +90 days post-Phase-1-ship: photo_library_import_meals_per_completed_session_average above 30 sustained.
Headline privacy metric: photo_library_import_preclassifier_false_positive_rate below 5% sustained.

## 1. What it is

Phase 1 ships:

1. **Permission flow**: 5-step consent flow + native platform permission dialog (iOS PHPickerViewController limited-mode + all-photos; Android 13+ Photo Picker)
2. **Pre-classifier**: Anthropic Vision food-vs-non-food classifier on 512x512 downsampled images at ~$0.0005/photo
3. **Basic deduplication**: 2 signals (temporal 5min window + pHash 10/64 bits threshold)
4. **Batch processing**: Vercel Pro 300s timeout function processing 60 photos × 2-5s each comfortably within window
5. **Review + confirm**: per-photo review surface with "From historical import" chip + EXIF capture date preserved as `meals.captured_at`
6. **Onboarding integration**: offer surfaces AFTER full CAQ completion (post-Phase 5) per Ask #3
7. **Settings entry**: `/settings/photo-library-import` access any time post-onboarding
8. **ED safety mode opt-in path**: gated on 170c ratification (committed Q3 2026 per Ask #1)
9. **30-day draft TTL** with day-7 "are you still planning to review?" notification per Ask #6

Phase 1 does NOT ship (filed for 170s-supplement-2):
- Extended date ranges (180+ day, all-time, custom)
- Location-based dedup (3rd signal via GPS EXIF when user grants location permission)
- 170r educational content inline surfaces during review
- Advanced bulk operations (multi-select batch portion adjustment + bulk meal-type re-classify)
- Anthropic ZDR enrollment cleaner privacy copy
- Multi-photo best-of-N (170d gated)

## 2. Why this matters at Phase 1

Three strategic claims independent of supplement-2:

1. **Onboarding stickiness ships at Phase 1.** New users who complete full CAQ get the 170s offer; opt-in cohort gains 30 days of historical meal depth in a single session. Phase 1 ratification gate measures retention impact vs. control.
2. **Corpus contribution starts at Phase 1.** Every imported meal carries `data_source='photo_library_import'` + `user_confirmed_label=true` + `exif_capture_date_verified=true` — exceptionally high-value 170g training rows from day one.
3. **170h immediate insight unlock for new users.** A new user with 30 days of imported meals has statistical sample size for many insight categories on day 1; 170h ships meaningful insights immediately when 170h ships.

Bounded to 30-day max range in Phase 1 because:
- Reduces single-session cost ($0.15-0.25 typical vs. $0.35-0.50 for 90-day)
- Faster end-to-end processing (60s-120s typical vs. 90-300s)
- Lower drop-off in the 8-9 step consent funnel
- Empirical adoption data informs supplement-2's extended-range UX

Supplement-2 extends to 90+ day ranges based on Phase 1 adoption telemetry.

## 3. Data model

Four tables, all append-only migrations. Full Phase 2-ready schema; supplement-2 adds zero tables (only column additions per 170c ratification + location dedup).

### 3.1 `photo_library_imports`

```sql
CREATE TABLE IF NOT EXISTS public.photo_library_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_window_start_date DATE NOT NULL,
  import_window_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'permission_pending' CHECK (status IN (
    'permission_pending', 'permission_granted', 'scanning',
    'pre_classifying', 'deduplicating', 'batch_processing',
    'awaiting_review', 'review_in_progress', 'completed',
    'abandoned', 'permission_revoked')),
  photos_scanned_count INT NOT NULL DEFAULT 0,
  photos_classified_food_count INT NOT NULL DEFAULT 0,
  photos_classified_uncertain_count INT NOT NULL DEFAULT 0,
  photos_classified_non_food_count INT NOT NULL DEFAULT 0,
  dedup_groups_count INT NOT NULL DEFAULT 0,
  representative_photos_processed_count INT NOT NULL DEFAULT 0,
  meals_imported_count INT NOT NULL DEFAULT 0,
  meals_skipped_count INT NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(8,4),
  permission_grant_method TEXT CHECK (permission_grant_method IN (
    'all_photos', 'selected_photos', 'denied', 'revoked_mid_session')),
  safety_mode_user BOOLEAN NOT NULL DEFAULT FALSE,
  draft_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_photo_library_imports_user_status
  ON public.photo_library_imports(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_library_imports_active
  ON public.photo_library_imports(user_id)
  WHERE status IN ('scanning','pre_classifying','deduplicating',
                   'batch_processing','awaiting_review','review_in_progress');
CREATE INDEX IF NOT EXISTS idx_photo_library_imports_draft_reminder
  ON public.photo_library_imports(updated_at) WHERE status = 'awaiting_review';

ALTER TABLE public.photo_library_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_library_imports_owner_all" ON public.photo_library_imports;
CREATE POLICY "photo_library_imports_owner_all"
  ON public.photo_library_imports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS photo_library_imports_updated_at ON public.photo_library_imports;
CREATE TRIGGER photo_library_imports_updated_at
  BEFORE UPDATE ON public.photo_library_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

`draft_reminder_sent_at` added vs. original spec to track the day-7 notification per Ask #6.

### 3.2 `photo_library_import_candidates`

```sql
CREATE TABLE IF NOT EXISTS public.photo_library_import_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.photo_library_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_photo_identifier TEXT NOT NULL,
  exif_capture_date_local TIMESTAMP,
  exif_capture_date_utc TIMESTAMPTZ,
  exif_timezone_offset_minutes INT,
  exif_latitude NUMERIC(10,7),
  exif_longitude NUMERIC(10,7),
  phash_64 BIGINT,
  preclassifier_result TEXT CHECK (preclassifier_result IN (
    'food', 'non_food', 'uncertain', 'not_classified')),
  preclassifier_confidence NUMERIC(5,4),
  preclassifier_rationale TEXT,
  dedup_group_id UUID,
  is_representative_of_group BOOLEAN NOT NULL DEFAULT FALSE,
  vision_job_id UUID,
  user_action TEXT CHECK (user_action IN (
    'pending', 'imported', 'skipped', 'rejected', 'retry_requested')),
  meal_id UUID REFERENCES public.meals(meal_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_photo_library_candidates_import_status
  ON public.photo_library_import_candidates(import_id, user_action);
CREATE INDEX IF NOT EXISTS idx_photo_library_candidates_dedup
  ON public.photo_library_import_candidates(import_id, dedup_group_id);

ALTER TABLE public.photo_library_import_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_library_candidates_owner_all" ON public.photo_library_import_candidates;
CREATE POLICY "photo_library_candidates_owner_all"
  ON public.photo_library_import_candidates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

`local_photo_identifier` is the iOS PHAsset localIdentifier OR Android MediaStore ID. Meaningful only on device. `exif_latitude` + `exif_longitude` columns ship Phase 1 but are populated ONLY in supplement-2 when location dedup activates (Phase 1 ignores GPS entirely).

`vision_job_id` references the nutrition_photo_jobs table (170 base infrastructure) when full vision analysis runs.

### 3.3 `photo_library_import_dedup_groups`

```sql
CREATE TABLE IF NOT EXISTS public.photo_library_import_dedup_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.photo_library_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  representative_candidate_id UUID NOT NULL REFERENCES public.photo_library_import_candidates(id) ON DELETE CASCADE,
  group_size INT NOT NULL,
  group_signal_temporal BOOLEAN NOT NULL DEFAULT FALSE,
  group_signal_phash BOOLEAN NOT NULL DEFAULT FALSE,
  group_signal_location BOOLEAN NOT NULL DEFAULT FALSE,
  group_confidence NUMERIC(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_library_dedup_groups_import
  ON public.photo_library_import_dedup_groups(import_id);

ALTER TABLE public.photo_library_import_dedup_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dedup_groups_owner_all" ON public.photo_library_import_dedup_groups;
CREATE POLICY "dedup_groups_owner_all"
  ON public.photo_library_import_dedup_groups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

`group_signal_location` ships Phase 1 but is always FALSE; supplement-2 wires it in when location dedup activates.

### 3.4 `photo_library_import_telemetry_sessions` (sampled)

```sql
CREATE TABLE IF NOT EXISTS public.photo_library_import_telemetry_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  import_id UUID REFERENCES public.photo_library_imports(id) ON DELETE SET NULL,
  permission_grant_outcome TEXT NOT NULL CHECK (permission_grant_outcome IN (
    'all', 'limited', 'denied', 'revoked_mid_session')),
  photos_in_library_count INT,
  photos_in_window_count INT,
  preclassifier_calls_count INT,
  preclassifier_calls_cost_usd NUMERIC(8,4),
  full_vision_calls_count INT,
  full_vision_calls_cost_usd NUMERIC(8,4),
  total_cost_usd NUMERIC(8,4),
  total_session_duration_seconds INT,
  user_finished_review BOOLEAN,
  user_imported_count INT,
  user_skipped_count INT,
  user_safety_mode_status TEXT,
  device_kind TEXT,
  capacitor_plugin_version TEXT,
  consent_step_drop_off INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_created
  ON public.photo_library_import_telemetry_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_outcome
  ON public.photo_library_import_telemetry_sessions(permission_grant_outcome);

ALTER TABLE public.photo_library_import_telemetry_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telemetry_sessions_service_role_only" ON public.photo_library_import_telemetry_sessions;
CREATE POLICY "telemetry_sessions_service_role_only"
  ON public.photo_library_import_telemetry_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

Sampled at 50% Phase 1 first 90 days (per spec §11.4 for privacy-sensitive feature visibility). Drops to 20% after parser stabilization. `consent_step_drop_off` added vs. spec to measure Concern §7 funnel completion rate.

### 3.5 nutrition_photo_jobs.analyze_kind extension

Per spec §11.5; CHECK reconstitution per `[[project_local_vs_live_migrations_drift]]` exception precedent:

```sql
ALTER TYPE public.nutrition_photo_jobs_analyze_kind ADD VALUE IF NOT EXISTS 'photo_library_import_preclassify';
ALTER TYPE public.nutrition_photo_jobs_analyze_kind ADD VALUE IF NOT EXISTS 'photo_library_import_analysis';
ALTER TYPE public.nutrition_photo_jobs_analyze_kind ADD VALUE IF NOT EXISTS 'photo_library_import_committed';
```

If the enum doesn't exist on live (170a/170a-supplement may have used CHECK constraints per past 170-series experience), Phase A migration uses CHECK reconstitution instead.

## 4. Pre-classifier + Anthropic Vision API integration

### 4.1 System prompt (Gordon long-pole)

Spec §4.2 verbatim system prompt as the starting point. Gordon iterates against 1,000-photo curated test set at Phase 1 Blueprint (estimated 150-200hr authoring + 30-60hr test set construction per Concern §3).

Phase 1 Blueprint deliverable: `docs/prompts/prompt-170s-phase-1-classifier-system-prompt-draft-YYYY-MM-DD.md` with Gordon's iterated prompt + edge case decisions per Concern §17 (food prep + packaging + partial frames + multi-meal photos).

### 4.2 Classification call shape

```typescript
interface ClassificationRequest {
  image_base64: string;  // 512x512 downsampled
  exif_metadata: {
    capture_date_local?: string;
    capture_date_utc?: string;
    timezone_offset_minutes?: number;
  };
}

interface ClassificationResponse {
  is_food_photo: 'true' | 'false' | 'uncertain';
  confidence: number;  // 0.0 to 1.0
  rationale_brief: string;  // one sentence
}
```

Pre-classifier per-call cost: ~$0.0005. Latency p50 < 800ms; p99 < 1500ms.

### 4.3 Uncertain bucket handling

Per spec §4.3: uncertain photos are NOT auto-sent to full analysis + NOT auto-discarded. They surface in a separate "Uncertain" review tab during Stage 5 where user manually marks each as "analyze this" or "skip."

### 4.4 Accuracy targets (validated at Phase 1.E ratification)

Per spec §17.1 on Gordon's 1,000-photo curated test set:
- True positive rate (food correctly classified): ≥ 92%
- True negative rate (non-food correctly classified): ≥ 95%
- False positive rate (non-food → food, privacy-critical): ≤ 5%
- False negative rate (food → non-food): ≤ 8%
- Uncertain rate: 5-15%

The 5% FP cap is the privacy-critical metric. Below 5% allows feature to flag-on; above blocks Phase 1.E ratification.

## 5. Basic deduplication (Phase 1)

Two signals only in Phase 1 (location deferred to supplement-2):

1. **Temporal proximity**: photos taken within 5min window (env-tunable `PHOTO_IMPORT_DEDUP_TIME_WINDOW_MINUTES`)
2. **Perceptual hash similarity**: pHash distance < 10/64 bits (env-tunable `PHOTO_IMPORT_PHASH_SIMILARITY_THRESHOLD`)

Group formed when both signals agree. Conservative grouping (prefers separate over false-merge). Test set: 200 photo groups with ground truth at Phase 1.E ratification per spec §17.2.

pHash implementation: pure JS dHash 64-bit. No new dependencies. Computed client-side on 512x512 downsampled image (cached from pre-classifier step). 5-15s for 60 photos on typical mobile device.

Representative photo selection per group: highest pre-classifier confidence + Laplacian-variance focus score + highest EXIF resolution.

## 6. Batch processing on Vercel Pro 300s function (per Ask #5)

Phase 1 background worker uses Vercel Pro 300s timeout function (`api/photo-library-import/[id]/batch-worker`). At 2-5s per photo × 30 dedupe group representatives = 60-150s total — comfortable within 300s budget.

Batch flow:
1. User confirms selected dedupe groups in Stage 4 review.
2. Client POSTs candidate_ids to `/api/photo-library-import/[id]/batch-analyze`.
3. Server inserts batch job record + starts Vercel function (HTTP invocation; not Vercel Cron).
4. Function processes each photo sequentially through standard 170 pipeline + cascade resolution + draft `nutrition_photo_jobs` record.
5. Drafts accumulate in pending state (NOT auto-saved to `meals` until user confirms in Stage 5).
6. Progress emitted via Server-Sent Events to client OR client polls `/api/photo-library-import/[id]/status`.

If batch exceeds 300s (rare; Phase 1 is bounded to 30 dedupe groups max so unlikely):
- Function returns "more batches needed" + saves progress to DB
- Client invokes follow-up batch with continuation token
- Each follow-up has its own 300s budget

Cost cap per session: $5 enforced via running cost tracking in `photo_library_imports.total_cost_usd`; pauses + notifies if approached.

Phase 1 rate limits:
- Max 1 import session per user per day
- Max 200 photos pre-classified per session
- Max 30 dedupe groups submitted for full analysis per session (smaller than spec's 100 due to 30-day range)

## 7. EXIF date preservation

Per spec §7.

`meals.captured_at` is the load-bearing field. Phase 1 implementation:
- Capacitor plugin extracts `DateTimeOriginal` + `OffsetTimeOriginal` from EXIF
- Server validates against import window (rejects out-of-window dates)
- UTC conversion via plugin-reported timezone or fallback to user's current timezone
- Missing EXIF → fallback to `DateTime` → `DateTimeDigitized` → file system modification date → user manual entry

Per Concern §5, 15-25% of photos likely require user manual date entry. Phase 1 UX includes batch date input affordance: "These 12 photos all need dates. Pick a range that applies to all?" reducing friction for screenshot-imported or social-media-uploaded photos.

100% EXIF date preservation accuracy is a HARD requirement; photos with no recoverable date and no user-provided date are dropped from import.

## 8. 5-step consent flow + post-FULL-CAQ onboarding (per Ask #3)

### 8.1 Onboarding offer surface

Per Ask #3: offer surfaces AFTER full CAQ completion (post-Phase 5+). New post-onboarding screen between CAQ Phase 5 completion + first Dashboard load:

"Got food photos already? Import them as your meal history."

Two CTAs: "Import photos" (Teal primary) OR "Skip for now" (text style). Skip persists in `pantry_user_preferences`-style settings row; user can re-trigger from `/settings/photo-library-import` any time.

### 8.2 5-step consent flow

Per spec §3.1:

1. **Feature introduction** ("Tell me more" / "Skip")
2. **What gets scanned** (privacy explanation; non-food filter explanation)
3. **Date range selection** — Phase 1 OPTIONS LIMITED: Last 7 days / Last 14 days / Last 30 days (recommended default). Custom + 60/90/180/all-time deferred to supplement-2.
4. **Native platform permission request** (iOS PHPickerViewController limited-mode OR all-photos; Android Photo Picker 13+ OR READ_MEDIA_IMAGES 11-12)
5. **Privacy summary + final confirmation** (per Ask #4 precise copy: "We do not permanently retain your photos. They are transmitted to Anthropic for analysis only and discarded by ViaConnect immediately after.")

Step 3 reduced to 3 range options in Phase 1 because 30-day bound is the Phase 1 scope cap. Supplement-2 unlocks the full 6-option range selector.

### 8.3 Permission grant outcomes

- **All photos**: full library access within selected range
- **Selected photos**: iOS limited-access subset OR Android Photo Picker subset; user pre-filters before granting; highest-privacy path
- **Denied**: import flow exits gracefully with "No problem. You can still log meals using the standard photo capture entry path."

Permission is NOT retained across sessions (spec §3.3). Each new import requires fresh grant. Capacitor plugin programmatically revokes after session completes.

## 9. Review surface + per-photo detail + bulk import

### 9.1 Review surface (Stage 5)

Per spec §8.1. Layout:
- Header: "Review your historical meals. {N} ready to import."
- Filter bar: All / High confidence / Medium confidence / Low confidence / Uncertain (from pre-classifier) / Could not analyze
- Photo grid: thumbnails sorted by capture date (most recent first; sortable)
- Per-photo quick actions: Import / Skip without opening detail
- Bulk actions footer: "Import all selected" (Teal primary) / "Skip all" / "Save and finish later"

### 9.2 Per-photo detail view

Tapping a photo opens the standard Prompt 170 result review screen with:
- Photo thumbnail at top
- Parsed `meal_items` with portion adjustments + modifier chips + cooking method selectors
- "From historical import" chip (parallel to 170m/170n "From Quick Log" + "From Voice log")
- Capture date displayed: "Eaten on {EXIF_date} at {EXIF_time}"
- "Adjust date" affordance if EXIF appears wrong

Save commits meal with EXIF-derived `captured_at`. Edit flow identical to standard 170 review.

### 9.3 Bulk confirmation safety rail

Per spec §8.3: bulk import of >20 photos with avg confidence < 0.65 triggers confirmation dialog ("Many of these photos analyzed with low confidence. Confirm you want to import all as-is?"). Prevents accidental bulk import of blurry photos.

### 9.4 "Save and finish later" — 30-day TTL with day-7 notification (per Ask #6)

Per Ask #6 Option C compromise: drafts persist 30 days but day-7 in-app notification + day-14 push notification (if granted) prompt user to finish review. Avoids orphan analysis cost without forcing too-tight TTL.

Auto-discard at day 30 with notification: "We discarded {N} unconfirmed historical photo meals from your import on {date}. You can re-import any time."

## 10. ED safety mode opt-in (gated on 170c ratification per Ask #1)

170c is calendared for Q3 2026 ratification per Ask #1. Phase 1 build kickoff in Sep 2026 should align with 170c ratification + Phase 1.E ship gate (Dec 2026) clearly post-170c.

If 170c IS ratified at Phase 1 build start:
- ED safety mode users see the 170s feature HIDDEN by default in Settings
- Opt-in path exists with additional consent friction per spec §10.2
- If user opts in despite safety mode:
  - Macros HIDDEN during review
  - Calorie totals HIDDEN during review
  - Bulk import cap reduced to 30 photos per session
  - Post-import summary uses non-numeric framing
  - 170h insights respect safety mode framing

If 170c slips past Phase 1 build start (RISK per Ask #1 commit):
- Phase 1 cannot ship safely per spec §0 + §10 non-negotiable
- Phase 1 ship date slips correspondingly
- Alternative: 170s Phase 1 ships with feature flag PHOTO_LIBRARY_IMPORT_ENABLED=false until 170c ratifies

`PHOTO_LIBRARY_IMPORT_SAFETY_MODE_OPT_IN_ENABLED` (default false) kill switch gates whether safety-mode users can opt in at all per spec §10.5.

## 11. API surface

Phase 1 ships 9 routes under `/api/photo-library-import/*`. All gated by `PHOTO_LIBRARY_IMPORT_ENABLED` master server flag + `NEXT_PUBLIC_PHOTO_LIBRARY_IMPORT_ENABLED` client gate per 170f / 170p / 170r precedent.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/photo-library-import/start` | Initialize import session |
| POST | `/api/photo-library-import/[id]/preclassify` | Submit batch of photos for classification |
| POST | `/api/photo-library-import/[id]/dedup-compute` | Compute dedup groups from food-classified candidates |
| POST | `/api/photo-library-import/[id]/batch-analyze` | Submit selected dedup representatives for full analysis |
| GET | `/api/photo-library-import/[id]/status` | Poll session status + progress |
| POST | `/api/photo-library-import/[id]/candidates/[cand_id]/review` | Record per-photo user action |
| POST | `/api/photo-library-import/[id]/bulk-review` | Record bulk review action |
| POST | `/api/photo-library-import/[id]/cancel` | User cancels session |
| POST | `/api/photo-library-import/[id]/finish` | User finishes review session |

Plus the Vercel Pro 300s batch worker function: `/api/photo-library-import/[id]/batch-worker`.

All routes follow established 170f / 170p / 170r auth + admin client + Zod safeParse + feature-flag 503 pattern.

## 12. Helix events

Phase 1 ships all 5 Helix events from spec §11.6.

| Event | Points | Cap | Trigger |
|---|---|---|---|
| `historical_photo_import_started` | 2 | 1/day | User starts an import session |
| `historical_photo_import_completed` | 10 | 1 LIFETIME | User completes a session with at least 1 meal imported. HEADLINE onboarding milestone. |
| `historical_photo_meal_reviewed` | 1 | 50/session | User reviewed an individual meal during import |
| `historical_photo_bulk_imported` | 5 | 5/session | User bulk-imports multiple meals at once |
| `historical_photo_import_completed_safety_mode` | 5 | 1 LIFETIME | User completes a session while in 170c safety mode; smaller reward consistent with safety framing |

Maximum daily Helix earn from 170s: 2 + occasional one-time 10 + 50 + 25 = ~75-87 for first-time importers; ~50 for return users.

## 13. Kill switches

Seven kill switches per spec §15.4:

1. `PHOTO_LIBRARY_IMPORT_ENABLED` (master server) + `NEXT_PUBLIC_PHOTO_LIBRARY_IMPORT_ENABLED` (master client)
2. `PHOTO_LIBRARY_IMPORT_ONBOARDING_OFFER_ENABLED` (gates post-CAQ onboarding offer; Settings-only fallback)
3. `PHOTO_LIBRARY_IMPORT_PRECLASSIFIER_ENABLED` (if false, feature returns to standard photo capture)
4. `PHOTO_LIBRARY_IMPORT_DEDUP_ENABLED` (if false, all food photos analyzed individually)
5. `PHOTO_LIBRARY_IMPORT_SAFETY_MODE_OPT_IN_ENABLED` (gates 170c safety-mode user opt-in)
6. `PHOTO_LIBRARY_IMPORT_BULK_REVIEW_ENABLED` (gates bulk-review affordances)
7. `PHOTO_LIBRARY_IMPORT_DAILY_SESSION_LIMIT_ENFORCED` (gates 1-per-day rate limit)

## 14. Composition

### 14.1 With 170 base + cascade

Imported meals go through standard Prompt 170 meal save path. Only differentiator: `analyze_kind` value (`photo_library_import_committed`) + `captured_at` set to EXIF date.

### 14.2 With 170a + 170a-supplement

`nutrition_photo_jobs.analyze_kind` extended per §3.5. Practitioner portal redaction matrix extended per §15.

### 14.3 With 170c (HARD prerequisite per Ask #1)

ED safety mode opt-in flow per §10. Clinical-claim linter applies to all 170s UI copy + post-import summary. If 170c slips past Phase 1 build start, Phase 1 ships flag-off OR ship delays.

### 14.4 With 170f (recipe library; SHIPPED 2026-06-01)

Recipe match short-circuit applies to imported photos identically to fresh captures. Imported meals that match a saved recipe link to it.

### 14.5 With 170g (corpus; filed)

Every imported meal carries `data_source='photo_library_import'` + `user_confirmed_label=true` + `exif_capture_date_verified=true` + `import_session_id` + `bulk_review_confidence_at_save_time`. Exceptionally high-value training rows when 170g ships.

### 14.6 With 170h (insights; filed)

170s enables 170h immediate insights for new users. A new user with 30 days of imported meals has sample size for many insight categories on day 1. Headline strategic compose.

### 14.7 With 170i (practitioner)

Imported meals flow to practitioners with Detailed Meals scope identically to fresh-captured meals. Per Concern §12, the "historical import" provenance is HIDDEN from practitioners. Practitioner sees chronological meals without explanation; defensible privacy posture acknowledged in audit trail.

### 14.8 With 170l (barcode + OFF)

Photos containing visible barcodes route through OFF cache during analysis identically to fresh captures.

### 14.9 With 170r (educational content)

Phase 1 does NOT ship 170r inline surfaces during import review (deferred to supplement-2). When 170r Phase 1 ships + has Learn surface + Dashboard card live, that's a separate touchpoint; supplement-2 wires the inline surface during import review.

### 14.10 With 170p (pantry)

NO retroactive pantry population per spec §9.9 + Phase 1. Filed for future supplement if user demand emerges.

## 15. Privacy posture (per Ask #4 default)

Phase 1 user-facing copy uses the precise framing per Ask #4 default:

> "We do not permanently retain your photos. They are transmitted to Anthropic for analysis only and discarded by ViaConnect immediately after."

NOT the imprecise "photos are not stored" framing flagged in Concern §2. Kelsey reviews exact copy at Blueprint.

Anthropic ZDR enrollment per Ask #8 deferred to Kelsey + Gary review at Blueprint; cross-prompt strategic decision affecting ALL Vision API usage (170 + 170l + 170p + 170r + 170s). If pursued, supplement-2 spec updates copy to "we do not retain your photos at all; Anthropic does not retain them either under our zero-data-retention agreement."

### 15.1 Practitioner redaction matrix (per spec §16.3)

| Data element | Consumer | Practitioner (Detailed Meals scope) |
|---|---|---|
| `photo_library_imports` (session metadata) | Yes | No |
| `photo_library_import_candidates` | Yes | No |
| `photo_library_import_dedup_groups` | Yes | No |
| `meals` with `analyze_kind='photo_library_import_committed'` | Yes | Yes (the meal itself) |
| Link between meals and historical import sessions | Yes | NO (link hidden per Concern §12 trade-off acceptance) |

### 15.2 Non-food photo handling

Per spec §16.2: when pre-classifier returns 'non_food':
- NOT transmitted to full vision API
- NOT cached on ViaConnect servers
- NOT shown in any user-facing review interface
- Pre-classification call result IS retained in telemetry (for system improvement) with photo data discarded after the call
- `local_photo_identifier` retained in `photo_library_import_candidates` to avoid re-processing on future imports; photo data itself NOT retained

### 15.3 EXIF location metadata in Phase 1

Phase 1 does NOT use GPS EXIF data for any purpose (location dedup deferred to supplement-2). GPS EXIF columns ship Phase 1 but are not populated until supplement-2.

## 16. Acceptance criteria

Phase 1 ships only when:

1. All 4 tables created with documented columns + indexes + RLS + triggers; verified via `apply_migration` + `list_tables` round-trip.
2. `nutrition_photo_jobs.analyze_kind` extended with 3 new values.
3. Capacitor photo library plugin selected via Blueprint formal evaluation + Gary explicit approval + security review documented.
4. 5-step consent flow renders on iOS 14+ and Android 13+ via Capacitor.
5. Permission grants work for "all photos" and "selected photos" modes; permission revocation stops library access immediately within 1s of platform-level revocation.
6. Pre-classifier accuracy targets met on Gordon's 1,000-photo curated test set (≥92% TP / ≥95% TN / ≤5% FP / 5-15% uncertain).
7. Dedup accuracy targets met on Gordon's 200-photo-group curated test set (≥88% TP / ≤5% FP).
8. EXIF date preservation verified at 100% on photos with valid EXIF; manual fallback works for missing EXIF; date validation rejects out-of-window dates.
9. Vercel Pro 300s batch function processes 30 dedup representatives within budget (typically 60-150s for 30 photos × 2-5s each).
10. Cost cap $5 per session enforced; 1 import per user per day enforced.
11. Review surface renders photo grid with filter + sort + bulk actions; tap-to-expand opens standard 170 result review with "From historical import" chip + capture date display.
12. Bulk confirmation safety rail fires for >20 photos with avg confidence < 0.65.
13. Save and finish later: drafts persist 30 days; day-7 in-app notification fires; auto-discard at day 30 with notification.
14. Post-FULL-CAQ onboarding offer surfaces correctly; Settings entry works.
15. ED safety mode opt-in flow respects spec §10 (HIDDEN by default; opt-in with friction; macros/calories hidden during review; bulk cap 30; non-numeric summary).
16. Practitioner test account: import sessions + provenance NOT visible.
17. Photos verified as NOT persistently stored (network traffic inspection + storage audit + DB inspection).
18. Precise privacy copy per §15 (Kelsey reviewed; "do not permanently retain" not "are not stored").
19. 7 kill switches function correctly.
20. 5 Helix events fire correctly.
21. Telemetry sessions write at 50% sampling Phase 1 first 90 days.
22. WCAG 2.2 AA verified.
23. No em / en dashes anywhere in user-facing copy.
24. Hard rules per §17 satisfied.

## 17. Hard rules reaffirmed

Per spec §22:

1. Append-only migrations.
2. **ONE new package.json dependency** (Capacitor photo library plugin) with explicit Gary approval at Phase 1 Blueprint after security review.
3. No Supabase email template or auth.config modifications.
4. Lucide React icons strokeWidth 1.5.
5. No emojis in code.
6. Bio Optimization verbatim.
7. Helix Rewards Consumer portal only.
8. Bioavailability "10x to 28x" verbatim site-wide.
9. No Semaglutide / Retatrutide injectable only / Tesofensine pending FDA.
10. Desktop and mobile developed simultaneously EXCEPT 170s is MOBILE-ONLY v1 (web shows "use mobile app" message; iOS + Android only).
11. No em / en dashes anywhere in user-facing copy.
12. Brand tokens (Navy + Card + Teal + Orange) + Instrument Sans.
13. Direct push to main no PR.
14. Reading history is consumer-only.
15. Gordon canonical spelling.
16. **Photos are not persistently stored. NON-NEGOTIABLE.**
17. **Non-food photos are never sent for full vision analysis. NON-NEGOTIABLE.**
18. Permission does not persist across sessions (more conservative than typical app pattern).
19. Safety mode opt-in for bulk historical review requires additional friction.

## 18. Phasing within Phase 1 (Blueprint long-poles)

Standard A-E rhythm.

### 18.A Schema + migrations + RLS (1 engineer-week)

Append `20260901000010_prompt_170s_phase_1_photo_library_foundation.sql` with 4 tables + indexes + RLS + triggers + nutrition_photo_jobs.analyze_kind extension.

### 18.B Gordon classifier + plugin integration (3 engineer-weeks + 4-6 Gordon parallel)

Engineering:
- Capacitor plugin integration (per Blueprint selection)
- Pre-classifier client (Anthropic Vision API call wrapper)
- pHash computer (pure JS dHash 64-bit)
- Temporal grouper + dedup orchestrator + representative selector
- EXIF date extractor + timezone resolver + capture date mapper
- Permission flow state manager + revocation handler
- Vercel Pro 300s batch worker

Gordon authoring (parallel):
- Food vs non-food classifier system prompt iterations (150-200hr per Concern §3)
- 1,000-photo curated test set construction (estimated 100hr Gordon + 30hr Hannah/Kelsey/diverse user review)
- 200-photo-group dedup test set (estimated 30hr)
- Edge case decisions per Concern §17

### 18.C API routes (1 engineer-week)

9 routes per §11 + batch worker.

### 18.D UI surfaces (3 engineer-weeks + 1 Hannah parallel)

- 5-step consent flow components
- Onboarding offer screen (post-FULL-CAQ)
- Permission state UI + revocation handler UI
- Scanning + pre-classifying progress views
- Dedup groups review view
- Batch processing progress view (Server-Sent Events or polling)
- Review surface (grid + detail + bulk actions + save-and-finish-later)
- Settings > Photo Library Import section
- ED safety mode opt-in flow (gated on 170c ratification)
- Post-import summary

Hannah deliverables:
- 5-step consent flow wireframes (mobile-first; the only platforms)
- Onboarding offer screen wireframes
- Review surface wireframes (grid + detail + bulk actions)
- Safety mode opt-in flow wireframes (gated; coordinated with 170c team)

### 18.E Pre-launch audit + smoke + ratification gate (2 engineer-weeks)

- Jeffery pre-launch audit chain (security-advisor + performance-advisor + michelangelo + hannah + gordon)
- Privacy posture verification (network traffic + storage audit + DB inspection per spec §16)
- Pre-classifier accuracy validation on 1,000-photo test set
- Dedup accuracy validation on 200-photo-group test set
- EXIF preservation test across diverse iOS + Android devices
- Cost cap enforcement test
- Permission revocation test (verify <1s response)
- Capacitor plugin security review final sign-off
- Localhost smoke per `[[feedback_launch_localhost]]`
- Vercel flag flip checklist

### 18.F Total Phase 1 runway

| Slice | Engineer-weeks | Gordon content | Other |
|---|---|---|---|
| A schema + migrations | 1 | — | — |
| B classifier + plugin + libs | 3 | 4-6 weeks (150-260hr) parallel | — |
| C API routes | 1 | — | — |
| D UI surfaces | 3 | — | 1 Hannah parallel |
| E audit + smoke | 2 | — | — |
| **Total engineering** | **10** | | |

With 2 engineers in parallel: ~7-8 calendar weeks engineering. Gordon content + plugin selection + Kelsey review span 6-10 weeks calendar parallel. Total Phase 1 calendar runway from Blueprint clear: 10-14 weeks.

Optimistic ship target: Dec 2026 - Jan 2027 (Blueprint Sep 2026, build Oct-Nov, audit Dec, ship Dec-Jan).

## 19. Open questions for Phase 1 Blueprint

| # | Question | Recommendation |
|---|---|---|
| Q1 | Capacitor plugin choice between 3 candidates | Defer to Blueprint formal evaluation per Ask #2 |
| Q2 | Edge cases for pre-classifier (food prep + packaging + partial frames + multi-meal photos) | Gordon explicit decisions per Concern §17 at Blueprint with test set coverage for each |
| Q3 | Privacy copy exact wording (Kelsey review) | Default per Ask #4: "We do not permanently retain your photos. They are transmitted to Anthropic for analysis only and discarded by ViaConnect immediately after." Kelsey approves final wording. |
| Q4 | Anthropic ZDR enrollment pursuit | Defer to Kelsey + Gary review at Blueprint per Ask #8; cross-prompt strategic |
| Q5 | iOS / Android version floor (iOS 14+ + Android 13+ recommended) | Blueprint document; affects plugin choice |
| Q6 | Phase 1 30-day range as max — should we ship even tighter (14-day or 7-day default) to reduce Phase 1 ship risk? | 30-day max with 3 user-selectable options (7 / 14 / 30); recommended default = 30 day |
| Q7 | Vercel Pro 300s function pricing impact at 100k user adoption | Arnold cost projection at Blueprint |
| Q8 | Post-FULL-CAQ onboarding offer timing — immediately after Phase 5 OR delayed to first Dashboard view? | Immediately after Phase 5 with skip option; surface again on Dashboard if user skipped |

## 20. Risk acceptance acknowledgments (durable audit trail)

Per Gary ratification 2026-06-01:

1. **170c ratification commitment for Q3 2026** (Ask #1). If 170c slips, 170s Phase 1 ship slips correspondingly. No permissive-defaults fallback per spec §0+§10 non-negotiable.

2. **Capacitor plugin selection deferred to Blueprint formal evaluation** (Ask #2). FIRST post-launch package.json dep; package.json lock `[[feedback_permanent_protections]]` requires explicit Gary approval AFTER Blueprint security review.

3. **30-day draft persistence with day-7 notification** (Ask #6 compromise). Accepts bounded orphan analysis cost (~$18 per fully-abandoned 60-photo session) in exchange for not forcing too-tight TTL.

4. **Anthropic ZDR enrollment deferred** (Ask #8). Phase 1 ships with precise "we do not permanently retain; Anthropic standard 30-day retention applies" copy. If ZDR pursued by supplement-2, copy updates to cleaner posture.

5. **Practitioner historical-import provenance hidden** (Concern §12). Practitioner sees imported meals chronologically without explanation. Defensible privacy posture; accepts information asymmetry risk for consumer privacy primacy.

## 21. Filed-not-built reaffirmation

Filed 2026-06-01. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Sep 2026 contingent on:
1. 170c ratification calendared for Q3 2026 per Ask #1
2. Capacitor plugin candidates identified for Blueprint security review
3. Gordon's 1,000-photo test set construction begun (parallel; can start now without build authorization)

Build authorization is separate per phase per `[[feedback_no_unsolicited_changes]]`.

## 22. Related

- `prompt-170s-filed-2026-06-01.md` (placeholder spec with architectural review)
- `prompt-170s-supplement-2-2026-06-01.md` (supplement-2 filed alongside)
- `project_prompt_170s_filed.md` (memorial; primary working doc)
- `project_prompt_170c_filed.md` (HARD prerequisite per Ask #1)
- `project_prompt_170g_filed.md` (170s provides high-value corpus rows)
- `project_prompt_170h_filed.md` (170s enables immediate insights for new users)
- `project_prompt_170r_filed.md` (170r inline surfaces during review deferred to supplement-2)
- `project_capacitor_setup.md` (Capacitor 6.x approved; photo plugin extends per Ask #2)
- `project_prompt_170p_phase_split.md` (analogous phase split precedent)
- `project_prompt_170f_shipped.md` (recipe match short-circuit composes Phase 1 ship)
- `feedback_permanent_protections.md` (package.json lock; Capacitor photo plugin needs explicit Phase 1 Blueprint exception)
- `feedback_jeffery_pre_launch_review.md` (Phase 1.E audit gate)
- `feedback_no_unsolicited_changes.md` (no build until explicit Gary go)
