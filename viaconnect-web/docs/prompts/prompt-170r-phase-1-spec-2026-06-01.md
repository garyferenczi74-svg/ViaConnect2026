# Prompt 170r Phase 1: Educational Content Foundation

**Filed:** 2026-06-01 (launch +0)
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Sep 2026 (post-launch + 60 days).
**Supersedes:** Monolithic single-phase framing of original spec per Option B ratification 2026-06-01.
**Owner agent:** Gordon (60-80 card content authoring + relevance scoring + variable substitution + bioavailability narrative bridge)
**Build agent:** Michelangelo
**UX agent:** Hannah (Learn subsection nested under Wellness Analytics + Dashboard "Learn today" card + 2-3 inline surfaces + long-form a11y)
**Co-owners:** Arnold (engagement telemetry + 7 admin rollups), Kelsey (FDA-aligned content review; internal-only per Ask #1 ratification)
**Orchestrator:** Jeffery
**Hard-blocked-by:** None for Phase 1 (170c posture is permissive-defaults; 170h is soft-dep with graceful degradation)
**Soft-dep:** 170h shipping; if not yet shipped at Phase 1 ship, insight cross-reference UX (§7.4) suppresses; rest of Phase 1 unaffected
**Provides for supplement-2:** Schema + relevance engine + Learn surface mount; supplement-2 layers email digest + remaining cards + real-time triggers + remaining inline surfaces

## 0. Summary

Phase 1 ships the smallest shippable educational content foundation: 60-80 Gordon-authored content cards (bioavailability category 20-25 + popular nutrient education 20-25 + foundation cards 15-30), a relevance scoring engine that surfaces top-1 daily, a Learn subsection nested under the existing Wellness Analytics tab (NOT a new top-level tab per Ask #6 ratification), a Dashboard "Learn today" card, and 2-3 inline content surfaces (meal save + insight detail when 170h shipped + recipe view).

Six new Supabase tables, five kill switches, five Helix events, seven admin rollups, one new cron job. The strategic anchor is the Bioavailability and Absorption category of 20-25 cards including the foundational "10x to 28x range explained" card that bridges Farmceutica's dual liposomal-micellar delivery story to user-facing education.

Headline behavioral metric at +90 days post-Phase-1-ship: content_bioavailability_category_completion_rate above 60% (per spec §19.4). Below 30% triggers Hannah UX review; below 15% triggers Phase 2 (supplement-2) deprioritization.

## 1. What it is

A server-side surfacing engine + content library + Learn surface. Each content card belongs to one of 8 categories, has stable Kelsey-reviewed text, deterministically substitutes per-user variables (iron intake from meal_items, CAQ phase 4 flags, etc.) into placeholder slots, and surfaces to users when the scoring engine determines relevance above a threshold.

Phase 1 ships:
1. Content schema (6 tables; the full data model so supplement-2 doesn't add tables).
2. Relevance scoring engine + sharded nightly cron.
3. Variable substitution + conditional sections.
4. Content authoring pipeline (markdown → DB build script + linter + version manager).
5. Learn subsection under Wellness Analytics tab.
6. Dashboard "Learn today" card.
7. 2-3 inline surfaces (meal save + insight detail [if 170h shipped] + recipe view).
8. Settings > Education subsection.
9. 60-80 Kelsey-reviewed published cards.

Phase 1 does NOT ship (filed for 170r-supplement-2):
- Email digest infrastructure + weekly cron
- Remaining 60-90 cards (lifestyle + condition + genetic + supplement mechanism)
- Real-time triggers (post-CAQ flag immediate surface)
- Pantry inline surface (gated on 170p Phase 1 ship)
- Plan candidate inline surface (gated on 170q ship)
- 170u GENEX360 SNP-aware variants
- 170w bioavailability-threaded coaching

## 2. Why this matters at Phase 1

Two strategic claims independent of supplement-2:

1. **Bioavailability narrative bridge ships at Phase 1.** The 20-25 bioavailability cards including the "10x to 28x" foundational explainer go live with Phase 1. Users start encountering substantive bioavailability education within 60-90 days post-launch. This is the strongest narrative-to-product bridge in the consumer experience and does not need to wait for the email digest infrastructure.

2. **Learn surface ships at Phase 1.** Users have a dedicated destination for educational content. Even without the proactive email digest, users can browse, follow topics, save for later, and engage with content cards via the Learn subsection + Dashboard card + inline surfaces.

Headline target: 30-50% of users view at least one content card in their first 30 days post-Phase-1-ship. Bioavailability category completion rate above 60%.

## 3. Data model

Six tables, all append-only migrations. Full Phase 2-ready schema so supplement-2 adds zero tables.

### 3.1 `content_cards`

```sql
CREATE TABLE IF NOT EXISTS public.content_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  lead_text TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  key_takeaways_jsonb JSONB,
  what_to_do_next_jsonb JSONB,
  related_card_ids UUID[] NOT NULL DEFAULT '{}',
  citations_jsonb JSONB,
  fda_disclaimer_variant TEXT NOT NULL DEFAULT 'standard',
  primary_category TEXT NOT NULL CHECK (primary_category IN (
    'nutrient_education', 'bioavailability_and_absorption',
    'macronutrient_patterns', 'food_synergies_and_antagonists',
    'genetic_education', 'lifestyle_factors',
    'condition_relevant_education', 'supplement_mechanism')),
  secondary_tags TEXT[] NOT NULL DEFAULT '{}',
  triggering_caq_flags_jsonb JSONB,
  triggering_meal_patterns_jsonb JSONB,
  triggering_supplement_patterns_jsonb JSONB,
  relevance_score_weights_jsonb JSONB,
  prerequisite_card_ids UUID[] NOT NULL DEFAULT '{}',
  safety_mode_filter TEXT NOT NULL DEFAULT 'surface' CHECK (safety_mode_filter IN (
    'surface', 'do_not_surface_safety_mode', 'surface_only_safety_mode')),
  medical_caution_level TEXT NOT NULL DEFAULT 'low' CHECK (medical_caution_level IN (
    'low', 'medium', 'high')),
  bioavailability_bridge_card BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_reading_time_minutes INT,
  word_count INT,
  version INT NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  kelsey_compliance_review_id TEXT,
  gary_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  gary_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_cards_published_category
  ON public.content_cards(primary_category, last_reviewed_at DESC)
  WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_cards_slug
  ON public.content_cards(slug) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_cards_secondary_tags
  ON public.content_cards USING GIN (secondary_tags) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_cards_bioavailability_bridge
  ON public.content_cards(bioavailability_bridge_card) WHERE is_published = TRUE AND bioavailability_bridge_card = TRUE;

ALTER TABLE public.content_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_cards_published_readable" ON public.content_cards;
CREATE POLICY "content_cards_published_readable"
  ON public.content_cards FOR SELECT
  USING (is_published = TRUE AND auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS content_cards_updated_at ON public.content_cards;
CREATE TRIGGER content_cards_updated_at
  BEFORE UPDATE ON public.content_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Design notes per Concern §9 (memorial):** triggers stored inline as JSONB on the card row. Trade-off acknowledged: trigger tuning requires card re-publish. For Phase 1's 60-80 cards this is manageable; if cumulative trigger tuning friction proves high in production, supplement-2 can migrate to a separate `content_card_triggers` table.

### 3.2 `content_card_drafts`

```sql
CREATE TABLE IF NOT EXISTS public.content_card_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_card_id UUID REFERENCES public.content_cards(id) ON DELETE SET NULL,
  draft_slug TEXT NOT NULL,
  draft_title TEXT NOT NULL,
  draft_body_markdown TEXT NOT NULL,
  draft_metadata_jsonb JSONB,
  draft_state TEXT NOT NULL DEFAULT 'gordon_authoring' CHECK (draft_state IN (
    'gordon_authoring', 'gordon_review', 'kelsey_review',
    'linter_check', 'gary_approval', 'approved',
    'rejected', 'published')),
  rejection_reason TEXT,
  kelsey_review_notes TEXT,
  linter_check_results_jsonb JSONB,
  gordon_author_id UUID,
  kelsey_reviewer_id UUID,
  gary_approver_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_card_drafts_state
  ON public.content_card_drafts(draft_state, updated_at DESC);

ALTER TABLE public.content_card_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drafts_service_role_only" ON public.content_card_drafts;
CREATE POLICY "drafts_service_role_only"
  ON public.content_card_drafts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS content_card_drafts_updated_at ON public.content_card_drafts;
CREATE TRIGGER content_card_drafts_updated_at
  BEFORE UPDATE ON public.content_card_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 3.3 `user_content_views`

```sql
CREATE TABLE IF NOT EXISTS public.user_content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_card_id UUID NOT NULL REFERENCES public.content_cards(id) ON DELETE CASCADE,
  content_card_version INT NOT NULL,
  surfacing_surface TEXT NOT NULL CHECK (surfacing_surface IN (
    'dashboard_learn_today', 'learn_subsection',
    'inline_meal_save', 'inline_recipe', 'inline_insight',
    'inline_pantry', 'inline_plan', 'email_digest',
    'direct_link', 'search')),
  scroll_percent_reached NUMERIC(5,2) NOT NULL DEFAULT 0,
  marked_as_read BOOLEAN NOT NULL DEFAULT FALSE,
  saved_for_later BOOLEAN NOT NULL DEFAULT FALSE,
  shared BOOLEAN NOT NULL DEFAULT FALSE,
  reading_time_seconds INT,
  device_kind TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_content_views_user_card_viewed
  ON public.user_content_views(user_id, content_card_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_content_views_user_recent
  ON public.user_content_views(user_id, viewed_at DESC);

ALTER TABLE public.user_content_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_content_views_owner_all" ON public.user_content_views;
CREATE POLICY "user_content_views_owner_all"
  ON public.user_content_views FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3.4 `user_content_dismissals` + `user_content_topic_follows`

```sql
CREATE TABLE IF NOT EXISTS public.user_content_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_card_id UUID REFERENCES public.content_cards(id) ON DELETE CASCADE,
  dismissed_topic TEXT,
  dismissal_reason TEXT CHECK (dismissal_reason IN (
    'not_relevant', 'too_basic', 'too_advanced', 'seen_similar', 'other')),
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_user_content_dismissals_user_active
  ON public.user_content_dismissals(user_id, expires_at) WHERE expires_at > NOW();

ALTER TABLE public.user_content_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dismissals_owner_all" ON public.user_content_dismissals;
CREATE POLICY "dismissals_owner_all"
  ON public.user_content_dismissals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_content_topic_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_tag TEXT NOT NULL,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_content_topic_follows
  ON public.user_content_topic_follows(user_id, topic_tag);

ALTER TABLE public.user_content_topic_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topic_follows_owner_all" ON public.user_content_topic_follows;
CREATE POLICY "topic_follows_owner_all"
  ON public.user_content_topic_follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3.5 `content_surfacing_sessions` (telemetry)

```sql
CREATE TABLE IF NOT EXISTS public.content_surfacing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  cards_evaluated INT NOT NULL,
  cards_above_threshold INT NOT NULL,
  cards_surfaced INT NOT NULL,
  top_card_id UUID REFERENCES public.content_cards(id) ON DELETE SET NULL,
  top_card_relevance_score NUMERIC(5,4),
  user_has_followed_topics BOOLEAN NOT NULL,
  user_has_dismissed_recently BOOLEAN NOT NULL,
  surfacing_session_outcome TEXT NOT NULL CHECK (surfacing_session_outcome IN (
    'surfaced_and_viewed', 'surfaced_not_viewed',
    'no_surface_relevance_low', 'no_surface_recency_penalty',
    'no_surface_dismissal', 'no_surface_frequency_cap')),
  scoring_engine_latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surfacing_sessions_created
  ON public.content_surfacing_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surfacing_sessions_outcome
  ON public.content_surfacing_sessions(surfacing_session_outcome);

ALTER TABLE public.content_surfacing_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surfacing_sessions_service_role_only" ON public.content_surfacing_sessions;
CREATE POLICY "surfacing_sessions_service_role_only"
  ON public.content_surfacing_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

Phase 1 first 60 days sampling: 100%. Drops to 20% when surfacing quality stabilizes (Hannah + Arnold judge).

## 4. Surfacing engine + relevance scoring

### 4.1 Scoring algorithm (spec §6.1 verbatim)

```
relevance_score =
  caq_trigger_score * w_caq +
  meal_pattern_trigger_score * w_meal +
  supplement_pattern_trigger_score * w_supp +
  insight_link_score * w_insight +
  user_topic_follow_score * w_follow -
  recency_penalty -
  dismissal_penalty
```

Default weights (Gordon-tuned + env-tunable via CONTENT_SURFACING_WEIGHTS_JSON):
- w_caq = 0.30
- w_meal = 0.20
- w_supp = 0.15
- w_insight = 0.20
- w_follow = 0.15

Threshold for Dashboard "Learn today" surface: 0.60. Threshold for Learn subsection display: 0.30 (sorted by relevance).

**Permissive-defaults posture (per Ask #2):** in Phase 1 the surfacing engine does NOT apply the safety_mode_filter. Cards with safety_mode_filter = 'do_not_surface_safety_mode' STILL surface to all users. When 170c ratifies, supplement-2 wires the filter in. Phase 1 documents this risk acceptance explicitly in the Settings > Education subsection ("These materials are general education. Talk to your healthcare provider before changing your nutrition program.").

**Soft-dep 170h posture (per Ask #3):** insight_link_score is computed against existing 170h insights when 170h is shipped; if 170h is not yet shipped at Phase 1 ship, w_insight defaults to 0 and the term contributes nothing. Total score still functional from CAQ + meal + supplement + follow signals.

### 4.2 Sharded nightly cron (per Concern §6)

Per spec §6.2 the cron runs at midnight in user's locale. At 100k users with p50 latency 500ms, sequential processing requires ~14hr; sharding mandatory.

Phase 1 cron architecture: 24 shards by `user_id` UUID prefix; each shard processes ~1/24 of active users; shards run at staggered hours (hour 0 = shard 0, hour 1 = shard 1, etc.) so the user's "today" card is computed before their morning Dashboard load. Edge Function execution per shard < 30s with 100k/24 ≈ 4,200 users × 500ms ≈ 35 minutes — exceeds Edge Function timeout.

Phase 1 mitigation: further decompose each hourly shard into per-1k-user sub-batches; orchestrate via a queue table `content_surfacing_queue` (consumed by the cron). Each Edge Function invocation processes one 1k-user batch in < 30s.

Pre-launch at 10k-50k users: 1 shard per hour ≈ 400-2,000 users × 500ms ≈ 3-17 minutes; fits in 30s Edge Function execution if optimized. Defer the queue-table sharding to Blueprint scoping.

### 4.3 Cold-start strategy (gap in original spec; flagged per Concern §8)

A new user with no CAQ completed + no meal logs has no triggering signals. Phase 1 cold-start strategy:

- If user has completed CAQ Phase 1 (demographics): default surface = bioavailability-fundamentals foundation card.
- If user has completed CAQ Phase 4 (health concerns) with NO flags: rotate through 5 popular nutrient cards (vitamin D + magnesium + iron + omega-3 + B12).
- If user has logged at least 1 meal: surface trigger from meal pattern.
- If user has no profile data + no meals: Dashboard "Learn today" card hidden.

Cold-start defaults persist until the user has meaningful signals (>5 meal logs OR CAQ Phase 4 complete).

## 5. Variable substitution

### 5.1 Variables available

Per spec §5.1 verbatim:

| Variable | Source |
|---|---|
| `{user_first_name}` | profile |
| `{user_caq_phase_4_iron_status}` | CAQ Phase 4 |
| `{iron_g_30d_average}` | meal_items aggregation |
| `{percent_of_rda_iron}` | computed |
| `{supplement_iron_adherence_30d}` | supplement log |
| `{recent_170h_iron_insight}` | 170h insight (Phase 1 fallback "" if 170h not shipped) |
| `{user_sex}, {user_age_band}, {user_activity_level}` | CAQ Phase 1 |
| `{user_dietary_pattern}` | CAQ Phase 6 |
| `{user_practitioner_count}` | 170i scope sharing |

`{genex360_hfe_status}` deferred to 170u when that prompt ships.

### 5.2 Substitution safety (spec §5.2)

Textual replacement only. No code execution. No HTML injection. Numeric values formatted to spec (1 decimal for mg; integer for percent). String values bounded (first name truncated to 20 chars).

Substitution failures default to documented fallback text per template; template-author authors fallbacks during card drafting.

### 5.3 Conditional sections (spec §5.3)

Simple syntax:

```
{IF user_caq_phase_4_iron_status == 'flagged'}
Your health assessment indicated possible iron concerns...
{ENDIF}

{IF user_dietary_pattern == 'vegetarian' OR user_dietary_pattern == 'vegan'}
Plant-based iron (non-heme iron) absorbs at lower rates...
{ENDIF}
```

Equality + OR/AND only. No nesting, no arithmetic, no string manipulation. **Templating vocabulary freeze deferred to Blueprint per Ask #7.** Phase 1 Blueprint deliverable: locked variable list + locked conditional operators + fallback structure documentation.

## 6. Content authoring pipeline

### 6.1 Markdown drafts in repo

`content/educational-cards/<category>/*.md` per spec §17. Each card has frontmatter metadata + markdown body. Two-source-of-truth model (md + DB) acknowledged; DB is the published source of truth, md is the draft source. Manual DB edits are forbidden post-publish; corrections flow through markdown + re-publish.

### 6.2 Publish build script

`scripts/content/publish-cards-from-markdown.ts` reads md files + validates frontmatter + runs the clinical-claim linter + validates citations + inserts/updates `content_cards` rows. Build fails on linter violations.

Linter rules:
- No diagnose/treat/cure language
- Required FDA disclaimer footer present
- Bioavailability copy locked at "10x to 28x" verbatim
- No em or en dashes anywhere in body (Concern §11)
- No emojis
- Bio Optimization verbatim
- All citations resolve to DOI or PubMed ID

### 6.3 Kelsey internal review (per Ask #1)

**RISK ACCEPTED:** No outside counsel. Kelsey is sole reviewer for FDA compliance + clinical-claim linter + supplement claim verification + bioavailability category substantiation.

Kelsey review per card:
- Read full draft.
- Verify FDA disclaimer presence + variant matches content type.
- Verify no prescriptive/diagnostic language.
- For bioavailability bridge cards: verify LipoCellTech / Swiss Biopharm / Pharmako study citations resolve to actual study documents (peer-reviewed where possible; flag substantiation strength when not peer-reviewed).
- Document review in `content_card_drafts.kelsey_review_notes`.

Kelsey block authority: any card Kelsey rejects does not publish. Override requires Gary.

### 6.4 Gary final approval (high-caution cards)

Cards with `medical_caution_level = 'high'` (condition_relevant_education + most bioavailability bridge cards) require explicit Gary sign-off in `content_card_drafts.gary_approver_id`. Phase 1 Gary-approval queue includes:

- The "10x to 28x range explained" foundational card (mandatory Gary approval per spec §7.3)
- 5-8 other bioavailability bridge cards making specific product claims
- 2-3 condition-relevant cards in Phase 1 scope

Total Gary review hours estimate: 3-5 hours pre-Phase-1-ship.

### 6.5 Periodic re-review (12-month cycle)

Annual Kelsey re-review of every published card. Phase 1 ships the schedule infrastructure (`last_reviewed_at` field + supplement-2 ships the cron that emails Kelsey 60-day-warning reminders).

## 7. UI surfaces

Five UI surfaces in Phase 1. Per Ask #6 ratification, Learn is NESTED under existing Wellness Analytics tab; NOT a new top-level Consumer nav tab.

### 7.1 Learn subsection (under Wellness Analytics)

Route: `/wellness-analytics/learn`.

Mount point: existing Wellness Analytics tab gains a "Learn" subsection alongside its existing sections. Tab nav unchanged at the Consumer portal level.

Layout (mobile-first):
- Hero: "Learn from your patterns. Personalized education based on your health profile."
- **Today's card** at top (when surfacing engine returned a card): large hero card with title + hook + lead + Read more CTA + Save for later + Not interested.
- **Recently read** horizontal scroll (last 30 days).
- **Followed topics** sections per topic.
- **Browse by category** 8-card grid for the 8 categories.
- **Browse all library** link to paginated library page at `/wellness-analytics/learn/library`.

### 7.2 Dashboard "Learn today" card

A new card on `/dashboard` placed below the existing nutrition score card + 170p Phase 1 pantry widget.

Header: "Today's learning."
Body: hero card excerpt from today's surfaced content.
CTA: "Read this" → opens content card full view at `/wellness-analytics/learn/cards/[slug]`.
Dismiss affordance.

Hidden when no card meets relevance threshold for today OR `pantry_user_preferences.dashboard_widget_enabled = FALSE` equivalent for content (i.e., user toggled "Show Learn today on Dashboard" off in Settings).

### 7.3 Content card full view

Route: `/wellness-analytics/learn/cards/[slug]`.

Sections:
- Title + subtitle + lead
- Body (markdown rendered server-side to safe HTML)
- Key takeaways
- What to do next
- Related cards
- Citations
- FDA disclaimer
- Reading progress indicator (top sticky bar)
- Save / share / follow topic / dismiss affordances
- "Mark as read" action

### 7.4 Inline content surfaces (2-3 in Phase 1)

Three inline surfaces in Phase 1:

**Meal save inline surface:** when a user saves a meal that strongly matches a content trigger (e.g., logs an iron-rich meal while iron is a flagged CAQ concern), a small "Learn more about iron" link appears in the meal save success state. Dismissible.

**Insight detail inline surface (CONDITIONAL on 170h shipped at Phase 1 ship):** insight cards include "Learn more about this" link to the matched content card. If 170h not shipped, this surface is suppressed.

**Recipe view inline surface (CONDITIONAL on 170f Phase 1 SHIPPED):** 170f Phase 1 shipped 2026-06-01 so this surface is active at Phase 1 ship. Recipes can include inline "Learn about [nutrient]" links for prominent nutrients in the recipe.

Phase 1 does NOT ship: pantry detail inline surface (gated on 170p Phase 1 ship Q4 2026) + plan candidate inline surface (170q not filed yet). Both filed for supplement-2 or later.

### 7.5 Settings > Education subsection

New section in `/settings` consumer settings.

Controls:
- Followed topics list (tap to unfollow)
- Dismissed topics list (tap to un-dismiss)
- Saved for later cards
- Reading history (chronological with completion percentage)
- Dashboard "Learn today" toggle (default ON)
- Inline content surfaces toggle (default ON)
- Surfacing frequency (low / medium / high; default medium)
- Permissive-defaults transparency line: "These materials are general education. They surface based on your profile and patterns. Adjust your preferences at any time."

NOT in Phase 1 settings (deferred to supplement-2): weekly email digest opt-in.

## 8. API surface

Phase 1 adds 9 routes under `/api/content/*`. All gated by `EDUCATIONAL_CONTENT_ENABLED` master flag (default false until Phase E flip; splits into `EDUCATIONAL_CONTENT_ENABLED` server + `NEXT_PUBLIC_EDUCATIONAL_CONTENT_ENABLED` client per 170f / 170p Phase 1 precedent).

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/content/today` | User's today-surfaced card |
| GET | `/api/content/cards/[slug_or_id]` | Full card with personalized variables |
| POST | `/api/content/cards/[id]/view` | Log view event |
| POST | `/api/content/cards/[id]/scroll-progress` | Update scroll position |
| POST | `/api/content/cards/[id]/save-for-later` | Bookmark |
| POST | `/api/content/cards/[id]/share` | Log share |
| POST | `/api/content/cards/[id]/dismiss` | Dismiss with reason |
| POST | `/api/content/topics/follow` | Follow topic |
| GET | `/api/content/library` | Paginated library |

PUT `/api/content/preferences` lives in `/api/settings/education` for consistency with prior consumer-settings APIs.

All follow the 170f / 170p auth + admin client + Zod safeParse + feature-flag 503 pattern.

## 9. Helix events

Phase 1 ships 5 Helix events (drops `education_email_digest_subscribed` to supplement-2).

| Event | Points | Cap | Trigger |
|---|---|---|---|
| `education_content_card_read` | 1 | 10/day | View logged with > 25% scroll |
| `education_content_card_completed` | 2 | 5/day | Scroll > 90% |
| `education_content_card_shared` | 3 | 3/day | Share event logged |
| `education_topic_followed` | 1 | 5/day | Topic follow created |
| `education_bioavailability_card_completed` | 3 | 5/day | Completion of any `bioavailability_bridge_card = TRUE` card; HEADLINE strategic metric |

Maximum daily Phase 1 Helix earn: 10 + 10 + 9 + 5 + 15 = **49 points**. Within Concern §10 ceiling envelope.

## 10. Kill switches

Five kill switches in Phase 1:

1. `EDUCATIONAL_CONTENT_ENABLED` (master server) + `NEXT_PUBLIC_EDUCATIONAL_CONTENT_ENABLED` (master client)
2. `CONTENT_DASHBOARD_TODAY_CARD_ENABLED`
3. `CONTENT_INLINE_SURFACES_ENABLED`
4. `CONTENT_BIOAVAILABILITY_PRODUCT_LINKS_ENABLED` — gates contextual Farmceutica product links in bioavailability cards; can be disabled for regulatory review periods. Per Ask #1 risk acceptance, this flag is the primary off-ramp if FTC scrutiny materializes post-launch.
5. `CONTENT_NIGHTLY_CRON_ENABLED` — kills the nightly surfacing computation entirely; Dashboard + Learn show only follow + library views

Phase 2 (supplement-2) adds: `CONTENT_EMAIL_DIGEST_ENABLED` + `CONTENT_REALTIME_TRIGGERS_ENABLED`.

## 11. Composition

### 11.1 With 170 base (cascade)

Content templates reference user meal data via the cascade. Variables like `{iron_g_30d_average}` are computed from `meal_items` aggregations.

### 11.2 With 170c (permissive defaults per Ask #2)

Phase 1 does NOT apply safety_mode_filter. ED safety mode users see content cards including weight/optimization-adjacent material that 170c would normally filter. **RISK ACCEPTED.** Supplement-2 wires the filter in when 170c ratifies.

The clinical-claim linter from spec §170h §13.5 is NOT integrated in Phase 1 because it's a 170c artifact and 170c is filed-not-ratified. Phase 1 ships its own internal linter rules (FDA disclaimer + bioavailability copy + em/en-dash + emoji + Bio Optimization verbatim) but does not consume the 170c linter library. **RISK ACCEPTED:** more permissive language gates may pass cards a fuller linter would catch.

### 11.3 With 170h (soft-dep per Ask #3)

If 170h shipped at Phase 1 ship:
- `insight_link_score` contributes to relevance scoring
- Insight detail inline surface (§7.4) is active
- Content card body can reference recent insights via `{recent_170h_iron_insight}` etc.

If 170h not shipped at Phase 1 ship:
- `insight_link_score` defaults to 0
- Insight detail inline surface suppressed
- Variable `{recent_170h_iron_insight}` fallback to empty string
- All other Phase 1 functions preserved

### 11.4 With 170f (recipe library; shipped 2026-06-01)

Recipe view inline surface active at Phase 1 ship. Recipes can include "Learn about [nutrient]" inline links. Recipe view component in 170f reads from a small adapter library `lib/content/recipeInlineSurface.ts` that calls `/api/content/today?context=recipe&recipe_id=X` returning the highest-relevance card matching the recipe's prominent nutrients.

### 11.5 With 170l (barcode + OFF) + 170m + 170n + 170o

Inline surfaces NOT shipped at Phase 1 for: barcode scan result (170l), meal save (already specified §7.4), voice-native save (170n composes with meal save), hydration logging (170o). Meal save is the only meal-logging inline surface Phase 1 ships; supplement-2 expands to barcode/voice-native/hydration.

### 11.6 With 170p Phase 1 (pantry; not yet shipped)

Pantry detail inline surface deferred to supplement-2 (or filed as Phase 1.1 supplement once 170p Phase 1 ships).

### 11.7 With 170i practitioner

Reading history is consumer-only across all current 170i scopes per spec §15.6. Practitioner test account verifies no content engagement visible. Future practitioner opt-in sharing filed for 170i-supplement; out of scope for Phase 1.

## 12. Acceptance criteria

Phase 1 ships only when:

1. All 6 tables created with documented columns + indexes + RLS + triggers; verified via `apply_migration` then `list_tables` round-trip.
2. 60-80 content cards published with Kelsey review documented; bioavailability category includes 20-25 cards with the "10x to 28x range explained" foundational card carrying explicit Gary approval (`gary_approved_at NOT NULL`).
3. 9 API routes operational; each route 401s without auth + 503s with kill switch off + returns documented response shape.
4. Surfacing engine: nightly sharded cron computes per-user top card; surfaces above 0.60 threshold render on Dashboard.
5. Variable substitution: a card with `{iron_g_30d_average}` variable for a test user with 10mg/d iron renders the value substituted; user with 0 meal logs sees fallback text.
6. Conditional sections render correctly per `{IF ... ENDIF}` syntax.
7. Learn subsection renders nested under Wellness Analytics tab with Today's card + Recently read + Followed topics + Browse by category sections.
8. Content card full view renders with all 9 sections + working save/share/follow/dismiss.
9. Meal save inline surface fires on iron-rich meal log for user with iron CAQ flag.
10. Recipe view inline surface fires on relevant recipes (composes with 170f).
11. Insight detail inline surface CONDITIONAL on 170h shipped; if shipped, fires correctly; if not shipped, suppressed without error.
12. Topic following + dismissal affect surfacing.
13. 5 Helix events fire correctly with documented caps.
14. Telemetry sessions write at 100% sampling Phase 1 first 60 days.
15. Practitioner test account: Learn subsection + reading history NOT visible.
16. Cold-start strategy works (new user with no signals sees foundation card or no surface depending on signal availability).
17. Em/en-dash linter blocks any draft containing them in content body.
18. Emoji linter blocks any draft containing them.
19. Bio Optimization + "10x to 28x" appear verbatim everywhere they appear.
20. Brand tokens (Navy + Card + Teal + Orange) used consistently.
21. Lucide React strokeWidth 1.5 throughout.
22. WCAG 2.2 AA verified for long-form reading layout + reading progress indicator + all affordances.
23. Permissive-defaults transparency line present in Settings > Education.

## 13. Hard rules reaffirmed

Per memorial §6:

1. Append-only migrations.
2. Zero new package.json dependencies.
3. No Supabase email template or auth.config modifications.
4. Lucide React icons strokeWidth 1.5.
5. No emojis in code OR content card body.
6. Bio Optimization verbatim everywhere it appears.
7. Helix Rewards Consumer portal only.
8. Bioavailability copy locked at "10x to 28x" verbatim site-wide AND across all content cards.
9. No Semaglutide / Retatrutide injectable only / Tesofensine pending FDA.
10. Desktop and mobile developed simultaneously.
11. No em or en dashes anywhere (CRITICAL for 600-1,200 word card body prose; enforced via build-script linter per Concern §11).
12. Brand tokens (Navy + Card + Teal + Orange) + Instrument Sans.
13. Direct push to main, no PR.
14. Reading history is consumer-only.
15. Gordon canonical spelling.
16. No real-time LLM-generated content (AI in Gordon authoring workflow only; never at runtime).

## 14. Phasing within Phase 1 (Blueprint long-poles)

Standard A-E rhythm.

### 14.A Schema + migrations + RLS (1 engineer-week)

Append `20260901000010_prompt_170r_phase_1_content_foundation.sql` with 6 tables + indexes + RLS + triggers + cron table for surfacing queue.

### 14.B Gordon libraries + parser foundation (3 engineer-weeks + 6 Gordon content-authoring-weeks parallel)

Engineering:
- `src/lib/content/types.ts` — interfaces + Zod schemas
- `src/lib/content/surfacing-engine/relevance-scorer.ts`
- `src/lib/content/surfacing-engine/caq-trigger-evaluator.ts`
- `src/lib/content/surfacing-engine/meal-pattern-trigger-evaluator.ts`
- `src/lib/content/surfacing-engine/supplement-pattern-trigger-evaluator.ts`
- `src/lib/content/surfacing-engine/insight-link-evaluator.ts` (soft-dep 170h)
- `src/lib/content/surfacing-engine/recency-penalty-calculator.ts`
- `src/lib/content/surfacing-engine/dismissal-penalty-calculator.ts`
- `src/lib/content/surfacing-engine/frequency-cap-enforcer.ts`
- `src/lib/content/variable-substitution/substituter.ts`
- `src/lib/content/variable-substitution/variable-source-aggregator.ts`
- `src/lib/content/variable-substitution/conditional-section-resolver.ts`
- `src/lib/content/variable-substitution/sanitizer.ts`
- `src/lib/content/authoring-pipeline/markdown-to-database-publisher.ts`
- `src/lib/content/authoring-pipeline/internal-linter.ts` (Phase 1 internal-only; 170c clinical-claim linter integration deferred)
- `src/lib/content/authoring-pipeline/citation-validator.ts`
- `src/lib/content/getCardsForSuggestion.ts` (single read path per single-read-path discipline)

Gordon authoring (parallel):
- Bioavailability category 20-25 cards (3-4 weeks of focused authoring; ~80-120 hours)
- Popular nutrient education 20-25 cards (2-3 weeks; ~50-80 hours)
- Foundation cards 15-30 (lifestyle + macro + synergies overview; ~50-100 hours)

Total Phase 1 content authoring estimate: 180-300 Gordon hours.

### 14.C API routes (1 engineer-week)

9 routes per §8.

### 14.D UI surfaces (3 engineer-weeks + 1 Hannah parallel)

- `src/components/content/LearnSubsection.tsx` (mounted in Wellness Analytics tab)
- `src/components/content/TodaysCardHero.tsx`
- `src/components/content/RecentlyReadCarousel.tsx`
- `src/components/content/FollowedTopicsSections.tsx`
- `src/components/content/BrowseByCategoryGrid.tsx`
- `src/components/content/ContentCardFullView.tsx`
- `src/components/content/ContentCardActions.tsx`
- `src/components/content/ContentCardReadingProgressBar.tsx`
- `src/components/content/DashboardLearnTodayCard.tsx` (mounted on /dashboard)
- `src/components/content/MealSaveInlineSurface.tsx` (mounted in meal save flows)
- `src/components/content/InsightInlineSurface.tsx` (soft-dep 170h)
- `src/components/content/RecipeInlineSurface.tsx` (composes with 170f)
- `src/components/content/EducationSettingsSection.tsx` (mounted in /settings)

Hannah deliverables:
- Wellness Analytics > Learn subsection wireframes (mobile + desktop)
- Content card full view wireframes (reading + scroll progress + affordances)
- Dashboard "Learn today" card wireframes
- 2-3 inline surface treatments

### 14.E Pre-launch Kelsey review marathon + audit + smoke + ratification gate (2 engineer-weeks + 6-8 weeks Kelsey content review parallel)

- Kelsey reviews ALL 60-80 cards (1-3 hours per card × 60-80 cards = 60-240 hours)
- Gary explicit review of 10x-to-28x foundational card + 5-8 other bioavailability bridge cards
- Jeffery pre-launch audit chain (security + performance + michelangelo + hannah + gordon)
- Localhost smoke per `[[feedback_launch_localhost]]`
- Vercel flag flip checklist
- Adoption baseline telemetry captured pre-flip

### 14.F Total Phase 1 runway

| Slice | Engineer-weeks | Gordon content | Kelsey review |
|---|---|---|---|
| A schema + migrations | 1 | — | — |
| B libs + parser | 3 | 6 weeks (180-300hr) parallel | — |
| C API routes | 1 | — | — |
| D UI surfaces | 3 (+ 1 Hannah) | — | — |
| E audit + Kelsey marathon | 2 | — | 6-8 weeks (60-240hr) parallel |
| **Total engineering** | **10** | | |

With 2 engineers in parallel (UI track + backend track): ~7-8 calendar weeks engineering. Gordon content + Kelsey review span 8-12 weeks calendar parallel. Total Phase 1 calendar runway: 10-14 weeks from Blueprint clear.

Optimistic ship target: Dec 2026 - Jan 2027 (Blueprint Sep 2026, build Oct-Nov, audit + Kelsey marathon Dec, ship Dec-Jan).

## 15. Open questions for Phase 1 Blueprint

| # | Question | Recommendation |
|---|---|---|
| Q1 | Templating language vocabulary (variables + conditionals) freeze | Per Ask #7 defer to Blueprint; lock document published in Blueprint Observe |
| Q2 | Nightly cron sharding architecture: 24-hour-shard + 1k-user-sub-batch via queue table | Document fully in Blueprint |
| Q3 | Cold-start strategy for users with no CAQ + no meals: foundation card vs. hidden Dashboard card | Recommendation per §4.3; Hannah signoff at Blueprint |
| Q4 | Phase 1 markdown source vs. DB versioning: edit flow + version markers + manual DB edit prohibition | Document fully in Blueprint |
| Q5 | Gary review queue for 10x-to-28x foundational card + high-caution bioavailability cards: calendar timing pre-Phase-1-ship | Target Gary review 2 weeks before Phase 1.E ship gate |
| Q6 | Trigger inline JSONB on content_cards row vs. separate `content_card_triggers` table | Phase 1 keeps inline (Concern §9 trade-off acknowledged); separate table evaluated at supplement-2 if trigger tuning friction proves high |
| Q7 | Internal linter scope (Phase 1) vs. 170c clinical-claim linter integration (when ratified) | Phase 1 internal only; supplement-2 integrates 170c linter when ratifies |
| Q8 | Em/en-dash linter rule wording: exact ASCII set + Unicode set to block | Block U+2014 + U+2013 + U+2015 + U+2212 + ASCII " — " (3-char sequence); document in linter file |

## 16. Risk acceptance acknowledgments (durable audit trail)

Per Gary ratification 2026-06-01:

1. **FDA/FTC outside counsel not engaged.** Bioavailability content framing risk owned jointly by Kelsey + Gary. Substantiation of "10x to 28x" claim relies on LipoCellTech / Swiss Biopharm / Pharmako study documentation that may or may not be peer-reviewed; Kelsey verifies citations resolve to actual study documents. If FTC scrutinizes 170r post-launch under the totality-of-the-commercial-message doctrine, defense relies on Kelsey's compliance review record + Gary's foundational card approval + the CONTENT_BIOAVAILABILITY_PRODUCT_LINKS_ENABLED kill switch as the immediate off-ramp.

2. **Permissive-defaults posture on 170c.** ED safety mode users may see content cards (including weight/optimization-adjacent material) that 170c would normally filter. Settings > Education permissive-defaults transparency line ("These materials are general education") is the user-facing acknowledgment. Supplement-2 wires the filter in when 170c ratifies; until then, the v1 content category mix avoids the highest-risk weight/restriction framings per Gordon authoring guidelines.

## 17. Filed-not-built reaffirmation

Filed 2026-06-01. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Sep 2026. Build authorization is separate per phase per `[[feedback_no_unsolicited_changes]]`.

## 18. Related

- `prompt-170r-filed-2026-06-01.md` (placeholder with architectural review + 8 ratification asks)
- `prompt-170r-supplement-2-2026-06-01.md` (supplement-2 filed alongside)
- `project_prompt_170r_filed.md` (memorial; primary working doc)
- `project_prompt_170c_filed.md` (permissive-defaults posture per Ask #2 ratification)
- `project_prompt_170h_filed.md` (soft-dep per Ask #3)
- `project_prompt_170f_shipped.md` (recipe inline surface composes Phase 1 ship)
- `project_prompt_170p_phase_split.md` (analogous phase split precedent)
- `feedback_bioavailability_spec_28.md` ("10x to 28x" copy lock)
- `feedback_no_dashes.md` (long-form prose discipline; enforced via internal linter)
- `feedback_jeffery_pre_launch_review.md` (Phase 1.E audit gate)
- `feedback_no_unsolicited_changes.md` (no build until explicit Gary go)
