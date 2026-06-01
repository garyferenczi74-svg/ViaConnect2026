# Prompt 170r-supplement-2: Email Digest + Remaining Content + Real-Time Triggers

**Filed:** 2026-06-01
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Q1 2027 (post-170r Phase 1 ship + at least 60 days adoption telemetry).
**Owner agent:** Gordon (60-90 additional cards across 4 categories + email digest content composition)
**Build agent:** Michelangelo
**UX agent:** Hannah (email digest template + Settings opt-in + 2 remaining inline surfaces)
**Co-owners:** Arnold (digest open + click telemetry), Kelsey (annual periodic re-review cron + 170c clinical-claim linter integration when ratified)
**Orchestrator:** Jeffery
**Hard-blocked-by:** 170r Phase 1 SHIPPED + AWS SES outbound infrastructure provisioned (likely shares stack with 170p-supplement-2 inbound provisioning)
**Soft-blocked-by:** 170c ratification (wires safety_mode_filter + clinical-claim linter); 170p Phase 1 SHIPPED (pantry detail inline surface depends on Pantry tab + item detail); 170q filing (plan candidate inline surface)
**Provides for:** 170r-supplement-3 (170u GENEX360 SNP variants), 170r-supplement-4 (170w bioavailability coaching)

## 0. Summary

