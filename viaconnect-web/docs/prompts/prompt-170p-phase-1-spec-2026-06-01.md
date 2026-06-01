# Prompt 170p Phase 1: Pantry Foundation

**Filed:** 2026-06-01 (launch +0, post-170f Phase 1 SHIPPED same day)
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Aug 2026.
**Supersedes:** `prompt-170p-filed-2026-05-31.md` monolithic framing per `project_prompt_170p_phase_split` ratified 2026-06-01.
**Owner agent:** Gordon (receipt parser system prompt + Anthropic Vision integration + expiration estimates table + cascade-aware ingredient lookups + telemetry session schema)
**Build agent:** Michelangelo (TDD, OBRA)
**UX agent:** Hannah (Pantry tab + receipt scan flow + item detail view + Dashboard widget + Settings section)
**Co-owners:** Arnold (pantry adoption telemetry + receipt scan accuracy rollups), Kelsey (expiration disclaimer copy + receipt-image-privacy disclosure)
**Orchestrator:** Jeffery
**Composes with:** 170 base (cascade) + 170b (curated foods) + 170l (barcode + OFF cache) + 170m (Quick Log allergen vocab) + 170c (dietary filter feature-flagged if not yet ratified)
**Hard-blocked-by:** None for Phase 1. (Phase 2-4 blockers tracked separately in supplement specs.)
**Provides for Phase 2-4:** `pantry_items` schema + cascade-aware lookup paths + Pantry tab mount point + Settings preferences + telemetry rollup pattern.

## 0. Summary

Pantry Foundation ships the smallest shippable pantry. Users get a tracked inventory of what they have at home. Two entry paths populate the pantry: manual entry (text + barcode reuse from 170l) and receipt scanning (Anthropic Vision API OCR + Claude Haiku normalization + cascade lookup). A new top-level **Pantry tab** in the consumer navigation hosts the items list + item detail + edit/consume/delete + running-low section. A Dashboard widget surfaces "what's in your pantry" + "what's expiring soon". Settings exposes category, location, expiration, and notification preferences. Five Helix events reward the loop. Telemetry samples 20% of receipt-scan sessions.

Phase 1 does not ship email forwarding, PDF upload, Chrome agent, or the meal suggestion engine. Those land in supplements 2, 3, and 4 respectively. Phase 1 is the foundation every later phase reads from. The data model is sized for that role from day one.

Headline behavioral metric for Phase 1 ratification at +90 days post-ship: pantry adoption rate (defined as: percentage of active meal-logging users who have populated pantry with at least 5 items via any entry path during a 14-day window). Target above 25% triggers Phase 2 Blueprint acceleration; below 15% triggers Phase 2 deprioritization per phase split memo Section 8.4.

## 1. What it is

A tracked inventory of food items the user has at home, with provenance (how it got into the pantry), quantity, unit, location (fridge/freezer/pantry/counter), expiration estimate, and consumption history. Two entry paths in v1: manual entry (text NLU + barcode scan) and receipt scanning (photo of a paper or digital receipt, OCR via Vision API, normalization via Haiku, cascade lookup).

The user-facing affordances:

1. **Add item to pantry** via barcode scan (composes with 170l), text NLU ("2 lbs ground turkey", "12 eggs", "almond milk"), or photo of a receipt.
2. **See what's in the pantry** as a filterable list (by category, location, expiration window).
3. **Edit a pantry item** (rename, change quantity, change location, change expiration).
4. **Mark an item consumed** (decrements quantity; logs the event).
5. **Delete an item** (without consumption logging; for entry errors).
6. **See what's expiring soon** in a Dashboard widget and in a Pantry tab "Running Low" section.
7. **Opt into expiration notifications** (in-app + push if Capacitor active).

The user does not (in Phase 1) get:
- Meal suggestions from pantry contents (Phase 4)
- Pantry auto-deduction when a meal is logged (Phase 4 opt-in)
- Email forwarding from grocery services (Phase 2)
- PDF receipt upload (Phase 3)
- Browser-agent imports from Instacart/Amazon Fresh order history (Phase 3)

## 2. Why this matters

ViaConnect's nutrition platform tracks what users eat. It does not track what they have to eat. This gap shows up empirically in three places:

1. **NutriVision drop-off**: users who log a meal once but do not log a second meal within 7 days cite "I forgot what I ate" or "I cooked something and never logged it" in qualitative interviews (Arnold Q1 2026 corpus). A pantry is the surface where users discover-then-log rather than remember-then-log.
2. **Meal Planning gap**: 170q (forward meal planning) and Gordon's next-meal insight both need to know what's available. Phase 1 provides that knowledge.
3. **Cold-start for 170p Phase 4 suggestion engine**: a populated pantry is the input to the headline behavioral feature. Phase 1 builds the pantry; Phase 4 reads from it.

Phase 1 has standalone user value (a tracked inventory + expiration awareness + manual replenishment) regardless of whether Phases 2-4 ship.

## 3. Data model

Two new tables. Append-only migrations per standing rule.

### 3.1 `pantry_items`

User-owned pantry inventory rows. Each row is a single distinct food item in a single location.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  raw_name            TEXT NOT NULL,
  canonical_name      TEXT NOT NULL,
  brand               TEXT,
  category            TEXT NOT NULL CHECK (category IN (
                        'produce', 'meat_seafood', 'dairy', 'eggs',
                        'pantry_staples', 'frozen', 'beverages',
                        'baked_goods', 'snacks', 'condiments',
                        'spices_herbs', 'baby_food', 'other')),

  -- Quantity
  quantity            NUMERIC NOT NULL CHECK (quantity >= 0),
  unit                TEXT NOT NULL CHECK (unit IN (
                        'g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl_oz',
                        'cup', 'item', 'package', 'slice', 'serving')),

  -- Location
  location            TEXT NOT NULL CHECK (location IN (
                        'fridge', 'freezer', 'pantry', 'counter',
                        'spice_rack', 'other')),

  -- Provenance (how it got into pantry)
  added_via           TEXT NOT NULL CHECK (added_via IN (
                        'manual_text', 'manual_barcode', 'receipt_scan',
                        'grocery_email_import', 'pdf_upload',
                        'chrome_agent_import', 'meal_log_inverse')),
  added_via_session   UUID,
  source_text         TEXT,

  -- Expiration
  expiration_estimate_date  DATE,
  expiration_source         TEXT CHECK (expiration_source IN (
                              'user_entered', 'category_default',
                              'receipt_printed', 'package_label')),
  expiration_confidence     NUMERIC CHECK (expiration_confidence BETWEEN 0 AND 1),

  -- Cascade and curation
  cascade_match_source  TEXT CHECK (cascade_match_source IN (
                          'curated', 'off_cache', 'usda', 'unmatched')),
  cascade_match_ref     TEXT,
  nutrient_density_per_serving JSONB,

  -- 170c dietary crossover (feature-flagged; nullable for v1)
  contains_allergens    TEXT[] NOT NULL DEFAULT '{}',
  conflicts_with_diet_tags TEXT[] NOT NULL DEFAULT '{}',

  -- Status
  is_consumed         BOOLEAN NOT NULL DEFAULT FALSE,
  consumed_at         TIMESTAMPTZ,

  -- Telemetry
  parser_version      TEXT,
  ingestion_confidence NUMERIC CHECK (ingestion_confidence BETWEEN 0 AND 1),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_active
  ON public.pantry_items(user_id, location) WHERE is_consumed = FALSE;
