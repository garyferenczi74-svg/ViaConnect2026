# Prompt #138e — Outcome Visualization & 30/60/90 Future-State (Categorical Phase)

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Conversion-stack sibling #4 / Outcome-framing copy + IA + timeline visualization
**Parent prompts:** #138 (Hero — visual non-disruption pattern, `Surface = 'marketing_copy'`); #138c (Trust Band — Dr. Fadi clinician card, regulatory paragraph, testimonial pipeline shipped empty); #138d (Sarah Scenario — scope-reduction discipline, `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY`)
**Related governance branch (non-parent):** #138b (Dependabot Triage)
**Conversion-stack siblings:** #138 Hero (shipped); #138c Trust Band (shipped); #138d Sarah Scenario (shipped); #138f Supplement Upload Fix (pending)
**Originating analysis:** Executive product review (April 24, 2026) critique 4 — *"The outcome isn't as vivid as it could be. I never quite got a clear picture of what will be different for me after I use this... Will I have more energy, better sleep, a clear daily plan."*
**Phasing decision (Gary, April 24, 2026):** This prompt ships **categorical future-state framing only**. Two successors are reserved with named preconditions:

- **#138e-a** — Testimonial activation against #138c §6's deferred pipeline. Ships only when ≥1 signed endorser consent file exists AND legal counsel of record is engaged AND briefed.
- **#138e-b** — Bio Optimization Score as marketing-cited outcome metric. Ships only when the aggregate outcomes pipeline is verified live with cohort segmentation, consent governance, and freshness monitoring.

**Status:** Active — authorizes Claude Code to implement §5–§10. The two successors are reserved, not authorized.
**Date:** 2026-04-24
**Delivery Mode:** Claude Code — `/effort max`
**Local Path:** `C:\Users\garyf\ViaConnect2026\viaconnect-web`
**Supabase Project:** `nnhkcufyqjojdbvdrpky` (us-east-2)

---

## 0. Standing Platform Rules (Non-Negotiable)

Every standing rule from #119 applies, restated for continuity:

- Score name is **"Bio Optimization"** — never "Vitality Score" or "Wellness Score".
- Bioavailability is exactly **10–27×** (does not need to be cited inside the outcome surface).
- No Semaglutide. Retatrutide is injectable only, never stacked (no peptide is named in this prompt regardless).
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

The April 24, 2026 executive product review's critique 4 read: *"The outcome isn't as vivid as it could be. I never quite got a clear picture of what will be different for me after I use this and after spend all that time inputting my data? Will I have more energy, better sleep, a clear daily plan.. pull me in sooner."*

The reviewer's request is for outcome vividness — not abstract benefit language but a concrete picture of what the next 30, 60, and 90 days look like for someone who actually uses the platform. The conversion-stack work so far has answered three questions:

