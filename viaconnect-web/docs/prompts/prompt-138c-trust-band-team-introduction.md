# Prompt #138c — Trust Band + Team Introduction

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Conversion-stack sibling #2 / Homepage trust-section copy + IA + Marshall integration
**Parent prompts:** #138 (Homepage Hero & Value-Proposition Rewrite — visual non-disruption pattern + `Surface = 'marketing_copy'` infrastructure); #138b (Dependabot Triage and Merge Policy — unrelated governance branch, listed for completeness of the #138 family)
**Conversion-stack siblings:** #138 Hero Rewrite (shipped); #140 Sample Protocol Walkthrough ("Sarah" Scenario); #141 Outcome Visualization & 30/60/90 Future-State; #142 Supplement Upload Diagnostic & Fix
**Originating analysis:** Executive product review (April 24, 2026) critique 3 ("I would want to see proof or reassurance" — team, medical grounding, testimonials)
**Status:** Active — authorizes Claude Code to implement §5–§9 under the visual-non-disruption guarantee inherited from #138 §3
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

The April 24, 2026 executive product review's critique 3 read: *"As a user, I naturally look for — who's behind this? Is this medically grounded? Has this helped anyone yet? Right now, that layer feels a bit light."* The reviewer suggested that even a small signal like "Built with health professionals" or "Based on established research" would go a long way toward building confidence and trust.

