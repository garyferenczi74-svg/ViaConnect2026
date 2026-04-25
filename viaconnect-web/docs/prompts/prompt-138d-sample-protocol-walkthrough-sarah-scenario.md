# Prompt #138d — Sample Protocol Walkthrough ("Sarah" Scenario), Scope-Reduced

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Conversion-stack sibling #3 / Composite case study (category-level illustration)
**Parent prompts:** #138 (Homepage Hero Rewrite — visual non-disruption pattern, `Surface = 'marketing_copy'`); #138c (Trust Band + Team Introduction — Dr. Fadi clinician card, regulatory paragraph, consent model)
**Related governance branch (non-parent):** #138b (Dependabot Triage) — listed for completeness of the #138 family; no content relationship
**Conversion-stack siblings:** #138 Hero (shipped); #138c Trust Band (shipped); #138e Outcome Visualization (pending); #138f Supplement Upload Fix (pending)
**Originating analysis:** Executive product review (April 24, 2026) critiques 1 ("hard to quickly get it") and 2 ("AI clinical reasoning sounds powerful but doesn't build trust on its own"); reviewer suggested *"a simple example ('Here's what Sarah learned…')"*
**Scope decision (Gary, April 24, 2026):** Scope-reduced. Category-level illustration only. No specific peptides, no specific dosages, no specific SKU names, no outcome-percentage claims. See §3 for the binding scope definition.
**Status:** Active — authorizes Claude Code to implement §6–§11 under the visual-non-disruption guarantee inherited from #138 §3 and the scope-reduction commitment in §3
**Date:** 2026-04-24
**Delivery Mode:** Claude Code — `/effort max`
**Local Path:** `C:\Users\garyf\ViaConnect2026\viaconnect-web`
**Supabase Project:** `nnhkcufyqjojdbvdrpky` (us-east-2)

---

## 0. Standing Platform Rules (Non-Negotiable)

Every standing rule from #119 applies, restated for continuity:

- Score name is **"Bio Optimization"** — never "Vitality Score" or "Wellness Score".
- Bioavailability is exactly **10–27×** (does not need to be cited inside the Sarah scenario; see §3.4).
- No Semaglutide. Retatrutide is injectable only, never stacked (and per §3, no peptide is named in this scenario regardless).
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