CREATE INDEX IF NOT EXISTS idx_pantry_items_user_expiration
  ON public.pantry_items(user_id, expiration_estimate_date)
  WHERE is_consumed = FALSE AND expiration_estimate_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pantry_items_canonical
  ON public.pantry_items(canonical_name);
CREATE INDEX IF NOT EXISTS idx_pantry_items_user_added_via_session
  ON public.pantry_items(added_via_session) WHERE added_via_session IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pantry_items_allergens
  ON public.pantry_items USING GIN (contains_allergens);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pantry_items_owner_all" ON public.pantry_items;
CREATE POLICY "pantry_items_owner_all"
  ON public.pantry_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS pantry_items_updated_at ON public.pantry_items;
CREATE TRIGGER pantry_items_updated_at
  BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Design notes for `pantry_items`:**

- `canonical_name` always lowercase + trimmed per the 170f Blueprint Issue #6 convention so Phase 4 suggestion engine can intersect pantry canonicals with `recipe_ingredients.canonical_name` (also lowercase + trimmed) without case-folding overhead.
- `category` enum is finite + stable for v1; future categories filed for additive migration only.
- `unit` enum reuses the 170f recipe unit vocabulary verbatim (`g`, `kg`, `ml`, `l`, `oz`, `lb`, `fl_oz`, `cup`, `item`, `slice`, `serving`) plus `package` (a sealed package treated as one consumable unit, e.g. "1 package of bacon").
- `added_via` is a closed enum with 7 values; the Phase 1 paths emit `manual_text`, `manual_barcode`, `receipt_scan`; Phase 2 emits `grocery_email_import`; Phase 3 emits `pdf_upload` + `chrome_agent_import`; Phase 4 emits `meal_log_inverse` (the inverse-log path that proposes adding pantry items from a recently logged meal, opt-in).
- `expiration_source` distinguishes user-set vs. Gordon's category-default vs. printed-on-receipt vs. package-label-OCR. Phase 1 emits `user_entered` (user typed a date) + `category_default` (Gordon's table) + `receipt_printed` (receipt text contained a "best by" date that the parser extracted). `package_label` is a Phase 3 addition (image OCR of physical packaging).
- `expiration_confidence` is the parser's confidence in the date. User-entered = 1.0. Category default = 0.5. Receipt-printed parser hit = 0.8. Below-0.4 expiration estimates are not surfaced in UI (parser failed; treat as unknown).
- `cascade_match_source` mirrors the 170f convention so the same cascade lookup library can serve both recipe ingredients and pantry items.
- `contains_allergens` and `conflicts_with_diet_tags` are populated when 170c ratifies. Until then, both stay empty arrays. The columns exist in v1 to avoid a column add later when 170c ratifies. Index on `contains_allergens` lets Phase 4 suggestion engine pre-filter cheaply.
- `is_consumed` toggle (rather than hard delete) preserves consumption history for Phase 4 suggestion scoring + Arnold's adoption analytics. Hard delete only for entry errors (the user-facing DELETE button is for "I added this by mistake" not "I ate this").

### 3.2 `pantry_consumption_log`

Append-only consumption events. Each row is a single consume action on a single pantry item.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_consumption_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pantry_item_id      UUID NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,

  -- Consumption details
  quantity_consumed   NUMERIC NOT NULL CHECK (quantity_consumed >= 0),
  unit_consumed       TEXT NOT NULL,
  remaining_after     NUMERIC NOT NULL CHECK (remaining_after >= 0),

  -- Provenance of the consume event
  consumed_via        TEXT NOT NULL CHECK (consumed_via IN (
                        'manual_button', 'meal_log_link',
                        'expiration_acknowledged_used',
                        'expiration_acknowledged_discarded')),
  meal_id             UUID,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pantry_consumption_user_created
  ON public.pantry_consumption_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pantry_consumption_item
  ON public.pantry_consumption_log(pantry_item_id);
CREATE INDEX IF NOT EXISTS idx_pantry_consumption_meal
  ON public.pantry_consumption_log(meal_id) WHERE meal_id IS NOT NULL;

ALTER TABLE public.pantry_consumption_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pantry_consumption_owner_all" ON public.pantry_consumption_log;
CREATE POLICY "pantry_consumption_owner_all"
  ON public.pantry_consumption_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Design notes for `pantry_consumption_log`:**

- `consumed_via='manual_button'` is the Phase 1 default (user taps "Consumed" in item detail). `meal_log_link` is Phase 4 (an explicit link from a logged meal back to which pantry item was used). `expiration_acknowledged_used` and `expiration_acknowledged_discarded` are emitted when a user taps the running-low chip for an item and confirms "used it" or "discarded it" (the latter awards no Helix points; we do not reward waste).
- `quantity_consumed` + `unit_consumed` + `remaining_after` together preserve the "how much was left" story for analytics. The trigger function on `pantry_items` (not in v1; deferred to Phase 1.1 if needed) could automate `remaining_after` calculation; for v1 the API computes it server-side from `pantry_items.quantity - quantity_consumed` clamped at 0.
- No CASCADE-set-null on `meal_id` because `meal_id` references the `meals` table which already has its own deletion semantics; consumption logs are append-only audit trail.