This prompt delivers the **Trust Band** — a new homepage section that sits immediately below the hero (the hero being the scope of #138) and immediately above whatever section currently occupies the second-screen slot. The band surfaces:

- **A single named clinician** — Dr. Fadi Dagher, Medical Director — with role and credentials.
- **An advisory framing** — a short statement of how clinician oversight operates on the platform.
- **A regulatory posture summary** — a neutral, compliance-grade statement naming the frameworks the platform honors (FDA disclaimers, FTC Endorsement Guides, HIPAA safeguards) without overclaiming certification or endorsement.
- **Three to four trust chips** — small, scannable elements (practitioner network size, number of supplement SKUs under compliance review, years of operation, etc.) that give the band visual structure without requiring testimonials.
- **A deliberately-absent testimonial framework** — placeholder infrastructure for future testimonials but no testimonials shipped in this prompt. When testimonials are added, they flow through a dedicated FTC-compliant pipeline defined in §6.

What this prompt does **not** deliver:

- **Testimonials themselves** — per Gary's standing caution on FTC 16 CFR 255 compliance, no testimonials ship without a complete material-connection-disclosure pipeline. The pipeline is specified here; the content is not generated here.
- **Steve Rica surfaced by name on the Trust Band** — Steve is the approver of this copy, not a named figure on the band itself. Naming a compliance officer by name on marketing material is a distinct decision with its own risk calculus (it can read as defensive or as an admission of compliance concern) and is deferred to a future conversion-stack prompt if Gary decides to include it.
- **Advisory board members** — if an advisory board forms later, the band's structure supports adding it; a separate prompt would specify board governance, FTC disclosure, and photography standards.
- **An "About Us" page** — the Trust Band sits on the homepage; a full About Us is a different deliverable under the broader marketing surface, out of scope here.
- **Testimonial video infrastructure** — the testimonial framework in §6 is text-only; video introduces additional FTC, hosting, and accessibility requirements that warrant their own prompt.

---

## 2. Why Trust Bands Work (Briefly)

The Trust Band pattern is the established answer to the category-wide problem the executive reviewer identified: wellness consumers in 2026 have heard "AI" and "precision" and "personalized" so many times that those words function as noise rather than differentiation. A visitor who just saw the hero (under #138) needs immediate evidence that the product is real before they'll scroll further. The trust band works as a fast trust handoff from positioning language to proof language.

Function Health, Levels, Whoop, and Calm all operate a variant of this pattern, typically in these specific slots:

- **Medical/clinical credibility** (named clinician + credentials).
- **Regulatory/compliance posture** (what standards are honored).
- **Scale signals** (user counts, partner counts, inventory counts).
- **Third-party validation** (press, awards, certifications — where available).

ViaConnect's band, at this stage, has solid answers for the first three and is deliberately silent on the fourth until real third-party signals accrue. Silence is better than invented validation.

---

## 3. Visual Non-Disruption — Inherited From #138

The visual non-disruption guarantee from #138 §3 applies here, extended to the Trust Band's new visual elements. Specifically:

### 3.1 Inherited Protections

The following protections from #138 §3 apply unchanged to this prompt:

- No design-token modifications (colors, typography, spacing, shadows, radii, breakpoints).
- No brand voice, tagline, or mark changes.
- No existing-section modifications — the Trust Band is a *new* section added between the hero and whatever currently sits below, not a replacement for anything.

### 3.2 New Visual Primitives (permitted, bounded)

The Trust Band introduces a small number of new visual primitives that did not exist before:

- A **trust chip** — a compact element rendering `<icon> + <short text>`, using an existing Lucide icon at `strokeWidth={1.5}` and existing typography scale.
- A **clinician card** — a compact element rendering clinician name, credential string, role, and optional headshot.
- A **regulatory statement block** — a single-paragraph typographic block using existing typography scale.

These primitives MUST use existing design tokens. No new colors, no new fonts, no new spacing scales, no new icon styles. If the primitive cannot render cleanly with existing tokens, the primitive is revised — not the tokens.

### 3.3 Clinician Photography — Governance

A clinician photo (if included) is a new asset class on the homepage. It must:

- Match the existing brand photography treatment (likely duotone or monochrome-on-Navy; Marketing confirms the canonical treatment before the asset ships).
- Use the same aspect ratio convention as any existing portrait treatment on the site.
- Be licensed for commercial use indefinitely (written license on file before the asset is committed).
- Have Dr. Fadi Dagher's written consent for use in marketing (captured and stored per §8.6).

If no suitable photo exists at ship time, the clinician card renders with a typographic initial (first and last initial in brand-consistent typography on a brand-color background). The typographic initial is the permanent fallback — it is not a placeholder awaiting a "better" asset. This is important because shipping "placeholder" imagery tends to outlive its intended temporariness.

### 3.4 Trust Chip Iconography

Each trust chip uses one Lucide icon. The icon conveys the chip's category (credentials, compliance, scale, etc.) — not the exact chip content. Example: a chip reading "Medically Directed" might use `lucide-stethoscope`; a chip reading "FTC-Compliant Claims" might use `lucide-shield-check`. The icon set is part of the Trust Band's seed (§5); additions flow through the same approval gate as copy variants.

### 3.5 Section Placement

The Trust Band sits immediately below the hero and immediately above the next existing section. No existing section is reordered, removed, or modified. The Trust Band is additive.

If the homepage's current second-screen section provides a form of trust signaling that would duplicate the Trust Band (unlikely but possible), Marketing flags this during implementation and the resolution is decided by Gary — either by amending this prompt to retire the duplicated content, or by differentiating the Trust Band's focus. This prompt does not authorize removal of existing sections.

---

## 4. Copy — Starting Set

The Trust Band ships with one starting copy set (not a variant test, unlike #138 — this section's content is more singular than the hero) plus slot infrastructure for future variants if testing becomes warranted.

### 4.1 Regulatory Posture Paragraph

The central element of the band — a single paragraph, 2–3 sentences, declaring the compliance posture without overclaiming.

**Starting copy:**

> "FarmCeutica's protocol engine is medically directed by a licensed clinician and built against FTC Endorsement Guide standards, DSHEA supplement-label conventions, and HIPAA Security Rule safeguards. Every recommendation is grounded in published research and reviewed before it reaches you."

**Why this phrasing:**

- "Medically directed by a licensed clinician" is factually accurate and is the foundation for naming Dr. Fadi in the adjacent clinician card. Saying both is redundant; saying neither is a missed trust signal. The regulatory paragraph uses the categorical phrasing; the clinician card does the named attribution.
- "Built against FTC Endorsement Guide standards" is a substantiable claim because Marshall's `MARSHALL.CLAIMS.TESTIMONIAL_DISCLOSURE` rule (per #119 §4.1) is architecturally tied to 16 CFR 255. Naming the guide is defensible.
- "DSHEA supplement-label conventions" names the correct statute for supplement label compliance without claiming FDA endorsement (which would be false).
- "HIPAA Security Rule safeguards" is substantiable because #127 / canonical #138 (the compliance-stack Multi-Framework Evidence Architecture prompt) established HIPAA as one of the three frameworks the platform is attested against.
- "Grounded in published research and reviewed before it reaches you" is the promise that matters most for this critique and is defensible because Dr. Fadi's review role is real.

**What this phrasing deliberately avoids:**

- The words "FDA approved" — supplements and peptides cannot be FDA-approved; the phrase would be an overclaim with immediate regulatory risk.
- The words "clinically proven" — overclaims research substantiation and is an FTC red flag.
- The word "certified" — without a named certifying body, "certified" is empty; with a named body, it commits to a specific audit relationship not currently in place.
- The phrase "doctor-recommended" — triggers a narrower FTC standard than "medically directed" and is harder to substantiate at the platform level.

### 4.2 Clinician Card — Dr. Fadi Dagher

**Starting copy:**

- **Name:** Dr. Fadi Dagher, MD (or whatever credential string Dr. Fadi approves — Marketing confirms before the card ships; the credential line must match Dr. Fadi's written approval exactly, not paraphrase it)
- **Role:** Medical Director
- **Descriptor (one sentence, 15–25 words):** *"Reviews the scientific grounding of every protocol category, ensuring recommendations reflect current research and appropriate clinical caution."*

**Why this phrasing:**

- "Reviews the scientific grounding of every protocol category" is defensible as a category-level review rather than a per-recommendation claim. It honestly describes the oversight model without overclaiming that Dr. Fadi personally reviews each individual user's protocol (which is not the operating reality).
- "Appropriate clinical caution" signals professional judgment without promising outcomes.
- 15–25 words fits the compact card format and is consistent with the established typography scale.

**Dr. Fadi approval required for all three fields** — name, credential, role line, and descriptor sentence. No copy ships without his written approval per §8.6.

### 4.3 Trust Chips — Starting Set of Four

Each chip is `<icon> + <text>` where text is ≤6 words. The four starting chips:

| Icon | Text | Rationale |
|---|---|---|
| `lucide-stethoscope` | "Medically Directed" | Restates the clinician oversight posture in chip form for scanners who don't read the paragraph. |
| `lucide-shield-check` | "FTC-Compliant Claims" | Surfaces the regulatory discipline that differentiates ViaConnect from many competitors who claim compliance without architecting it. |
| `lucide-lock` | "HIPAA-Grade Privacy" | The word "grade" rather than "compliant" is important — HIPAA applies to covered entities under specific regulatory triggers; "HIPAA-grade" describes the engineering posture without claiming the legal status. |
| `lucide-microscope` | "Research-Grounded Protocols" | Echoes the "grounded in published research" claim from §4.1 in chip form. |

**Why four and not three or five:** four chips fits two rows of two on mobile and one row of four on desktop, using the existing Tailwind grid primitives. Three chips looks thin; five requires a grid shift. Four is the visual sweet spot.

**Chip language rules** (enforced via §7 Marshall pre-check):

- No superlatives ("best", "most", "only").
- No comparative claims without substantiation ("more effective than", "faster than").
- No numerical claims without a substantiation file (e.g., "10,000+ users" requires a live data source confirming the count).
- Must be substantiable via a named evidence source from the compliance stack (#122 / canonical #138's evidence packets, #119's rule registry, or external licensing documents).

### 4.4 What Is NOT in the Starting Set

Deliberately omitted:

- **Testimonials.** The testimonial framework is defined in §6 but ships empty. When a testimonial is added, it passes through the FTC-compliant pipeline in §6 before rendering.
- **Press mentions.** If ViaConnect has press coverage, a press-mention slot can be added in a successor prompt. Not in this one.
- **Awards / certifications.** Same as press — reserved for future accrual.
- **Scale numbers** (user counts, practitioner counts). These are attractive trust signals but are each a substantiation commitment — the numbers must be current, queryable against a live source, and the claim must be re-verified as the number changes. Infrastructure for this is defined in §6.4 but no scale numbers ship in the starting set.
- **Advisory board.** If an advisory board forms, the band structure supports it; a successor prompt specifies governance.

---

## 5. Slot Structure for Future Additions

Like #138's variant slot structure, the Trust Band's content is table-backed so Marketing can add or adjust elements without code changes.

### 5.1 Band Content Model

The Trust Band has four content surfaces:

- `regulatory_paragraph` — a single active paragraph (versioned; old versions archived).
- `clinician_card` — a set of clinician cards (currently one: Dr. Fadi; extensible).
- `trust_chips` — an ordered list of chips (currently four; extensible up to six without layout strain).
- `testimonial_slot` — the future-testimonial pipeline (ships empty; see §6).

Each surface is its own table in §8. Each row has an `active` flag; a surface can have multiple active rows (chips, clinician cards) or exactly one active row (regulatory paragraph).

### 5.2 Content Lifecycle

The same lifecycle from #138 §5.2 applies here, with minor adjustments:

1. **Draft.** Marketing or Gary writes content in the admin UI at `/admin/marketing/trust-band` (§10).
2. **Substantiation check.** If content includes a numerical claim, a named clinician, or a specific regulatory framework reference, a substantiation file must be linked.
3. **Clinician consent check.** For clinician cards, the named clinician's written consent record must be on file (§8.6).
4. **Marshall pre-check.** Runs against surface `'marketing_copy'` (established by #138 §7; not re-established here) with the additional rule `MARSHALL.MARKETING.NAMED_PERSON_CONNECTION` (P1, established in #138 §7.3).
5. **Steve approval.** Steve Rica reviews the pre-checked content.
6. **Activation.** Content goes live on the homepage.

The lifecycle is enforced at the database level via the same check-constraint pattern #138 established — `active = true` requires substantiation (where applicable), clinician consent (where applicable), Marshall pre-check pass, and Steve approval.

### 5.3 No Silent Activation

Consistent with #138's policy, no Trust Band content can be served to visitors without the full gate passage. This is important because the Trust Band is where trust signals live — a broken gate on the Trust Band directly undermines the trust it purports to build.

---

## 6. Testimonial Framework (Pipeline Only — No Testimonials Shipped)

The executive reviewer said testimonials would go "a long way in building confidence and in turn, trust." That's true, and it's also the single highest-risk content category in marketing copy. A testimonial framework that ships without FTC compliance is worse than no framework at all because one non-compliant testimonial can invalidate the brand's entire compliance posture.

This section specifies the pipeline. **No testimonials are shipped under this prompt.**

### 6.1 What FTC 16 CFR 255 Requires

The short version:

- **Material connection disclosure.** Any endorsement by someone with a material connection to the brand (payment, free product, employment, affiliation) must disclose that connection clearly and prominently.
- **Truthful and non-misleading.** The endorsement must reflect the honest opinion of the endorser.
- **Typicality of results.** Testimonials describing results must either describe typical results or include a clear disclosure about atypical results.
- **Substantiation.** The brand must have substantiation for claims the testimonial makes, independent of the testimonial itself.

16 CFR 255 is enforced via FTC action; penalties can be substantial. The ViaConnect compliance stack already includes `MARSHALL.CLAIMS.TESTIMONIAL_DISCLOSURE` (P1) from #119 §4.1 which enforces material-connection disclosure on Hounddog-detected practitioner testimonials; this prompt extends that discipline to testimonials shipped on the marketing surface.

### 6.2 Testimonial Schema

Every testimonial row includes:

| Field | Purpose |
|---|---|
| `endorser_identity` | Full name or first-name-plus-initial, per endorser's written preference |
| `endorser_role` | Practitioner, consumer, clinician, or other |
| `endorser_material_connection` | Payment received, free product, employment, affiliation, or none |
| `endorser_connection_disclosure_text` | The exact disclosure text that renders alongside the testimonial |
| `endorser_written_consent_storage_key` | Supabase Storage key for the signed consent document |
| `testimonial_text` | The endorsement text itself |
| `testimonial_date_of_statement` | When the endorser made the statement |
| `claims_substantiation_refs` | Array of references to substantiation files supporting any claims the testimonial makes |
| `typicality_status` | `typical` \| `atypical_with_disclosure` |
| `typicality_disclosure_text` | Required if atypical; the exact text that renders |
| `marshall_precheck_session_id` | FK to the pre-check session |
| `steve_approval_at` | Timestamp + identity + note |
| `legal_counsel_review_at` | Timestamp; **required for all testimonials** — not just Steve's approval |
| `active` | Bool; enforced by multi-condition check constraint |

### 6.3 Dual-Approval Requirement

Unlike Trust Band content in §5, testimonials require **both** Steve's approval AND legal counsel review. The rationale: Steve can evaluate Marshall-rule compliance; legal counsel is the appropriate level for FTC exposure review. This is the same dual-approval pattern used in the compliance stack for high-risk actions (e.g., #124 Vision first-time takedown filings, #122 de-pseudonymization flows).

The dual approval is enforced at the database level — a testimonial row cannot have `active = true` without both approval records.

### 6.4 Scale-Claim Infrastructure (for future use)

If ViaConnect eventually wants to ship a trust chip like "10,000+ users" or "1,200+ practitioners," the infrastructure is defined here even though no such chip ships now:

- A `scale_claim_sources` table records which live data source backs which claim (e.g., `count_of_active_practitioners` queries the `practitioners` table with a specific active-status filter).
- A nightly job re-queries each active source and refreshes the claim's numerical value.
- If the live value drops below the claimed threshold (e.g., claim says "1,200+" but count falls to 1,150), the chip is automatically deactivated and flagged to Marketing for review.
- Auto-deactivation is important because understated-by-reality claims are themselves FTC concerns (you cannot maintain a claim of "1,200+" if you actually have 1,150 — silence is better than falsehood).

No scale claims ship in the starting set; the infrastructure is declared here so that future additions don't require a new prompt.

### 6.5 Testimonial Rendering Rules

When testimonials eventually ship, they render per the following rules (enforced in UI code):

- **Material connection disclosure appears in the same visual element as the testimonial,** not below it or in a footnote. The disclosure is clearly legible — same font size as the testimonial body, not grayed out.
- **Typicality disclosure (if applicable) appears immediately after the testimonial body.**
- **Endorser identity is displayed per the endorser's written preference** — ViaConnect does not decide whether to show full names or first-name-plus-initial; the endorser does.
- **No testimonial can be rendered without a resolvable `endorser_written_consent_storage_key`.** A broken or missing consent file immediately deactivates the testimonial.
- **Photographs of endorsers require separate written consent** (distinct from the written consent for the quote itself) captured per §8.6.

### 6.6 What Happens If An Endorser Revokes Consent

Endorsers can revoke consent at any time. When revocation is received:

1. The testimonial is deactivated within 24 hours of receipt.
2. The consent record is updated with the revocation date.
3. The deactivation is audit-logged.
4. No "last-chance pitch" to retain the endorsement — revocation is honored without negotiation.

This is table stakes for endorsement governance. The endorser's ongoing consent is load-bearing for the legitimacy of the testimonial.

---

## 7. Marshall Pre-Check Integration

### 7.1 Surface Reuse

The `'marketing_copy'` Surface enum value established by #138 §7.1 is reused unchanged. No new surface is registered by this prompt.

### 7.2 Rule Reuse

The `MARSHALL.MARKETING.*` rule namespace established by #138 §7.3 is reused unchanged. Every rule registered in #138 applies to Trust Band content with the same severity and evaluation logic:

- `MARSHALL.MARKETING.NAMED_PERSON_CONNECTION` (P1) — applies strongly to the clinician card (§4.2) and to any testimonials (§6).
- `MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION` (P1) — applies if any future trust chip makes a time claim.
- `MARSHALL.MARKETING.SCIENTIFIC_GROUNDING` (P2) — applies to the regulatory paragraph's "grounded in published research" phrasing.
- `MARSHALL.MARKETING.OUTCOME_GUARANTEE` (P0) — applies to all Trust Band content; no content promises specific outcomes.
- `MARSHALL.MARKETING.COMPLIANCE_NAMING` (P2) — applies to the regulatory paragraph, which names specific frameworks (FTC, DSHEA, HIPAA).

### 7.3 New Rules in `MARSHALL.MARKETING.*`

Two rules specific to the Trust Band surface are registered here:

| Rule ID | Severity | Description |
|---|---|---|
| `MARSHALL.MARKETING.ENDORSER_CONSENT_REQUIRED` | P0 | Any testimonial content must link to a valid, non-revoked written consent record. Missing or revoked consent is a P0 finding. |
| `MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING` | P1 | When marketing copy names a specific regulatory framework (FTC, DSHEA, HIPAA, ISO, etc.), the naming must be consistent with the platform's actual compliance posture per the compliance-stack evidence (#119, #122 / canonical #138, #127 / canonical #138 — pending canonical renumbering confirmation). Naming a framework without corresponding evidence is a P1 finding. |

### 7.4 Pre-Check Invocation

The pre-check pipeline from #121 is invoked via the same wrapper established in #138 §7.4. No new pipeline code is required; the Trust Band surfaces call into the existing `lib/marketing/variants/precheck.ts` helper with the Trust Band's content payload.

### 7.5 What Happens If Pre-Check Finds a P0

A P0 finding on Trust Band content blocks activation. The content stays in draft. Marketing is notified. Remediation is required before activation. This matches #138's pattern and the compliance stack's general approach — P0 is never overridden at the marketing-copy level, only via Steve + Gary dual approval for specific content with a documented rationale.

### 7.6 Legal Counsel Review Threshold

As noted in §6.3, testimonials require legal counsel review in addition to Steve approval. For non-testimonial Trust Band content (regulatory paragraph, clinician card, trust chips), Steve's approval is sufficient unless the content is flagged by Marshall as triggering a framework-naming rule (`MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING`), in which case legal counsel review is also required.

This tiered-review structure prevents legal counsel from being the bottleneck on every minor copy adjustment while ensuring they're in the loop on the highest-risk content categories.

---

## 8. Database Schema — Append-Only Migration

New migration: `supabase/migrations/20260424_trust_band.sql`

```sql
-- ============================================================================
-- TRUST BAND + TESTIMONIAL FRAMEWORK
-- Migration: 20260424_trust_band.sql
-- ============================================================================

-- Regulatory paragraph (singular active row enforced by partial unique index)
create table if not exists trust_band_regulatory_paragraphs (
  id uuid primary key default gen_random_uuid(),
  paragraph_text text not null,
  frameworks_named text[] not null default '{}',          -- e.g. ['FTC Endorsement Guides','DSHEA','HIPAA Security Rule']
  substantiation_refs text[] not null default '{}',
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  steve_approval_note text,
  legal_counsel_review_at timestamptz,
  legal_counsel_review_by text,                            -- name of reviewing counsel or firm
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regulatory_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false))
);

create unique index idx_regulatory_single_active on trust_band_regulatory_paragraphs(active)
  where active = true;

-- Clinician cards
create table if not exists trust_band_clinician_cards (
  id uuid primary key default gen_random_uuid(),
  clinician_display_name text not null,                    -- rendered via getDisplayName() at read time
  credential_line text not null,                           -- as approved by the clinician exactly
  role_line text not null,                                 -- e.g. 'Medical Director'
  descriptor_sentence text not null,                       -- 15-25 words
  photo_storage_key text,
  photo_license_storage_key text,                          -- license documentation
  clinician_consent_storage_key text not null,             -- written consent; required
  clinician_consent_received_at timestamptz not null,
  clinician_consent_scope text not null,                   -- text of the scope the clinician consented to
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
  constraint clinician_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false
               and clinician_consent_storage_key is not null))
);

create index idx_clinician_cards_active on trust_band_clinician_cards(active, display_order) where active = true;

-- Trust chips
create table if not exists trust_band_chips (
  id uuid primary key default gen_random_uuid(),
  icon_name text not null,                                 -- lucide icon name, e.g. 'stethoscope'
  chip_text text not null,                                 -- ≤6 words
  category text not null check (category in (
    'credentials','compliance','scale','research','other'
  )),
  substantiation_ref text,                                 -- required for scale/research categories
  live_data_source text,                                   -- for scale claims; see §6.4
  current_measured_value numeric,                          -- for scale claims
  claimed_threshold numeric,                               -- for scale claims (e.g., 1200 for "1,200+")
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
  constraint chip_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and archived = false)),
  constraint chip_word_count
    check (array_length(string_to_array(chip_text, ' '), 1) <= 6),
  constraint scale_chip_has_source
    check (category != 'scale' or live_data_source is not null)
);

create index idx_chips_active on trust_band_chips(active, display_order) where active = true;

-- Testimonials (ships empty per §6; pipeline exists)
create table if not exists trust_band_testimonials (
  id uuid primary key default gen_random_uuid(),
  endorser_identity text not null,                         -- full name or first+initial, per endorser preference
  endorser_role text not null check (endorser_role in (
    'practitioner','consumer','clinician','other'
  )),
  endorser_material_connection text not null check (endorser_material_connection in (
    'none','payment_received','free_product','employment','affiliation','other_disclosed'
  )),
  endorser_connection_disclosure_text text not null,
  endorser_written_consent_storage_key text not null,
  endorser_consent_received_at timestamptz not null,
  endorser_consent_revoked_at timestamptz,
  endorser_photo_storage_key text,
  endorser_photo_consent_storage_key text,                 -- separate consent for photo
  testimonial_text text not null,
  testimonial_date_of_statement date not null,
  claims_substantiation_refs text[] not null default '{}',
  typicality_status text not null check (typicality_status in (
    'typical','atypical_with_disclosure'
  )),
  typicality_disclosure_text text,
  marshall_precheck_session_id uuid,
  marshall_precheck_passed boolean not null default false,
  steve_approval_at timestamptz,
  steve_approval_by uuid references auth.users(id),
  legal_counsel_review_at timestamptz,
  legal_counsel_review_by text,
  active boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonial_activation
    check (active = false
           or (marshall_precheck_passed = true
               and steve_approval_at is not null
               and legal_counsel_review_at is not null
               and archived = false
               and endorser_consent_revoked_at is null
               and endorser_written_consent_storage_key is not null)),
  constraint atypicality_requires_disclosure
    check (typicality_status = 'typical'
           or typicality_disclosure_text is not null)
);

create index idx_testimonials_active on trust_band_testimonials(active, display_order) where active = true;
create index idx_testimonials_revoked on trust_band_testimonials(endorser_consent_revoked_at) where endorser_consent_revoked_at is not null;

-- Scale-claim live-value refresh log (§6.4)
create table if not exists trust_band_scale_measurements (
  id uuid primary key default gen_random_uuid(),
  chip_id uuid not null references trust_band_chips(id) on delete cascade,
  measured_at timestamptz not null default now(),
  measured_value numeric not null,
  data_source_queried text not null,
  passed_threshold boolean not null
);

create index idx_scale_measurements_chip on trust_band_scale_measurements(chip_id, measured_at desc);

-- Lifecycle audit log
create table if not exists trust_band_events (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (surface in (
    'regulatory_paragraph','clinician_card','trust_chip','testimonial'
  )),
  row_id uuid not null,
  event_kind text not null check (event_kind in (
    'drafted','substantiation_linked','precheck_completed',
    'steve_approved','steve_revoked','legal_reviewed','activated',
    'deactivated','consent_revoked','archived','scale_below_threshold'
  )),
  event_detail jsonb,
  actor_user_id uuid references auth.users(id),
  occurred_at timestamptz not null default now()
);

create index idx_trust_band_events on trust_band_events(surface, row_id, occurred_at desc);

-- RLS
alter table trust_band_regulatory_paragraphs enable row level security;
alter table trust_band_clinician_cards       enable row level security;
alter table trust_band_chips                 enable row level security;
alter table trust_band_testimonials          enable row level security;
alter table trust_band_scale_measurements    enable row level security;
alter table trust_band_events                enable row level security;

-- Admin read/write policies
create policy trust_regulatory_admin on trust_band_regulatory_paragraphs
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy trust_clinician_admin on trust_band_clinician_cards
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy trust_chips_admin on trust_band_chips
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy trust_testimonials_admin on trust_band_testimonials
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy trust_scale_admin on trust_band_scale_measurements
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

create policy trust_events_admin on trust_band_events
  for all to authenticated
  using (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'))
  with check (auth.jwt()->>'role' in ('marketing_admin','admin','superadmin','compliance_admin'));

-- Public read for active content (anonymous visitors must be able to render the band)
-- Note: anon role policies are additive, not overriding the admin policies above
create policy trust_regulatory_public_read on trust_band_regulatory_paragraphs
  for select to anon, authenticated
  using (active = true);

create policy trust_clinician_public_read on trust_band_clinician_cards
  for select to anon, authenticated
  using (active = true);

create policy trust_chips_public_read on trust_band_chips
  for select to anon, authenticated
  using (active = true);

create policy trust_testimonials_public_read on trust_band_testimonials
  for select to anon, authenticated
  using (active = true);
```

### 8.6 Consent Storage

Written consent documents (clinician consent, endorser consent, photo consent) live in the Supabase Storage bucket `trust-band-consents`, private, with signed-URL access for admin workflows only. Consent documents are retained indefinitely — the record of consent is itself evidence and deleting it would undermine the legitimacy of the content it backed.

---

## 9. OBRA Four Gates

### Gate 1 — Observe & Brainstorm

- Identify where the Trust Band sits on the current homepage (section immediately below hero, immediately above current second-screen section).
- Catalog existing duotone/monochrome photography treatment and confirm the canonical style with Marketing before the Dr. Fadi photo spec is finalized.
- Confirm Dr. Fadi Dagher's written consent scope (including exact credential string he approves for display).
- Confirm which Lucide icons are already in use elsewhere on the homepage to maintain visual consistency.
- Identify legal counsel of record for testimonial review — named person or firm.
- Verify that the `'marketing_copy'` surface and `MARSHALL.MARKETING.*` rules are shipped and functioning from #138 before this prompt implements.

### Gate 2 — Blueprint / Micro-Task Decomposition

1. Migration `20260424_trust_band.sql`.
2. Consent storage bucket `trust-band-consents` created with admin-only access policies.
3. New rule registrations: `MARSHALL.MARKETING.ENDORSER_CONSENT_REQUIRED`, `MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING` in `compliance/rules/marketing.ts` (extending what #138 established).
4. `lib/marketing/trustband/types.ts`.
5. `lib/marketing/trustband/activation.ts` — check-constraint-mirroring TypeScript gate for API-layer validation.
6. `lib/marketing/trustband/scaleRefresh.ts` — nightly refresh job for scale-claim chips (no scale claims active now; infrastructure only).
7. `lib/marketing/trustband/consentRevocation.ts` — 24-hour deactivation workflow.
8. `lib/marketing/trustband/precheck.ts` — wrapper over #138's shared pre-check invocation.
9. API routes: `/api/marketing/trust-band/*` covering regulatory paragraph, clinician cards, chips, testimonials.
10. Admin UI: `/admin/marketing/trust-band` with tabs for each surface.
11. Dr. Fadi consent-capture workflow UI (Steve initiates; Dr. Fadi signs; Steve uploads signed doc).
12. Public rendering component `components/home/TrustBandSection.tsx` (new, added between hero and next existing section).
13. Seed the starting regulatory paragraph, clinician card, and four trust chips into the database (subject to Dr. Fadi's consent and Steve's approval flows actually completing before `active = true` is set).
14. Mobile responsive verification at 360px and 414px viewports.
15. Visual regression test confirming no impact on existing sections.
16. SOC 2 collector extension for Trust Band activity (feeds into #122 / canonical #138 packets).
17. End-to-end tests.
18. Marshall self-scan of PR.

### Gate 3 — Review

- §3 visual non-disruption verified by diff inspection.
- All Trust Band content passes Marshall pre-check.
- Dr. Fadi's consent is on file and matches the credential line that ships.
- Testimonials table is empty at ship time (no seeded testimonials).
- Check constraints on activation enforced at database layer — verified by inserting test rows violating constraints.
- Scale-chip auto-deactivation test passes (simulate measured value dropping below threshold; chip deactivates).
- Consent revocation test passes (simulate revocation; testimonial deactivates within 24 hours).
- All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()` for all display.
- Desktop + mobile parity.
- No "Vitality Score" / "5–27×" / "Semaglutide" references except in guardrail checks.
- No CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy references.
- `package.json`, email templates, applied migrations, design tokens, brand colors, typography all untouched.

### Gate 4 — Audit / TDD

- ≥90% coverage on `lib/marketing/trustband/*`.
- Visual regression test confirms no pixel diff in sections above or below the Trust Band.
- Activation-gate test: row with `active = true` but missing approval cannot insert.
- Unique active regulatory paragraph test: second row with `active = true` rejected.
- Consent revocation flow test: revoke → 24 hours → deactivation.
- Scale-measurement test: measured value drops below threshold → chip auto-deactivated → audit event logged.
- Marshall pre-check integration test: regulatory paragraph naming "FDA approved" rejected with finding.
- Testimonial dual-approval test: row without `legal_counsel_review_at` cannot activate.
- Typicality-disclosure constraint test: atypical testimonial without disclosure text rejected at insert.
- Public read visibility test: anon visitor sees only `active = true` rows.
- Marshall self-scan: zero P0 findings.

---

## 10. File Manifest

**New files (create):**

```
supabase/migrations/20260424_trust_band.sql

lib/marketing/trustband/types.ts
lib/marketing/trustband/activation.ts
lib/marketing/trustband/scaleRefresh.ts
lib/marketing/trustband/consentRevocation.ts
lib/marketing/trustband/precheck.ts

app/api/marketing/trust-band/regulatory/route.ts
app/api/marketing/trust-band/regulatory/[id]/activate/route.ts
app/api/marketing/trust-band/regulatory/[id]/archive/route.ts
app/api/marketing/trust-band/clinicians/route.ts
app/api/marketing/trust-band/clinicians/[id]/activate/route.ts
app/api/marketing/trust-band/clinicians/[id]/consent-upload/route.ts
app/api/marketing/trust-band/chips/route.ts
app/api/marketing/trust-band/chips/[id]/activate/route.ts
app/api/marketing/trust-band/testimonials/route.ts
app/api/marketing/trust-band/testimonials/[id]/activate/route.ts
app/api/marketing/trust-band/testimonials/[id]/revoke-consent/route.ts
app/api/marketing/trust-band/scale-refresh/route.ts

components/marketing-admin/TrustBandDashboard.tsx
components/marketing-admin/RegulatoryParagraphEditor.tsx
components/marketing-admin/ClinicianCardEditor.tsx
components/marketing-admin/ClinicianConsentCapture.tsx
components/marketing-admin/TrustChipEditor.tsx
components/marketing-admin/TestimonialEditor.tsx
components/marketing-admin/ConsentRevocationAction.tsx
components/marketing-admin/LegalCounselReviewPanel.tsx
components/marketing-admin/ScaleMeasurementHistory.tsx

components/home/TrustBandSection.tsx
components/home/RegulatoryParagraph.tsx
components/home/ClinicianCard.tsx
components/home/TrustChipGrid.tsx
components/home/TrustChip.tsx
components/home/TestimonialCarousel.tsx   (renders nothing while testimonials table is empty)
components/home/MaterialConnectionDisclosure.tsx
components/home/TypicalityDisclosure.tsx

supabase/seeds/trust_band_starting_content_seed.sql
   (paragraph draft + clinician card draft + four chip drafts; none active until approvals complete)

tests/marketing/trustband/**/*.test.ts
tests/e2e/trust_band_activation_gate.test.ts
tests/e2e/trust_band_consent_revocation.test.ts
tests/e2e/trust_band_scale_auto_deactivation.test.ts
tests/e2e/trust_band_marshall_precheck.test.ts
tests/visual-regression/trust_band_no_sibling_drift.test.ts
```

**Modified files (surgical edits only):**

```
compliance/rules/marketing.ts                    (add two new rule registrations per §7.3)
lib/marketing/variants/precheck.ts               (expose the pre-check wrapper for reuse)
app/(home)/page.tsx                              (insert <TrustBandSection /> between hero and next section, no other changes)
app/(admin)/admin/marketing/page.tsx             (add Trust Band nav entry)
lib/soc2/collectors/marketing-copy-activity.ts   (extend to include trust band events)
```

**Explicitly NOT modified (DO NOT TOUCH):**

- Hero component (that's #138's territory).
- `tailwind.config.js` — no design token changes.
- Existing homepage sections other than insertion point.
- Brand color constants.
- Typography configuration.
- `package.json`.
- Supabase email templates.
- Any previously-applied migration.

---

## 11. Acceptance Criteria

- ✅ Migration applies cleanly. RLS enabled on every new table. Activation check constraints verified.
- ✅ Dr. Fadi Dagher's written consent is on file, stored in `trust-band-consents` bucket, referenced by the clinician card row.
- ✅ Clinician card's credential line matches Dr. Fadi's written approval exactly.
- ✅ Regulatory paragraph passes Marshall pre-check with zero P0 findings.
- ✅ Four starting trust chips pass Marshall pre-check.
- ✅ Testimonials table is empty at ship (infrastructure present; no content).
- ✅ Scale-chip auto-deactivation logic works — verified by integration test.
- ✅ Consent revocation triggers deactivation within 24 hours — verified by integration test.
- ✅ Unique-active constraint on regulatory paragraph — verified by test.
- ✅ Trust Band renders between hero and next existing section without modifying either — verified by visual regression test.
- ✅ Mobile rendering verified at 360px and 414px viewports.
- ✅ All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- ✅ No "Vitality Score" / "Wellness Score" / "5–27×" / "Semaglutide" references except in guardrail checks.
- ✅ No CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy references.
- ✅ Hero section and sections below the Trust Band are untouched — verified by pixel diff.
- ✅ `package.json`, email templates, applied migrations, design tokens untouched.
- ✅ `marshall-lint` self-scan produces zero P0 findings.
- ✅ OBRA Gate 1–4 summary in PR description.

---

## 12. Rollout Plan

**Phase A — Infrastructure + Consent Capture (Days 1–7)**

- Migration applied. RLS verified. Admin UI accessible.
- Dr. Fadi's consent conversation initiated by Steve. Consent captured, signed, uploaded.
- Regulatory paragraph drafted, Marshall-pre-checked, reviewed by Steve.
- Four trust chips drafted, Marshall-pre-checked, reviewed by Steve.
- No Trust Band rendered on the homepage yet (all rows `active = false`).

**Phase B — Clinician Card Activation (Days 8–10)**

- Clinician card approved by Steve.
- Photography decision made (use photo vs. typographic initial).
- If photo: license documentation stored, consent for photo use confirmed separately.
- Clinician card row activated.

**Phase C — Full Band Activation (Days 11–14)**

- Regulatory paragraph activated.
- Four chips activated in approved display order.
- Trust Band becomes visible on the homepage.
- Mobile and desktop verified live.
- Initial impression tracking inherited from #138's infrastructure.

**Phase D — Steady State (Day 15+)**

- Marketing can propose new chips, revised paragraphs, or additional clinician cards via admin UI.
- Each proposal flows through the full lifecycle (draft → substantiation → pre-check → approval → activation).
- Nightly scale-refresh job runs even though no scale chips are active — infrastructure warms up.
- Legal counsel review cadence established for any testimonial candidates that arrive.

**Kill-Switches**

- Per-row `active` toggle in admin UI for surgical rollback.
- Environment flag `TRUST_BAND_ENABLED`: `true` (default) / `false` (hides the entire band regardless of row activation state). Setting `false` requires Steve + Gary dual approval; audit-logged.

---

## 13. Conversion Stack Sibling Coordination

This is the second of five conversion-stack siblings. Coordination with other siblings:

- **#138 Hero Rewrite (shipped)** — the Trust Band sits immediately below the hero. The hero's variant-test framing and the Trust Band's single-copy-set model are deliberately different: hero tests framings; Trust Band stabilizes trust signals. Mixing the two patterns would dilute both.
- **#140 Sample Protocol Walkthrough ("Sarah" Scenario)** — the Sarah scenario sits below the Trust Band. The Trust Band's regulatory posture paragraph primes the visitor to accept that the Sarah walkthrough represents a real clinical workflow; without the Trust Band's priming, the Sarah scenario reads as advertising.
- **#141 Outcome Visualization & 30/60/90 Future-State** — the outcome section sits below the Sarah scenario. The Trust Band's "grounded in published research" phrase is the substantiation backbone for the outcome section's claims; #141's copy must respect what the Trust Band has already said.
- **#142 Supplement Upload Diagnostic & Fix** — bug fix, unrelated to the Trust Band's content. Independent work stream.

Each sibling reuses #138's `'marketing_copy'` surface, the `MARSHALL.MARKETING.*` rule namespace, and the lifecycle gate pattern. No sibling reimplements these primitives.

---

## 14. Document Control

| Field | Value |
|---|---|
| Prompt number | 138c |
| Title | Trust Band + Team Introduction |
| Conversion-stack position | Second of five (#138, #138c, #140, #141, #142) |
| Format | Hybrid (copy + IA + implementation + Marshall integration + testimonial pipeline) |
| Visual non-disruption | §3 extends #138 §3's guarantee to new Trust Band primitives |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Originating analysis | Executive product review (April 24, 2026) critique 3 |
| Reuses from #138 | `'marketing_copy'` Surface enum value; `MARSHALL.MARKETING.*` rule namespace; pre-check pipeline; check-constraint activation pattern |
| New Marshall rules | `MARSHALL.MARKETING.ENDORSER_CONSENT_REQUIRED` (P0), `MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING` (P1) |
| New tables | 6 (regulatory_paragraphs, clinician_cards, chips, testimonials, scale_measurements, events) |
| New storage bucket | `trust-band-consents` (private, admin-only) |
| Testimonials at ship | Zero (pipeline present; content deferred) |
| Successor / sibling prompts | #140 (Sarah Scenario), #141 (Outcome Visualization), #142 (Supplement Upload Fix); successor if advisory board forms |
| Successor content | Added per §5 slot structure; testimonials added per §6 pipeline; no re-prompting required |

---

## 15. Acknowledgment

By memorializing this prompt in the Prompt Library, Gary establishes:

- **The Trust Band as a new homepage section** sitting between the hero and the next existing section, with no modifications to either.
- **Dr. Fadi Dagher as the single named clinician on the band**, with his written consent on file before the clinician card activates.
- **The starting regulatory posture paragraph** naming FTC Endorsement Guide standards, DSHEA supplement-label conventions, and HIPAA Security Rule safeguards — each substantiable against the compliance stack.
- **Four starting trust chips** (Medically Directed / FTC-Compliant Claims / HIPAA-Grade Privacy / Research-Grounded Protocols) subject to Marshall pre-check and Steve approval before activation.
- **The testimonial pipeline specified in §6 but shipping empty** — no testimonials are activated under this prompt. Future testimonials pass through the FTC-compliant pipeline with dual Steve + legal counsel approval.
- **The scale-claim infrastructure (§6.4) ready for future chips** but with no active scale claims at ship.
- **The consent-revocation workflow as a 24-hour automatic-deactivation path**, non-negotiable.

Steve Rica retains final approval authority on every Trust Band element prior to activation. Legal counsel is the second approver for testimonials and for any content that triggers `MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING`. Steve or legal counsel may revoke approval at any time, which immediately deactivates the affected content.

Steve is not surfaced by name on the Trust Band itself; his role is internal reviewer and approver of the copy. If a future decision is made to name Steve (or any other compliance officer, advisory board, etc.) on the marketing surface, that decision is a separate prompt with its own risk calculus.

No new homepage sections beyond the Trust Band are introduced by this prompt — those are the scope of sibling conversion-stack prompts #140 and #141.

---

## Memorialization note

This prompt is authored as **Prompt #138c** and memorialized in the library at `docs/prompts/prompt-138c-trust-band-team-introduction.md`. No renumbering required: the `#138c` slot was unclaimed in both git history and the prompt library at the time of memorialization.

**Cross-reference notes (important for future readers):**

- The spec's references to **"#138 Hero Rewrite (shipped)"** point to the conversion-stack hero spec memorialized in the library at `docs/prompts/prompt-138a-homepage-hero-rewrite.md`. The `#138a` filename in the library reflects an earlier renumber that resolved a collision with `prompt-138-multi-framework-evidence-architecture.md` (which holds the integer `#138` slot via prior memorialization). Gary's current canonical labeling treats the Hero Rewrite as `#138` for conversion-stack purposes; the library filename retains `#138a` for git-history continuity.
- The spec's parent reference to **"#138b (Dependabot Triage and Merge Policy — unrelated governance branch)"** points to a governance prompt Gary maintains in his canonical Standing Rule #4 chain (per the recent `feedback_external_repo_governance.md` memory update enumerating "Dependabot triage per #138b"). That prompt is **not yet memorialized in this library** (`docs/prompts/`) — when it arrives, it will be filed at `prompt-138b-*.md`.
- The spec's references to **"#127 / canonical #138"** for the compliance-stack Multi-Framework Evidence Architecture point to `docs/prompts/prompt-138-multi-framework-evidence-architecture.md` in the library (originally drafted as `#127`, renumbered to `#138` to resolve a separate collision). Gary's "X / canonical Y" notation is preserved verbatim because it correctly captures the renumbering history.
- The spec's references to **"#122 / canonical #138"** are similar shorthand bridging the original SOC 2 Exporter compliance-chain number (`#122`) with the canonical Multi-Framework slot. The SOC 2 Exporter was shipped as code commits and is not standalone-memorialized in `docs/prompts/`.

**Conversion-stack roster** per Gary's current canonical labeling (§14 of this spec):

| Position | Canonical # | Library file | Status |
|---|---|---|---|
| 1 | #138 | `prompt-138a-homepage-hero-rewrite.md` | memorialized |
| 2 | **#138c** | **`prompt-138c-trust-band-team-introduction.md`** | **this commit** |
| 3 | #140 | `prompt-140-*.md` | reserved |
| 4 | #141 | `prompt-141-*.md` | reserved |
| 5 | #142 | `prompt-142-*.md` | reserved |

This roster supersedes the `#138a`–`#138e` mapping I proposed in a previous turn. Gary's authoring at `#138c` is now canonical for this prompt; the prior `#138b`/`#138d`/`#138e` slot reservations from that earlier turn are released.

**Implementation status:** this spec is memorialized at authoring time. Execution flows through the concurrent Claude Code engineering session per the established pattern. The visual non-disruption guarantee in §3 (inherited from `#138` §3) is the load-bearing constraint for that execution: any change to design tokens, brand colors, typography, imagery, or component shapes is out-of-scope and would require a separate prompt.

This memorialization session produces only the authoritative policy/spec artifact and does not touch `lib/marketing/trustband/**`, the new migration, API routes, UI components, or tests.