The April 24, 2026 executive product review's critique 2 read: *"AI clinical reasoning and Genome precision — they sound powerful but they don't necessarily build trust on their own. I think people are asking themselves 'Can I trust this with my health?' I think what may help is a simple example ('Here's what Sarah learned…')."*

The reviewer's intuition is correct: abstract capability language in the hero does not substitute for evidence that the capability actually works. A concrete walkthrough of a representative user's journey through the platform — CAQ completion, engine reasoning, reviewed protocol output — is a category-standard trust-building device used by Function Health, Levels, Whoop, and Calm in different forms.

This prompt delivers a **scope-reduced Sarah Scenario**:

- A composite case study of a representative user named Sarah — age, lifestyle, and health-concern persona defined generally, not medically specifically.
- A process walkthrough showing the three-step flow: Sarah takes the CAQ → the engine produces a draft protocol → Dr. Fadi's review tier confirms the confidence level.
- A category-level output showing the *kinds* of protocol categories Sarah's engine produced — methylation support, sleep architecture, stress-response, etc. — without naming specific peptides, supplements, dosages, or SKUs.
- A Tier 1 / Tier 2 / Tier 3 confidence framing explaining what each tier means in general terms (assessment-only, assessment + labs, assessment + labs + genetics), and showing which tier Sarah's example reached.
- A prominent illustrative disclaimer that renders in the same visual element as the case study, not as a footnote.
- A hand-off to the real CAQ as the case study's call-to-action — "Your assessment will look different because your biology is different."

### 1.1 What This Prompt Is Not

Deliberately out of scope:

- **Specific peptide names.** BPC-157, Retatrutide, SLU-PP-332, GHK-Cu, or any other peptide from the FarmCeutica catalog does not appear in this prompt's output.
- **Specific supplement SKUs or branded product names.** Sarah's output does not name a FarmCeutica product.
- **Specific dosages, frequencies, or administration routes.** No milligram, microgram, IU, once-daily, twice-weekly, sublingual, intranasal, or injectable references in Sarah's scenario.
- **Specific outcome percentages or timeframes.** No "Sarah's sleep improved 40%" or "within 30 days Sarah reported...". Vivid outcome framing is reserved for #138e (Outcome Visualization), which will handle aggregate claims with their own substantiation requirements.
- **Third-party branded references.** No "LabCorp," "Quest," "23andMe," "Everlywell," "Thorne," "Pure Encapsulations," etc. Generic categorical language only.
- **Sarah as a real person.** Sarah is a composite — no photography of a specific individual, no quotes attributed to a real person. A typographic or illustrative treatment represents her.
- **Dr. Fadi quoted as endorsing Sarah's specific protocol.** Dr. Fadi is named as the review-tier operator in the aggregate, consistent with his #138c consent scope ("reviews the scientific grounding of every protocol category"). He is not quoted about Sarah specifically, and the scenario does not suggest he personally reviewed her output line by line.
- **Dr. Fadi's personal liability surface expanded beyond #138c.** This prompt's design is such that Dr. Fadi's existing consent on #138c is sufficient — no additional consent capture is required for #138d because this prompt does not introduce any new clinician attribution beyond what #138c already established. If the design drifts toward needing expanded consent during implementation, the drift is a §3 violation and the design is revised back.

### 1.2 Why the Scope Reduction

A full dose-specific case study would have been more vivid. It would also have required:

- Peptide marketing legal scoping separate from DSHEA-supplement framing (peptides fall outside DSHEA and have their own FDA posture).
- Dr. Fadi's personal written endorsement of the specific Sarah protocol, meaningfully expanding his personal liability.
- Substantiation files for every dose-specific claim, per `MARSHALL.MARKETING.SCIENTIFIC_GROUNDING`.
- Potential FTC re-examination of the "typicality" question since specific doses imply specific results.

The scope reduction preserves 85% of the conversion value (making abstract capability concrete) while eliminating ~95% of the regulatory exposure. The trade-off is well-chosen for this moment in the brand's development.

---

## 2. Why This Works as a Conversion Device

### 2.1 The Specific Job the Sarah Scenario Does

Critique 2 identified a gap: visitors see "AI clinical reasoning" and do not know what that actually produces. The Sarah Scenario fills the gap by showing the *shape* of the output without showing the *content* of a specific output. This is the same technique Whoop uses when marketing shows a strain/recovery graph with axes and ranges but not a specific individual's data — the visitor sees what the product outputs without seeing a specific person's private results.

### 2.2 Where It Sits in the Conversion Flow

The Sarah Scenario sits below the Trust Band (#138c) and above the Outcome Visualization (#138e). The progression:

1. **Hero (#138)** — What is this?
2. **Trust Band (#138c)** — Can I trust this?
3. **Sarah Scenario (#138d — this prompt)** — What does this actually produce?
4. **Outcome Visualization (#138e)** — What changes for me?
5. **Existing below-the-fold sections** — How do I start / how much / who is this for?

Each surface answers one question. Mixing questions across surfaces is the failure mode the conversion stack is designed to avoid.

### 2.3 The Tier 1/2/3 Confidence Framing as a Differentiator

The executive reviewer's critique 2 specifically named "AI clinical reasoning and Genome precision" as phrases that don't build trust on their own. The Tier 1/2/3 confidence framing is the honest counter to that: rather than claiming uniform high accuracy, ViaConnect's engine explicitly communicates its own confidence level based on the data it has. That's rarer in the wellness space than it should be. Showing the tier framing in the Sarah Scenario turns the critique's concern into the scenario's proof-point.

This matters strategically: the Tier 1/2/3 framing is established internally in the compliance and engine work (CAQ-only = 72%, +labs = 86%, +genetics = 96% per standing memory). Making it visible publicly is a brand differentiation choice that the scope-reduced Sarah Scenario can do without introducing regulatory risk — because "Tier 2 confirmed" is a process claim, not a product claim.

---

## 3. Binding Scope Definition (What Goes In, What Stays Out)

This section is the binding reference for Claude Code implementation. If implementation work ambiguates any of these lines, the resolution defaults to the more restrictive interpretation.

### 3.1 Stays In

- **Sarah persona.** Age in a decade band (e.g., "late 30s"), not a specific age. Lifestyle descriptors at a general level ("works long hours at a desk job," "has two young kids," "exercises three times a week when schedules allow"). Two or three health concerns expressed at consumer-language level ("disrupted sleep," "mid-afternoon energy crashes," "frequent mild digestive complaints") — never as medical diagnoses.
- **Process narrative.** Three-phase flow: assessment → engine analysis → Dr. Fadi review tier. Each phase is a paragraph or card showing what happens at that stage.
- **Category-level output.** Three to five protocol categories identified by the engine. Examples: "methylation-pathway support," "sleep architecture optimization," "stress-response and HPA-axis balance," "mitochondrial energy support," "gut microbiome restoration." Each category is named and briefly described; no specific interventions are named within the category.
- **Tier confidence framing.** Sarah's scenario reaches Tier 2 (assessment + labs) as the illustrative example. A side panel explains all three tiers in general terms, establishing the confidence-ladder as a platform feature.
- **Dr. Fadi's review role.** Stated at the process-narrative level: "Every protocol category is reviewed by Dr. Fadi Dagher, Medical Director, before it reaches the user." His name is cited with the same credential string used in #138c. No quote attributed to him about Sarah specifically.
- **Illustrative disclaimer.** Prominent, in-element, same font weight as body copy. See §4.5 for exact language.
- **Hand-off CTA.** Single clear call-to-action at the bottom: "Your assessment will be different because your biology is different. Start yours." Destination: the CAQ start route.

### 3.2 Stays Out — Drug Names and Intervention Specifics

The following are explicitly excluded from all Sarah Scenario copy, imagery, and supporting text:

- Names of any peptide in the FarmCeutica catalog (29 peptides, per standing memory — none appear).
- Names of any supplement SKU in the FarmCeutica catalog (56 supplement SKUs — none appear).
- Generic peptide names (BPC-157, GHK-Cu, Retatrutide, SLU-PP-332, TB-500, Ipamorelin, Epitalon, etc.).
- Third-party supplement brand names.
- Specific supplement ingredients at specific doses (e.g., "methylfolate 800mcg" — the ingredient name plus dose is out; the category "methylation-pathway support" is in).
- Delivery form specifications (liposomal, micellar, injectable, nasal spray).
- Any reference to specific bioavailability figures inside the Sarah narrative (the 10–27× figure does not need to appear in the Sarah case study, though it remains valid brand copy elsewhere per the standing rules).

### 3.3 Stays Out — Outcome Specifics

- Percentage improvements ("Sarah's sleep improved 40%" — no).
- Timeframe claims for Sarah specifically ("within 30 days Sarah reported..." — no).
- Biomarker-value changes ("Sarah's fasting glucose decreased from X to Y" — no).
- "Before and after" framing ("Sarah's baseline → Sarah's result" — no).
- Subjective wellness claims specific to Sarah ("Sarah feels more energy" — no).

The outcome surface is the scope of #138e (Outcome Visualization), which will handle aggregate and categorical outcome framing with its own substantiation discipline. Sarah's scenario stops at "Sarah received a protocol" — what Sarah did with it and what happened afterward is deferred.

### 3.4 Stays Out — Real-World Identifiers

- Photography of a specific individual representing Sarah. A typographic monogram ("S." on a brand-color background) or an illustrative abstract treatment per the existing brand style is permitted. A photograph of a model is not permitted — it invites the inference that the model is the real person, which is a testimonial framing this prompt deliberately avoids.
- Specific geographic location for Sarah.
- Specific employer, industry, or professional role naming.
- Brand-named third-party products Sarah is described as using.
- Specific medical diagnoses attributed to Sarah.

### 3.5 Stays Out — Dr. Fadi's Expanded Attribution

- A quote attributed to Dr. Fadi about Sarah's case specifically.
- A claim that Dr. Fadi personally reviewed Sarah's output (as distinct from reviewing the protocol categories in aggregate — which is his actual operational role per #138c).
- A signature, image, or explicit personal endorsement of the Sarah Scenario beyond what #138c already established for the Trust Band's clinician card.

If the #138d implementation produces any copy or visual that expands Dr. Fadi's attribution surface, Dr. Fadi is shown the copy and must provide written supplementary consent specifically for this prompt before activation. The default assumption is that expanded consent is *not* needed because the scope reduction is sufficient to keep Dr. Fadi's #138c consent scope intact.

---

## 4. Copy — Starting Set

Unlike #138's hero variants, the Sarah Scenario ships as a single copy set — it's an extended narrative, not a testable one-liner. If future testing of alternative Sarah personas or alternative protocol-category presentations becomes warranted, §5's slot structure allows it.

### 4.1 Section Title

**Starting copy:** *"How the engine works — a walkthrough."*

**Why this phrasing:**

- Leads with "how" — positions the section as process explanation, which is what the reviewer's critique 2 asked for.
- "The engine" rather than "our engine" — keeps the section from reading as marketing voice; it reads as neutral explanation.
- "Walkthrough" signals a procedural show-you-rather-than-tell-you treatment, matching the reviewer's *"'Here's what Sarah learned...'"* suggestion.

### 4.2 Introductory Paragraph

**Starting copy:**

> "Sarah isn't a real person — she's a composite built to show how the ViaConnect engine interprets an assessment and returns a reviewed protocol. Your own results will look different because your biology is different. The purpose of this walkthrough is to make the process concrete."

**Why this phrasing:**

- Opens with the illustrative disclosure, rather than burying it at the bottom. The disclosure is load-bearing for the section's FTC posture; leading with it signals honesty.
- "Composite built to show" is direct language — not "inspired by real users" (which invites FTC scrutiny) and not "fictional character" (which sounds trivializing). "Composite" is the industry-standard word for this kind of illustration.
- The last sentence — "make the process concrete" — names the section's purpose aloud, which short-circuits the reviewer's original critique by acknowledging it.

### 4.3 Phase 1 Card — Assessment

**Starting copy:**

> "Sarah starts with the Comprehensive Assessment — about 70 questions covering her current health, family history, supplements and medications she's using, sleep and stress patterns, and goals. It takes her about 12 minutes."

**Why this phrasing:**

- "About 70 questions" — establishes scope without claiming exact question count (actual count is subject to CAQ revisions per the compliance stack; approximate is safer).
- "About 12 minutes" — matches the time-to-value framing from #138's Variant D, with the `MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION` rule applying at pre-check.
- Lists the major CAQ categories in everyday language, without using the internal phase-numbering from the CAQ canonical structure (7 phases per standing memory — the public-facing version doesn't need to expose the internal architecture).

### 4.4 Phase 2 Card — Engine Analysis

**Starting copy:**

> "The engine reviews Sarah's responses and identifies four protocol categories that the evidence suggests are worth addressing: methylation-pathway support, sleep architecture optimization, stress-response balance, and mitochondrial energy support. For each category, the engine assembles the relevant research and matches it to the specific details Sarah shared."

**Why this phrasing:**

- "The evidence suggests" rather than "the engine recommends" — softer framing that respects both the Tier confidence framing and the absence of specific product-level recommendations.
- Four categories, not three or five — four is concrete enough to feel like a real output and short enough to scan; it also matches the four-chip pattern from #138c's Trust Band, reinforcing visual consistency.
- "Methylation-pathway support, sleep architecture optimization, stress-response balance, mitochondrial energy support" — four categories chosen because they map to common ViaConnect protocol areas while being widely-understood in the functional-medicine vocabulary. They are categories, not interventions.
- "Matches it to the specific details Sarah shared" — gestures at personalization without claiming algorithmic specifics that could be reverse-engineered or overclaimed.

**Category-substitution note:** If during implementation Marketing or Steve decides a different set of four categories better represents the platform's strengths, the substitution is made at content level without re-prompting. The rule is: four categories, each a widely-recognized functional-medicine category, no specific interventions named.

### 4.5 Phase 3 Card — Dr. Fadi's Review Tier

**Starting copy:**

> "Before the protocol reaches Sarah, every category she receives has been reviewed by Dr. Fadi Dagher, Medical Director, as part of the platform's oversight model. Sarah's scenario reaches Tier 2 — meaning her assessment was paired with a lab panel. Tier 2 protocols carry a higher confidence rating than Tier 1 because the lab data refines the engine's suggestions."

**Why this phrasing:**

- "Every category she receives has been reviewed..." — Dr. Fadi's role is the category-level review, consistent with his #138c consent scope. The phrasing avoids implying he reviewed her specific output line-by-line.
- "Tier 2 — meaning her assessment was paired with a lab panel" — introduces the tier framing in operational terms without reciting the internal confidence percentages (which are platform-engineering numbers, not marketing numbers).
- "Higher confidence rating than Tier 1" — comparative framing that sets up the tier explainer (§4.6) and avoids specific percentage claims.

### 4.6 Tier Explainer (Side Panel)

**Starting copy:**

> "The protocol engine operates at three confidence tiers, and each user's protocol is labeled with its tier so there's no ambiguity:
>
> - **Tier 1 — Assessment only.** The engine works with your CAQ responses. Useful as a starting point; less precise than higher tiers.
> - **Tier 2 — Assessment plus labs.** Adding a lab panel gives the engine measurable biomarkers to work with. The engine's suggestions are tuned to the lab data, and Dr. Fadi's review accounts for both sources.
> - **Tier 3 — Assessment plus labs plus genetics.** Adding a genetic panel (GeneX360™) gives the engine your metabolic and pathway-level context. Tier 3 is the most tailored, and carries the highest confidence rating."

**Why this phrasing:**

- Explicit labeling of tiers on the user's actual protocol — matches the "each user's protocol is labeled with its tier so there's no ambiguity" commitment, which is itself a trust signal (most platforms conceal their confidence limits).
- No numerical confidence percentages — the internal figures (72% / 86% / 96%) are engineering calibration numbers, not marketing numbers. Saying "higher confidence" is true; citing specific percentages in marketing without a peer-reviewed substantiation for those specific numbers would be an overclaim.
- GeneX360™ named in the Tier 3 slot — the brand sub-mark appears here because Tier 3 actually requires GeneX360™ panel data, and naming it surfaces the product without introducing a distinct product-marketing claim.

### 4.7 Hand-Off CTA

**Starting copy:**

> "Your assessment will be different because your biology is different. Start yours — about 12 minutes."

**CTA label:** "Start my assessment"

**CTA destination:** Unchanged from current CAQ-start route.

**Why this phrasing:**

- "Your assessment will be different because your biology is different" — directly counters the risk that visitors interpret Sarah's output as a prediction of their own output. This sentence is load-bearing for the FTC posture of the entire section.
- "About 12 minutes" — repeats the time-to-value claim from Phase 1 as a friction-reducer at the point of commitment.
- CTA label uses first-person possessive ("my") — established conversion-copy pattern that slightly outperforms imperative ("Start assessment") in comparable settings.

### 4.8 The Four Category Descriptions (Expanded)

Each of the four protocol categories named in §4.4 needs a one-sentence explanation. These descriptions render either on hover (desktop) or as expandable accordions (mobile), so they stay out of the main flow but are available for curious visitors.

- **Methylation-pathway support.** *"Addresses how efficiently the body processes folate, B-vitamins, and related nutrients that affect energy, detoxification, and hormone balance."*
- **Sleep architecture optimization.** *"Supports the biological patterns underlying deep sleep, REM cycles, and nighttime recovery — often where fatigue issues originate."*
- **Stress-response balance.** *"Supports the HPA axis — the system that governs cortisol, stress recovery, and resilience under chronic load."*
- **Mitochondrial energy support.** *"Addresses the cellular energy factories that affect stamina, recovery, and baseline vitality."*

**Why this phrasing:**

- Each description is categorical education rather than product marketing. A visitor could read any of these on a neutral functional-medicine reference site and see similar language.
- No specific ingredients are named in the category descriptions — that discipline extends through the whole section.
- Each description ends with an outcome concept ("energy," "recovery," "resilience," "stamina") that gestures at benefit without promising specific results for Sarah or for any visitor.

### 4.9 Illustrative Disclaimer (Repeated)

Because §4.2's introduction establishes the illustrative framing, and §4.4 and §4.5 reference Sarah's specific four categories and Tier 2 status, a second concise disclaimer appears at the bottom of the walkthrough adjacent to the CTA:

> *"Sarah is a composite. Your own protocol will reflect your own biology, your own lifestyle, and your own health history."*

This repetition is intentional. FTC guidance on illustrative content is strongest when the illustrative nature is clear throughout, not just at the top.

---

## 5. Slot Structure for Future Variants

The single Sarah Scenario that ships in §4 may be supplemented later by alternative personas (a "David" persona with different life stage, a "Maria" persona with different health-concern emphasis, etc.) if Marketing or Steve decides variety would improve conversion or representation.

### 5.1 Persona Slot

Each persona row in the `scenario_personas` table carries:

- Persona identifier (e.g., `sarah`, `david`, `maria`).
- Persona descriptor (age band, lifestyle summary, health-concern set — all at the non-medical-diagnosis level enforced in §3).
- Display-order preference.
- Four protocol categories selected for this persona.
- Tier outcome for this persona (1, 2, or 3).
- Marshall pre-check session ID.
- Steve approval timestamp + identity.
- Dr. Fadi supplementary consent reference (null if #138c scope is sufficient; populated if the persona's treatment expands his attribution surface, per §3.5).
- `active_in_rotation` flag.

### 5.2 One Persona at a Time in MVP

At launch, exactly one persona is displayed — Sarah. Future work may enable rotation (each visitor sees a different persona) or selection (visitors choose which persona resonates). Those mechanics are reserved for future prompts; this prompt ships single-persona.

### 5.3 Category Library

The four categories Sarah receives in §4.4 are one possible set. A category library table holds the full list of widely-understood functional-medicine categories that the platform can cite, each with its Marshall-pre-checked description (per §4.8). New categories added to the library flow through the same lifecycle as copy variants (draft → pre-check → Steve approval → activation).

### 5.4 Tier Example Variability

The illustrative example in the starting copy reaches Tier 2. Future variants might show a Tier 1 example (to normalize the starting point) or a Tier 3 example (to showcase the full GeneX360™ path). Tier choice is a content decision per variant, not a code decision.

---

## 6. Marshall Pre-Check Integration

### 6.1 Surface Reuse

The `'marketing_copy'` Surface enum value established by #138 §7.1 is reused unchanged. No new surface is registered.

### 6.2 Rule Reuse

The `MARSHALL.MARKETING.*` rule namespace from #138 §7.3 applies in full. Specifically:

- `MARSHALL.MARKETING.NAMED_PERSON_CONNECTION` (P1) — applies to every Dr. Fadi reference in the scenario; §3.5's scope guardrail is the content-level expression of this rule.
- `MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION` (P1) — applies to the "about 12 minutes" claim in §4.3 and §4.7.
- `MARSHALL.MARKETING.SCIENTIFIC_GROUNDING` (P2) — applies to each category description in §4.8 and to the tier explainer's confidence language in §4.6.
- `MARSHALL.MARKETING.OUTCOME_GUARANTEE` (P0) — applies to every sentence in Sarah's scenario. The scope reduction in §3 is largely motivated by this rule.
- `MARSHALL.MARKETING.COMPLIANCE_NAMING` (P2) — applies if any regulatory framework is named within the Sarah scenario itself (the #138c Trust Band handles the regulatory posture; the Sarah Scenario should not duplicate it).

### 6.3 New Rules Specific to Composite Case Studies

Two rules are registered that are specific to composite case study content:

| Rule ID | Severity | Description |
|---|---|---|
| `MARSHALL.MARKETING.COMPOSITE_DISCLOSURE` | P0 | Composite case study content MUST carry an illustrative disclosure that (a) uses the word "composite" or equivalent clear language, (b) renders in the same visual element as the narrative (not a footnote), and (c) appears at both the opening and closing of the case study. Missing or footnote-sized disclosures are a P0 finding. |
| `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` | P0 | Case study content MUST NOT name specific peptides, specific supplement SKUs, specific dosages, specific administration routes, or specific brand-name products. Category-level language only. This rule is the automated enforcement layer of the §3 scope reduction. |

The `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` rule matters because scope-reduction discipline is hardest to maintain when multiple people edit copy over time. Marshall's pre-check catching the drift is a safer guardrail than human review alone.

### 6.4 Pre-Check Invocation

The pipeline from #121 is invoked via #138's existing wrapper. No new pipeline code is required. Every persona and every category description passes through pre-check independently.

### 6.5 Pre-Check Failure Modes

If `MARSHALL.MARKETING.COMPOSITE_DISCLOSURE` fails — content missing or incomplete disclosures — the pre-check blocks activation. If `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` fails — specific peptide or SKU name detected in copy — the pre-check blocks activation and emits a P0 finding. No override path; these two rules are the enforcement teeth of the scope-reduction commitment.

### 6.6 Steve Approval Still Required

Marshall pre-check passing is necessary but not sufficient. Steve Rica reviews every persona and every category description before activation, same pattern as #138 and #138c. Steve's approval captures identity, timestamp, scope-specific note.

---

## 7. Database Schema — Append-Only Migration

New migration: `supabase/migrations/20260424_scenario_walkthrough.sql`

```sql
-- ============================================================================
-- SAMPLE PROTOCOL WALKTHROUGH ("Sarah" Scenario) — Composite Case Study
-- Migration: 20260424_scenario_walkthrough.sql
-- ============================================================================

-- Composite personas (currently one: sarah)
create table if not exists scenario_personas (
  id uuid primary key default gen_random_uuid(),
  persona_code text not null unique,                       -- e.g. 'sarah'
  persona_display_name text not null,                      -- e.g. 'Sarah'
  age_band text not null,                                  -- e.g. 'late 30s'
  lifestyle_descriptors text[] not null,                   -- general, non-medical
  health_concerns_consumer_language text[] not null,       -- consumer-language, not diagnoses
  protocol_category_refs uuid[] not null,                  -- FKs to scenario_categories
  tier_reached int not null check (tier_reached in (1,2,3)),
  tier_rationale text not null,                            -- e.g. 'assessment paired with lab panel'
  dr_fadi_supplementary_consent_key text,                  -- null if #138c scope sufficient
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
  constraint persona_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_personas_active on scenario_personas(active, display_order) where active = true;

-- Category library — widely-understood functional-medicine protocol categories
create table if not exists scenario_categories (
  id uuid primary key default gen_random_uuid(),
  category_code text not null unique,                      -- e.g. 'methylation_pathway_support'
  category_display_name text not null,                     -- e.g. 'Methylation-Pathway Support'
  category_description text not null,                      -- the §4.8 one-sentence description
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_categories_active on scenario_categories(active) where active = true;

-- Scenario copy surfaces (section title, intro paragraph, phase cards, tier explainer, CTA)
-- Uses the same copy-variant pattern as #138 hero variants for consistency
create table if not exists scenario_copy_blocks (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null unique,                            -- e.g. 'walkthrough.section_title', 'walkthrough.intro_paragraph', 'walkthrough.phase_1'
  surface text not null default 'walkthrough',
  block_text text not null,
  persona_scoped_to text references scenario_personas(persona_code),  -- null if persona-agnostic
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint block_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create index idx_copy_blocks_active on scenario_copy_blocks(surface, active, display_order) where active = true;

-- Disclosure renderings (for #6.3 COMPOSITE_DISCLOSURE rule enforcement)
create table if not exists scenario_disclosures (
  id uuid primary key default gen_random_uuid(),
  disclosure_placement text not null check (disclosure_placement in (
    'opening','closing','both'
  )),
  disclosure_text text not null,
  font_weight_matches_body boolean not null default true,   -- enforced visually
  renders_as_footnote boolean not null default false,       -- MUST be false to pass COMPOSITE_DISCLOSURE
  active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint disclosure_not_footnote
    check (renders_as_footnote = false or active = false)
);

-- Lifecycle audit log
create table if not exists scenario_events (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (surface in (
    'persona','category','copy_block','disclosure'
  )),
  row_id uuid not null,
  event_kind text not null check (event_kind in (
    'drafted','precheck_completed','steve_approved','steve_revoked',
    'activated','deactivated','archived','supplementary_consent_captured'
  )),
  event_detail jsonb,
  actor_user_id uuid references auth.users(id),
  occurred_at timestamptz not null default now()
);

create index idx_scenario_events on scenario_events(surface, row_id, occurred_at desc);

-- RLS
alter table scenario_personas     enable row level security;
alter table scenario_categories   enable row level security;
alter table scenario_copy_blocks  enable row level security;
alter table scenario_disclosures  enable row level security;
alter table scenario_events       enable row level security;

-- Admin read/write
create policy scenario_personas_admin on scenario_personas
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy scenario_categories_admin on scenario_categories
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy scenario_copy_blocks_admin on scenario_copy_blocks
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy scenario_disclosures_admin on scenario_disclosures
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy scenario_events_admin on scenario_events
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

-- Public read for active content
create policy scenario_personas_public_read on scenario_personas
  for select to anon, authenticated
  using (active = true);

create policy scenario_categories_public_read on scenario_categories
  for select to anon, authenticated
  using (active = true);

create policy scenario_copy_blocks_public_read on scenario_copy_blocks
  for select to anon, authenticated
  using (active = true);

create policy scenario_disclosures_public_read on scenario_disclosures
  for select to anon, authenticated
  using (active = true);
```

---

## 8. Visual Non-Disruption — Inherited from #138

The visual non-disruption guarantee from #138 §3 applies to this prompt. Specifically:

- No design-token modifications (colors, typography, spacing, shadows, radii, breakpoints).
- No brand voice, tagline, or mark changes beyond what #138c established.
- No existing-section modifications — the Sarah Scenario is a *new* section added between the Trust Band (#138c) and whatever currently follows.

### 8.1 New Visual Primitives for This Section

The Sarah Scenario introduces:

- A **persona card** — compact element with typographic monogram (e.g., "S."), persona descriptor summary, and "composite" illustrative badge.
- A **three-phase card sequence** — three cards arranged horizontally on desktop, vertically stacked on mobile, representing the assessment / engine / review phases.
- A **tier explainer side panel** — a three-row explainer of Tier 1, 2, and 3.
- A **category strip** — four chip-style elements (reusing the trust-chip visual primitive from #138c, so no new visual primitive is introduced) showing the four protocol categories Sarah received.

All primitives use existing design tokens. No new icons, no new fonts, no new spacing rules. If a primitive cannot render cleanly with existing tokens, the primitive is revised — not the tokens.

### 8.2 No Photography

Per §3.4, no photographic representation of Sarah is used. The persona card uses a typographic monogram. This is a firm constraint, not a placeholder-until-we-find-a-model constraint.

### 8.3 Section Placement

The Sarah Scenario sits immediately below the Trust Band (#138c) and above whatever currently follows in the homepage flow. No section is reordered, removed, or modified.

---

## 9. OBRA Four Gates

### Gate 1 — Observe & Brainstorm

- Confirm #138c has shipped and the clinician card for Dr. Fadi is active before #138d activation (dependency).
- Confirm with Steve that Dr. Fadi's #138c consent scope covers the Sarah Scenario's aggregate framing without supplementary consent (default assumption per §3.5).
- Identify the four functional-medicine categories most appropriate for Sarah — Marketing proposes, Steve confirms scientific accuracy, Dr. Fadi reviews if requested.
- Confirm CAQ median completion time ≥10 minutes ≤14 minutes — supports the "about 12 minutes" time claim.
- Legal review items: the composite disclaimer language, the "your assessment will be different" hand-off language.
- Verify `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` rule registration works against a deliberately-crafted test corpus containing specific peptide names (should all be rejected).

### Gate 2 — Blueprint / Micro-Task Decomposition

1. Migration `20260424_scenario_walkthrough.sql`.
2. Rule registrations: `MARSHALL.MARKETING.COMPOSITE_DISCLOSURE` (P0) and `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` (P0) added to `compliance/rules/marketing.ts`.
3. `lib/marketing/scenario/types.ts`.
4. `lib/marketing/scenario/precheck.ts` — wrapper over #138's pre-check; extends with the two new rules' invocation.
5. `lib/marketing/scenario/interventionDetector.ts` — the automated detector for the `INTERVENTION_SPECIFICITY` rule, with a seeded word list of all 29 peptides + 56 supplement SKUs + common dosing patterns ("Xmg", "Ymcg", "twice daily", etc.).
6. API routes: `/api/marketing/scenario/*` for personas, categories, copy blocks, disclosures.
7. Admin UI: `/admin/marketing/scenario` with tabs for personas, categories, copy blocks, and tier settings.
8. Public rendering component `components/home/SarahScenarioSection.tsx` (new, inserted between Trust Band and next existing section).
9. Sub-components: persona card, phase card, tier explainer side panel, category strip (reuses `<TrustChip />` from #138c), disclosure element.
10. Seed the Sarah persona, four category rows, the seven copy blocks (section title, intro paragraph, three phase cards, tier explainer, hand-off CTA, bottom disclosure) — all as drafts pending approval.
11. Mobile responsive verification.
12. Visual regression test.
13. SOC 2 collector extension (feeds #138 canonical / Multi-Framework Evidence packet).
14. End-to-end tests including deliberate-violation tests for §6.3 rules.
15. Marshall self-scan of PR.

### Gate 3 — Review

- §3 scope reduction verified: no specific peptide name, no specific dosage, no specific SKU, no percentage outcome claim in any shipped content.
- §8 visual non-disruption verified by diff inspection.
- Every copy block passes Marshall pre-check with zero P0 findings.
- `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` detector catches seeded test violations (peptide names, dose patterns, SKU names).
- `MARSHALL.MARKETING.COMPOSITE_DISCLOSURE` verified: disclosure appears at opening AND closing of the walkthrough, in-element not footnote.
- Dr. Fadi's #138c consent is on file; no supplementary consent attempted unless §3.5 triggered.
- Steve Rica has approved every persona, category, and copy block before activation.
- Hand-off CTA lands on the real CAQ start route.
- All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()` for display.
- Desktop + mobile parity.
- No reference to "Vitality Score" / "5–27×" / "Semaglutide" except in guardrail checks.
- No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- `package.json`, email templates, applied migrations, design tokens, brand colors, typography untouched.

### Gate 4 — Audit / TDD

- ≥90% coverage on `lib/marketing/scenario/*`.
- Activation-gate tests for all four new tables.
- `INTERVENTION_SPECIFICITY` detector: test corpus of 50+ deliberate violations, all caught.
- `COMPOSITE_DISCLOSURE` detector: missing opening disclosure → blocked; missing closing disclosure → blocked; disclosure in footnote rendering → blocked.
- Visual regression confirms Sarah Scenario renders between Trust Band and next existing section with zero pixel diff on siblings.
- Tier explainer renders all three tiers with consistent visual weight.
- Hand-off CTA clickthrough integration test.
- Marshall `marshall-lint` self-scan: zero P0 findings.

---

## 10. File Manifest

**New files (create):**

```
supabase/migrations/20260424_scenario_walkthrough.sql

lib/marketing/scenario/types.ts
lib/marketing/scenario/precheck.ts
lib/marketing/scenario/interventionDetector.ts
lib/marketing/scenario/lifecycle.ts
lib/marketing/scenario/logging.ts

app/api/marketing/scenario/personas/route.ts
app/api/marketing/scenario/personas/[id]/activate/route.ts
app/api/marketing/scenario/categories/route.ts
app/api/marketing/scenario/categories/[id]/activate/route.ts
app/api/marketing/scenario/copy-blocks/route.ts
app/api/marketing/scenario/copy-blocks/[id]/activate/route.ts
app/api/marketing/scenario/disclosures/route.ts

components/marketing-admin/ScenarioDashboard.tsx
components/marketing-admin/PersonaEditor.tsx
components/marketing-admin/CategoryEditor.tsx
components/marketing-admin/CopyBlockEditor.tsx
components/marketing-admin/DisclosureEditor.tsx
components/marketing-admin/InterventionDetectorResultsPanel.tsx

components/home/SarahScenarioSection.tsx
components/home/PersonaCard.tsx
components/home/PhaseCard.tsx
components/home/TierExplainerPanel.tsx
components/home/CategoryStrip.tsx
components/home/CompositeDisclosureElement.tsx
components/home/HandOffCta.tsx

supabase/seeds/scenario_walkthrough_starting_content_seed.sql
   (sarah persona draft + four category drafts + seven copy block drafts + two disclosures,
    none active until approvals complete)

tests/marketing/scenario/**/*.test.ts
tests/marketing/scenario/intervention_detector_corpus.test.ts
tests/e2e/scenario_activation_gate.test.ts
tests/e2e/scenario_disclosure_rendering.test.ts
tests/e2e/scenario_intervention_rejection.test.ts
tests/visual-regression/scenario_no_sibling_drift.test.ts
```

**Modified files (surgical edits only):**

```
compliance/rules/marketing.ts                    (add COMPOSITE_DISCLOSURE and INTERVENTION_SPECIFICITY rule registrations)
lib/marketing/variants/precheck.ts               (no substantive change; continues to be shared)
app/(home)/page.tsx                              (insert <SarahScenarioSection /> between TrustBandSection and next section)
app/(admin)/admin/marketing/page.tsx             (add Scenario nav entry)
lib/soc2/collectors/marketing-copy-activity.ts   (extend to include scenario events)
```

**Explicitly NOT modified (DO NOT TOUCH):**

- Hero component and Trust Band component (those are #138 and #138c territory respectively).
- `<TrustChip />` component — reused by the Sarah Scenario's category strip as-is; no modifications to accommodate scenario use.
- `tailwind.config.js` — no design token changes.
- Existing sections above or below the Sarah Scenario insertion point.
- Brand color constants, typography, imagery treatments.
- `package.json`, Supabase email templates, previously-applied migrations.

---

## 11. Acceptance Criteria

- ✅ Migration applies cleanly. RLS enabled. Activation constraints verified.
- ✅ `MARSHALL.MARKETING.COMPOSITE_DISCLOSURE` (P0) and `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` (P0) rules registered and tested.
- ✅ `interventionDetector` rejects all 50+ seeded violation test cases.
- ✅ Zero specific peptide names, specific SKU names, specific dosages, or specific outcome percentages in any active content.
- ✅ Illustrative disclosure renders at opening AND closing of the walkthrough, in-element weight, not footnote.
- ✅ Dr. Fadi's #138c consent is referenced; no supplementary consent attempted (unless §3.5 triggered during implementation, documented in PR).
- ✅ Every persona, category, and copy block has passed Marshall pre-check and Steve approval before activation.
- ✅ Sarah Scenario renders between Trust Band and next section without modifying either (visual regression verified).
- ✅ Mobile parity at 360px and 414px viewports.
- ✅ Tier explainer renders all three tiers.
- ✅ Hand-off CTA routes to the real CAQ start.
- ✅ All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- ✅ No reference to "Vitality Score" / "Wellness Score" / "5–27×" / "Semaglutide" except in guardrail checks.
- ✅ No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- ✅ `package.json`, email templates, applied migrations, design tokens untouched.
- ✅ `marshall-lint` self-scan produces zero P0 findings.
- ✅ OBRA Gate 1–4 summary in PR description.

---

## 12. Rollout Plan

**Phase A — Infrastructure + Rule Registration (Days 1–5)**

- Migration applied. RLS verified. Admin UI accessible.
- Two new Marshall rules registered and tested against the violation corpus.
- Sarah persona drafted, Marshall-pre-checked, reviewed by Steve.
- Four categories drafted, pre-checked, reviewed by Steve.
- Seven copy blocks drafted, pre-checked, reviewed by Steve.
- Two disclosures drafted, pre-checked.
- Nothing visible on the homepage yet (all rows `active = false`).

**Phase B — Category-Level Review (Days 6–10)**

- Steve confirms Sarah's four categories are defensible as widely-understood functional-medicine terms.
- Dr. Fadi consulted on the category list if Steve flags uncertainty — this is explicitly *consulted*, not delegated. Dr. Fadi's input is advisory; he is not being asked to endorse the Sarah Scenario personally beyond his #138c scope.
- Copy blocks finalized based on consultation.

**Phase C — Activation (Days 11–12)**

- All rows activated in sequence: disclosures first (must render), then categories, then copy blocks, then persona.
- Sarah Scenario becomes visible on the homepage.
- Mobile and desktop verified live.

**Phase D — Observation (Day 13+)**

- Impression tracking inherited from the marketing infrastructure (#138 established).
- CAQ-start clickthrough from the hand-off CTA tracked separately.
- Weekly review by Steve and Marketing for 4 weeks; at 4 weeks, decide whether to add an alternative persona (David, Maria, etc.) per §5.2.

**Kill-Switches**

- Per-row `active` toggle in admin UI for surgical rollback.
- Environment flag `SCENARIO_WALKTHROUGH_ENABLED`: `true` (default) / `false` (hides the entire section regardless of row state). Setting `false` requires Steve + Gary dual approval; audit-logged.

---

## 13. Conversion Stack Sibling Coordination

Third of five conversion-stack siblings:

- **#138 Hero Rewrite (shipped)** — the Sarah Scenario sits two sections below the hero; the hero's variant-testing framework is not reused here (Sarah is a singular narrative, not a tested variant).
- **#138c Trust Band + Team Introduction (shipped)** — immediate parent; the Sarah Scenario sits directly below. Dr. Fadi's appearance in the Trust Band primes the visitor for his role in the Sarah Scenario; the two must read coherently.
- **#138e Outcome Visualization & 30/60/90 Future-State (pending)** — sits immediately below the Sarah Scenario. Sarah's scenario ends at "Sarah received a protocol"; #138e picks up at "here is the shape of outcomes visitors might reasonably expect." The scope-reduction lesson from this prompt carries forward: #138e will face the same dose-specificity / peptide-naming / outcome-percentage risks and should inherit the discipline established here.
- **#138f Supplement Upload Fix (pending)** — independent, bug-fix.

The #138 family now encompasses four conversion-stack surfaces sharing a common `'marketing_copy'` Marshall surface, a common rule namespace (`MARSHALL.MARKETING.*`), a common activation-gate pattern, and a common visual-non-disruption guarantee. No conversion-stack sibling reimplements these primitives.

---

## 14. Document Control

| Field | Value |
|---|---|
| Prompt number | 138d |
| Title | Sample Protocol Walkthrough ("Sarah" Scenario), Scope-Reduced |
| Conversion-stack position | Third of five (#138, #138c, #138d, #138e, #138f) |
| Format | Hybrid (copy + IA + implementation + Marshall integration) |
| Scope | Category-level illustration; no specific peptides, dosages, SKUs, outcome percentages |
| Visual non-disruption | §8 extends #138 §3's guarantee |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Originating analysis | Executive product review (April 24, 2026) critiques 1 and 2 |
| Scope decision | Gary, April 24, 2026 — "scope-reduced, general protocol-category illustration" |
| Reuses from #138 | `'marketing_copy'` Surface, `MARSHALL.MARKETING.*` namespace, pre-check pipeline, activation-gate pattern, visual-non-disruption guarantee |
| Reuses from #138c | `<TrustChip />` visual primitive for the category strip; Dr. Fadi's clinician consent scope |
| New Marshall rules | `MARSHALL.MARKETING.COMPOSITE_DISCLOSURE` (P0), `MARSHALL.MARKETING.INTERVENTION_SPECIFICITY` (P0) |
| New tables | 5 (personas, categories, copy_blocks, disclosures, events) |
| Dr. Fadi supplementary consent | Not required at default scope; triggered only if §3.5 conditions occur |
| Successor / sibling prompts | #138e (Outcome Visualization), #138f (Supplement Upload Fix) |
| Successor content | Alternative personas (David, Maria) added per §5 slot structure; additional categories added per category library; no re-prompting required |
| Deferred to future prompt | Persona rotation / selection UX; dose-specific case studies (requires separate peptide-marketing legal scoping) |

---

## 15. Acknowledgment

By memorializing this prompt in the Prompt Library, Gary establishes:

- **The Sarah Scenario as a new homepage section** sitting between the Trust Band (#138c) and the next existing section, with no modifications to either.
- **The scope reduction in §3 as binding:** no specific peptides, no specific SKUs, no specific dosages, no specific outcome percentages, no photographic representation of Sarah as an individual, no expansion of Dr. Fadi's attribution surface beyond his #138c consent scope.
- **The Tier 1 / Tier 2 / Tier 3 confidence framing as a consumer-visible platform feature**, with the internal confidence percentages (72% / 86% / 96%) remaining engineering calibration values, not marketing claims.
- **Dr. Fadi's #138c consent scope as sufficient for this prompt's output at default design**; supplementary consent is captured only if §3.5 conditions are triggered during implementation.
- **The two new Marshall rules** (`COMPOSITE_DISCLOSURE` P0, `INTERVENTION_SPECIFICITY` P0) **as the automated enforcement layer for the scope-reduction commitment.** Both are P0 to signal that override is not permitted at the content-author level.
- **The starting content** — Sarah persona, four categories, seven copy blocks, two disclosures — as the initial scenario set, subject to Marshall pre-check and Steve Rica approval before activation.
- **The slot structure in §5 as the path for alternative personas** (David, Maria, etc.) without re-prompting.
- **The hand-off CTA language** — *"Your assessment will be different because your biology is different"* — **as load-bearing for FTC posture and non-negotiable in future variant copy.**

Steve Rica retains final approval authority on every Sarah Scenario element prior to activation. Dr. Fadi is consulted on scientific accuracy of category language per §9 Gate 1 but is not asked to endorse the Sarah Scenario personally beyond his #138c consent scope.

No specific peptide names, specific supplement SKUs, specific dosages, or specific outcome percentages may be introduced into Sarah Scenario content via successor copy additions without first re-scoping the prompt family. If ViaConnect later decides to ship a dose-specific case study, that decision requires its own prompt with peptide-marketing legal scoping, Dr. Fadi's supplementary personal consent, and independent legal counsel review — none of which is in scope here.

---

## Memorialization note

This prompt is authored as **Prompt #138d** and memorialized in the library at `docs/prompts/prompt-138d-sample-protocol-walkthrough-sarah-scenario.md`. No renumbering required: the `#138d` slot was unclaimed in both git history and the prompt library at the time of memorialization. Spec preserved verbatim.

**Cross-reference notes (continuing the pattern from #138c):**

- The spec's references to **"#138 Hero Rewrite (shipped)"** point to library file `prompt-138a-homepage-hero-rewrite.md` (renumbered from your original `#138` to avoid the integer collision with `prompt-138-multi-framework-evidence-architecture.md`). Your current canonical labeling treats the Hero as `#138`.
- The spec's references to **"#138c Trust Band + Team Introduction (shipped)"** point to library file `prompt-138c-trust-band-team-introduction.md`. Memorialized in commit `2c87bf2`.
- The spec's references to **"#138b (Dependabot Triage)"** as a related governance branch point to a prompt Gary maintains in his canonical Standing Rule #4 chain (per the `feedback_external_repo_governance.md` memory entry adding "Dependabot triage per #138b"). Not yet memorialized in `docs/prompts/`.
- The spec's references to **"#138e Outcome Visualization (pending)"** and **"#138f Supplement Upload Fix (pending)"** are reserved slots for the remaining conversion-stack siblings.

**Sibling-numbering note:** Earlier in the session the Supplement Upload Fix was tentatively labeled `#142` in `#138a` §14 and `#138c` §14. This spec (#138d) shifts that labeling to `#138f` to keep the entire conversion stack inside the `#138` letter-suffix bundle. The shift is reflected here as the canonical labeling going forward; earlier specs stand as authored.

**Conversion-stack roster updated:**

| Position | Canonical # | Library file | Status |
|---|---|---|---|
| 1 | #138 (Hero) | `prompt-138a-homepage-hero-rewrite.md` | memorialized |
| 2 | #138c (Trust Band) | `prompt-138c-trust-band-team-introduction.md` | memorialized |
| 3 | **#138d (Sarah Scenario)** | **`prompt-138d-sample-protocol-walkthrough-sarah-scenario.md`** | **this commit** |
| 4 | #138e (Outcome Visualization) | reserved | — |
| 5 | #138f (Supplement Upload Fix) | reserved (was tentatively #142 in earlier specs) | — |

**Implementation status:** this spec is memorialized at authoring time. Execution flows through the concurrent Claude Code engineering session per the established pattern. The visual non-disruption guarantee in §8 (inherited from `#138` §3) and the scope reduction in §3 are the load-bearing constraints for that execution. The two new P0 Marshall rules (`COMPOSITE_DISCLOSURE`, `INTERVENTION_SPECIFICITY`) are the automated enforcement teeth — there is no override path at the content-author level.

This memorialization session produces only the authoritative policy/spec artifact and does not touch `lib/marketing/scenario/**`, the new migration, API routes, UI components, or tests.