### 3.3 `pantry_receipt_scan_sessions` (telemetry)

Privacy-respecting telemetry for receipt scan sessions at 20% sampling. Metadata only; receipt images NEVER persisted past the analysis call.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_receipt_scan_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash             TEXT NOT NULL,
  session_id            UUID NOT NULL,

  -- Image metadata (NOT the image itself)
  image_byte_size       INTEGER,
  image_dimensions      TEXT,
  image_modality_hint   TEXT,

  -- Parser metadata
  vision_provider       TEXT NOT NULL DEFAULT 'anthropic_claude_haiku_4_5',
  parser_version        TEXT NOT NULL,
  items_detected_count  INTEGER,
  parser_confidence_avg NUMERIC CHECK (parser_confidence_avg BETWEEN 0 AND 1),
  needed_clarification  BOOLEAN NOT NULL DEFAULT FALSE,
  clarification_rounds  INTEGER NOT NULL DEFAULT 0,

  -- Outcome
  session_outcome       TEXT NOT NULL CHECK (session_outcome IN (
                          'saved_all', 'saved_partial', 'discarded',
                          'parser_error', 'vision_timeout')),
  items_saved_count     INTEGER NOT NULL DEFAULT 0,

  -- Latency
  vision_latency_ms     INTEGER,
  total_session_ms      INTEGER,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_sessions_user_hash_created
  ON public.pantry_receipt_scan_sessions(user_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_sessions_outcome
  ON public.pantry_receipt_scan_sessions(session_outcome);

ALTER TABLE public.pantry_receipt_scan_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipt_sessions_service_role_only" ON public.pantry_receipt_scan_sessions;
CREATE POLICY "receipt_sessions_service_role_only"
  ON public.pantry_receipt_scan_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

**Design notes:**

- `user_hash` is the corpus-salt-based hash from `lib/nutrition/corpus/user-hash.ts` (same pattern as `quick_log_sessions`). Privacy posture identical to 170m.
- Receipt images go to Vision API and are discarded immediately after parse. No persistent storage of receipt imagery in v1. The `image_byte_size` + `image_dimensions` + `image_modality_hint` are extracted client-side BEFORE upload and stored as metadata for parser-quality analysis (small blurry images vs. crisp tall receipts).
- Service-role-only RLS prevents users from reading their own telemetry (it's metadata, not feature-relevant; the items they saved are in `pantry_items`).

### 3.4 `pantry_user_preferences` (settings)

User-level preferences for pantry behavior.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_user_preferences (
  user_id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expiration_warning_days       INTEGER NOT NULL DEFAULT 3 CHECK (expiration_warning_days BETWEEN 1 AND 14),
  push_notifications_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  default_location              TEXT NOT NULL DEFAULT 'pantry' CHECK (default_location IN (
                                  'fridge', 'freezer', 'pantry', 'counter', 'spice_rack', 'other')),
  dashboard_widget_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  receipt_scan_privacy_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_scan_privacy_acknowledged_at TIMESTAMPTZ,

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pantry_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pantry_prefs_owner_all" ON public.pantry_user_preferences;
CREATE POLICY "pantry_prefs_owner_all"
  ON public.pantry_user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS pantry_prefs_updated_at ON public.pantry_user_preferences;
CREATE TRIGGER pantry_prefs_updated_at
  BEFORE UPDATE ON public.pantry_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 3.5 `pantry_category_default_shelf_lives` (Gordon-curated)

Gordon-authored default expiration estimates by category + location combination. Used when no user input + no receipt-printed date is available. Service-role writes only; consumer reads via API.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_category_default_shelf_lives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  location        TEXT NOT NULL,
  shelf_life_days INTEGER NOT NULL CHECK (shelf_life_days > 0),
  notes           TEXT,
  curated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, location)
);

ALTER TABLE public.pantry_category_default_shelf_lives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shelf_lives_read_authenticated" ON public.pantry_category_default_shelf_lives;
CREATE POLICY "shelf_lives_read_authenticated"
  ON public.pantry_category_default_shelf_lives FOR SELECT
  USING (auth.role() = 'authenticated');
```

Gordon seeds approximately 78 (category × location) combinations covering the 13 categories × 6 locations matrix, omitting combinations that are not sensible (e.g., `frozen` × `counter` is omitted).

## 4. Entry paths

Phase 1 ships 2 entry paths. Each path produces `pantry_items` rows with `added_via` correctly stamped.

### 4.1 Manual entry: text NLU + barcode scan

The user taps a "+" floating action button in the Pantry tab. A modal opens with three sub-paths:

1. **Type it**: a single text input. NLU parses "2 lbs ground turkey" into `{ raw_name: "ground turkey", quantity: 2, unit: "lb" }`. NLU pattern reuses the Quick Log 170m parser at lower confidence threshold (0.65 vs. 0.80) since pantry text is shorter and less context-rich. Cascade lookup populates `canonical_name`, `cascade_match_source`, `cascade_match_ref`, and `nutrient_density_per_serving` when matched.
2. **Scan barcode**: composes with 170l's `BarcodeScannerOverlay` component. Successful scan returns OFF cache product data; user confirms quantity + unit + location + (optionally) expiration. Stamps `added_via='manual_barcode'`.
3. **Pick from common items**: a fast list of the user's 12 most-recently-added items (with "+" to re-add same) sorted by frequency. Tap inserts a new `pantry_items` row with the same canonical_name + brand but fresh quantity input.

Sub-path 3 is the highest-frequency repeat-add path; sub-path 1 is the long-tail; sub-path 2 is the most accurate.

**NLU contract for sub-path 1:**

```typescript
interface PantryManualParseRequest {
  text: string;            // user-typed
  locale: string;          // default en-US
  default_location: string; // from preferences
}

interface PantryManualParseResponse {
  items: Array<{
    raw_name: string;
    quantity: number;
    unit: PantryUnit;
    category: PantryCategory;
    confidence: number;
    cascade_match_source?: string;
    cascade_match_ref?: string;
  }>;
  needs_clarification?: {
    question: string;
    options: string[];
  };
  parser_version: string;
}
```

When a single text input yields multiple items ("eggs, milk, cheese"), the parser emits one `items[]` entry per detected food. The save endpoint accepts the array as a single transaction.

### 4.2 Receipt scan

The user taps "+ Scan receipt" in the Pantry tab. Camera opens (composes with 170l's `WebCameraPreview` web fallback and the Capacitor native camera on mobile). User aligns receipt + captures. Frame goes through:

1. **Client-side validation**: byte size, dimensions, modality hint (paper vs. digital screenshot vs. illegible). Below thresholds (under 100KB and under 800px width) prompt re-shoot.
2. **POST to `/api/pantry/receipt/scan`**: payload is base64-encoded JPEG + minimal metadata. Server-side calls Anthropic Vision API (Claude Haiku 4.5) with a Gordon-authored system prompt.
3. **Vision response parsing**: structured JSON returning `{ items: [...], total_amount?, store_name?, receipt_date? }`. Each item has `raw_name`, `quantity_text`, `unit_text`, `category_hint`, `confidence`.
4. **Cascade normalization**: each item's `raw_name` runs through the standard cascade (curated → OFF cache → unmatched). `canonical_name` populated.
5. **Result review screen**: a list of detected items with per-item edit affordances (rename, change quantity, change unit, change category, remove). User can also add an item the parser missed. "Save all" inserts `pantry_items` rows as a single transaction with `added_via='receipt_scan'` and `added_via_session=<session_id>`.
6. **Telemetry**: at 20% sampling, a `pantry_receipt_scan_sessions` row is inserted with metadata only.

**Vision system prompt structure (Gordon long-pole):**

The system prompt covers: receipt formats (paper grocery store + digital pickup + restaurant receipt + farmers market), item line patterns, weight vs. count quantification, brand handling, ignoring tax/total/discount/loyalty rows, ambiguous category resolution, expiration date extraction when printed, sample receipts (Whole Foods + Trader Joe's + Walmart + Target + Kroger + Costco) for in-context priming.

Estimated draft length: 800-1,100 lines (comparable to 170m's Haiku system prompt at 1,163 lines).

**Curated receipt test set (Gordon long-pole):**

100 sample receipts spanning the 6 store templates × variant conditions (low-light photo, perfect photo, partial photo with cut-off bottom, digital pickup screenshot, post-discount confusing format). Each labeled with expected items + expected misses + expected confidence. Validates pre-ship that the parser meets a 90%+ per-item recall on clean photos and 70%+ on low-light.

### 4.3 What Phase 1 explicitly does not handle

- Receipt scan with > 30 items (real-world Costco runs): caps at 30 displayed items in review screen, with a "more items detected; tap to expand" affordance. Above 60 items, the parser asks for re-shoot in two halves.
- Receipts with non-food items mixed in (toilet paper, batteries): parser filters to food categories only. Non-food rows are silently dropped (not surfaced in the review screen). A note at the bottom of the screen says "Non-food items skipped." Reduces friction at the cost of edge case where a user wants to track a food-adjacent item (e.g., dog food); Phase 1.1 supplement filed to add an opt-in "include all items" toggle.
- Multi-currency receipts: v1 ignores price entirely (no `price_paid` field on `pantry_items`). Pricing is Phase 3 advanced analytics.
- Subscription/recurring grocery orders: receipt scan treats them as one-time. Recurring detection is Phase 2 (email forwarding).

## 5. UI surfaces

Five UI surfaces ship in Phase 1.

### 5.1 Pantry tab (top-level consumer navigation)

A new top-level tab between "Nutrition" and "Wellness Analytics" (insert position TBD by Hannah; Blueprint deliverable). Tab icon: Lucide `Refrigerator` strokeWidth 1.5. Tab label: "Pantry".

Route: `/pantry`.

Layout (mobile-first):
- **Hero**: `MobileHeroBackground` with the existing nutrition food hero image (reuse) at 0.55 overlay opacity, similar to the Nutrition tab pattern.
- **Header row**: page title "Pantry" + total item count chip + "+ Add" floating action button (anchored bottom-right on mobile, header on desktop).
- **Filter chips row**: All / Fridge / Freezer / Pantry / Counter + category filter dropdown. Horizontally scrollable on mobile.
- **Search input**: text search across `raw_name` + `canonical_name`. Debounced 250ms.
- **Running Low section** (collapsed by default; expands if any items meet criteria): items expiring within `expiration_warning_days` OR with `quantity / original_quantity < 0.25`. Each row has "Used" + "Discarded" quick buttons.
- **Items list** (default expanded): grouped by location (Fridge → Freezer → Pantry → Counter → Spice Rack → Other). Each item is a card with photo placeholder, name, brand (if present), quantity + unit, expiration chip (color-coded: red if past, orange if within warning days, gray if unknown), location chip, "+" and "−" quick-quantity buttons. Tap card opens detail view.

Empty state (no items): centered illustration + "Your pantry is empty" + 2 CTAs ("Type an item" + "Scan a receipt") + "Browse common items" link.

### 5.2 Pantry item detail view

Modal/sheet (bottom sheet on mobile, modal on desktop). Opens when a card tapped.

Sections:
- Photo (placeholder if no photo)
- Name + brand
- Editable fields: quantity, unit, location, category, expiration date
- Cascade match badge (if matched: "Matched: <canonical_name> from <source>")
- Nutrient density per serving (if cascade matched, surfaced as small table)
- Provenance line: "Added via <added_via> on <date>" (small text)
- Action row: Consumed (button) + Edit (pencil) + Delete (trash icon, with confirm)
- Consumption history (collapsible): last 10 consumption events from `pantry_consumption_log`

The Consumed button opens a small input "How much?" with quick-pick chips (25%, 50%, 100%) and a custom input. Tap "Confirm" inserts a `pantry_consumption_log` row + updates `pantry_items.quantity` (clamped at 0) + sets `is_consumed=TRUE` if remaining hits 0.

### 5.3 Pantry editor (item create / edit form)

Reused for both manual text-entry, barcode-scan confirmation, and per-item edit from the receipt review screen.

Fields:
- Name (text)
- Brand (text, optional)
- Quantity (number)
- Unit (dropdown)
- Category (dropdown)
- Location (dropdown, defaults to `pantry_user_preferences.default_location`)
- Expiration date (date picker, optional; placeholder shows "Auto: <category_default_date>" when user has not entered one)
- Photo (Phase 3 addition; v1 skips)

Save: POST `/api/pantry/items`.

### 5.4 Dashboard widget

A new card on `/dashboard` between the existing nutrition score card and the meal-quick-log row.

Header: "Your Pantry" + total active item count.
Content:
- 4-up grid of "What's expiring soon" (top 4 by expiration date ascending). Each cell: name, days-until-expiration chip, "Use it" button (links to detail view).
- If nothing expiring: "Nothing expiring this week" + "View pantry" link.

Hidden entirely when `pantry_user_preferences.dashboard_widget_enabled=false` OR `pantry_items` row count for user equals 0 (cold-start: don't surface an empty widget).

### 5.5 Settings > Pantry section

New section in `/settings` consumer settings. Renders as a collapsed accordion that expands on tap.

Controls:
- "Default location for new items" (dropdown matching `pantry_user_preferences.default_location`)
- "Show pantry widget on Dashboard" (toggle)
- "Expiration warnings: show items expiring within N days" (slider 1-14, default 3)
- "Push notifications when items are about to expire" (toggle; gated on Capacitor permission grant)
- "Receipt scan privacy" (collapsible explainer + acknowledge button; sets `receipt_scan_privacy_acknowledged=TRUE` + `receipt_scan_privacy_acknowledged_at=NOW()`)
- Footer link: "Learn how Gordon estimates expiration dates" (Kelsey-authored explainer page; one-screen)

## 6. API surface

Phase 1 ships 9 API routes under `/api/pantry/*`. All gated by `PANTRY_ENABLED` master kill switch (default false until Phase E ratification). Master flag splits into `PANTRY_ENABLED` (server gate) + `NEXT_PUBLIC_PANTRY_ENABLED` (client mount gate) following the 170f Phase 1 precedent.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/pantry/items` | List user's active pantry items |
| POST | `/api/pantry/items` | Create one or many pantry items (single payload schema with `items: [...]`) |
| GET | `/api/pantry/items/[id]` | Item detail |
| PATCH | `/api/pantry/items/[id]` | Update item fields |
| DELETE | `/api/pantry/items/[id]` | Delete item (hard delete for entry errors; use `/consume` for "I ate it") |
| POST | `/api/pantry/items/[id]/consume` | Insert consumption log + decrement quantity |
| POST | `/api/pantry/text/parse` | NLU parse a text input into pantry items shape |
| POST | `/api/pantry/receipt/scan` | Anthropic Vision OCR + normalization on a receipt image |
| GET/PATCH | `/api/pantry/preferences` | Read/update `pantry_user_preferences` |

All routes follow the established `createClient` + `auth.getUser()` + `createAdminClient` post-ownership-check pattern from 170f.

Idempotency:
- POST `/api/pantry/items` with `Idempotency-Key` header dedup at (user, key) on the receipt scan path so a re-tap after spotty network does not double-insert. Manual text + barcode paths skip idempotency since user-initiated.
- POST `/api/pantry/items/[id]/consume` is NOT idempotent (intentional: each tap is a discrete consumption event).

Feature-flag 503 gate: present on all 9 handlers consistent with 170f routes.

## 7. Helix events

Five Helix events shipped in Phase 1.

| Event | Points | Cap | Trigger |
|---|---|---|---|
| `pantry_receipt_scanned` | 5 | 1/day | Receipt scan completes with `session_outcome IN ('saved_all','saved_partial')` AND at least 1 item saved |
| `pantry_item_added_manually` | 1 | 20/day | A `pantry_items` row inserts with `added_via IN ('manual_text','manual_barcode')` |
| `pantry_item_consumed` | 1 | 50/day | A `pantry_consumption_log` row inserts with `consumed_via='manual_button'` |
| `pantry_expiration_avoided` | 2 | 5/day | A `pantry_consumption_log` row inserts with `consumed_via='expiration_acknowledged_used'` AND the related `pantry_items.expiration_estimate_date` is within `pantry_user_preferences.expiration_warning_days` of today |
| `pantry_running_low_acknowledged` | 1 | 5/day | User taps a Running Low chip + chooses "Used" or "Discarded"; only "Used" awards points |

Cap design:
- 20/day on manual-add to discourage gaming via spam adds.
- 50/day on consumption to allow honest multi-item meal cooks.
- 5/day on expiration-avoided to keep the headline-honoring event meaningful.

Events from Phase 2 (`grocery_email_imported`, `grocery_email_address_configured`) + Phase 3 (`pantry_pdf_imported`, `pantry_chrome_agent_imported`) + Phase 4 (`pantry_meal_suggestion_made`, `pantry_meal_suggestion_logged`) ship with their respective supplements.

## 8. Telemetry

Two telemetry tables in Phase 1: `pantry_receipt_scan_sessions` (defined above) + a lightweight `pantry_manual_entry_sessions` table.

### 8.1 `pantry_manual_entry_sessions`

```sql
CREATE TABLE IF NOT EXISTS public.pantry_manual_entry_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash             TEXT NOT NULL,
  session_id            UUID NOT NULL,

  entry_kind            TEXT NOT NULL CHECK (entry_kind IN ('text_nlu', 'barcode', 'common_items_pick')),
  text_input_length     INTEGER,
  items_added_count     INTEGER NOT NULL DEFAULT 0,
  parser_confidence_avg NUMERIC CHECK (parser_confidence_avg BETWEEN 0 AND 1),
  needed_clarification  BOOLEAN NOT NULL DEFAULT FALSE,
  session_outcome       TEXT NOT NULL CHECK (session_outcome IN (
                          'saved', 'discarded', 'parser_error')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_sessions_user_hash_created
  ON public.pantry_manual_entry_sessions(user_hash, created_at DESC);

ALTER TABLE public.pantry_manual_entry_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_sessions_service_role_only" ON public.pantry_manual_entry_sessions;
CREATE POLICY "manual_sessions_service_role_only"
  ON public.pantry_manual_entry_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

Same 20% sampling. Same privacy posture (text never stored; length only).

### 8.2 Arnold rollup queries (admin-only)

Three admin queries surface in the Jeffery admin panel (no consumer access):

1. **Adoption funnel**: total active meal-logging users / users who have added at least 1 pantry item / users who have added at least 5 / users who have scanned a receipt at least once.
2. **Receipt scan accuracy**: distribution of `parser_confidence_avg` + ratio of `saved_all` vs. `saved_partial` vs. `parser_error` per week.
3. **Expiration interaction**: count of `pantry_expiration_avoided` events / count of `pantry_running_low_acknowledged='Discarded'` events / count of items past expiration date without acknowledgment.

These rollups feed the Phase 1 ratification ship-or-deprioritize-Phase-2 decision at +90 days.

## 9. Composition with prior prompts

### 9.1 170 base (cascade)

Pantry items' `cascade_match_source` + `cascade_match_ref` use the standard cascade. The Gordon receipt parser calls the same `lookupFood` library function NutriVision uses. Cascade fallthrough order: curated → OFF cache (170l) → USDA → unmatched.

### 9.2 170b (farmceutica_curated_foods)

Pantry-relevant curated foods (proteins, grains, vegetables, dairy, common pantry staples) reuse the existing 170b corpus. Gordon Blueprint deliverable: audit the curated foods corpus for pantry coverage gaps and file an additive curation list (estimated 80-150 additional items: cleaning supplies, baby food, ethnic specialty items). Curation list itself ships separately as a data-only Phase 0 prerequisite.

### 9.3 170c (dietary filter + ED safety mode)

`pantry_items.contains_allergens` + `pantry_items.conflicts_with_diet_tags` populate ONLY when 170c is ratified. Until then, both columns stay empty arrays (default).

When 170c ratifies, a one-time backfill job populates `contains_allergens` for existing rows by running the 170c allergen classifier over each row's `canonical_name`. The backfill is filed as a Phase 1 follow-up; not in Phase 1 ship scope.

### 9.4 170f (recipe library)

Phase 1 does NOT integrate with 170f. `pantry_items.canonical_name` and `recipe_ingredients.canonical_name` share the same lowercase + trimmed convention, but no read path joins them in Phase 1. Phase 4 (supplement-4 suggestion engine) is where the intersection logic lives.

### 9.5 170l (barcode + OFF cache)

`/api/pantry/text/parse` and `/api/pantry/receipt/scan` both call into the existing OFF cache via the same lookup pattern 170l established. The barcode scan sub-path in 4.1 directly mounts the 170l `BarcodeScannerOverlay` component (no fork; props differ to specify "pantry" destination instead of "nutrition log").

### 9.6 170m (Quick Log allergen vocab)

The 9-class allergen vocab from 170m (peanuts, tree_nuts, milk, eggs, soy, wheat, fish, shellfish, sesame, gluten) is reused for the `pantry_items.contains_allergens` array when 170c ratifies. Vocab constant inherited; no fork.

### 9.7 170h (composition with body opt-state)

170h dependency identified but soft: Phase 4's suggestion scoring composes pantry coverage with the user's body opt-state (cutting / maintaining / bulking) to tune calorie targets. Phase 1 has no body-opt-state interaction; the score multiplier is Phase 4 only.

### 9.8 170i (practitioner ecosystem)

Practitioners cannot see pantry under any current 170i scope. Pantry data is consumer-only across all phases. The Settings > Permissions section for practitioner data sharing does NOT include a pantry toggle. If practitioners ever request pantry visibility, that requires an explicit 170i scope extension + Kelsey ToS review + Gary ratification.

## 10. Hard rules reaffirmed

Standing rules reaffirmed for Phase 1 deliverables:

1. Append-only migrations.
2. Zero new package.json dependencies.
3. No Supabase email template or auth.config modifications.
4. Lucide React icons only with strokeWidth 1.5.
5. No emojis in code.
6. Bio Optimization score name verbatim (Phase 4 reuse; Phase 1 does not write to it).
7. Helix Rewards data is Consumer portal only.
8. Bioavailability copy locked at "10x to 28x" site-wide; Phase 1 does not surface bioavailability copy on pantry surfaces.
9. No Semaglutide; Retatrutide injectable only; Tesofensine removed pending FDA approval. (No relevance to Phase 1 but reaffirmed.)
10. Desktop and mobile developed simultaneously.
11. No em dashes or en dashes anywhere in deliverables or response prose.
12. Brand tokens: Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18. Instrument Sans typography.
13. Workflow: direct push to main, no PR.
14. Pantry data is consumer-only.
15. Practitioners cannot see pantry under any current 170i scope.
16. No credential storage for grocery services. (Phase 1 has no grocery service integration; Phase 2 reaffirms.)

## 11. Phasing within Phase 1 (Blueprint long-poles)

The Phase 1 build itself decomposes into the standard A → B → C → D → E rhythm.

### 11.1 Phase 1.A: Schema + migrations + RLS

Append `20260801000010_prompt_170p_phase_1_pantry_foundation.sql` with all 5 tables + indexes + RLS policies + trigger functions. Verified via `apply_migration` MCP. Includes the Gordon-curated `pantry_category_default_shelf_lives` seed (78 rows; data migration, not separate file).

Estimated: 1 engineer-week.

### 11.2 Phase 1.B: Gordon libraries + parser foundation

- `src/lib/pantry/types.ts` — `PantryItem`, `PantryCategory`, `PantryUnit`, `PantryLocation`, `PantryAddedVia` enums + Zod schemas.
- `src/lib/pantry/normalizePantryItem.ts` — text → structured shape via cascade lookup (no LLM call; deterministic).
- `src/lib/pantry/expirationEstimator.ts` — given category + location + optional package label, returns `{ date, source, confidence }`.
- `src/lib/pantry/cascadeLookup.ts` — wraps the shared cascade for pantry-context lookup with caching.
- `src/lib/pantry/getPantryForSuggestion.ts` — Phase 4 will consume this; Phase 1 lays the canonical query contract per the 170f single-read-path pattern (Blueprint Issue #5).
- `PARSER_VERSION = 'pantry.gordon.v1.0.0'` constant.

Gordon long-poles:
- Receipt scan Vision API system prompt (~800-1,100 lines, in `docs/prompts/prompt-170p-phase-1-receipt-system-prompt-draft-YYYY-MM-DD.md`)
- Receipt scan curated test set (100 receipts across 6 store templates × variant conditions)
- `pantry_category_default_shelf_lives` 78-row seed (~3 days of Gordon authoring)
- Manual entry NLU prompt extension on top of the 170m Haiku prompt (reuses architecture; adds pantry-specific intents)

Estimated: 3 engineer-weeks + 2 weeks Gordon authoring (parallel).

### 11.3 Phase 1.C: API routes

The 9 routes from §6, each in the established 170f/170l/170m pattern. Auth gate + Zod schema + admin client gated post-ownership-check + feature-flag 503 + structured safeLog + idempotency where called out.

Estimated: 2 engineer-weeks.

### 11.4 Phase 1.D: UI surfaces

- `src/components/pantry/PantryTab.tsx` — top-level tab orchestrator
- `src/components/pantry/PantryItemCard.tsx` — list card with quick quantity buttons
- `src/components/pantry/PantryItemDetailSheet.tsx` — modal/sheet detail view
- `src/components/pantry/PantryItemEditorForm.tsx` — create/edit form
- `src/components/pantry/PantryReceiptScanFlow.tsx` — capture + analyze + review screen
- `src/components/pantry/PantryManualEntryModal.tsx` — text + barcode + common-items
- `src/components/pantry/DashboardPantryWidget.tsx` — 4-up expiring-soon card
- `src/components/pantry/PantrySettingsSection.tsx` — Settings accordion
- Routes: `src/app/(app)/(consumer)/pantry/page.tsx` mounts the tab; Dashboard + Settings page edits mount the widget + section.

Hannah deliverables (Blueprint long-poles):
- Pantry tab wireframes (mobile + desktop) — 5-7 surfaces
- Receipt scan flow wireframes (capture state → progress state → review state → confirmation state)
- Item detail sheet wireframes (consumed input + edit affordances)
- Empty state illustration
- Cold-start onboarding tooltip (single-screen)

Estimated: 4 engineer-weeks + 1.5 weeks Hannah (parallel).

### 11.5 Phase 1.E: Pre-launch audit + smoke + ratification gate

- Jeffery pre-launch review chain (security-advisor + performance-advisor + michelangelo + hannah + gordon).
- Localhost smoke per `[[feedback_launch_localhost]]`.
- Vercel flag flip checklist.
- Receipt scan accuracy validation against the 100-receipt curated test set (must hit 90% per-item recall on clean photos + 70% on low-light).
- Adoption funnel telemetry baseline (zero state captured before flag flip).

Estimated: 2 engineer-weeks total (parallel with Hannah finishing UI polish).

### 11.6 Total Phase 1 runway

| Slice | Engineer-weeks |
|---|---|
| 1.A schema + migrations | 1 |
| 1.B parser foundation | 3 (+ 2 Gordon parallel) |
| 1.C API routes | 2 |
| 1.D UI surfaces | 4 (+ 1.5 Hannah parallel) |
| 1.E audit + smoke | 2 |
| **Total** | **12 engineer-weeks** |

With 2 engineers in parallel (UI track + backend track) the calendar runway is ~8 weeks. With 1 engineer the calendar runway is ~12 weeks. Blueprint clears in 2-3 weeks before build kicks off.

Optimistic ship target: Nov 2026 (Blueprint Aug, build Sep-Oct, ship Nov).

## 12. Acceptance criteria

Phase 1 ships only when:

1. All 5 tables created with documented columns + indexes + RLS + triggers; verified via `apply_migration` then `list_tables` round-trip.
2. `pantry_category_default_shelf_lives` seeded with 78 rows.
3. 9 API routes operational; each route 401s without auth + 503s with kill switch off + returns documented response shape with auth + flag on.
4. Manual entry text path: typed "2 lbs ground turkey" produces 1 pantry item with `quantity=2, unit='lb', category='meat_seafood', canonical_name='ground turkey'`.
5. Manual entry barcode path: scanning a UPC for "Annie's Mac and Cheese" returns OFF cache product data and inserts a pantry item with brand, cascade_match_source='off_cache'.
6. Receipt scan path: a clean Whole Foods receipt photo with 8 items returns 7 or 8 items detected at `parser_confidence_avg >= 0.85`; review screen renders; "Save all" creates 8 pantry items in a single transaction.
7. Receipt scan latency: Vision API call returns within 12 seconds on a 1.5MB JPEG over a stable connection. Timeout at 30 seconds.
8. Pantry tab renders the items grouped by location with filter chips functional.
9. Item detail sheet shows all fields; consume action decrements quantity + logs the event; delete prompts confirm + hard-deletes.
10. Dashboard widget shows top 4 expiring items when count > 0; hides entirely when 0.
11. Settings section toggles persist to `pantry_user_preferences`.
12. 5 Helix events fire correctly with documented caps.
13. Telemetry sessions insert at 20% sampling; user_hash never reveals user_id.
14. Practitioner test account (consumer-portal scope only via 170i): pantry tab does not appear in the practitioner-facing navigation.
15. No em or en dashes in any user-facing copy.
16. No emojis in any code file.
17. Brand tokens used consistently (Navy + Card + Teal; Orange reserved for expiration warnings).
18. Lucide React icons strokeWidth 1.5 throughout.
19. Mobile bottom-sheet pattern matches desktop modal pattern.
20. Receipt scan curated test set passes 90% per-item recall on clean photos + 70% on low-light.

## 13. Helix events reaffirmation

Reaffirming the 5 Phase 1 Helix events (per §6):

```
pantry_receipt_scanned          5 pts (1/day cap)
pantry_item_added_manually      1 pt  (20/day cap)
pantry_item_consumed            1 pt  (50/day cap)
pantry_expiration_avoided       2 pts (5/day cap)
pantry_running_low_acknowledged 1 pt  (5/day cap)
```

Total maximum daily Phase 1 Helix earn: 5 + 20 + 50 + 10 + 5 = **90 points**. Sized to be meaningful (the daily NutriVision earn ceiling is comparable) without dominating.

## 14. Open questions for Gary (pre-Blueprint resolution)

These need answers before Blueprint kicks off in Aug 2026.

| # | Question | Recommendation |
|---|---|---|
| Q1 | Tab insertion position: should Pantry sit between Nutrition and Wellness Analytics or replace one of them? | Insert as new tab. No replacement. |
| Q2 | Phase 1 supports manual + receipt; should "+ Add from common items" sub-path 3 also surface starter common items for cold-start users? | Yes; Gordon curates 24 starter items (eggs, milk, bread, butter, etc.) shown when user has fewer than 5 items in pantry. |
| Q3 | Should the receipt scan privacy disclosure be a one-time modal before first scan OR a checkbox on the scan screen each time? | One-time modal with persistent acknowledgment in `pantry_user_preferences.receipt_scan_privacy_acknowledged`. |
| Q4 | If a user adds the same item twice (eg "2 lbs ground turkey" then "1 lb ground turkey"), should we merge or keep separate rows? | Keep separate rows; each row is a discrete purchase or addition event. Merge logic deferred to Phase 4 when consumption-based recommendations might benefit. |
| Q5 | Should we offer a "Mark all as consumed" action when the user adds a new receipt scan from the same store within 7 days (assuming prior groceries were eaten)? | No; Phase 1 conservative. Deferred to Phase 1.1 supplement after empirical evidence of user demand. |
| Q6 | Phase 1 ships zero photos on pantry items. Should the Dashboard widget show category-based illustration placeholders (eggs → egg illustration) or generic gray box? | Generic gray box for Phase 1. Category illustrations are Phase 3 polish (after Hannah designs them). |
| Q7 | Capacitor push notifications for expiration warnings: should the iOS app prompt for notification permission on first pantry tab visit, on first item added, or only when user toggles preference on? | Only when user explicitly toggles the preference on. Avoids permission-prompt fatigue. |
| Q8 | When 170c ratifies and the contains_allergens backfill runs, should we surface the allergen flag chips on existing pantry items immediately or wait for the user to acknowledge an "Allergen info now available" prompt? | Surface immediately with no prompt; opt-out via Settings if user does not want allergen surfacing. |

## 15. Composes-with checklist

Reaffirming explicit compose-with linkage to prior prompts. Each cell is in scope of the Blueprint dependency review.

| Prompt | Phase 1 dependency posture |
|---|---|
| 170 base | Cascade lookup; no new contract |
| 170a + supplements | None |
| 170b curated foods | Reuse + additive curation list (Gordon long-pole) |
| 170c dietary filter | Feature-flag fallback v1; backfill when ratifies |
| 170d | None |
| 170e | None |
| 170f recipe library | Schema only (shared lowercase canonical convention); no read join until Phase 4 |
| 170g | None |
| 170h body opt-state | None Phase 1; soft Phase 4 |
| 170i practitioner | EXPLICIT EXCLUSION (consumer-only) |
| 170j voice edit | None |
| 170k i18n | None Phase 1; locale-aware category names deferred to 170k composition |
| 170l barcode + OFF | Direct component reuse + cache reuse |
| 170m Quick Log | Allergen vocab reuse + NLU pattern reuse |
| 170n Voice-Native | None |
| 170o Hydration | None |
| 170p-supplement-2/3/4 | Provides foundation schema + cascade |
| 170q meal planning | Provides schema for Phase 4 + 170q composition |
| 171a Mobile Hero | Reuse `MobileHeroBackground` |
| 171b BOS caffeine | Provides schema for nutrient density per serving |

## 16. Pre-Blueprint Gordon long-pole status

| Deliverable | Estimate | Authoring window |
|---|---|---|
| Receipt Vision system prompt (1st draft) | ~1,000 lines | Sep 2026 (3 weeks) |
| Receipt curated test set (100 receipts) | 100-150 hrs labeling | Aug-Sep 2026 (parallel; 4 weeks) |
| Category default shelf-life seed (78 rows) | 1 week | Aug 2026 |
| Common-items starter set (24 items) | 2-3 days | Aug 2026 |
| 170c-dependent allergen classifier audit | n/a until 170c ratifies | TBD |

These long-poles run in parallel with Blueprint and Phase 1.A schema work, not sequentially.

## 17. Sequencing relative to launch

Today (2026-06-01) is launch day +0. 170f Phase 1 shipped same day. Pantry Foundation Blueprint kickoff target Aug 2026 = launch +60 days. Ship target Nov 2026 = launch +150 days.

This is consistent with the phase split memo's Q4 2026 placement for Phase 1.

170p Phase 1 has NO build authorization yet. This document is the Blueprint-ready spec, NOT a build authorization. Build kicks off only when:
1. 170c ratification status confirmed (ratified or feature-flag posture confirmed)
2. Engineering capacity for 2 engineers in parallel confirmed
3. Gordon long-pole deliverables on track per §16
4. Gary writes "begin 170p Phase 1 build" or equivalent explicit go

## 18. Filed-not-built reaffirmation

This document is FILED but NOT YET AUTHORIZED FOR BUILD per §1.3 of the standing prompt protocol. Filing serves three purposes:

1. **Staffing visibility**: engineering and Gordon know the full Phase 1 scope and can plan capacity.
2. **Dependency clarity**: 170q (Q4 2026 alongside 170p-1), 170c (composes with Phase 1 fallback), 170f (provides schema convention) all have a written reference to align against.
3. **Blueprint kickoff readiness**: when Gary authorizes build in Aug 2026, the spec is already comprehensive enough that Blueprint reviews resolve concerns rather than discover scope.

Filing date: 2026-06-01. Build authorization date: TBD (target Aug 2026). Ship target: Nov 2026.

## 19. Related

- `prompt-170p-filed-2026-05-31.md` (superseded monolithic filing)
- `project_prompt_170p_phase_split.md` (ratified memo)
- `prompt-170p-supplement-2-2026-06-01.md` (Email Forwarding; filed alongside)
- `prompt-170p-supplement-3-2026-06-01.md` (Additional Inputs; filed alongside)
- `prompt-170p-supplement-4-2026-06-01.md` (Meal Suggestion Engine; filed alongside)
- `project_prompt_170f_shipped.md` (170f Phase 1 SHIPPED 2026-06-01; provides recipe schema convention)
- `project_prompt_170l_shipped.md` (170l SHIPPED; provides barcode + OFF cache reuse)
- `project_prompt_170m_shipped.md` (170m SHIPPED; provides allergen vocab + NLU pattern)
- `feedback_jeffery_pre_launch_review.md` (Phase 1.E audit gate)
- `feedback_launch_localhost.md` (Phase 1.E localhost smoke gate)
- `feedback_no_unsolicited_changes.md` (no build until explicit Gary go)
