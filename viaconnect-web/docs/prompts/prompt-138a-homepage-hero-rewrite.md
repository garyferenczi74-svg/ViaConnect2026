# Prompt #138a — Homepage Hero & Value-Proposition Rewrite

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Conversion-stack capstone / Homepage copy + IA + A/B test infrastructure
**Parent prompts:** #119–#138 compliance stack (canonical numbering); #18a (Desktop+Mobile sync + DO NOT TOUCH protections); #67 (TypeScript stabilization patterns); #121 (Pre-Check pipeline reused for marketing-copy gating)
**Originating analysis:** Executive product review (April 24, 2026) flagging hero clarity, abstract language, light proof layer, weak outcome vividness, and supplement upload bug
**Conversion-stack siblings:** #138b Trust Band; #138c Sample Protocol Walkthrough ("Sarah" Scenario); #138d Outcome Visualization & 30/60/90 Future-State; #138e Supplement Upload Diagnostic & Fix
**Status:** Active — authorizes Claude Code to implement §5–§9 under the visual-non-disruption guarantee in §3
**Date:** 2026-04-24
**Delivery Mode:** Claude Code — `/effort max`
**Local Path:** `C:\Users\garyf\ViaConnect2026\viaconnect-web`
**Supabase Project:** `nnhkcufyqjojdbvdrpky` (us-east-2)

---

## 0. Standing Platform Rules (Non-Negotiable)

Every standing rule from #119 applies, restated for continuity:

- Score name is **"Bio Optimization"** — never "Vitality Score" or "Wellness Score".
- Bioavailability is exactly **10–27×**.
- No Semaglutide. Retatrutide is injectable only, never stacked.
- Lucide React icons only, `strokeWidth={1.5}`. No emojis in any client-facing UI.
- `getDisplayName()` for all client-facing names.
- Helix Rewards: Consumer portal only.
- Desktop + Mobile simultaneously, responsive Tailwind from the first commit.
- **NEVER** touch `package.json`, Supabase email templates, or any previously-applied migration. Migrations are append-only.
- **Brand constants:** Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`, Instrument Sans typography.
- ViaCura tagline: **"Built For Your Biology."**

Per the **Amendment to #119/#120 (April 23, 2026):** No CedarGrowth Organics or Via Cura Ranch references.

---

## 1. Mission Statement

The April 24, 2026 executive product review identified five substantive critiques of the current homepage:

1. **Time-to-comprehension is too slow** ("hard to quickly get it").
2. **Abstract language** ("AI clinical reasoning", "Genome precision") sounds powerful but does not build trust.
3. **The trust layer** (team, medical grounding, testimonials) is too light.
4. **The outcome is not vivid enough** — visitors don't see what's different for them after using the platform.
5. **The supplement upload flow has a silent failure** (deferred to #138e).

Critiques 1, 2, and 4 are addressable through homepage copy and information architecture changes only — without disrupting the visual design that the review explicitly praised ("clean," "professional," "logical flow"). Critique 3 is the scope of #138b (Trust Band). Critique 5 is the scope of #138e (Supplement Upload Diagnostic).

This prompt delivers:

- A **visual non-disruption guarantee** (§3) — the existing visual design system is declared off-limits to modification.
- A **starting set of four hero copy variants** (§4) spanning genuinely different framings — process-narrative, outcome-first, proof-first, time-to-value.
- A **copy-variant slot structure** (§5) so Marketing can add additional variants over time without re-prompting.
- **A/B test infrastructure** (§6) — variant assignment, impression tracking, conversion tracking, winner declaration rules.
- **Marshall pre-check integration for marketing copy** (§7) — every variant passes through Marshall's existing pre-check pipeline before going live, with a new `'marketing_copy'` surface and applicable rule registrations.
- **Information architecture decisions** (§8) — what's in the hero, what's not, what's reserved for #138b–#138d.
- OBRA gate compliance and file manifest (§9–§11).

The prompt does NOT change brand colors, typography, component shapes, spacing, layout grids, or imagery. Those are explicitly protected in §3.

---

## 2. Why Hybrid (Copy + Code) Rather Than Pure Copy or Pure Implementation

The four review critiques in §1 cannot be addressed by a copy document alone:

- A copy document tells writers what to write. It doesn't deliver the variants into the rendering pipeline.
- A copy document doesn't establish A/B testing infrastructure, which is required to validate that the new copy actually outperforms the existing copy.
- A copy document doesn't integrate with Marshall's pre-check pipeline, which is required by Gary's standing rules on FTC Endorsement Guide and DSHEA compliance.

Equally, this prompt cannot be a pure implementation spec:

- The starting variants (§4) are content decisions that require explicit per-variant articulation — these are the words that go on the homepage.
- The copy-variant slot structure (§5) is a content-governance pattern that has copy implications beyond what code alone expresses.
- The Marshall surface registration (§7) requires both code (rule registration) and content semantics (which rules apply to marketing copy).

The hybrid format covers both layers. The visual-non-disruption guarantee (§3) prevents the implementation work from leaking into design changes that weren't asked for.

---

## 3. Visual Non-Disruption Guarantee (DO NOT MODIFY)

Claude Code (Michelangelo) implementing this prompt MUST NOT modify any of the following:

### 3.1 Components — DO NOT MODIFY

The visual structure of these components stays exactly as it exists today:

- The hero container component (whatever its current path — likely `components/home/Hero.tsx` or `components/landing/HeroSection.tsx`).
- The CTA button component used in the hero.
- The hero background, gradient, or imagery treatment.
- The page header / navigation that sits above the hero.
- The section-divider treatment between the hero and the next homepage section.
- Any animation timings, easing curves, or motion presets.

What MAY be modified inside these components:

- The `text` prop (or equivalent string content) passed to existing text-rendering elements.
- The `href` of the CTA if A/B test infrastructure requires variant-specific destinations (it shouldn't, but the option is reserved).
- New child elements added strictly to support variant rendering (e.g., a wrapper component that selects which variant's text to display).

### 3.2 Design Tokens — DO NOT MODIFY

The following tokens stay exactly as defined in `tailwind.config.js`, the design-tokens module, or wherever they currently live:

- All color values, including the brand four (Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`).
- All typography scales (Instrument Sans + the established weight/size/line-height combinations).
- All spacing scales (Tailwind's default plus any custom values currently configured).
- All shadow, blur, opacity, and radius values.
- All breakpoint definitions.

If a copy variant requires a layout adjustment that genuinely cannot be achieved with existing tokens (e.g., a variant whose word count breaks the existing text container), the resolution is to **shorten the copy**, not to introduce new tokens. The visual system controls the copy, not the other way around.

### 3.3 Imagery — DO NOT MODIFY

Hero imagery, background treatments, illustrations, and any photographic content stay as they currently exist. #138c (Sarah scenario) is the prompt that may introduce new imagery, and only with Dr. Fadi Dagher's pre-publication review.

### 3.4 Brand & Voice — DO NOT MODIFY

- The "ViaConnect" mark and the "GeneX360" sub-mark stay as currently rendered.
- The ViaCura tagline "Built For Your Biology" remains the master tagline.
- The SNP sub-line "Your Genetics | Your Protocol" remains where it currently appears.
- No new logos, marks, sub-brands, or tagline variants are introduced by this prompt.

### 3.5 Existing Section Order — DO NOT MODIFY

Whatever sections currently appear on the homepage in whatever order — that order stays. #138b (Trust Band) and #138d (Outcome Visualization) will introduce new sections; #138a does not reorder anything.

### 3.6 What This Guarantee Means in Practice

If, while implementing this prompt, Michelangelo finds that a copy variant cannot be cleanly rendered without modifying any of the above — the variant gets shortened, reframed, or dropped. The visual system is the constraint, not the variable.

If Michelangelo encounters a genuine ambiguity (a case where it's unclear whether a change counts as "copy" or "design"), the OBRA Review phase escalates to Gary for the decision rather than guessing.

---

## 4. Starting Variants (Four)

Four hero copy variants are delivered with this prompt. Each makes a different bet about what the visitor most wants to know in the first three seconds.

Every variant respects the standing rules in §0 and the additional content rules in §7.5.

### 4.1 Variant A — Process-Narrative

**Slot:** `hero.variant.A`

**Framing bet:** Visitors want to know what they'll do before they care what they'll get.

**Headline:** "Your wellness protocol — built from your biology, in three steps."

**Subheadline:** "Answer the assessment. Add your data. Get the precise protocol your body needs, with the science behind every recommendation."

**CTA:** "Start the assessment" — destination unchanged from current implementation

**Word count:** Headline 9 words, subhead 22 words. Within existing layout container budget.

**Why this variant:** Directly addresses the executive review's critique 1 ("hard to quickly get it"). The reviewer's suggested line was "Answer a few questions about your health, upload your data, and we'll tell you exactly what your body needs and why." Variant A is a tightened version of that suggestion that fits the visual container.

### 4.2 Variant B — Outcome-First

**Slot:** `hero.variant.B`

**Framing bet:** Visitors want to know what changes for them before they care about the process.

**Headline:** "Sleep deeper. Wake clearer. Know exactly what your body needs."

**Subheadline:** "ViaConnect builds your Bio Optimization protocol from your assessment, your supplements, and (optionally) your genetics — so the next 30 days actually move your numbers."

**CTA:** "Build my protocol" — destination unchanged

**Word count:** Headline 10 words, subhead 30 words. Within existing layout container budget.

**Why this variant:** Directly addresses the executive review's critique 4 ("the outcome isn't as vivid as it could be"). The reviewer asked for vivid future-state framing; variant B opens with three concrete near-term outcomes (sleep, mental clarity, knowing what to take) before introducing the brand mechanic. "Bio Optimization" is named directly because it is the brand metric and Critique 4 specifically said the outcome isn't vivid enough — naming the score is part of making it vivid.

### 4.3 Variant C — Proof-First

**Slot:** `hero.variant.C`

**Framing bet:** Visitors will not engage with personalization claims until they know who's behind the recommendation engine.

**Headline:** "Precision wellness, reviewed by clinicians."

**Subheadline:** "FarmCeutica's protocol engine is medically directed by Dr. Fadi Dagher. Every recommendation is grounded in published research, FTC-compliant claims, and your own biology."

**CTA:** "See how it works" — destination unchanged

**Word count:** Headline 5 words, subhead 24 words. Within existing layout container budget.

**Why this variant:** Directly addresses the executive review's critique 3 ("trust factor needs strengthening"). Surfaces Dr. Fadi Dagher (Medical Director per the standing memory) in the hero rather than below the fold. Names "FTC-compliant claims" because the executive review noted the trust layer is light, and naming compliance posture in the hero is a defensible trust signal.

**Compliance note:** This variant is the most likely to require Marshall pre-check escalation. Naming Dr. Fadi by name in marketing copy is a material connection statement; the variant survives pre-check only if Dr. Fadi is genuinely the Medical Director (he is, per standing memory) and only if the relationship is current. Steve Rica reviews this variant before activation.

### 4.4 Variant D — Time-to-Value

**Slot:** `hero.variant.D`

**Framing bet:** Visitors won't start an assessment they think will take an hour. Time-to-value is the hidden conversion blocker.

**Headline:** "Your personalized protocol in about 12 minutes."

**Subheadline:** "Answer the Comprehensive Assessment, optionally add your genetic panel, and get a Tier 1, 2, or 3 protocol — backed by Dr. Fadi Dagher and the Marshall compliance system."

**CTA:** "Begin — 12 minutes" — destination unchanged

**Word count:** Headline 7 words, subhead 28 words. Within existing layout container budget.

**Why this variant:** Combines the time-to-value framing (12 minutes is the established CAQ completion estimate) with the Tier 1/2/3 protocol confidence framing that #138c (Sarah scenario) will elaborate. Names the Marshall compliance system as a trust signal, which is unconventional in marketing copy but defensible because Marshall is a real architectural commitment under #119 and naming it differentiates ViaConnect from competitors who claim compliance without architecting it.

**Time-claim verification:** Before this variant ships, Marketing or Steve verifies that 12 minutes is the actual median CAQ completion time for visitors who finish. If the actual median is meaningfully higher (e.g., 15+ minutes), the headline is updated to match reality. Marketing claims that overstate speed are an FTC concern.

### 4.5 Control — Existing Copy

The currently-shipped homepage copy serves as the control. It is not modified by this prompt; it is treated as `hero.variant.control` in the A/B test infrastructure.

---

## 5. Variant Slot Structure for Future Additions

Marketing will want to add variants over time as new framings emerge. The slot structure makes adding a variant a content edit, not a code change.

### 5.1 Slot Schema

Every variant is a row in the `marketing_copy_variants` table (defined in §10):

| Field | Type | Notes |
|---|---|---|
| `slot_id` | text | e.g., `hero.variant.E` |
| `surface` | text | e.g., `hero` (current scope) — future surfaces (`pricing_hero`, `cta_band`) added by successor prompts |
| `variant_label` | text | Short human-readable label, e.g., "Outcome-First v2" |
| `framing` | text | One of: `process_narrative` \| `outcome_first` \| `proof_first` \| `time_to_value` \| `other` |
| `headline_text` | text | Required |
| `subheadline_text` | text | Required |
| `cta_label` | text | Required |
| `cta_destination` | text | Default: unchanged from existing |
| `word_count_validated` | bool | Set true only after the variant is rendered in the existing layout without breakage |
| `marshall_precheck_passed` | bool | Set true only after §7 pre-check passes |
| `marshall_precheck_session_id` | uuid | Foreign key to `precheck_sessions` from #121 |
| `steve_approval_at` | timestamptz | Set only when Steve Rica approves the variant for testing |
| `active_in_test` | bool | Set true only when the variant is currently being served to visitors |
| `created_at` / `updated_at` | timestamptz | Standard |

### 5.2 Variant Lifecycle

A new variant flows through:

1. **Draft.** Marketing or Gary writes the variant in the admin UI at `/admin/marketing/hero-variants` (defined in §11).
2. **Word-count check.** Automated check confirms headline ≤12 words and subhead ≤32 words; the existing hero container has been verified to render those bounds without breakage. Variants exceeding the bounds are rejected at draft time.
3. **Marshall pre-check.** §7 pipeline runs. Findings are surfaced to Marketing for remediation. Variant cannot advance until pre-check passes.
4. **Steve approval.** Steve Rica reviews the pre-checked variant for FTC compliance, brand voice, factual accuracy. Steve's approval is captured with timestamp + identity.
5. **Test enrollment.** Variant is added to the active A/B test (per §6).
6. **Result analysis.** When the test reaches its stopping rule (per §6.4), the variant either becomes the new control or is archived.

The lifecycle is enforced at the database level via check constraints — `active_in_test = true` requires `marshall_precheck_passed = true AND steve_approval_at IS NOT NULL`.

### 5.3 No Silent Variant Activation

A variant cannot be served to visitors without all three of: word-count validation, Marshall pre-check pass, Steve approval. The check constraint in §5.2 enforces this; the admin UI surfaces it; the runtime variant-selection code re-validates before each render.

---

## 6. A/B Test Infrastructure

### 6.1 Variant Assignment

Visitor assignment is deterministic by visitor identifier, not random per-request:

- **Visitor identifier:** the existing ViaConnect visitor cookie (or its replacement; Marketing should confirm the canonical name with Thomas before implementation). If no cookie exists, one is set on first visit.
- **Hash function:** SHA-256 of `(visitor_id || test_id)`, take first 8 bytes as integer, modulo number-of-active-variants.
- **Assignment table:** the result is the index into the active variant array.
- **Persistence:** assignment is stable across sessions for the same visitor — a visitor who saw variant B on Monday sees variant B on Wednesday. This prevents the A/B test from polluting itself with within-visitor variance.

### 6.2 Impression Tracking

Every hero render writes a row to `marketing_copy_impressions`:

| Field | Notes |
|---|---|
| `id` | UUID |
| `visitor_id` | from cookie |
| `slot_id` | which variant rendered |
| `rendered_at` | timestamp |
| `viewport` | desktop / tablet / mobile |
| `referrer_category` | one of: direct \| organic_search \| paid_search \| social \| email \| referral \| other |
| `is_returning_visitor` | bool |

Impression writes are async — they don't block rendering. Failed writes retry up to 3 times then drop to error log; an impression-write failure rate above 1% is itself a flagged condition.

### 6.3 Conversion Tracking

The primary metric is **CAQ-start rate** — the percentage of visitors with at least one hero impression who subsequently click the CAQ-start CTA and load the first CAQ phase.

Secondary metrics tracked but not decision-driving:

- Signup completion rate (visitor → registered account).
- Time-to-CAQ-start (seconds from impression to CTA click).
- Bounce rate (visitor leaves without clicking anything).

Conversion rows write to `marketing_copy_conversions` with the same `visitor_id` foreign key, allowing per-visitor join from impression to conversion.

### 6.4 Winner Declaration Rules

A variant becomes the new control only when ALL of the following hold:

1. **Sample size:** ≥5,000 visitors per variant in the test.
2. **Runtime:** ≥14 days, covering at least two complete weekly cycles.
3. **Confidence:** 95% one-sided binomial test against the current control.
4. **Effect size:** absolute lift in CAQ-start rate ≥1 percentage point. (Below this, even a statistically significant result is unlikely to be operationally meaningful.)
5. **Steve approval:** Steve Rica reviews the winning variant's complete impression-conversion history before promotion to control. This is a sanity check against weird traffic patterns (bot waves, referrer anomalies) that statistics alone won't catch.

If multiple variants meet criteria 1–4, the highest-lift variant wins — but Steve still reviews before promotion.

### 6.5 Loser Handling

Variants that fail to meet the winner criteria after the runtime threshold are archived, not deleted. The variant's impression and conversion history remains in the database indefinitely. Archived variants are evidence of what was tried; deleting them forfeits learning.

### 6.6 Test Pause and Rollback

Marketing or Steve can pause an active test at any time:

- **Pause:** active variants stop being served; visitors revert to control. Test data is preserved.
- **Rollback:** a specific variant is removed from active rotation immediately (e.g., if Marshall pre-check is retroactively flagged or if Steve discovers a factual error post-approval).
- **Resume:** a paused test resumes serving variants where it left off. Sample size accumulates from where pause began, not from zero.

Pause and rollback are admin-UI-driven (§11) and audit-logged.

---

## 7. Marshall Pre-Check Integration for Marketing Copy

### 7.1 New Surface: `'marketing_copy'`

The `Surface` enum in `compliance/engine/types.ts` gains a new value: `'marketing_copy'`. Existing rules that should also evaluate marketing copy get the new surface added to their `surfaces` array. New rules specific to marketing copy register under the namespace `MARSHALL.MARKETING.*`.

### 7.2 Applicable Rule Registrations

The following rules have `'marketing_copy'` added to their applicable surfaces:

- `MARSHALL.CLAIMS.DISEASE_CLAIM` — marketing copy cannot make disease-treatment claims.
- `MARSHALL.CLAIMS.TESTIMONIAL_DISCLOSURE` — testimonials in marketing copy require material-connection disclosure (FTC 16 CFR 255).
- `MARSHALL.CLAIMS.SUBSTANTIATION` — claims must have substantiation on file.
- `MARSHALL.BRAND.FORBIDDEN_STRINGS` — no "Vitality Score", no "Wellness Score", etc.
- `MARSHALL.BRAND.AMENDMENT_VIOLATIONS` — no CedarGrowth Organics or Via Cura Ranch references.
- `MARSHALL.BRAND.BIOAVAILABILITY_FORMAT` — must read "10–27×" exactly.
- `MARSHALL.BRAND.SEMAGLUTIDE` — never reference Semaglutide.

### 7.3 New `MARSHALL.MARKETING.*` Rules

| Rule ID | Severity | Description |
|---|---|---|
| `MARSHALL.MARKETING.NAMED_PERSON_CONNECTION` | P1 | Marketing copy that names a clinician (e.g., Dr. Fadi Dagher) must be backed by a current relationship and is reviewed by that person before publication. |
| `MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION` | P1 | Time-to-value claims (e.g., "in 12 minutes") must match the actual median completion time within ±20% — verified by querying the relevant analytics surface. |
| `MARSHALL.MARKETING.SCIENTIFIC_GROUNDING` | P2 | Phrases like "grounded in published research" require the substantiation file to list the specific publications. |
| `MARSHALL.MARKETING.OUTCOME_GUARANTEE` | P0 | Marketing copy MUST NOT promise specific outcomes (e.g., "you will sleep better") — it MAY frame possibilities ("designed to improve sleep") with appropriate disclosures. |
| `MARSHALL.MARKETING.COMPLIANCE_NAMING` | P2 | Naming compliance systems (e.g., "Marshall compliance system") in marketing copy is permitted only with reference to the architectural commitment in #119. |

### 7.4 Pre-Check Pipeline Reuse

The pre-check pipeline is the existing pipeline from #121. No new pipeline is built. The marketing-copy invocation:

1. Constructs a `PreCheckInput` with `surface = 'marketing_copy'` and the variant text.
2. Calls #121's `runPreCheck(input)`.
3. Receives a `PreCheckResult` with findings, proposed remediations, and clearance decision.
4. Writes the result and the session ID to the `marketing_copy_variants.marshall_precheck_session_id` field.
5. Sets `marketing_copy_variants.marshall_precheck_passed = (clearance_decision == 'clean')`.

### 7.5 Variant-Level Content Rules (in addition to standing rules)

Marketing copy variants for the homepage hero MUST:

- Use sentence case for headlines (not title case, not all-caps).
- End headlines with a period only if grammatically necessary; question marks permitted; exclamation marks NOT permitted.
- Avoid first-person plural ("we") in the headline; subhead may use "we" sparingly.
- Avoid the word "guarantee" or any synonym thereof.
- Avoid medical-treatment verbs ("cure", "treat", "heal") for non-treatment content.
- Avoid the words "miracle", "breakthrough", "revolutionary" — these are well-known FTC red flags.
- Avoid superlatives without substantiation ("the best", "the most accurate", "the only").

These rules are encoded in the `MARSHALL.MARKETING.*` rule namespace and enforced via §7.4 pre-check.

### 7.6 Steve Rica's Role

Steve Rica reviews every variant after Marshall pre-check passes and before the variant enters active testing. Steve's review captures:

- Approval timestamp + identity.
- Approval scope (this specific variant; not a blanket approval).
- Optional note (free-text rationale).

Steve can revoke approval at any time, which immediately deactivates the variant in active tests (per §6.6 rollback).

---

## 8. Information Architecture Decisions

### 8.1 What Is in the Hero (this prompt's scope)

- A headline + subheadline + CTA, content driven by the active variant.
- Whatever visual treatment currently exists (background, imagery, gradient, motion).
- The site header above (unchanged).

### 8.2 What Is NOT in the Hero (reserved for #138b–#138d)

- Trust signals naming the team (Dr. Fadi, Steve, advisory board) — reserved for #138b Trust Band, which sits below the hero.
- The Sarah composite case study — reserved for #138c Sample Protocol Walkthrough, which sits further down the page.
- Outcome timelines (30/60/90-day future-state) — reserved for #138d Outcome Visualization.
- Pricing — out of scope for the entire conversion stack as currently scoped.
- Testimonials — out of scope until FTC-compliant testimonial framework is built (referenced in #138b but not delivered there either).

### 8.3 Below-the-Fold Sections

Existing below-the-fold sections stay where they are and as they are. #138b Trust Band will insert immediately after the hero. #138d Outcome Visualization will insert after #138b's Trust Band. These insertions are the scope of those prompts, not this one.

### 8.4 Mobile Hero IA

Mobile hero parity is non-negotiable per the standing rules. Each variant must render on mobile (≤640px viewport) with:

- Headline still readable (no horizontal scroll, no truncation).
- Subheadline still complete (no truncation).
- CTA still tappable (≥44px touch target).

If a variant's word counts cause mobile breakage, the variant is shortened — not the layout adjusted. Variants D and B are the most at-risk for mobile word-count overflow; their word counts in §4 were chosen to fit the 360px-wide viewport assumption.

---

## 9. OBRA Four Gates

### Gate 1 — Observe & Brainstorm

- Catalog the current hero component path and structure.
- Verify which visitor-cookie mechanism is canonical (Thomas confirmation).
- Verify the actual median CAQ completion time (Variant D time-claim substantiation).
- Confirm Dr. Fadi Dagher consents to being named in Variant C marketing copy (Steve coordinates).
- Identify any existing A/B test infrastructure to reuse before introducing the Supabase-backed assignment table.
- Legal review: Variant C's "FTC-compliant claims" language; Variant D's "12 minutes" time claim.

### Gate 2 — Blueprint / Micro-Task Decomposition

1. Migration `20260424_marketing_copy_variants.sql` (§10).
2. Surface enum extension: `'marketing_copy'` added to `compliance/engine/types.ts`.
3. New rule module `compliance/rules/marketing.ts` with `MARSHALL.MARKETING.*` rules.
4. Existing rule modules updated to add `'marketing_copy'` to applicable surfaces.
5. `lib/marketing/variants/types.ts`.
6. `lib/marketing/variants/assignment.ts` (deterministic hashing).
7. `lib/marketing/variants/impression.ts` (async write with retry).
8. `lib/marketing/variants/conversion.ts` (visitor-id join).
9. `lib/marketing/variants/winnerCheck.ts` (statistics + criteria evaluation).
10. `lib/marketing/variants/precheck.ts` (Marshall #121 invocation wrapper).
11. `lib/marketing/variants/lifecycle.ts` (variant state machine).
12. API routes: `/api/marketing/variants/*`.
13. Hero component refactor — wrap existing component with `<HeroVariantRenderer>` that selects which copy to display. The existing component itself stays unchanged; the wrapper is new code that reads from the variant assignment and passes the correct strings to existing props.
14. Admin UI: `/admin/marketing/hero-variants` for variant CRUD, lifecycle actions, test status, results.
15. Steve approval flow + audit log entries.
16. Seed the four starting variants (§4) into the database.
17. Word-count validation utility.
18. SOC 2 collector extension: `marketing-copy-activity-collector` for #122 / #127.
19. End-to-end test suite.
20. Marshall self-scan of PR.

### Gate 3 — Review

- §3 visual non-disruption guarantee verified by diff inspection — no design tokens changed, no component shapes modified.
- All four starting variants pass Marshall pre-check (or have documented findings with Steve's accept-as-is decisions).
- Steve's approval flow captures identity, timestamp, scope.
- A/B test infrastructure is deterministic — same visitor + same test gets same variant across runs.
- Word-count validation rejects variants exceeding bounds.
- Mobile rendering verified on 360px and 414px viewports for each variant.
- All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- No reference to "Vitality Score" / "Wellness Score" / "5–27×" / "Semaglutide" except in guardrail checks.
- No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- `package.json`, email templates, applied migrations untouched.

### Gate 4 — Audit / TDD

- ≥90% coverage on `lib/marketing/variants/*` and `compliance/rules/marketing.ts`.
- Visual regression tests confirm no pixel diff in hero components beyond text content.
- Variant assignment determinism test: same `visitor_id` + same `test_id` → same variant across 1,000 calls.
- Impression write failure simulation: drops to error log, doesn't block render.
- Marshall pre-check integration test: variant with disease-claim language is rejected with finding `MARSHALL.CLAIMS.DISEASE_CLAIM`.
- Marshall pre-check integration test: variant with `MARSHALL.MARKETING.OUTCOME_GUARANTEE` violation rejected with P0 finding.
- Word-count overflow test: 13-word headline rejected at draft time.
- Steve approval revocation test: variant deactivates immediately when approval is revoked.
- Winner declaration test: variant meeting all 5 criteria becomes new control after Steve promotion.
- Loser archival test: variant failing criteria is archived, not deleted.
- Marshall self-scan: zero P0 findings on the PR.

---

## 10. Database Schema — Append-Only Migration

New migration: `supabase/migrations/20260424_marketing_copy_variants.sql`

```sql
-- ============================================================================
-- HOMEPAGE HERO VARIANTS + A/B TEST INFRASTRUCTURE + MARSHALL PRE-CHECK GATING
-- Migration: 20260424_marketing_copy_variants.sql
-- ============================================================================

-- Variant catalog
create table if not exists marketing_copy_variants (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null unique,                       -- e.g., 'hero.variant.A'
  surface text not null default 'hero'                -- expandable to other surfaces by successor prompts
    check (surface in ('hero')),
  variant_label text not null,
  framing text not null check (framing in (
    'process_narrative','outcome_first','proof_first','time_to_value','other'
  )),
  headline_text text not null,
  subheadline_text text not null,
  cta_label text not null,
  cta_destination text,
  word_count_validated boolean not null default false,
  marshall_precheck_passed boolean not null default false,
  marshall_precheck_session_id uuid,                  -- FK to precheck_sessions when #121 is in place
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  steve_approval_note text,
  active_in_test boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Activation invariant
  constraint variant_can_only_activate_when_validated_and_approved
    check (active_in_test = false
           or (word_count_validated = true
               and marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_variants_active on marketing_copy_variants(surface, active_in_test) where active_in_test = true;
create index idx_variants_archived on marketing_copy_variants(archived);

-- Impressions
create table if not exists marketing_copy_impressions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  slot_id text not null references marketing_copy_variants(slot_id),
  rendered_at timestamptz not null default now(),
  viewport text check (viewport in ('desktop','tablet','mobile')),
  referrer_category text check (referrer_category in (
    'direct','organic_search','paid_search','social','email','referral','other'
  )),
  is_returning_visitor boolean not null default false
);

create index idx_impressions_visitor on marketing_copy_impressions(visitor_id, rendered_at);
create index idx_impressions_slot on marketing_copy_impressions(slot_id, rendered_at desc);
create index idx_impressions_recent on marketing_copy_impressions(rendered_at desc);

-- Conversions
create table if not exists marketing_copy_conversions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  conversion_kind text not null check (conversion_kind in (
    'caq_start','signup_complete','bounce'
  )),
  preceding_slot_id text,                             -- which variant impressed before this conversion
  occurred_at timestamptz not null default now(),
  time_from_impression_seconds int                    -- null if no preceding impression in the session
);

create index idx_conversions_visitor on marketing_copy_conversions(visitor_id, occurred_at);
create index idx_conversions_kind_slot on marketing_copy_conversions(conversion_kind, preceding_slot_id);

-- Test rounds (so we can pause / resume / archive without losing the timeline)
create table if not exists marketing_copy_test_rounds (
  id uuid primary key default gen_random_uuid(),
  test_id text not null,
  surface text not null,
  active_slot_ids text[] not null,
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  resumed_at timestamptz,
  ended_at timestamptz,
  winner_slot_id text references marketing_copy_variants(slot_id),
  ended_reason text check (ended_reason in (
    'winner_promoted','no_winner_archived','manual_terminated','superseded'
  ))
);

-- Variant lifecycle audit log
create table if not exists marketing_copy_variant_events (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references marketing_copy_variants(id) on delete cascade,
  event_kind text not null check (event_kind in (
    'created','word_count_validated','precheck_completed',
    'steve_approved','steve_revoked','activated','deactivated',
    'archived','restored'
  )),
  event_detail jsonb,
  actor_user_id uuid references auth.users(id),
  occurred_at timestamptz not null default now()
);

create index idx_variant_events_variant on marketing_copy_variant_events(variant_id, occurred_at desc);

-- RLS
alter table marketing_copy_variants         enable row level security;
alter table marketing_copy_impressions      enable row level security;
alter table marketing_copy_conversions      enable row level security;
alter table marketing_copy_test_rounds      enable row level security;
alter table marketing_copy_variant_events   enable row level security;

-- Variants: marketing_admin / admin / superadmin read+write
create policy variants_admin_rw on marketing_copy_variants
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

-- Impressions and conversions: insert-only from any authenticated visitor session;
-- read by admin only (no per-visitor exposure to other visitors)
create policy impressions_insert on marketing_copy_impressions
  for insert to authenticated
  with check (true);                                  -- insertion gated by app-layer auth, not RLS

create policy impressions_admin_read on marketing_copy_impressions
  for select to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin'));

create policy conversions_insert on marketing_copy_conversions
  for insert to authenticated
  with check (true);

create policy conversions_admin_read on marketing_copy_conversions
  for select to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin'));

-- Test rounds + events: admin only
create policy test_rounds_admin on marketing_copy_test_rounds
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin'));

create policy variant_events_admin_read on marketing_copy_variant_events
  for select to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin'));
```

---

## 11. File Manifest

**New files (create):**

```
supabase/migrations/20260424_marketing_copy_variants.sql

compliance/rules/marketing.ts

lib/marketing/variants/types.ts
lib/marketing/variants/assignment.ts
lib/marketing/variants/impression.ts
lib/marketing/variants/conversion.ts
lib/marketing/variants/winnerCheck.ts
lib/marketing/variants/precheck.ts
lib/marketing/variants/lifecycle.ts
lib/marketing/variants/wordCount.ts
lib/marketing/variants/logging.ts

lib/soc2/collectors/marketing-copy-activity.ts

app/api/marketing/variants/route.ts
app/api/marketing/variants/[id]/route.ts
app/api/marketing/variants/[id]/precheck/route.ts
app/api/marketing/variants/[id]/approve/route.ts
app/api/marketing/variants/[id]/revoke/route.ts
app/api/marketing/variants/[id]/activate/route.ts
app/api/marketing/variants/[id]/archive/route.ts
app/api/marketing/test-rounds/route.ts
app/api/marketing/test-rounds/[id]/pause/route.ts
app/api/marketing/test-rounds/[id]/resume/route.ts
app/api/marketing/test-rounds/[id]/promote-winner/route.ts
app/api/marketing/impressions/route.ts
app/api/marketing/conversions/route.ts

components/marketing-admin/VariantList.tsx
components/marketing-admin/VariantEditor.tsx
components/marketing-admin/VariantPreview.tsx
components/marketing-admin/PreCheckResultPanel.tsx
components/marketing-admin/SteveApprovalAction.tsx
components/marketing-admin/TestRoundDashboard.tsx
components/marketing-admin/ImpressionConversionChart.tsx
components/marketing-admin/WinnerDeclarationPanel.tsx
components/marketing-admin/ArchivedVariantsList.tsx

components/home/HeroVariantRenderer.tsx          (new wrapper; imports existing hero component unchanged)

app/(admin)/admin/marketing/page.tsx
app/(admin)/admin/marketing/hero-variants/page.tsx
app/(admin)/admin/marketing/hero-variants/new/page.tsx
app/(admin)/admin/marketing/hero-variants/[id]/page.tsx
app/(admin)/admin/marketing/test-rounds/page.tsx
app/(admin)/admin/marketing/test-rounds/[id]/page.tsx

supabase/seeds/marketing_copy_variants_seed.sql  (the four starting variants from §4)

tests/marketing/variants/**/*.test.ts
tests/e2e/hero_variant_assignment.test.ts
tests/e2e/hero_variant_lifecycle.test.ts
tests/e2e/hero_variant_marshall_precheck.test.ts
tests/e2e/hero_winner_declaration.test.ts
tests/visual-regression/hero_no_design_drift.test.ts
```

**Modified files (surgical edits only):**

```
compliance/engine/types.ts                       (add 'marketing_copy' to Surface enum)
compliance/engine/RuleEngine.ts                  (register marketing rule module)
compliance/rules/claims.ts                       (add 'marketing_copy' to applicable surfaces)
compliance/rules/brand.ts                        (add 'marketing_copy' to applicable surfaces)
lib/getDisplayName.ts                            (add 'marketing_admin' label if needed)
app/(home)/page.tsx                              (replace existing <Hero /> with <HeroVariantRenderer />, no other changes)
app/(admin)/admin/page.tsx                       (add Marketing subsection link)
lib/soc2/collectors/runAll.ts                    (register marketing-copy-activity-collector)
```

**Explicitly NOT modified (DO NOT TOUCH):**

- The existing hero component file itself — visual rendering stays unchanged. `<HeroVariantRenderer>` wraps it.
- `tailwind.config.js` — no design token changes.
- Brand color constants files.
- Typography configuration.
- Any imagery or asset files.
- `package.json` — assignment hashing uses Node `crypto.subtle`, no new libraries.
- Supabase email templates.
- Any previously-applied migration.

---

## 12. Acceptance Criteria

- ✅ Migration applies cleanly. RLS enabled on every new table. Activation invariant constraint verified by test.
- ✅ Surface enum extended with `'marketing_copy'`.
- ✅ All four starting variants seeded; each passes Marshall pre-check or has documented Steve accept-as-is.
- ✅ Variant assignment is deterministic — verified by test.
- ✅ Impression and conversion writes are async and don't block render — verified by load test.
- ✅ Winner declaration requires all 5 criteria — verified by test.
- ✅ Loser archival preserves history — verified by test.
- ✅ Steve approval revocation immediately deactivates — verified by test.
- ✅ Word-count validation rejects oversized variants at draft time.
- ✅ Mobile rendering verified at 360px and 414px viewports for each starting variant.
- ✅ Visual regression test passes — no pixel diff in hero beyond text content.
- ✅ All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- ✅ Desktop + mobile parity on every new admin page.
- ✅ No reference to "Vitality Score" / "Wellness Score" / "5–27×" / "Semaglutide" except in guardrail checks.
- ✅ No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- ✅ `package.json`, email templates, applied migrations, design tokens, brand colors, typography untouched.
- ✅ `marshall-lint` self-scan produces zero P0 findings.
- ✅ OBRA Gate 1–4 summary in PR description.

---

## 13. Rollout Plan

**Phase A — Infrastructure Only (Days 1–7)**

- Migration applied. RLS verified. Admin UI accessible to Steve and Marketing.
- Four starting variants seeded but `active_in_test = false`.
- `<HeroVariantRenderer>` deployed serving control only (existing copy).
- Impression and conversion tracking running on control to establish baseline.

**Phase B — Marshall Pre-Check + Steve Approval (Days 8–14)**

- Each starting variant runs through pre-check.
- Findings (if any) addressed via remediation or copy adjustment.
- Steve reviews and approves the remediated variants.
- Variants approved but not yet activated.

**Phase C — Active A/B Test (Days 15–35)**

- Variants activated. Test round started. Variant assignment 20% control / 20% A / 20% B / 20% C / 20% D.
- Daily monitoring of impression-conversion data.
- Steve and Marketing review weekly.

**Phase D — Winner Declaration (Day 36+)**

- §6.4 criteria evaluated. If a winner exists, Steve reviews and promotes.
- Promoted winner becomes new control. Other variants archived.
- Test round closed with `ended_reason`.

**Kill-Switches**

- `MARKETING_VARIANT_TEST_MODE`: `active` / `paused` / `control_only` (Steve + Gary dual approval to set `paused` or `control_only`).
- Per-variant `active_in_test` toggle in admin UI for surgical rollback.

---

## 14. Conversion Stack Sibling Coordination

This prompt is the first of five conversion-stack siblings. Each subsequent prompt should:

- **#138b Trust Band** — surface team and regulatory posture below the hero. Pass through Marshall pre-check using the `'marketing_copy'` surface established here.
- **#138c Sample Protocol Walkthrough ("Sarah" Scenario)** — composite case study. Will require Dr. Fadi Dagher pre-publication review (hard requirement, not optional).
- **#138d Outcome Visualization & 30/60/90 Future-State** — outcome timelines. Marshall pre-check applies, with `MARSHALL.MARKETING.OUTCOME_GUARANTEE` (P0) as a critical guard.
- **#138e Supplement Upload Diagnostic & Fix** — bug fix, not copy work. Different format from #138a–#138d (implementation spec, not copy+IA spec).

Each sibling reuses the marketing-copy infrastructure established in this prompt — `Surface = 'marketing_copy'`, the Marshall rule namespace, the variant lifecycle, the A/B test infrastructure pattern (where applicable). No sibling reimplements these primitives.

---

## 15. Document Control

| Field | Value |
|---|---|
| Prompt number | 138a |
| Title | Homepage Hero & Value-Proposition Rewrite |
| Conversion-stack position | First of five (#138a–#138e) |
| Format | Hybrid (copy + IA + implementation + A/B infrastructure + Marshall integration) |
| Visual non-disruption | §3 declares the visual system off-limits to modification |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Originating analysis | Executive product review (April 24, 2026) |
| Starting variants | 4 (Process-Narrative, Outcome-First, Proof-First, Time-to-Value) plus Control |
| New Marshall surface | `'marketing_copy'` |
| New Marshall rule namespace | `MARSHALL.MARKETING.*` |
| New tables | 5 (variants, impressions, conversions, test_rounds, variant_events) |
| Authority for visual changes | None — explicit non-disruption guarantee in §3 |
| Successor / sibling prompts | #138b Trust Band, #138c Sarah Scenario, #138d Outcome Visualization, #138e Supplement Upload Fix |
| Successor variants | Added per §5 slot structure without new prompts |

---

## 16. Acknowledgment

By memorializing this prompt in the Prompt Library, Gary establishes:

- The four starting hero copy variants in §4 as the initial test set, subject to Marshall pre-check (§7) and Steve Rica approval (§7.6) before activation.
- The visual non-disruption guarantee in §3 as binding on Claude Code's implementation — no design tokens, components, imagery, brand voice, or section orderings may be modified by this prompt.
- The A/B test infrastructure in §6 with its determinism, tracking, and winner-declaration rules.
- Marshall pre-check (#121 pipeline) as the gate for all marketing copy with the new `'marketing_copy'` surface and the `MARSHALL.MARKETING.*` rule namespace.
- The slot structure in §5 as the path for future variants without re-prompting.

Steve Rica retains final approval authority on every variant prior to activation. Steve may revoke approval at any time, immediately deactivating the variant per §6.6.

This prompt does not introduce testimonials, pricing changes, or new homepage sections — those are reserved for sibling conversion-stack prompts #138b–#138d.

---

## Memorialization note

Originally drafted as Prompt #138. Renumbered to **#138a** at Gary's direction (Option D — letter suffix) on 2026-04-24 because the integer slot `#138` is already claimed in the live library by `prompt-138-multi-framework-evidence-architecture.md` (commit `8d42d89`, itself a renumber from the original compliance-stack `#127`).

**Renumber pattern applied:**
- This prompt: `#138` → `#138a`
- Sibling references in this spec body: `#139` → `#138b` (Trust Band), `#140` → `#138c` (Sample Protocol Walkthrough), `#141` → `#138d` (Outcome Visualization), `#142` → `#138e` (Supplement Upload Diagnostic)

**Caveat on the parent integer:** unlike `#129a` (which is a true amendment to `#129`), `#138a`–`#138e` are not amendments to `#138` (Multi-Framework Evidence Architecture). They share the integer purely as a stylistic convention to bundle the conversion stack under one prefix per Gary's preference. Future readers should not infer a content relationship between Multi-Framework Evidence Architecture and the conversion stack — they share an integer slot, nothing else.

**§0 lineage typo preserved as authored:** the lineage block at the top references "#119–#138 compliance stack (canonical numbering)". The compliance stack actually ends at `#128` per the §20 table in the prior `#128` prompt (Compliance Coach), so the upper bound likely should read `#119–#128`. Preserved verbatim per Gary's silence on the typo when offered the option to fix it during memorialization. A future amendment could correct it.

**Sibling-stack status:** `#138b`–`#138e` are not yet authored as of this memorialization. When they arrive, they will be memorialized at `docs/prompts/prompt-138b-*.md`, `prompt-138c-*.md`, `prompt-138d-*.md`, `prompt-138e-*.md` respectively.

**Implementation status:** this spec is memorialized at authoring time; no code touched. Execution flows through the concurrent Claude Code engineering session per the established pattern. The visual non-disruption guarantee in §3 is the load-bearing constraint for that execution: any change to design tokens, brand colors, typography, imagery, or component shapes is out-of-scope and would require a separate prompt.