Supplement-2 layers on top of Phase 1: weekly opt-in email digest via AWS SES outbound (provisioned per Ask #5 ratification), 60-90 additional Gordon-authored cards (lifestyle + condition-relevant + genetic + supplement mechanism categories), real-time triggers (post-CAQ flag immediate surface + inline surface trigger from meal/recipe events), 2 remaining inline surfaces (pantry detail + plan candidate), annual Kelsey re-review cron, and (when 170c ratifies) integration of the safety_mode_filter + clinical-claim linter that Phase 1 deferred.

Adds 2 kill switches, 1 Helix event, 1 additional cron job. Reuses all 6 Phase 1 tables; no schema additions.

Headline behavioral metric for supplement-2 at +60 days post-ship: email digest open rate above 30% on opt-in users.

## 1. What it is

Two related expansions of 170r:

1. **Proactive notification layer.** Weekly email digest delivers 1-3 relevant cards per opted-in user. Real-time triggers fire immediate content surface on severe CAQ flag completion or meal save event that strongly matches a trigger.
2. **Content corpus completion.** 60-90 additional cards fill out the 8-category taxonomy: lifestyle factors (sleep + stress + hydration + circadian), condition-relevant education (PCOS + IBS + autoimmune + thyroid), genetic education (10-15 SNP-specific cards), supplement mechanism (15-20 cards on delivery formats + interactions + contraindications).

Plus 170c integration when ratified (safety_mode_filter + clinical-claim linter) per the permissive-defaults migration plan filed in Phase 1.

## 2. Why this matters

Phase 1 ships the foundation + bioavailability narrative bridge + Learn surface + Dashboard card. Users discover content reactively (browse Learn subsection) and via the daily Dashboard card.

Supplement-2 adds proactive push (email digest reaches users in their inbox) and immediate trigger (post-CAQ surface) which together close the surfacing-cadence gap. A user with severe iron deficiency flagged in CAQ Phase 4 should see relevant content within minutes, not on the next nightly cron tick.

Supplement-2 also completes the content corpus. Phase 1 ships 60-80 cards focused on bioavailability + popular nutrients + foundation. Supplement-2 fills the long tail (condition-relevant + genetic + supplement mechanism + lifestyle deep dives) that broadens engagement beyond the bioavailability anchor.

## 3. Data model

Zero schema additions. Reuses all 6 Phase 1 tables.

Two new env vars (kill switches):
- `CONTENT_EMAIL_DIGEST_ENABLED` (server) + `NEXT_PUBLIC_CONTENT_EMAIL_DIGEST_ENABLED` (client; gates Settings opt-in visibility)
- `CONTENT_REALTIME_TRIGGERS_ENABLED`

Two new optional `pantry_user_preferences`-style columns on a new `content_user_preferences` table (since none of the Phase 1 tables have a per-user preferences home):

```sql
CREATE TABLE IF NOT EXISTS public.content_user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_digest_opted_in BOOLEAN NOT NULL DEFAULT FALSE,
  email_digest_cadence TEXT NOT NULL DEFAULT 'weekly' CHECK (email_digest_cadence IN ('weekly', 'biweekly')),
  realtime_triggers_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  inline_surfaces_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  dashboard_today_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  surfacing_frequency TEXT NOT NULL DEFAULT 'medium' CHECK (surfacing_frequency IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.content_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_prefs_owner_all" ON public.content_user_preferences;
CREATE POLICY "content_prefs_owner_all"
  ON public.content_user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS content_prefs_updated_at ON public.content_user_preferences;
CREATE TRIGGER content_prefs_updated_at
  BEFORE UPDATE ON public.content_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

This is the only schema addition in supplement-2. Phase 1 stores some preferences in client localStorage + Settings tab session state; supplement-2 promotes them to a server-backed row to enable email-digest opt-in tracking + cross-device consistency.

## 4. AWS SES outbound infrastructure (per Ask #5)

### 4.1 Provisioning

AWS SES outbound configured in `us-east-1` + `us-west-2` for multi-region failover. Sender identity: `Learn@viaconnectapp.com` (or `digest@viaconnectapp.com` pending Gary email-handle decision at Blueprint).

DNS records on `viaconnectapp.com`:
- SPF: `v=spf1 include:amazonses.com -all`
- DKIM: AWS-managed (rotation handled by SES)
- DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@viaconnectapp.com;`

Bounce + complaint topics SNS → ViaConnect API webhook for hard-bounce and complaint handling (auto-unsubscribe + future-send suppression).

Cost: SES outbound $0.10 per 1,000 emails. At weekly digest × 10k opt-in users × 50 weeks = ~520,000 emails/year = $52/year. Negligible at projected scale.

**Coordination with 170p-supplement-2:** SES inbound infrastructure is provisioned by 170p-supplement-2 (for grocery email forwarding). Outbound provisioning runs adjacent; both can share the SES account but require separate sending identity configuration. Estimated overlap: 1 platform-eng week saved by shared SES infrastructure setup.

### 4.2 Email template

Plain transactional template using AWS SES templated email API. Brand styling (Navy header + Card body + Teal accents + Orange CTA) per brand tokens. No tracking pixels per spec §15.2 (only ViaConnect's own click tracking via redirect URL).

Template body structure:
- Hero header: "Your weekly learning from Gordon."
- 1-3 card excerpts (title + lead + Read on platform CTA)
- Footer: standing unsubscribe link + Settings link

### 4.3 Weekly digest cron

`supabase/functions/content-email-digest-weekly-cron/index.ts` runs Saturday 9 AM in user's locale.

For each user with `content_user_preferences.email_digest_opted_in = TRUE`:
1. Compute 7-day rolling top cards (same relevance scoring engine as Phase 1 nightly cron, but aggregating across the past 7 nights of cron outputs).
2. Pick top 1-3 cards from those that user has NOT already viewed.
3. Insert SES outbound send job.
4. Log digest send to `content_surfacing_sessions` with `surfacing_session_outcome='digest_sent'`.

If user has fewer than 1 above-threshold candidate card across the week: skip digest for that week (no spam empty digests).

## 5. Real-time triggers (per spec §6.3)

### 5.1 Post-CAQ severe flag trigger

When user completes CAQ Phase 4 with `flag_severity >= moderate` AND `CONTENT_REALTIME_TRIGGERS_ENABLED = TRUE`:

1. Surfacing engine immediately computes top card for the user (re-uses Phase 1 scoring lib).
2. Returns the card in the post-CAQ flow render ("Based on your responses, this might be relevant...").
3. User can tap "Read now" → opens card; tap "Save for later" → bookmarks; tap "Dismiss" → suppresses for 30 days.
4. Insertion to `user_content_views` with `surfacing_surface='realtime_caq_flag'` for telemetry.

### 5.2 Meal save inline surface (Phase 1 ships basic version; supplement-2 enhances)

Phase 1 ships a basic meal-save inline surface for iron-rich meals + iron CAQ flag matching. Supplement-2 generalizes to all (nutrient × CAQ-flag) matches: e.g., user logs magnesium-rich meal with magnesium CAQ flag → inline surface; user logs high-omega-3 meal with cardiovascular CAQ flag → inline surface. Etc.

### 5.3 Cap

Per spec §6.5, real-time triggers cap at 1 per user-session. The cap prevents post-CAQ + meal-save + insight-detail compounding into trigger overload.

## 6. Remaining inline surfaces

### 6.1 Pantry detail inline surface (gated on 170p Phase 1 SHIPPED)

When user opens pantry item detail (170p Phase 1), the item detail view includes "Learn about [primary nutrient]" link for the item's prominent nutrient (e.g., spinach pantry item → "Learn about iron absorption"). Calls `getCardsForSuggestion()` (Phase 1 single-read-path contract) with `context='pantry'` + `item_canonical_name`.

If 170p Phase 1 not yet shipped at supplement-2 ship target (Q2-Q3 2027): this inline surface defers further OR ships at 170p Phase 1 ship-day cutover.

### 6.2 Plan candidate inline surface (gated on 170q filing)

When 170q (forward meal planning) ships, plan candidate cards can include educational content links for nutrients prominent in the plan. supplement-2 ships the inline component; activation gated on 170q ship.

If 170q not filed yet at supplement-2 ship: component ships dormant + flag-off. Activates when 170q filing lands.

## 7. Remaining 60-90 cards

Supplement-2 ships the long-tail content categories:

| Category | Card count | Authoring estimate |
|---|---|---|
| Lifestyle factors | 10-15 | 25-40 hr |
| Condition-relevant education | 10-15 | 40-60 hr (highest per-card review effort) |
| Genetic education | 10-15 | 25-40 hr |
| Supplement mechanism | 15-20 | 35-55 hr |
| Additional bioavailability fills | 5-10 | 20-30 hr |
| Additional nutrient education fills | 10-15 | 20-35 hr |
| **Total** | **60-90 cards** | **165-260 hours Gordon authoring** |

Kelsey review: 60-90 cards × 1-3 hr/card = 60-270 hours review.

Total supplement-2 content effort: 225-530 hours across Gordon + Kelsey. Larger than 170-series prior precedents but lower per-week intensity than Phase 1's 8-12 week sprint because supplement-2 has 12-16 week runway.

## 8. 170c integration (when ratified)

If 170c is ratified at supplement-2 build time:

1. **Wire safety_mode_filter into surfacing engine.** `relevance-scorer.ts` reads `user.safety_mode_active` (170c column); cards with `safety_mode_filter='do_not_surface_safety_mode'` excluded for safety-mode users. Cards with `safety_mode_filter='surface_only_safety_mode'` (recovery-focused content) preferentially surface.
2. **Wire 170c clinical-claim linter into build script.** `markdown-to-database-publisher.ts` runs the 170c linter on every card pre-publish; Phase 1's internal linter is superseded.
3. **One-time backfill linter pass on Phase 1's 60-80 already-published cards.** Cards that fail 170c linter require Gordon re-authoring + re-publish.
4. **Remove permissive-defaults transparency line from Settings > Education.** Replace with `[[feedback_hannah_fda_disclaimer_pattern]]` standard disclaimer.

If 170c is NOT ratified at supplement-2 build time: supplement-2 ships with permissive-defaults posture preserved. 170c integration filed for supplement-2.1 follow-up when 170c ratifies.

## 9. Helix events

Supplement-2 adds 1 Helix event:

| Event | Points | Cap | Trigger |
|---|---|---|---|
| `education_email_digest_subscribed` | 2 | 1 lifetime | User toggles email digest opt-in for the first time |

Maximum daily Phase 2 Helix earn (including Phase 1 events): 49 (Phase 1) + occasional lifetime 2 = ~49 sustained.

## 10. Kill switches

Supplement-2 adds 2:

1. `CONTENT_EMAIL_DIGEST_ENABLED` (server) + `NEXT_PUBLIC_CONTENT_EMAIL_DIGEST_ENABLED` (client)
2. `CONTENT_REALTIME_TRIGGERS_ENABLED`

Phase 1 kept 5 switches:
1. `EDUCATIONAL_CONTENT_ENABLED` (master)
2. `CONTENT_DASHBOARD_TODAY_CARD_ENABLED`
3. `CONTENT_INLINE_SURFACES_ENABLED`
4. `CONTENT_BIOAVAILABILITY_PRODUCT_LINKS_ENABLED`
5. `CONTENT_NIGHTLY_CRON_ENABLED`

Combined 170r post-supplement-2 ship: 7 switches.

## 11. API surface additions

Supplement-2 adds 4 routes.

| Method | Route | Purpose |
|---|---|---|
| GET/PATCH | `/api/content/preferences` | Read/write `content_user_preferences` row |
| POST | `/api/content/digest/unsubscribe` | One-click unsubscribe (called from email digest unsubscribe link with HMAC-signed token) |
| POST | `/api/content/realtime/post-caq-trigger` | Internal endpoint called by CAQ Phase 4 completion handler |
| POST | `/api/content/topics/unfollow` | Unfollow topic (Phase 1 only supported follow; supplement-2 adds unfollow without going to Settings) |

## 12. Annual Kelsey re-review cron

`supabase/functions/content-card-periodic-review-reminder/index.ts` runs first Monday of each month.

Queries `content_cards WHERE last_reviewed_at < NOW() - INTERVAL '11 months' AND is_published = TRUE` (60-day-warning).

For each match: sends an internal notification to Kelsey + Gordon flagging the card for review. Kelsey reviews + updates `last_reviewed_at` after fresh review pass.

Cards that exceed 12 months without review get a "needs review" badge in the admin view (not consumer-visible).

## 13. Composition

### 13.1 With 170r Phase 1

Reuses schema + relevance scoring engine + variable substitution + content authoring pipeline + Learn subsection + Dashboard card. Adds email digest + 60-90 cards + real-time triggers + pantry inline + plan inline + 170c integration.

### 13.2 With 170c (per Ask #2 / §8)

If ratified by supplement-2 ship: integrates safety_mode_filter + 170c clinical-claim linter + one-time backfill linter pass on Phase 1 corpus. If not ratified: defers to supplement-2.1.

### 13.3 With 170h (soft-dep)

Same posture as Phase 1: insight cross-reference active if 170h shipped; suppressed if not.

### 13.4 With 170p Phase 1 (pantry inline)

Pantry detail inline surface ships in supplement-2; activation gated on 170p Phase 1 ship-day.

### 13.5 With 170q (plan candidate inline)

Plan candidate inline component ships dormant in supplement-2; activates when 170q files + ships.

### 13.6 With 170i practitioner

Reading history + content engagement remain consumer-only across all current 170i scopes. Email digest sends are NOT visible to practitioners. Future practitioner opt-in sharing filed for 170i-supplement.

## 14. Phasing within supplement-2

| Slice | Engineer-weeks |
|---|---|
| 2.A AWS SES outbound provisioning (shared with 170p-supplement-2 if both kick off near each other) | 1-2 (platform) |
| 2.B Email digest cron + template + unsubscribe | 2 |
| 2.C Real-time triggers (post-CAQ + enhanced meal save) | 1 |
| 2.D Remaining inline surfaces (pantry + plan dormant) | 1.5 |
| 2.E content_user_preferences schema + preferences API + Settings expansion | 1 |
| 2.F 170c integration (if ratified): safety_mode_filter wiring + linter swap + backfill pass | 2 (conditional) |
| 2.G Annual Kelsey re-review cron | 0.5 |
| 2.H Audit + smoke + ratification | 1.5 |
| **Total engineering** | **10.5** (or 8.5 if 170c integration deferred to 2.1) |

With 2 engineers + Gordon parallel + Kelsey parallel: ~6-8 calendar weeks engineering. Gordon + Kelsey content runway 12-16 weeks parallel.

Optimistic ship target: Q3 2027 (Blueprint Q1 2027, build Q1-Q2 2027, content authoring Q1-Q2 2027 parallel, ship Q3 2027).

## 15. Acceptance criteria

1. `content_user_preferences` table created + RLS + trigger.
2. AWS SES outbound provisioned + verified via test send + DMARC alignment confirmed via mail-tester.com.
3. Email digest cron sends Saturday 9 AM user-locale to opted-in users with valid card candidates.
4. Real-time post-CAQ trigger fires on CAQ Phase 4 severe flag completion.
5. Meal save inline surface generalized to (nutrient × CAQ-flag) matching beyond Phase 1's iron-only seed.
6. Pantry detail inline surface fires for users with 170p Phase 1 shipped pantry items.
7. Plan candidate inline component ships dormant; activates on 170q ship.
8. 60-90 cards published with Kelsey review documented.
9. 170c integration: if ratified, safety_mode_filter excludes do_not_surface_safety_mode cards for safety-mode users + 170c linter integrated + Phase 1 corpus backfill complete; if not ratified, permissive-defaults posture preserved.
10. Annual Kelsey re-review cron triggers monthly + flags cards above 11 months.
11. Email digest opt-in flow in Settings; unsubscribe link in every digest email; one-click HMAC-signed unsubscribe.
12. Bounce + complaint webhook handlers auto-unsubscribe + future-send suppression.
13. 4 new API routes operational; each route 401s without auth + 503s with kill switch off + Zod validated.
14. 1 new Helix event fires correctly with lifetime cap.
15. 2 new kill switches function correctly.
16. Practitioner test account: email digest not sent + content engagement not visible.
17. Hard rules per Phase 1 §13 reaffirmed.

## 16. Open questions for Blueprint

| # | Question | Recommendation |
|---|---|---|
| Q1 | Email sender handle: `Learn@viaconnectapp.com` vs. `digest@viaconnectapp.com` vs. `gordon@viaconnectapp.com` | Gary picks at Blueprint; recommend `learn@viaconnectapp.com` |
| Q2 | Digest cadence: weekly fixed vs. user-selectable (weekly OR biweekly) | User-selectable per `content_user_preferences.email_digest_cadence` (already in schema) |
| Q3 | If 170c not ratified by supplement-2 build: ship preserved permissive-defaults posture or block on 170c | Ship preserved per Phase 1 risk acceptance; defer 170c integration to supplement-2.1 |
| Q4 | Pantry detail inline surface: ship dormant + activate on 170p Phase 1 ship-day OR delay supplement-2 ship until 170p Phase 1 shipped | Ship dormant; flag-on cutover when 170p Phase 1 ratifies |
| Q5 | Email digest privacy posture: track click events server-side vs. fully privacy-preserving (no click tracking) | Server-side click tracking via HMAC-signed redirect URL; no third-party tracking pixels per spec §15.2 |
| Q6 | Annual re-review cron notification target: Kelsey email + Gordon email vs. dashboard-only badge | Both: email + dashboard badge |
| Q7 | Real-time post-CAQ trigger UX: full modal vs. inline card in post-CAQ flow | Inline card in post-CAQ flow (less interruption) |

## 17. Filed-not-built reaffirmation

Filed 2026-06-01. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Q1 2027 contingent on 170r Phase 1 SHIPPED with at least 60 days adoption telemetry above baseline (Phase 1 ratification gate).

## 18. Related

- `prompt-170r-filed-2026-06-01.md` (original placeholder)
- `prompt-170r-phase-1-spec-2026-06-01.md` (Phase 1 hard prerequisite)
- `project_prompt_170r_filed.md` (memorial)
- `project_prompt_170c_filed.md` (170c integration when ratified)
- `project_prompt_170p_phase_split.md` (analogous phase split precedent; SES inbound coordination)
- `feedback_supabase_email.md` (Supabase email locked; SES outbound is separate provisioning)
- `feedback_jeffery_pre_launch_review.md` (audit gate)