- **Hero (#138)** — What is this?
- **Trust Band (#138c)** — Can I trust this?
- **Sarah Scenario (#138d)** — What does this actually produce?

**#138e answers the fourth question: What changes for me?**

This prompt delivers **categorical future-state framing**: a 30/60/90-day timeline structure showing which kinds of changes typically emerge in which timeframe windows, expressed at a category level (energy, sleep, mental clarity, etc.) without numerical claims, percentage outcomes, before/after assertions, or testimonials about specific results.

### 1.1 What Categorical Future-State Means

The reviewer wanted a "clear picture." A clear picture does not require a numerical claim. A clear picture can be:

- A **timeline structure** that names which areas of life tend to shift in which order — sleep typically responding before deep cellular changes, energy patterns settling before metabolic markers shift, and so on.
- **Outcome categories described in everyday language** — "afternoon energy stabilizes," "sleep onset gets steadier," "mid-morning brain fog softens" — that the reader recognizes from their own life without the platform claiming it will happen for them on a specific schedule.
- **A framing of cumulative effect** — what 30 days establishes, what 60 days deepens, what 90 days enables — that respects the truth that biology takes time without quantifying timeframes that ViaConnect cannot reliably promise.

The picture is vivid; the claims are categorical. This satisfies the reviewer's "vivid picture" without crossing into outcome-promise territory that needs substantiation files, FTC typicality disclosures, or peer-reviewed citation work.

### 1.2 What This Prompt Is Not

Deliberately out of scope, with successors named:

**Reserved for #138e-a (Testimonial Activation):**

- Activating #138c §6's deferred testimonial pipeline.
- Surfacing real practitioner or consumer testimonials in the outcome timeline.
- Material-connection disclosure rendering on testimonial elements.
- Photograph consent capture for endorser imagery.

**#138e-a precondition (binding):** At least one signed endorser consent file is on record in the `trust-band-consents` Supabase Storage bucket per #138c §8.6, AND named legal counsel of record is engaged and has confirmed availability for per-testimonial review per #138c §6.3.

**Reserved for #138e-b (Bio Optimization Score as Outcome Metric):**

- Surfacing the Bio Optimization Score as a public-facing outcome metric in marketing copy.
- Citing aggregate Score-change data ("users see their Score rise X points by day Y") as substantiation.
- Cohort-segmented outcome claims (Tier 1 vs. Tier 2 vs. Tier 3 outcome differentiation).
- Score visualization graphics on the homepage outcome surface.

**#138e-b precondition (binding):** An aggregate outcomes pipeline is verified live with documented cohort segmentation logic, documented consent governance for outcome data inclusion, documented statistical methodology approved by Steve Rica, and a freshness-monitoring job confirming claims stay accurate as the cohort evolves.

**Out of scope entirely (no successor reserved):**

- Specific peptide names (excluded per #138d §3.2).
- Specific supplement SKU names.
- Specific dosages or administration routes.
- Specific user names attached to specific results (testimonial framing is reserved for #138e-a; even there, specific result attribution is constrained).
- Outcome guarantees of any kind.
- Comparison claims against competitors or baseline non-treatment.

### 1.3 Why Phased

The conversion-stack work has demonstrated that scope-reduction discipline is the reason the stack hasn't generated regulatory exposure. #138d preserved that discipline by deferring dose-specific case study work. #138e preserves it again by deferring testimonial activation and Score-as-outcome surfacing until their preconditions are met. Phasing is not slowness; phasing is risk-aware sequencing that lets each new surface ship against real conditions instead of planned ones.

---

## 2. Why Categorical Outcome Framing Works

### 2.1 Vividness Without Numerical Claims

A specific number ("73% of users report improved sleep by day 60") is one form of vividness. A specific picture ("by month two, the afternoon energy crash that used to define your 3pm starts to feel less inevitable") is another. The second form is what category-leading wellness brands have shifted toward over the last several years, partly for FTC-posture reasons and partly because vivid pictures convert at least as well as numbers — visitors don't experience numbers viscerally.

Function Health's marketing rarely cites percentages; it cites discoveries ("you'll learn whether your hormone levels actually match how you feel"). Whoop's outcome framing has shifted from numerical performance claims toward experiential framing ("you'll see the connection between Tuesday's late dinner and Wednesday's heavy legs"). Levels' outcome surface is almost entirely categorical ("you'll find out which of your 'healthy' breakfasts actually spike your blood sugar").

The pattern is mature: vivid categorical framing beats numerical claims for both conversion and regulatory posture. #138e adopts this pattern.

### 2.2 The 30/60/90 Structure as a Trust Signal

A 30/60/90-day breakdown is itself a trust signal because it acknowledges that biology takes time. Wellness products that promise immediate transformation are pattern-matched by sophisticated visitors as suspicious. A timeline that says "month one establishes, month two deepens, month three enables" implicitly says: *we are not a quick-fix product, and we are honest about what biology actually does.*

This also handles the reviewer's specific concern — "after spend all that time inputting my data?" — by making the time investment legible. The visitor sees what the data input is *for* across a window of weeks, not what it produces in the first session.

### 2.3 Categorical Outcomes Inherit From the Sarah Scenario

#138d established four protocol categories (methylation-pathway support, sleep architecture optimization, stress-response balance, mitochondrial energy support). #138e's outcome framing maps each protocol category to its corresponding outcome category — what one tends to *feel* when the protocol category is working. This category-to-category coherence reinforces both surfaces and avoids introducing new vocabulary that would dilute the platform's positioning.

---

## 3. Binding Scope Definition

This section is the binding reference for Claude Code implementation. Same pattern as #138d §3 — concrete enumeration with conservative defaults.

### 3.1 Stays In

- **Three timeline phases** — Days 1–30, Days 31–60, Days 61–90. Each phase has its own card with its own categorical framing.
- **Outcome categories mapped to the four protocol categories from #138d §4.4**: energy, sleep quality, mental clarity / stress recovery, and recovery / vitality (these are the consumer-language counterparts to the protocol categories).
- **Categorical framing language** like "afternoon energy stabilizes," "sleep onset gets steadier," "mid-morning brain fog softens," "weekend recovery feels less like catching up." Specific experiential language; not specific numerical claims.
- **Cumulative-effect framing** — what each phase establishes, deepens, or enables, expressed as the typical pattern of change rather than a guaranteed schedule.
- **An honest qualifier line** — visible language acknowledging that "not everyone experiences the same pattern, and some categories shift faster than others depending on individual biology."
- **A single hand-off CTA** — same pattern as #138d §4.7. "Start your assessment" routing into the real CAQ, with a sentence reinforcing that the visitor's timeline will be theirs, not Sarah's, not the average's.
- **One compact reference to the Bio Optimization Score** — at the level of "the platform tracks your progress through your Bio Optimization Score, which evolves as you do." The Score is named as a tracking mechanism, **not** a marketing-cited outcome metric. Surfacing the Score as the outcome is reserved for #138e-b.

### 3.2 Stays Out — Numerical Outcome Claims

- Percentage improvements ("X% of users report Y").
- Score-change values ("users see their Bio Optimization Score rise N points").
- Days-to-result claims as guarantees ("you will sleep better in 14 days").
- Aggregate outcome statistics of any kind (these are reserved for #138e-b once the pipeline exists).
- Comparison-to-baseline framing ("X times better than not following a protocol").
- "Average user" framing without aggregate substantiation.

### 3.3 Stays Out — Testimonials and Endorser Content

- Quoted testimonials (deferred to #138e-a per §1.2).
- Practitioner endorsements with specific outcome attribution.
- Consumer reviews or ratings.
- Star ratings or thumbs-up counts.
- Photographs of users captioned with results.

### 3.4 Stays Out — Score as Outcome Metric

- Score-change graphs or trajectory visualizations on the homepage.
- Specific Score values cited in outcome copy ("most users reach a Score of X").
- Cohort-segmented Score claims ("Tier 2 users see their Score rise faster than Tier 1").
- Score-based outcome guarantees of any form.

The Score is named once, as a tracking mechanism. Public outcome metric surfacing is #138e-b's scope.

### 3.5 Stays Out — Drug Names and Intervention Specifics

Inheriting #138d §3.2 verbatim: no peptide names, no specific SKUs, no specific dosages, no delivery form specifications, no specific bioavailability figures within the outcome timeline. The `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` (P0) rule from #138d §6.3 applies to all outcome-section content.

### 3.6 Stays Out — Outcome Guarantee Language

The `MARSHALL.MARKETING.OUTCOME_GUARANTEE` (P0) rule from #138 §7.3 applies most strongly here. Forbidden patterns include:

- "You will [verb] [outcome]." → softer: "people often find [outcome] becomes [adjective]."
- "Within X days, you'll [outcome]." → softer: "by month one, the typical pattern is..."
- "Guaranteed [outcome]." → never.
- "Designed to give you [specific outcome]." → softer: "addresses the categories underlying [general capability]."

The general translation: every outcome statement frames what tends to happen for *people who follow protocols* rather than what *will happen for the visitor*. This is not weasel-wording; it's truthful framing of what the platform actually does.

### 3.7 The Honest Qualifier Is Required

Per §3.1, a qualifier line is required language: *"Not everyone experiences the same pattern, and some categories shift faster than others depending on individual biology."*

This is enforced via Marshall pre-check (`MARSHALL.MARKETING.OUTCOME_GUARANTEE` P0 includes a check that any 30/60/90-style timeline content includes adjacent qualifier language). The qualifier renders in-element with the timeline, not as a footnote, same discipline as the composite disclosure in #138d.

---

## 4. Copy — Starting Set

Like #138d, the outcome timeline ships as a single coherent copy set rather than a tested-variant set. The narrative arc benefits from singular framing; a/b-testing competing timeline structures is reserved as future work if conversion data warrants it.

### 4.1 Section Title

**Starting copy:** *"What the next 90 days might look like."*

**Why this phrasing:**

- "Might" — explicit modal hedge. Not "will." Not "what to expect." "Might" signals that the timeline is illustrative of the typical pattern, not a forecast for the visitor.
- "Next 90 days" — anchors the structure without committing to specific outcomes within those days.
- "Look like" — invites the visitor to picture, not to expect. Picture-language is the vividness the reviewer asked for.

### 4.2 Introductory Paragraph

**Starting copy:**

> "Biology doesn't change overnight, and good wellness work shouldn't pretend otherwise. The patterns below describe the typical sequence people who follow tiered protocols tend to notice — sleep often shifting before energy, energy often shifting before deeper recovery markers. Your own timeline will reflect your own biology. The point of this section is to make the journey legible."

**Why this phrasing:**

- Opens by naming the truth that biology takes time. This is a credibility move — sophisticated visitors immediately distrust products that imply fast transformation, so leading with "biology doesn't change overnight" earns trust by acknowledging what the visitor already suspects.
- "Patterns below describe the typical sequence" — categorical framing flagged immediately. Not "results you'll see," but "sequence people tend to notice."
- "Your own timeline will reflect your own biology" — same load-bearing sentence pattern as #138d §4.7's "your assessment will be different because your biology is different." This sentence is required language per §4.7 below; future variants must preserve its substantive content.
- "Make the journey legible" — names the section's purpose aloud, the way #138d named its purpose aloud. Self-explanation is a trust device.

### 4.3 Phase Card 1 — Days 1–30 ("What month one establishes")

**Card title:** *"Days 1–30: Foundation."*
**Card subtitle:** *"What month one establishes."*

**Card body:**

> "The first month is mostly about settling in. You complete your assessment, your protocol categories begin showing up in your daily plan, and your Bio Optimization Score starts capturing the inputs that will tell its story over time. People often report that the most reliable shift in this window is around sleep — sleep onset getting steadier, mid-night wakings becoming less frequent — because sleep responds to small inputs faster than most other categories. Energy patterns may begin to shift, but more often that becomes obvious in month two."

**Why this phrasing:**

- "Mostly about settling in" — sets expectations downward. The first month does not promise transformation; it promises settling. This is honest and protective.
- "Bio Optimization Score starts capturing the inputs that will tell its story" — names the Score as a tracking mechanism (per §3.1's permitted scope), with no claim about *what* the Score will show.
- "People often report" — categorical framing. Not "you will report," not "the average user reports." "People often" is the truthful framing.
- "Sleep responds to small inputs faster than most other categories" — substantiable as a general functional-medicine observation; not a per-product claim.
- "May begin to shift" / "more often that becomes obvious in month two" — temporal hedging that respects the variability of biological response.

### 4.4 Phase Card 2 — Days 31–60 ("What month two deepens")

**Card title:** *"Days 31–60: Deepening."*
**Card subtitle:** *"What month two deepens."*

**Card body:**

> "By the end of month two, the categories that were settling start to feel like patterns. Afternoon energy may feel less like a wall and more like a glide. Mental clarity in the late morning often steadies. For people on a Tier 2 or Tier 3 protocol, the engine begins refining suggestions based on the data you've added — your Score reflecting the trajectory of those refinements. This is also the window where many people notice that recovery from physical effort or stressful days feels less like catching up."

**Why this phrasing:**

- "Start to feel like patterns" — qualitative framing. Not "improve by X." Not "are now better."
- "May feel less like a wall and more like a glide" — picture-language, vivid, recognizable from anyone who has experienced the 3pm energy crash.
- "Mental clarity in the late morning often steadies" — same pattern: qualitative, common-experience, no numerical claim.
- "The engine begins refining suggestions based on the data you've added" — names the platform's actual operational behavior (the engine genuinely does refine as more data accrues per the Tier framework from #138d) without claiming a specific outcome.
- "Your Score reflecting the trajectory" — second permitted Score reference, again as tracking mechanism, not as outcome metric.
- "Recovery feels less like catching up" — visceral phrase, recognizable to anyone who has ever felt chronically behind.

### 4.5 Phase Card 3 — Days 61–90 ("What month three enables")

**Card title:** *"Days 61–90: Enablement."*
**Card subtitle:** *"What month three enables."*

**Card body:**

> "Month three is where the protocol starts feeling less like something you're following and more like something that's just part of how you operate. The categories that were deepening become familiar. People often report that the question shifts from 'is this working' to 'what do I want to focus on next' — which is the right question, because by this point the engine has refined its picture of you and your protocol has matured around your biology. For Tier 3 users with a GeneX360™ panel, this is typically when pathway-level refinements become most apparent."

**Why this phrasing:**

- "Less like something you're following and more like something that's just part of how you operate" — this is the language of habit formation, which is honest about what 90 days actually establishes.
- "The question shifts from 'is this working' to 'what do I want to focus on next'" — names the experiential outcome (transitioning from validation-seeking to direction-choosing) without quantifying it.
- "GeneX360™ panel" / "pathway-level refinements" — surfaces the brand sub-mark and the Tier 3 mechanic in a way that gestures at the deeper-tier value without overclaiming results specific to genetics-aware protocols.
- "Typically when pathway-level refinements become most apparent" — temporal categorical framing with the same hedge structure used in earlier phases.

### 4.6 Honest Qualifier Block

Renders adjacent to the three phase cards, visually distinct but not as a footnote. Uses existing Card Navy `#1E3054` background pattern.

**Starting copy:**

> "Not everyone experiences the same pattern, and some categories shift faster than others depending on individual biology. The timeline above describes what tends to be the case across people on tiered protocols — your own may move faster, slower, or in a different order. The platform's job is to track that for you, not to predict it."

**Why this phrasing:**

- Direct acknowledgment of variance — matches the FTC posture for atypicality even before a single testimonial ships.
- "Faster, slower, or in a different order" — three explicit possibilities, signaling that variance is normal.
- "The platform's job is to track that for you, not to predict it" — names the platform's actual operational role, which is observational/responsive, not predictive. This is both honest and a differentiator from products that claim predictive precision.

### 4.7 Hand-Off CTA

Mirrors the #138d §4.7 pattern.

**Starting copy:**

> "Your timeline will be yours — built from your assessment, your data, and your biology. Start the assessment when you're ready."

**CTA label:** "Start my assessment"

**CTA destination:** Unchanged from current CAQ-start route.

**Why this phrasing:**

- "Will be yours" — possessive, individuating. Counters the risk that visitors interpret the categorical timeline as a forecast of their own.
- "Built from your assessment, your data, and your biology" — names the three actual inputs (CAQ, supplemental data including labs, optional genetics) without listing them at the architectural level.
- "When you're ready" — non-pressuring close. The reviewer's critique 4 mentioned "pull me in sooner" — this CTA pulls without pressuring, which performs better for the kind of considered-purchase visitor most likely to be reading this section.

### 4.8 Bio Optimization Score Reference (Bounded)

The Score is referenced **exactly twice** across the timeline copy — once in §4.3 ("starts capturing the inputs that will tell its story over time") and once in §4.4 ("your Score reflecting the trajectory of those refinements"). Both references are at the level of tracking mechanism, not marketing-cited outcome.

The pattern is enforced by Marshall pre-check: `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` (P0, new — see §6.3). Any copy that surfaces the Score as a marketing-cited outcome metric (with specific values, change rates, or comparison framing) is rejected. The full Score-as-outcome surface is reserved for #138e-b once the aggregate outcomes pipeline is verified live.

This is the most subtle scope-reduction discipline in the entire conversion stack: the Score is named, but bounded. Naming it integrates the platform's signature mechanic into the outcome framing without committing to claims that would require the unbuilt aggregate outcomes pipeline.

### 4.9 Visual Treatment of the Timeline

Three phase cards arranged horizontally on desktop (≥1024px), vertically stacked on mobile (<1024px). The qualifier block from §4.6 sits below the three cards on both viewports. The hand-off CTA sits below the qualifier block.

**No graphical timeline illustration.** No upward-trending arrow, no "Score over time" mock graph, no before/after silhouette. The timeline is communicated typographically — through card titles, subtitles, and body copy — not through a visualization that would suggest a quantified progression. Adding a graphical timeline visualization is reserved for #138e-b once aggregate outcomes data exists to populate it honestly.

---

## 5. Slot Structure for Future Variants

Like #138d, the outcome timeline content is table-backed so Marketing can adjust phase descriptions, qualifier language, or CTA copy without code changes — within the scope-reduction discipline enforced by §3 and Marshall pre-check.

### 5.1 Phase Card Slot Schema

Each phase card row in the `outcome_timeline_phases` table carries:

| Field | Notes |
|---|---|
| `phase_id` | `phase_1_30` \| `phase_31_60` \| `phase_61_90` |
| `phase_title` | Required |
| `phase_subtitle` | Required |
| `phase_body` | Required |
| `marshall_precheck_session_id` | FK |
| `marshall_precheck_passed` | Bool |
| `steve_approval_at` | Required for activation |
| `active` | Activation gate per check constraint |
| `display_order` | Stable |
| `created_at` / `updated_at` | Standard |

Three phase rows always exist; only one of each is `active = true` at any time.

### 5.2 Qualifier and CTA Slot

Single rows in `outcome_timeline_qualifier` and `outcome_timeline_cta` respectively, with the same activation-gate pattern.

### 5.3 Timeline Variant Set

The starting copy is "30/60/90." If Marketing later wants to test an alternative structure (e.g., 14/45/90, or Quick Wins/Compounding/Mature) the variant set supports it via a `variant_set_id` field. Only one variant set is `active = true` at a time.

### 5.4 What the Slot Structure Does Not Allow

The slot structure does not allow:

- A new phase card with numerical outcome claims — `MARSHALL.MARKETING.OUTCOME_GUARANTEE` P0 catches it.
- A new phase card with peptide names or dosages — `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` P0 catches it.
- A new phase card without the qualifier block reference — `MARSHALL.MARKETING.OUTCOME_GUARANTEE` extended check (§6.3) catches it.
- A new phase card surfacing the Score as outcome metric — `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` (new this prompt, §6.3) catches it.

The discipline is database-enforced, pre-check-enforced, and Steve-reviewed. Three layers, deliberate redundancy.

---

## 6. Marshall Pre-Check Integration

### 6.1 Surface Reuse

`'marketing_copy'` Surface from #138 §7.1 reused unchanged.

### 6.2 Existing Rules That Apply

All of `MARSHALL.MARKETING.*` from #138 §7.3 applies, with these specific points of intensity for outcome content:

- `MARSHALL.MARKETING.OUTCOME_GUARANTEE` (P0) — primary enforcement layer.
- `MARSHALL.MARKETING.NAMED_PERSON_CONNECTION` (P1) — applies if Dr. Fadi is referenced; this prompt does not name him in the outcome timeline (he's named in the Trust Band immediately above), but if a future variant introduces him here, the rule fires.
- `MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION` (P1) — applies to the 30/60/90 framing. This rule's substantiation requirement is satisfied because 30/60/90 is presented as typical pattern of change (categorically substantiable from functional-medicine literature) rather than as guaranteed schedule.
- `MARSHALL.MARKETING.SCIENTIFIC_GROUNDING` (P2) — applies to phrases like "sleep responds to small inputs faster than most other categories"; the substantiation reference points to functional-medicine reference materials that establish this categorical framing.
- `MARSHALL.MARKETING.COMPOSITE_DISCLOSURE` (P0, from #138d §6.3) — applies because the timeline content is illustrative; the §4.6 qualifier block satisfies this.
- `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` (P0, from #138d §6.3) — applies; the timeline content names no specific peptide, SKU, or dosage.

### 6.3 New Rules Specific to Outcome Content

Two rules registered specifically for #138e:

| Rule ID | Severity | Description |
|---|---|---|
| `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` | P0 | The Bio Optimization Score may be referenced as a tracking mechanism (e.g., "your Score reflects your trajectory") but MUST NOT be cited as a marketing-claimed outcome metric (e.g., "users see their Score rise X points by day Y"). Specific Score values, change rates, cohort-segmented Score claims, and comparison-to-baseline Score framing are P0 violations. The full Score-as-outcome surface is reserved for #138e-b once the aggregate outcomes pipeline is verified live. |
| `MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED` | P0 | Any 30/60/90-style timeline copy MUST be adjacent to a qualifier block acknowledging individual variance ("not everyone experiences the same pattern" or substantively equivalent). Timeline content rendered without qualifier adjacency is a P0 violation. The qualifier MUST be in-element with the timeline, not a footnote. |

Both rules are P0 because they are the enforcement teeth of the categorical-framing discipline. The discipline is not negotiable at the content-author level.

### 6.4 Pre-Check Pipeline Reuse

The pipeline from #121 is invoked via the wrapper from #138 §7.4. No new pipeline code; the Score-as-tracking detector is a new check function, not a new pipeline.

### 6.5 Steve Approval Required

Marshall pre-check passing is necessary but not sufficient. Steve Rica reviews every phase card, qualifier block, and CTA before activation. Same pattern as #138, #138c, #138d.

### 6.6 Legal Counsel — Not Required for This Prompt

Unlike #138c §6.3 (which requires legal counsel review for testimonials) and #138e-a (which will require it once that prompt activates), #138e's categorical framing does not require legal counsel review at the per-phrase level. Steve's approval is sufficient because:

- No testimonials.
- No numerical outcome claims.
- No Score-as-outcome surfacing.
- No comparison claims.

The three things that would trigger legal counsel review are all reserved for the successor prompts. This is the deliberate effect of Option β phasing: each surface ships against the level of review it actually needs, not the level it would need if all three risks were stacked.

---

## 7. Database Schema — Append-Only Migration

New migration: `supabase/migrations/20260424_outcome_timeline.sql`

```sql
-- ============================================================================
-- OUTCOME VISUALIZATION & 30/60/90 FUTURE-STATE — Categorical Phase
-- Migration: 20260424_outcome_timeline.sql
-- ============================================================================

-- Variant sets (currently one: '30_60_90'; supports future alternatives like '14_45_90')
create table if not exists outcome_timeline_variant_sets (
  id uuid primary key default gen_random_uuid(),
  variant_set_code text not null unique,                  -- e.g. '30_60_90'
  variant_set_label text not null,                        -- e.g. 'Standard 30/60/90'
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index idx_variant_sets_single_active on outcome_timeline_variant_sets(active)
  where active = true;

-- Phase cards (three per active variant set)
create table if not exists outcome_timeline_phases (
  id uuid primary key default gen_random_uuid(),
  variant_set_id uuid not null references outcome_timeline_variant_sets(id) on delete cascade,
  phase_id text not null check (phase_id in ('phase_1_30','phase_31_60','phase_61_90','custom')),
  phase_title text not null,
  phase_subtitle text not null,
  phase_body text not null,
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  steve_approval_note text,
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phase_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_phases_active on outcome_timeline_phases(variant_set_id, active, display_order)
  where active = true;

-- Qualifier block (singular per active variant set)
create table if not exists outcome_timeline_qualifier (
  id uuid primary key default gen_random_uuid(),
  variant_set_id uuid not null references outcome_timeline_variant_sets(id) on delete cascade,
  qualifier_text text not null,
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qualifier_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_qualifier_active on outcome_timeline_qualifier(variant_set_id, active)
  where active = true;

-- Hand-off CTA (singular per active variant set)
create table if not exists outcome_timeline_cta (
  id uuid primary key default gen_random_uuid(),
  variant_set_id uuid not null references outcome_timeline_variant_sets(id) on delete cascade,
  cta_lead_text text not null,
  cta_label text not null,
  cta_destination text not null,
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cta_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_cta_active on outcome_timeline_cta(variant_set_id, active)
  where active = true;

-- Section title and intro paragraph (composable per variant set)
create table if not exists outcome_timeline_section_blocks (
  id uuid primary key default gen_random_uuid(),
  variant_set_id uuid not null references outcome_timeline_variant_sets(id) on delete cascade,
  block_kind text not null check (block_kind in ('section_title','intro_paragraph')),
  block_text text not null,
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint section_block_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_section_blocks_active on outcome_timeline_section_blocks(variant_set_id, block_kind, active)
  where active = true;

-- Lifecycle audit log
create table if not exists outcome_timeline_events (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (surface in (
    'variant_set','phase','qualifier','cta','section_block'
  )),
  row_id uuid not null,
  event_kind text not null check (event_kind in (
    'drafted','precheck_completed','steve_approved','steve_revoked',
    'activated','deactivated','archived'
  )),
  event_detail jsonb,
  actor_user_id uuid references auth.users(id),
  occurred_at timestamptz not null default now()
);

create index idx_outcome_events on outcome_timeline_events(surface, row_id, occurred_at desc);

-- RLS
alter table outcome_timeline_variant_sets    enable row level security;
alter table outcome_timeline_phases          enable row level security;
alter table outcome_timeline_qualifier       enable row level security;
alter table outcome_timeline_cta             enable row level security;
alter table outcome_timeline_section_blocks  enable row level security;
alter table outcome_timeline_events          enable row level security;

-- Admin read/write
create policy outcome_variant_sets_admin on outcome_timeline_variant_sets
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy outcome_phases_admin on outcome_timeline_phases
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy outcome_qualifier_admin on outcome_timeline_qualifier
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy outcome_cta_admin on outcome_timeline_cta
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy outcome_section_blocks_admin on outcome_timeline_section_blocks
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy outcome_events_admin on outcome_timeline_events
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

-- Public read for active content
create policy outcome_variant_sets_public_read on outcome_timeline_variant_sets
  for select to anon, authenticated
  using (active = true);

create policy outcome_phases_public_read on outcome_timeline_phases
  for select to anon, authenticated
  using (active = true);

create policy outcome_qualifier_public_read on outcome_timeline_qualifier
  for select to anon, authenticated
  using (active = true);

create policy outcome_cta_public_read on outcome_timeline_cta
  for select to anon, authenticated
  using (active = true);

create policy outcome_section_blocks_public_read on outcome_timeline_section_blocks
  for select to anon, authenticated
  using (active = true);
```

---

## 8. Visual Non-Disruption — Inherited

The visual non-disruption guarantee from #138 §3 applies. Specifically:

- No design-token modifications.
- No brand voice, tagline, or mark changes.
- No existing-section modifications. The Outcome Timeline is a *new* section added between the Sarah Scenario (#138d) and whatever currently follows.

### 8.1 New Visual Primitives

The Outcome Timeline introduces:

- A **phase card** — a compact element with phase title, phase subtitle, body copy. Reuses existing card design tokens (Card Navy `#1E3054` background, Instrument Sans typography scale, existing border-radius).
- A **qualifier block** — single-paragraph typographic block, visually distinct from phase cards but within the existing brand surface family. Uses an existing typography scale.
- A **hand-off CTA** — reuses the existing primary CTA component used in #138 hero and #138d Sarah Scenario.

All three primitives use existing design tokens. No new icons, no new fonts, no new spacing rules.

### 8.2 No Graphical Timeline

Per §4.9, no visualized timeline graphic. No upward arrow, no line graph, no Score visualization. The timeline is communicated typographically. Adding a graphical visualization is reserved for #138e-b once aggregate outcomes data exists to populate it honestly.

### 8.3 Section Placement

The Outcome Timeline sits immediately below the Sarah Scenario (#138d) and immediately above whatever currently follows in the homepage flow. No section is reordered, removed, or modified.

### 8.4 Mobile Treatment

On viewports below 1024px, the three phase cards stack vertically. The qualifier block and hand-off CTA stack below. Card heights are content-driven; no fixed heights. The full timeline scrolls naturally; no horizontal carousel mechanic.

---

## 9. OBRA Four Gates

### Gate 1 — Observe & Brainstorm

- Confirm #138c (Trust Band) and #138d (Sarah Scenario) have shipped before #138e activation (dependency).
- Confirm with Steve that the categorical phrasing in §4.3–4.5 is defensible against functional-medicine reference material.
- Confirm Marshall's existing rule registry from #138 / #138c / #138d is functional and the new `SCORE_AS_TRACKING_NOT_OUTCOME` and `OUTCOME_TIMELINE_QUALIFIER_REQUIRED` rules can be registered without conflicts.
- Confirm CAQ-start route used by hand-off CTA is the same route as #138, #138c, and #138d (consistency across conversion-stack siblings).
- Identify any existing graphical timeline assets in the design system to confirm they are NOT used here per §8.2.

### Gate 2 — Blueprint / Micro-Task Decomposition

1. Migration `20260424_outcome_timeline.sql`.
2. Rule registrations: `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` (P0) and `MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED` (P0) added to `compliance/rules/marketing.ts`.
3. `lib/marketing/outcomeTimeline/types.ts`.
4. `lib/marketing/outcomeTimeline/precheck.ts` — wrapper over #138's pre-check; adds the two new rules' invocation.
5. `lib/marketing/outcomeTimeline/scoreReferenceDetector.ts` — automated detector for `SCORE_AS_TRACKING_NOT_OUTCOME`. Detects Score references in copy, distinguishes tracking-language from outcome-language patterns (numerical Score values, change-rate verbs, cohort comparison framing all flag as outcome-language).
6. `lib/marketing/outcomeTimeline/qualifierAdjacencyDetector.ts` — automated detector for `OUTCOME_TIMELINE_QUALIFIER_REQUIRED`. Verifies that timeline content has an active qualifier block in the same variant set.
7. `lib/marketing/outcomeTimeline/lifecycle.ts`.
8. `lib/marketing/outcomeTimeline/logging.ts`.
9. API routes: `/api/marketing/outcome-timeline/*` for variant sets, phases, qualifier, CTA, section blocks.
10. Admin UI: `/admin/marketing/outcome-timeline` with tabs for variant sets, phases, qualifier, CTA, and section blocks.
11. Public rendering component `components/home/OutcomeTimelineSection.tsx`.
12. Sub-components: phase card, qualifier block, hand-off CTA, section title, intro paragraph.
13. Seed the starting variant set ("30_60_90"), three phase rows, one qualifier, one CTA, one section title, one intro paragraph as drafts pending approval.
14. Mobile responsive verification at 360px and 414px viewports; desktop verification at 1024px and 1440px viewports.
15. Visual regression test confirming no impact on Sarah Scenario above or sections below.
16. SOC 2 collector extension (extends `marketing-copy-activity-collector` to include outcome timeline events).
17. End-to-end tests including deliberate-violation tests for the two new rules.
18. Marshall self-scan of PR.

### Gate 3 — Review

- §3 binding scope verified: zero numerical outcome claims, zero specific Score values, zero testimonial content, zero peptide/SKU references, no graphical timeline visualization.
- §8 visual non-disruption verified by diff inspection.
- Every copy block passes Marshall pre-check with zero P0 findings.
- `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` detector catches deliberate violation test cases (numerical Score values, change-rate framing, cohort comparisons).
- `MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED` detector catches timeline content rendered without active qualifier.
- Steve Rica has approved every variant set, phase, qualifier, and CTA before activation.
- Hand-off CTA routes to the real CAQ start.
- All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- Desktop + mobile parity.
- No reference to "Vitality Score" / "5–27×" / "Semaglutide" except in guardrail checks.
- No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- `package.json`, email templates, applied migrations, design tokens, brand colors, typography untouched.
- The two reserved successors (#138e-a, #138e-b) are documented in this prompt's Document Control table with their preconditions explicitly named.

### Gate 4 — Audit / TDD

- ≥90% coverage on `lib/marketing/outcomeTimeline/*`.
- Activation-gate tests for all six new tables.
- Score-reference detector test corpus: ≥30 deliberate violations (specific Score values, change rates, cohort comparisons), all caught.
- Qualifier-adjacency detector test corpus: timeline content without active qualifier rejected.
- Visual regression confirms timeline renders between Sarah Scenario and next existing section with zero pixel diff on siblings.
- Mobile responsive test at 360px and 414px.
- Hand-off CTA clickthrough integration test.
- Marshall `marshall-lint` self-scan: zero P0 findings.

---

## 10. File Manifest

**New files (create):**

```
supabase/migrations/20260424_outcome_timeline.sql

lib/marketing/outcomeTimeline/types.ts
lib/marketing/outcomeTimeline/precheck.ts
lib/marketing/outcomeTimeline/scoreReferenceDetector.ts
lib/marketing/outcomeTimeline/qualifierAdjacencyDetector.ts
lib/marketing/outcomeTimeline/lifecycle.ts
lib/marketing/outcomeTimeline/logging.ts

app/api/marketing/outcome-timeline/variant-sets/route.ts
app/api/marketing/outcome-timeline/variant-sets/[id]/activate/route.ts
app/api/marketing/outcome-timeline/phases/route.ts
app/api/marketing/outcome-timeline/phases/[id]/activate/route.ts
app/api/marketing/outcome-timeline/qualifier/route.ts
app/api/marketing/outcome-timeline/qualifier/[id]/activate/route.ts
app/api/marketing/outcome-timeline/cta/route.ts
app/api/marketing/outcome-timeline/cta/[id]/activate/route.ts
app/api/marketing/outcome-timeline/section-blocks/route.ts
app/api/marketing/outcome-timeline/section-blocks/[id]/activate/route.ts

components/marketing-admin/OutcomeTimelineDashboard.tsx
components/marketing-admin/VariantSetEditor.tsx
components/marketing-admin/PhaseEditor.tsx
components/marketing-admin/QualifierEditor.tsx
components/marketing-admin/HandOffCtaEditor.tsx
components/marketing-admin/SectionBlockEditor.tsx
components/marketing-admin/ScoreReferenceDetectorPanel.tsx
components/marketing-admin/QualifierAdjacencyPanel.tsx

components/home/OutcomeTimelineSection.tsx
components/home/PhaseCard.tsx
components/home/QualifierBlock.tsx
components/home/OutcomeHandOffCta.tsx

supabase/seeds/outcome_timeline_starting_content_seed.sql
   (variant set '30_60_90' draft + three phase drafts + one qualifier draft +
    one CTA draft + section title + intro paragraph drafts; none active until approvals complete)

tests/marketing/outcomeTimeline/**/*.test.ts
tests/marketing/outcomeTimeline/score_reference_corpus.test.ts
tests/marketing/outcomeTimeline/qualifier_adjacency_corpus.test.ts
tests/e2e/outcome_timeline_activation_gate.test.ts
tests/e2e/outcome_timeline_score_reference_rejection.test.ts
tests/e2e/outcome_timeline_qualifier_required.test.ts
tests/visual-regression/outcome_timeline_no_sibling_drift.test.ts
```

**Modified files (surgical edits only):**

```
compliance/rules/marketing.ts                   (add SCORE_AS_TRACKING_NOT_OUTCOME and
                                                  OUTCOME_TIMELINE_QUALIFIER_REQUIRED rule registrations)
lib/marketing/variants/precheck.ts              (no substantive change; continues shared)
app/(home)/page.tsx                             (insert <OutcomeTimelineSection /> between
                                                  <SarahScenarioSection /> and next existing section)
app/(admin)/admin/marketing/page.tsx            (add Outcome Timeline nav entry)
lib/soc2/collectors/marketing-copy-activity.ts  (extend to include outcome timeline events)
```

**Explicitly NOT modified (DO NOT TOUCH):**

- Hero, Trust Band, Sarah Scenario components (those are #138, #138c, #138d territory).
- Any visual design tokens, brand colors, typography, imagery.
- `package.json`, Supabase email templates, previously-applied migrations.

---

## 11. Acceptance Criteria

- ✅ Migration applies cleanly. RLS enabled. Activation constraints verified.
- ✅ `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` (P0) and `MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED` (P0) rules registered and tested.
- ✅ `scoreReferenceDetector` rejects all 30+ seeded violation test cases.
- ✅ `qualifierAdjacencyDetector` rejects timeline content rendered without active qualifier.
- ✅ Zero numerical outcome claims, zero specific Score values, zero testimonial content in any active content.
- ✅ Bio Optimization Score referenced exactly twice, both as tracking mechanism per §3.1 and §4.8.
- ✅ Honest qualifier block adjacent to phase cards on every viewport size.
- ✅ Every variant set, phase, qualifier, CTA, and section block has passed Marshall pre-check and Steve approval before activation.
- ✅ Outcome Timeline renders between Sarah Scenario and next section without modifying either (visual regression verified).
- ✅ Mobile parity at 360px and 414px viewports.
- ✅ Hand-off CTA routes to the real CAQ start.
- ✅ No graphical timeline visualization (no upward arrow, no line graph, no Score visualization).
- ✅ All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- ✅ No reference to "Vitality Score" / "Wellness Score" / "5–27×" / "Semaglutide" except in guardrail checks.
- ✅ No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- ✅ Two reserved successors (#138e-a, #138e-b) documented with binding preconditions.
- ✅ `package.json`, email templates, applied migrations, design tokens untouched.
- ✅ `marshall-lint` self-scan produces zero P0 findings.
- ✅ OBRA Gate 1–4 summary in PR description.

---

## 12. Rollout Plan

**Phase A — Infrastructure + Rule Registration (Days 1–5)**

- Migration applied. RLS verified. Admin UI accessible.
- Two new Marshall rules registered and tested against violation corpus.
- Variant set "30_60_90" drafted, Marshall-pre-checked, reviewed by Steve.
- Three phase cards drafted, pre-checked, reviewed by Steve.
- Qualifier block drafted, pre-checked, reviewed by Steve.
- CTA, section title, intro paragraph drafted, pre-checked, reviewed by Steve.
- Nothing visible on the homepage yet (all rows `active = false`).

**Phase B — Activation Sequence (Days 6–8)**

- Variant set activated first. Then qualifier block (must render before phases). Then three phases in display order. Then CTA. Then section title and intro paragraph. The order matters because of the qualifier-adjacency rule — if phases render before the qualifier is active, the rule fires.
- Outcome Timeline becomes visible on the homepage.
- Mobile and desktop verified live.

**Phase C — Observation (Day 9+)**

- Impression tracking inherited from marketing infrastructure (#138 established).
- CAQ-start clickthrough from hand-off CTA tracked.
- Weekly review by Steve and Marketing for 4 weeks.

**Phase D — Decision Point on Successors (Day 30+)**

After 4 weeks of observation, Gary, Steve, and Marketing decide whether to proceed with #138e-a (testimonial activation) and/or #138e-b (Score-as-outcome). The decision is informed by:

- CAQ-start conversion rate from the categorical timeline alone. If conversion is strong without testimonials, the successor may be deferred further.
- State of the #138e-a precondition (signed endorser consent + engaged legal counsel).
- State of the #138e-b precondition (verified live aggregate outcomes pipeline).

**Kill-Switches**

- Per-row `active` toggle in admin UI for surgical rollback.
- Environment flag `OUTCOME_TIMELINE_ENABLED`: `true` (default) / `false` (hides the entire section regardless of row state). Setting `false` requires Steve + Gary dual approval; audit-logged.

---

## 13. Reserved Successors

This prompt explicitly reserves two successor prompts. The reservations are binding — if either successor is later issued, it must respect the precondition stated here.

### 13.1 #138e-a — Testimonial Activation

**Scope:** Activates #138c §6's deferred testimonial pipeline for outcome-section content. Surfaces real practitioner or consumer testimonials within or adjacent to the 30/60/90 timeline, with full FTC 16 CFR 255 material-connection disclosure rendering.

**Binding precondition:** All three of the following MUST hold before #138e-a is issued or implemented:

1. At least one signed endorser consent file exists in the `trust-band-consents` Supabase Storage bucket per #138c §8.6, including: explicit material-connection disclosure language, explicit typicality status (`typical` or `atypical_with_disclosure`), separate photograph consent if photo is to be used, and revocation acknowledgment.
2. Named legal counsel of record is engaged (named person or firm), briefed on FTC 16 CFR 255 requirements as they apply to ViaConnect, and has confirmed availability for per-testimonial review per #138c §6.3's dual-approval pattern.
3. Steve Rica has scoped the testimonial activation to specific surfaces (which testimonials, which outcome categories they're permitted to address, which placement in the timeline) before #138e-a is drafted.

If any of the three preconditions is not met, #138e-a is not drafted. Drafting against absent preconditions is the failure mode this reservation is designed to prevent.

### 13.2 #138e-b — Bio Optimization Score as Marketing-Cited Outcome Metric

**Scope:** Surfaces the Bio Optimization Score as a public-facing outcome metric in marketing copy. Cites aggregate Score-change data (with appropriate cohort segmentation, methodology disclosure, and substantiation) as evidence within or adjacent to the 30/60/90 timeline. Permits Score visualization graphics if the underlying data supports them honestly.

**Binding precondition:** All five of the following MUST hold before #138e-b is issued or implemented:

1. An aggregate outcomes pipeline is verified live in production, with documented cohort segmentation logic.
2. Consent governance is established for outcome data inclusion — users have explicitly consented (or have the opportunity to opt out) to having their Score data contribute to aggregate marketing claims.
3. Statistical methodology is documented and Steve-approved, including how cohorts are defined, how significance is assessed, and how outliers are handled.
4. A freshness-monitoring job confirms claims stay accurate as the cohort evolves; the job runs at minimum weekly and produces an alert if claim accuracy drifts beyond a defined threshold.
5. Legal counsel of record (engaged per #138e-a precondition #2 or independently) has reviewed the methodology and confirmed claims are FTC-defensible.

If any of the five preconditions is not met, #138e-b is not drafted.

### 13.3 No Silent Successor Activation

Neither successor can be issued by default extension of this prompt. Each requires an explicit drafting action with an explicit verification of preconditions documented in that successor's text. The `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` (P0) rule registered here will continue to block Score-as-outcome content until #138e-b is shipped and explicitly relaxes that rule (or replaces it with a more permissive variant tied to the verified pipeline).

---

## 14. Conversion Stack Sibling Coordination

Fourth of five conversion-stack siblings:

- **#138 Hero Rewrite (shipped)** — the Outcome Timeline sits three sections below the hero.
- **#138c Trust Band + Team Introduction (shipped)** — the Trust Band's regulatory paragraph (FTC, DSHEA, HIPAA framework naming) primes the visitor to accept that the categorical outcome framing is honestly scoped. The Trust Band's testimonial pipeline ships empty; #138e respects that emptiness rather than activating it.
- **#138d Sarah Scenario (shipped)** — immediate predecessor. The Sarah Scenario's category language (methylation, sleep architecture, stress-response, mitochondria) maps to the Outcome Timeline's experiential language (afternoon energy, sleep onset, mid-morning brain fog softening, recovery feeling less like catching up). The two surfaces should read coherently.
- **#138f Supplement Upload Fix (pending)** — independent bug-fix work.

The #138 family now encompasses five conversion-stack surfaces (Hero, Trust Band, Sarah Scenario, Outcome Timeline, plus the pending Supplement Upload Fix) sharing a common `'marketing_copy'` Marshall surface, a common rule namespace (`MARSHALL.MARKETING.*`), a common activation-gate pattern, and a common visual-non-disruption guarantee. No conversion-stack sibling reimplements these primitives.

---

## 15. Document Control

| Field | Value |
|---|---|
| Prompt number | 138e |
| Title | Outcome Visualization & 30/60/90 Future-State (Categorical Phase) |
| Conversion-stack position | Fourth of five (#138, #138c, #138d, #138e, #138f) |
| Format | Hybrid (copy + IA + implementation + Marshall integration) |
| Phasing | Categorical only; testimonials reserved for #138e-a; Score-as-outcome reserved for #138e-b |
| Phasing decision | Gary, April 24, 2026 — Option β (phased: #138e categorical now, #138e-a/#138e-b later) |
| Visual non-disruption | §8 extends #138 §3's guarantee |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Originating analysis | Executive product review (April 24, 2026) critique 4 |
| Reuses from #138 | `'marketing_copy'` Surface, `MARSHALL.MARKETING.*` namespace, pre-check pipeline, activation-gate pattern, visual-non-disruption guarantee, primary CTA component |
| Reuses from #138c | Trust Band's regulatory framing as priming context |
| Reuses from #138d | Category-to-category coherence with protocol categories; `INTERVENTION_SPECIFICITY` P0 rule; `COMPOSITE_DISCLOSURE` P0 rule |
| New Marshall rules | `MARSHALL.MARKETING.SCORE_AS_TRACKING_NOT_OUTCOME` (P0), `MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED` (P0) |
| New tables | 6 (variant_sets, phases, qualifier, cta, section_blocks, events) |
| Successor / sibling prompts | #138e-a (testimonial activation, preconditions in §13.1), #138e-b (Score as outcome metric, preconditions in §13.2), #138f (Supplement Upload Fix) |
| Successor content | New variant sets (alternative timelines like 14/45/90) added per slot structure; testimonials added only via #138e-a; Score outcomes added only via #138e-b |
| Deferred entirely | Numerical outcome claims, percentage outcomes, before/after framing, graphical timeline visualization, comparison-to-baseline framing |

---

## 16. Acknowledgment

By memorializing this prompt in the Prompt Library, Gary establishes:

- **The Outcome Timeline as a new homepage section** sitting between the Sarah Scenario (#138d) and the next existing section, with no modifications to either.
- **The phasing decision of April 24, 2026 (Option β) as binding:** #138e ships as categorical future-state only; testimonial activation is reserved for #138e-a behind the §13.1 precondition; Bio Optimization Score as marketing-cited outcome metric is reserved for #138e-b behind the §13.2 precondition.
- **The starting copy in §4** — section title, intro paragraph, three phase cards (Days 1–30, 31–60, 61–90), qualifier block, hand-off CTA — as the initial timeline, subject to Marshall pre-check and Steve Rica approval before activation.
- **The Bio Optimization Score as a tracking mechanism in marketing copy**, named exactly twice per §4.8, never surfaced as a marketing-cited outcome metric until the §13.2 precondition is met.
- **The two new Marshall rules** (`SCORE_AS_TRACKING_NOT_OUTCOME` P0, `OUTCOME_TIMELINE_QUALIFIER_REQUIRED` P0) **as the automated enforcement layer for the categorical-framing discipline.** Both are P0; override is not permitted at the content-author level.
- **The honest qualifier block** ("not everyone experiences the same pattern...") **as required language adjacent to any 30/60/90-style timeline content.** The qualifier renders in-element with the timeline, never as a footnote.
- **The hand-off CTA language structure** ("your timeline will be yours...") **as load-bearing for FTC posture and non-negotiable in future variant copy.**
- **The reserved successors (#138e-a, #138e-b) with their explicit binding preconditions in §13.** Drafting either successor against absent preconditions is the failure mode the reservations are designed to prevent.

Steve Rica retains final approval authority on every Outcome Timeline element prior to activation. Legal counsel review is *not* required for #138e itself (per §6.6), but is a binding precondition for #138e-a and #138e-b before either successor is issued.

No testimonials, no specific Score-change values, no numerical outcome claims, no graphical timeline visualization, no comparison-to-baseline framing may be introduced into Outcome Timeline content via successor copy additions to #138e itself. If ViaConnect later decides to ship any of these, the decision flows through #138e-a or #138e-b respectively, with the preconditions in §13 binding.

---

## Memorialization note

This prompt is authored as **Prompt #138e** and memorialized in the library at `docs/prompts/prompt-138e-outcome-visualization-categorical.md`. No renumbering required: the `#138e` slot was unclaimed in both git history and the prompt library at the time of memorialization. Spec preserved verbatim.

**Cross-reference notes (continuing the pattern from #138c and #138d):**

- The spec's references to **"#138 Hero (shipped)"** point to library file `prompt-138a-homepage-hero-rewrite.md`. Library filename retains `#138a` for git-history continuity (renumbered earlier to resolve a collision with `prompt-138-multi-framework-evidence-architecture.md` at the integer slot). Gary's current canonical labeling treats the Hero as `#138`.
- The spec's references to **"#138c Trust Band (shipped)"** point to library file `prompt-138c-trust-band-team-introduction.md`. Memorialized in commit `2c87bf2`.
- The spec's references to **"#138d Sarah Scenario (shipped)"** point to library file `prompt-138d-sample-protocol-walkthrough-sarah-scenario.md`. Memorialized in commit `85b6275`.
- The spec's references to **"#138b (Dependabot Triage)"** as a related governance branch point to a prompt Gary maintains in his canonical Standing Rule #4 chain (per the `feedback_external_repo_governance.md` memory entry). Not yet memorialized in `docs/prompts/`.
- The spec's references to **"#138e-a Testimonial Activation"** and **"#138e-b Score-as-outcome"** are *reserved successors* with binding preconditions in §13. They are not authorized by this prompt's memorialization and may not be drafted until their preconditions are independently verified and documented.
- The spec's references to **"#138f Supplement Upload Fix (pending)"** point to a reserved slot for the fifth conversion-stack sibling. Originally tentatively labeled `#142` in early conversion-stack specs (#138a §14, #138c §14); shifted to `#138f` in `#138d`'s memorialization to keep the entire conversion stack inside the `#138` letter-suffix bundle. `#138f` is now canonical.

**Conversion-stack roster (updated):**

| Position | Canonical # | Library file | Status |
|---|---|---|---|
| 1 | #138 (Hero) | `prompt-138a-homepage-hero-rewrite.md` | memorialized |
| 2 | #138c (Trust Band) | `prompt-138c-trust-band-team-introduction.md` | memorialized |
| 3 | #138d (Sarah Scenario) | `prompt-138d-sample-protocol-walkthrough-sarah-scenario.md` | memorialized |
| 4 | **#138e (Outcome Timeline, Categorical)** | **`prompt-138e-outcome-visualization-categorical.md`** | **this commit** |
| 5 | #138f (Supplement Upload Fix) | reserved | — |
| Reserved successor | #138e-a (Testimonial Activation) | reserved (preconditions in this spec §13.1) | — |
| Reserved successor | #138e-b (Score as Outcome Metric) | reserved (preconditions in this spec §13.2) | — |

**Implementation status:** this spec is memorialized at authoring time. Execution flows through the concurrent Claude Code engineering session per the established pattern. The visual non-disruption guarantee in §8 (inherited from `#138` §3) and the binding scope reduction in §3 are the load-bearing constraints for that execution. The two new P0 Marshall rules (`SCORE_AS_TRACKING_NOT_OUTCOME`, `OUTCOME_TIMELINE_QUALIFIER_REQUIRED`) are the automated enforcement teeth — there is no override path at the content-author level.

This memorialization session produces only the authoritative policy/spec artifact and does not touch `lib/marketing/outcomeTimeline/**`, the new migration, API routes, UI components, or tests.
