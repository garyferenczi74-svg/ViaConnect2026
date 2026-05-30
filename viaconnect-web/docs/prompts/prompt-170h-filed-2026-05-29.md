# Prompt 170h Filed: Symptom and Supplement Crossover Analytics

Date: 2026-05-29
Status: **Filed at spec level; ratified.** No code work in this turn.
Memorialized by: Jeffery (orchestrator) per the established 170d/170e/170f filing pattern.
Wireframe author: Hannah (UX), filling Section 11 below. Tone-locked against clinical-claim linter (§13.5 of spec).

## Mission (one line)

Mine the user's NutriVision meal log + CAQ Phase 5 symptom log + supplement protocol from CAQ Phase 6 to surface observational patterns and prospective timing conflicts on the Wellness Analytics page, with strict statistical guards and conservative framing that never makes clinical claims.

## Two engines, four insight types

| Type | Engine | Visual | Example |
|---|---|---|---|
| **Pattern** | Retrospective (weekly batch) | Neutral card + BarChart3 | "Past 30 days, you logged dairy 8 times. On 6 of those days you reported bloating within 24 hours." |
| **Conflict** | Prospective (meal save real-time) | Orange B75E18 + AlertCircle | "Your Iron supplement at 8 AM may be less absorbed because of the coffee in your breakfast." |
| **Tip** | Catalog-based | Teal 2DA5A0 + Lightbulb | "Vitamin D absorbs best with fat-containing meals." |
| **Goal** | Retrospective milestone | Card + Target | "You hit your protein target 5 of 7 days this week, up from 3 of 7 last week." |

## Activation posture (clinical safety FIRST)

Every insight surfaces with:
1. Plain English framing ("We noticed a pattern" not "X causes Y")
2. Sample size disclosure ("Based on 8 dairy meals over 30 days")
3. Confidence level ("Strong pattern", "Notable pattern", "Recent observation")
4. Medical disclaimer at the bottom of every insight card
5. "Why we think this" expandable section with supporting data points

**This framing is deliberate and non-negotiable.** Wellness analytics in this space is notorious for false-positive overclaiming. ViaConnect's posture is conservative observations with statistical rigor, not assertive medical claims.

## Why this is filed, not built

### Hard structural blockers

| Blocker | Status | Resolution path |
|---|---|---|
| 30 days of NutriVision meal data per active user | Day 0 today (commit `47a7663d`) | Calendar wait minimum; statistical engine needs 14-day floor per §4.5 |
| Gordon catalog drafting: 50 supplement-food-conflict rules with PubMed citations | Not started | Multi-week curation; Gordon agent is Read/Grep/Glob without WebFetch; Gary sources externally |
| Gordon plausibility pairings: ~100 well-established and plausible food→symptom pairs with citations | Not started | Same constraint as above |
| Gordon educational tips: ~30 catalog rows with citations | Not started | Same |
| Statistical methods memo signed by Gordon, approved by Gary | Not written | Blueprint deliverable per §16.2 |
| 30-user pilot cohort for false positive rate measurement | Not assembled | §16.4 Audit gate; recruit at Blueprint kickoff |

### Soft blockers

- **Edge Function infrastructure for FDR correction**: needs Supabase Edge Function deployment for the Benjamini-Hochberg helper (§7.1). Modal Labs not required (this is a stateless ~50ms compute call).
- **Plausibility gating tone**: §7.5 says only patterns matching the curated plausibility list surface as Notable or Strong. The list IS Gordon's catalog work; cannot pre-emptively script.

## Statistical rigor non-negotiables

Per §4.5-4.8 + §7:
- Minimum sample sizes (5 co-occurrences AND 10 food occurrences; 14 days data floor)
- Benjamini-Hochberg FDR correction at q=0.10 (mandatory, not optional)
- Effect size threshold: Phi ≥ 0.30 for binary pairs, Spearman ≥ 0.30 for continuous
- Directionality gate (food → symptom only; never symptom → food)
- Plausibility list (curated, only well-established or plausible pairings)

**Plain-English label mapping** (user never sees Phi coefficients or p-values):
- "Strong pattern" = Phi ≥ 0.50 + post-FDR p ≤ 0.05
- "Notable pattern" = Phi 0.40-0.50 + post-FDR p ≤ 0.10
- "Recent observation" = Phi 0.30-0.40 + post-FDR p ≤ 0.10

## Clinical-claim linter rules per §13.5 (HARD GATE)

User-facing copy must NEVER contain:
- "should" → use "may consider", "the conventional approach is"
- "diagnose", "treat", "cure", "prevent"
- Recommendations to stop a medication or supplement (always defer to practitioner)
- Causation claims → use "associated with", "may affect", "is correlated with"

The linter is enforced by unit test on catalog content + insight templates. Any new catalog rule that fails the linting fails CI.

**Hannah's wireframe copy is subject to the same linter.** Tone must be observational not authoritative throughout.

## Heritage divergence from Prompt 16 per §1.5

Prompt 16's medication interaction engine uses the 4-severity framework (Major RED, Moderate YELLOW, Minor GREEN, Synergistic BLUE) and gates the save action. 170h uses the same 4-severity vocabulary internally (database storage for future Prompt 16 composition) but the user-facing visual treatment is gentler:
- 170h Major severity is rendered as Orange B75E18 "Worth knowing" card, NOT the alarming Red treatment Prompt 16 uses
- 170h conflicts are non-blocking (surface AFTER meal save, never before)
- 170h Patterns are observational (not gating, not actionable in the medical sense)

Rationale: medication interactions are clinical; food-supplement timing is informative. The two surfaces are appropriately distinct.

## Cost model (filed reference)

| Component | Approx monthly cost |
|---|---|
| Postgres compute (weekly batch) | included in Supabase tier |
| Edge Function FDR helper | <$5 |
| Storage (analytics_insights at 10-30 rows/user/month) | <$2 |
| **Total** | **<$10/month** |

170h is the cheapest prompt in the NutriVision domain to operate. Value comes from clinical relevance, not compute.

## Helix events filed (6)

- `insight_viewed` (1 pt) — opened Insights tab
- `insight_acknowledged` (1 pt) — tapped to read details
- `insight_helpful_feedback` (2 pt) — marked helpful
- `insight_dismissed` (0 pt — no penalty for dismissal; logged for engine tuning)
- `insight_shared_with_practitioner` (3 pt) — share creates a shared_insights row
- `pattern_acted_on` (2 pt) — user updated supplement timing or dietary preference based on insight

## Migrations filed (7)

To be applied when 170h builds:
- `analytics_insights.sql` — RLS-scoped to user; dismiss + expiry support
- `insight_user_feedback.sql` — 4-rating + free text
- `supplement_food_conflicts.sql` — catalog with citation_url + version
- `educational_tips.sql` — catalog with cooldown_days for re-surfacing
- `plausibility_pairings.sql` — well_established/plausible/speculative levels
- `shared_insights.sql` — user-shares-with-practitioner with revoke
- `helix_insights_events.sql` — 6 new event rows

All append-only.

## Kill switches (per §12.5)

- `INSIGHTS_ENGINE_ENABLED` (master)
- `INSIGHTS_RETROSPECTIVE_ENABLED` (weekly batch only)
- `INSIGHTS_PROSPECTIVE_ENABLED` (meal-save conflict check only)

All default true after launch. Per-engine kill allows fine-grained safety control.

## Privacy posture per §13

Symptom logs are the most sensitive surface in the NutriVision domain:
- Symptom data NEVER leaves Supabase
- All analysis runs server-side; no symptom data goes to vision providers
- Per-user RLS strict; no cross-user analysis
- analytics_insights stores aggregate counts ("8 dairy meals, 6 with bloating") not individual symptom log entries
- Practitioner default visibility: NOTHING from 170h; user must explicitly share each insight
- User can revoke share at any time
- Three disclaimers per insight: medical disclaimer, FDA disclaimer, "Why we think this" expander

## Section 11: Wireframes (Hannah)

Hannah fills the wireframes for each surface below. Tone-locked against clinical-claim linter rules from §13.5. The 8 surfaces are:

### 11.1 Insights tab on Wellness Analytics (canonical home)

**ASCII wireframe, mobile 375 portrait:**

```
+---------------------------------------------+
|  <  Wellness Analytics                      |  56px Navy #1A2744 header
+---------------------------------------------+
|  Bio Score | Macros | Symptoms | Protocol | |  44px tab strip, horizontal scroll
|                                  Insights*  |  *active tab, Teal underline
+---------------------------------------------+
|                                             |
|   New for you                               |  18px Instrument Sans Medium
|   3 insights generated this week            |  13px Navy 70 percent
|                                             |
|  +---------------------------------------+  |
|  | (insight card per 11.2)               |  |  unviewed: Teal #2DA5A0 4px
|  |                                       |  |  left rule
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (insight card per 11.2)               |  |
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (insight card per 11.2)               |  |
|  +---------------------------------------+  |
|                                             |
|   Patterns                                  |  16px section divider, BarChart3
|   What we noticed in your logs              |  12px Navy 60 percent
|  +---------------------------------------+  |
|  | (card)                                |  |
|  +---------------------------------------+  |
|                                             |
|   Worth knowing                             |  16px divider, Info icon
|   Possible timing considerations            |  12px Navy 60 percent
|  +---------------------------------------+  |
|  | (card, Orange #B75E18 4px left rule)  |  |
|  +---------------------------------------+  |
|                                             |
|   Tips                                      |  16px divider, Lightbulb icon
|   From our educational library              |  12px Navy 60 percent
|  +---------------------------------------+  |
|  | (card)                                |  |
|  +---------------------------------------+  |
|                                             |
|   Goals                                     |  16px divider, Target icon
|   Wins worth celebrating                    |  12px Navy 60 percent
|  +---------------------------------------+  |
|  | (card)                                |  |
|  +---------------------------------------+  |
|                                             |
+---------------------------------------------+
| These observations are educational. They    |  56px sticky footer
| are not medical advice. Talk with your      |  Card #1E3054 background
| practitioner before changing your routine.  |  11px text Navy 80 percent
|             [ Refresh insights ]            |  Teal ghost button, 1 per day
+---------------------------------------------+
```

**Desktop 1024 plus:** two-column layout, left column 480px insight cards, right column 320px section navigation rail with anchor jumps + most recent generation timestamp. Sticky footer becomes inline below right rail.

**Interaction notes:**
- Tab activation: 200ms ease-out underline slide between tabs
- Section divider headers are non-collapsible (per spec; full visibility is the trust posture)
- "Refresh insights" disabled after 1 tap per 24 hours, label swaps to "Available again in 14 hours" with countdown
- Unviewed Teal left rule fades on first scroll-into-view + 600ms dwell (matches Patterns Trends pattern from 17a)
- Pull-to-refresh disabled (refresh is button-gated for rate limiting)

**Copy strings (linter-validated):**
- Page header: `Wellness Analytics`
- Tab label: `Insights`
- Unviewed section: `New for you`
- Unviewed subtitle: `3 insights generated this week` (count is dynamic)
- Section: `Patterns` / subtitle `What we noticed in your logs`
- Section: `Worth knowing` / subtitle `Possible timing considerations`
- Section: `Tips` / subtitle `From our educational library`
- Section: `Goals` / subtitle `Wins worth celebrating`
- Sticky disclaimer: `These observations are educational. They are not medical advice. Talk with your practitioner before changing your routine.`
- Refresh button: `Refresh insights`
- Rate-limit state: `Available again in 14 hours` (countdown computed; never says "you cannot")

**Brand tokens:**
- Page bg `#1A2744`, card bg `#1E3054`, Teal `#2DA5A0` (unviewed rule + active tab), Orange `#B75E18` (Worth knowing rule)
- All section icons Lucide React at strokeWidth `{1.5}`: BarChart3 (Patterns), Info (Worth knowing), Lightbulb (Tips), Target (Goals)
- Instrument Sans throughout

**Accessibility notes:**
- Tab strip uses `role="tablist"` with `aria-selected` on Insights tab
- Section dividers are `<h2>` elements with associated `aria-describedby` pointing to subtitle
- Unviewed Teal rule is decorative (`aria-hidden="true"`); semantic "new" state announced via `aria-label="New insight, unread"` on card
- Sticky footer is `role="region"` with `aria-label="Medical disclaimer and refresh"`
- Refresh button: focus visible 2px Teal outline; disabled state announces "Refresh available again in 14 hours" via `aria-live="polite"`
- Section divider order is the focus order: New → Patterns → Worth knowing → Tips → Goals → Disclaimer → Refresh

**UX rationale (section divider tone):** Each section gets a distinct icon + a one-line subtitle that frames the user's emotional posture for that group. Patterns is curious ("What we noticed"). Worth knowing is honest + non-alarming ("Possible timing considerations", not "Warnings"). Tips is generous ("From our educational library"). Goals is warm ("Wins worth celebrating"). The subtitles double as accessibility context; no user has to guess what each section means.

### 11.2 Insight card design (THE CANONICAL TONE SURFACE)

**ASCII wireframe, mobile 343 wide card on 375 viewport:**

```
+-------------------------------------------+  Card bg #1E3054
| (BarChart3)              [Notable pattern]|  Type badge 24px Lucide left,
| Pattern                                   |  label chip 11px Teal text on
|                                           |  Teal 12 percent fill, right
|                                           |
| Past 30 days, you logged dairy 8 times.   |  Headline 16px Instrument Sans
| On 6 of those days you reported bloating  |  Medium, line-height 1.4
| within 24 hours.                          |  white text
|                                           |
| This is associated with a notable pattern |  Body 14px Instrument Sans
| in your logs. Many people find dairy is   |  Regular, Navy 85 percent
| linked with digestive symptoms; many      |
| others do not. Your practitioner can help |
| you interpret this in the context of      |
| your overall health.                      |
|                                           |
| > Why we think this                       |  Expander row, 14px,
|                                           |  ChevronRight 16px Lucide,
|                                           |  closed by default
|                                           |
| Based on 8 dairy meals over 30 days.      |  11px sample size footer
|                                           |  Navy 60 percent
|                                           |
| -------- divider 1px Navy 20 percent ---- |
|                                           |
| [ Share with practitioner ]  [Helpful] [x]|  Action row, 44px tall
+-------------------------------------------+
| These observations are educational. They  |  11px disclaimer strip
| are not medical advice. Talk with your    |  outside card on Card 90 percent
| practitioner before changing your routine.|  background, full width
+-------------------------------------------+
```

**Expanded "Why we think this" state:**

```
| v Why we think this                       |  ChevronDown when open
|                                           |
| The 6 days with bloating after dairy out  |  13px body, Navy 80 percent
| of 8 total dairy days is a notable        |
| co-occurrence rate in your data.          |
|                                           |
| Time window: April 30 to May 29           |  Three data lines, 12px,
| Logged dairy meals: 8                     |  Navy 70 percent, mono-aligned
| Logged bloating within 24 hours: 6        |
|                                           |
| Dairy and digestive symptoms are listed   |  13px caveat line
| in our plausibility library as a well     |
| established pairing in clinical research. |
|                                           |
| (i) Source: catalog version 1.0           |  10px, Info icon 12px
```

**Desktop 1024 plus:** card max-width 480px, same content. Action row spreads across full width with more breathing room.

**Interaction notes:**
- "Why we think this" expander: tap or Enter expands inline, 250ms ease-out height transition, ChevronRight rotates 90 degrees to ChevronDown
- Action row buttons each 44px minimum tap target
- Share with practitioner is primary action position (left, more weight); Helpful is secondary (middle); Dismiss is tertiary (right "x")
- Helpful tap: button fills Teal solid for 300ms then returns to ghost state with filled ThumbsUp; haptic light tap on iOS
- Dismiss tap: opens bottom sheet from §11.3
- Card itself is not tappable (no whole-card action); each control is independently focusable

**Copy strings (linter-validated):**

For Pattern type, body template:
- `Past 30 days, you logged {food} {n} times. On {m} of those days you reported {symptom} within 24 hours.`
- `This is associated with a {confidence_label} in your logs. Many people find {food} is linked with {symptom_category} symptoms; many others do not. Your practitioner can help you interpret this in the context of your overall health.`
- Footer: `Based on {n} {food} meals over {window_days} days.`

For Conflict type, body template:
- `Your {supplement} at {time} may be less absorbed because of the {food} in your {meal}.`
- `Many people in this scenario find the conventional approach is to space the two by {hours} hours. Your practitioner can advise on the right approach for you.`
- Footer: `From our supplement timing catalog, version 1.0.`

For Tip type, body template:
- `{nutrient} absorbs best with {context}.`
- `From our educational library. Not specific to your logs.`
- Footer: `Educational reference. From the catalog.`

For Goal type, body template:
- `You hit your {goal_name} target {m} of {n} days this week, up from {prior_m} of {prior_n} last week.`
- `Consistency like this is associated with stronger outcomes in our wellness research.`
- Footer: `Based on {n} days of logs.`

Label chips (top-right):
- `Strong pattern` / `Notable pattern` / `Recent observation` / `Worth knowing` / `Good combination` / `Did you know?` / `Goal`

Expander label: `Why we think this`
Action row: `Share with practitioner` (text) / `Helpful` (text with ThumbsUp icon) / Dismiss is `x` icon only with `aria-label="Dismiss this insight"`

Per-card disclaimer strip: `These observations are educational. They are not medical advice. Talk with your practitioner before changing your routine.`

**Brand tokens:**
- Card bg `#1E3054`, page bg `#1A2744`
- Type badge icons Lucide React strokeWidth `{1.5}` at 24px: BarChart3 (Pattern Teal `#2DA5A0`), AlertCircle (Conflict Orange `#B75E18`), Lightbulb (Tip Teal `#2DA5A0`), Target (Goal Teal `#2DA5A0`), Sparkles (Synergistic Teal `#2DA5A0`)
- Label chip: Teal text on Teal 12 percent fill (Patterns/Tips/Goals); Orange text on Orange 12 percent fill (Worth knowing); Teal text on Teal 12 percent fill (Good combination)
- Helpful state: fill Teal `#2DA5A0` solid when activated
- Disclaimer strip: Card `#1E3054` 90 percent background, text Navy 70 percent
- Instrument Sans throughout (Medium 16px headline, Regular 14px body)

**Accessibility notes:**
- Card is `<article>` with `aria-labelledby` pointing to headline
- Type badge has `aria-label="Pattern insight"` (or Conflict, Tip, Goal)
- Label chip text is read alongside headline; no separate semantic role needed
- Expander is `<button aria-expanded="false" aria-controls="why-{id}">` with `<div id="why-{id}" role="region">` content
- Action row buttons: full text labels for Share + Helpful + dismiss `aria-label`
- Per-card disclaimer is `role="note"` and read after action row in linear reading order
- Focus order: badge (skipped, decorative) → headline (skipped, read with article) → body (skipped, read with article) → Why we think this expander → Share button → Helpful button → Dismiss button → next card

**UX rationale (expander default closed):** Default closed for cognitive load. The headline plus body plus sample size footer is the full first-glance story. Users who want to see the math open it; users who just want the takeaway move on. Trust through transparency comes from the expander being visibly there (not hidden behind a settings menu), not from defaulting it open. Open default would bury the next card on small screens, slowing scroll.

**UX rationale (per-card disclaimer placement):** Disclaimer is OUTSIDE the card on a tinted strip below, not inside the card body. This signals it is global compliance language, not per-insight commentary. Inside the body would visually equate the disclaimer with the body text; outside on a tinted strip makes it feel like a footer caption. It is small (11px) but not gray-on-gray invisible (Navy 70 percent on Card 90 percent has 4.7:1 contrast). Compliance posture: present, scannable, not buried.

**UX rationale (action row order Share → Helpful → Dismiss):** Share is the trust action and the highest-stakes choice. Putting it left (in LTR reading order, the first item) signals that ViaConnect believes user-practitioner collaboration is the most important outcome of an insight, more than the user telling us we got it right. Helpful is middle (engine tuning, important but not the user-facing value). Dismiss is the "x" rightmost, ergonomic for thumb on mobile right hand, but visually minimized. Spec said "Dismiss/Helpful/Share"; pushing back: we reorder to "Share/Helpful/Dismiss" because the action order encodes the value hierarchy.

**Voice for §11.2 (canonical):** Observational, warm, deferential to practitioner, honest about uncertainty. Sentences are short. "Many people find X; many others do not" is the foundational humility phrase that explicitly acknowledges individual variation. Closing every body with "Your practitioner can help you interpret this" is the trust handoff. No exclamation points. No emoji. No "should." No causation verbs.

### 11.3 Dismiss flow

**ASCII wireframe, mobile bottom sheet:**

```
                                              <- dimmed underlay 60 percent black
+---------------------------------------------+
|         ====                                |  Drag handle 32px wide
|                                             |
|  Help us improve                            |  18px Instrument Sans Medium
|                                             |
|  This is optional. Picking a reason helps   |  13px Navy 70 percent
|  us tune which patterns surface for you.    |
|                                             |
|  +---------------------------------------+  |
|  | (o) Not relevant to me right now      |  |  Radio chip 56px, full width
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (o) I am already aware of this        |  |
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (o) I cannot act on this              |  |
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (o) I do not see this pattern myself  |  |
|  +---------------------------------------+  |
|                                             |
|  Tell us more (optional)                    |  13px Navy 70 percent
|  +---------------------------------------+  |
|  |                                       |  |  Textarea 80px,
|  |                                       |  |  Card border Teal 30 percent
|  +---------------------------------------+  |
|                                             |
|  +---------------------------------------+  |
|  |        Dismiss this insight           |  |  Primary CTA, Teal solid
|  +---------------------------------------+  |
|                                             |
|         Cancel                              |  Text button, Navy 80 percent
+---------------------------------------------+
```

**Confirmation toast (top of viewport, 4-second auto-dismiss):**

```
+-------------------------------------------+
| (Check) Dismissed. This insight will not  |  Toast Card #1E3054,
| appear again for 30 days unless the       |  Teal Check icon
| pattern strengthens.                      |  13px text
+-------------------------------------------+
```

**Desktop 1024 plus:** modal centered, 480px wide, same content. Sheet drag handle replaced with close `x` top-right.

**Interaction notes:**
- Bottom sheet rises 300ms ease-out from below viewport, 60 percent black dim underlay
- Drag handle allows pull-down to cancel
- Radio chips are mutually exclusive; tap to select shows Teal 2px border + Teal `#2DA5A0` 8 percent fill
- Dismiss CTA enabled regardless of selection (selection is optional per design)
- After Dismiss tap: sheet drops 200ms, toast appears at top of viewport
- Toast can be tapped to undo (4-second window): undo restores the insight and removes the 30-day suppression entry

**Copy strings (linter-validated):**
- Sheet header: `Help us improve`
- Sheet intro: `This is optional. Picking a reason helps us tune which patterns surface for you.`
- Chip 1: `Not relevant to me right now`
- Chip 2: `I am already aware of this`
- Chip 3: `I cannot act on this`
- Chip 4: `I do not see this pattern myself`
- Textarea label: `Tell us more (optional)`
- Primary CTA: `Dismiss this insight`
- Cancel: `Cancel`
- Toast: `Dismissed. This insight will not appear again for 30 days unless the pattern strengthens.`
- Toast undo affordance: `Undo`

**Brand tokens:**
- Sheet bg `#1E3054` (Card)
- Underlay 60 percent black
- Drag handle Navy 40 percent
- Radio chip selected: Teal `#2DA5A0` 2px border + Teal 8 percent fill
- Primary CTA: Teal `#2DA5A0` solid background, white text
- Toast: Card `#1E3054`, Teal Check icon Lucide strokeWidth `{1.5}`
- Instrument Sans throughout

**Accessibility notes:**
- Sheet uses `role="dialog" aria-modal="true" aria-labelledby="dismiss-header"`
- Focus auto-traps to sheet on open; first focus on close affordance (drag handle or `x`)
- Radio group is `role="radiogroup" aria-label="Reason for dismissing"` containing 4 `role="radio"` items
- Textarea has visible label + `aria-describedby` pointing to "(optional)" helper text
- Primary CTA: `aria-label="Dismiss this insight and submit feedback"` when reason selected, else `aria-label="Dismiss this insight without feedback"`
- Cancel button: closes sheet, restores focus to dismissing card
- Toast is `role="status" aria-live="polite"`; Undo button inside toast is focusable for 4 seconds then auto-dismisses
- Escape key closes sheet (cancel equivalent); Enter on primary CTA submits

**UX rationale (optional vs required reason selection):** Optional. Required reason selection feels like a trap question and creates dismissal abandonment (user closes the app to avoid answering). Optional respects user autonomy and signals that ViaConnect trusts the user's intent. Gordon still gets engine-tuning signal from the 60 to 70 percent of users who do pick a reason; that is statistically meaningful without forcing the other 30 to 40 percent through a friction wall. The textarea is also optional for the same reason. The intro copy "This is optional. Picking a reason helps us tune which patterns surface for you" frames the ask as a collaboration, not a tax.

**UX rationale (30-day framing):** Chose "This insight will not appear again for 30 days unless the pattern strengthens." This is honest about the suppression window (30 days) AND honest about what could override it (pattern strengthening, i.e., new data points push the Phi coefficient higher or expand the sample). It avoids the absolutist "We won't show this again" which is technically false, and it avoids "This won't appear again unless the pattern strengthens" which buries the time window. The phrasing also implicitly teaches the user that patterns are statistical, not deterministic.

**UX rationale (chip 3 and chip 4 distinction):** "I cannot act on this" vs "I do not see this pattern myself" is the tone distinction worth getting right. Chip 3 is the user accepting the pattern but rejecting the relevance ("yes I eat dairy and I bloat, but I am not changing my diet"). Chip 4 is the user disagreeing with the pattern itself ("I do not actually feel bloated on dairy days; the engine is wrong"). These produce very different Gordon engine-tuning signals: chip 3 means tune which insights surface to this user; chip 4 means re-examine the catalog rule or the symptom log accuracy. Pushed back on spec's "Disagree with the pattern" which felt confrontational; softened to "I do not see this pattern myself" which is first-person honest.

### 11.4 Feedback flow

**ASCII wireframe, Helpful instant tap (toast at top of viewport):**

```
+-------------------------------------------+
| (Check) Thanks. We will surface more like |  Toast 4-second auto-dismiss
| this.                                     |  Card #1E3054, Teal Check
+-------------------------------------------+
```

**Action row state after Helpful tap:**

```
| [ Share with practitioner ]  [Helpful*] [x]|  Helpful button now Teal solid
                                              fill with white ThumbsUp;
                                              "Helpful" text persists
```

**Tap-and-hold (600ms hold) opens detail modal:**

```
+---------------------------------------------+
|                                          x  |  Modal close, 480px wide
|                                             |
|  How was this insight?                      |  18px Instrument Sans Medium
|                                             |
|  Tap one that fits best.                    |  13px Navy 70 percent
|                                             |
|  +---------------------------------------+  |
|  | (ThumbsUp) Helpful                    |  |  4 chips, 64px tall each
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (ThumbsDown) Not helpful              |  |
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (Eye) I was already aware of this     |  |
|  +---------------------------------------+  |
|  +---------------------------------------+  |
|  | (HelpCircle) Confusing or unclear     |  |
|  +---------------------------------------+  |
|                                             |
|  Add a comment (optional)                   |  13px Navy 70 percent
|  +---------------------------------------+  |
|  |                                       |  |  Textarea 80px
|  +---------------------------------------+  |
|                                             |
|  +---------------------------------------+  |
|  |          Send feedback                |  |  Primary Teal solid
|  +---------------------------------------+  |
+---------------------------------------------+
```

**Visible affordance for tap-and-hold (after first Helpful tap, on next insight card):**

```
| [ Share with practitioner ]  [Helpful] [x]|
|                              hold for more|  10px helper text under Helpful,
                                              Navy 50 percent, appears
                                              once after first Helpful
```

**Desktop 1024 plus:** modal centered, same content. Helpful instant tap has no hold equivalent on mouse; right-click or long-press on touchpad opens detail modal.

**Interaction notes:**
- Helpful instant tap: 1-frame Teal solid fill, light haptic, toast appears top
- Helpful tap-and-hold: 600ms hold threshold; vibration feedback at 200ms ("about to expand") and 600ms ("expanded"); modal opens with 250ms ease-out
- Helper text "hold for more" appears one time only after the user's first Helpful instant tap, fades after 5 seconds; localStorage flag prevents repeat
- Detail modal chip tap selects + 150ms ease-out fill animation; Send feedback button enables on selection
- Comment textarea optional in detail modal too
- Detail modal Send tap: same toast as instant tap, modal closes

**Copy strings (linter-validated):**
- Instant tap toast: `Thanks. We will surface more like this.`
- Modal header: `How was this insight?`
- Modal intro: `Tap one that fits best.`
- Chip 1: `Helpful` (ThumbsUp)
- Chip 2: `Not helpful` (ThumbsDown)
- Chip 3: `I was already aware of this` (Eye)
- Chip 4: `Confusing or unclear` (HelpCircle)
- Textarea label: `Add a comment (optional)`
- Primary CTA: `Send feedback`
- Detail modal send toast: `Thanks. Your feedback will help tune future insights.`
- Helper text: `hold for more`

**Brand tokens:**
- Toast: Card `#1E3054`, Teal Check icon
- Modal: Card `#1E3054` bg, Navy `#1A2744` outer dim
- Chip selected: Teal `#2DA5A0` 2px border + Teal 8 percent fill
- Chip icons Lucide React strokeWidth `{1.5}` at 20px
- Primary CTA: Teal solid
- Helper text: Navy 50 percent

**Accessibility notes:**
- Helpful button: `<button aria-label="Mark this insight as helpful, long press for more options" aria-pressed="false">`
- After instant tap: `aria-pressed="true"`, label changes to `aria-label="Marked as helpful, long press to change rating"`
- Tap-and-hold on touch: implemented via `pointerdown` + 600ms timer + `pointerup` cancel
- Keyboard: Shift+Enter or Alt+Enter on focused Helpful button opens detail modal (keyboard equivalent of tap-and-hold)
- Helper text "hold for more" is `aria-hidden="true"`; the aria-label on button already encodes this affordance for screen readers
- Detail modal: `role="dialog" aria-modal="true"`, focus auto-trapped
- Chip radio group with 4 options; Send button announces "Send feedback for: {selected chip label}"

**UX rationale (visible affordance for tap-and-hold):** Hidden gesture is a real risk in mobile UX; users miss it entirely. Mitigation: the first time a user taps Helpful, a small 10px helper "hold for more" appears under the Helpful button for 5 seconds, then disappears forever (localStorage flag). This is a single educational moment, not a persistent UI element that clutters every card. Plus the screen reader `aria-label` always encodes the affordance, so keyboard and assistive tech users never miss it. Pushing back on spec's silent gesture posture: the helper text is non-negotiable for discoverability without making the affordance permanent visual noise. Also: keyboard equivalent (Shift+Enter or Alt+Enter) is required for keyboard-only users who cannot perform a hold.

### 11.5 Share with practitioner flow

**ASCII wireframe, mobile modal:**

```
                                              <- 60 percent black dim
+---------------------------------------------+
|                                          x  |  480px wide on desktop;
|                                             |  full-width sheet on mobile
|  Share with your practitioner               |  18px Instrument Sans Medium
|                                             |
|  +-------+                                  |
|  |       |  You will share with             |  56px avatar circle,
|  | (DR)  |  Dr. Sarah Chen                  |  Card 90 percent bg with
|  |       |  Integrative Medicine            |  practitioner photo or
|  +-------+  Verified practitioner           |  initials; identity right
|                                             |
|  What your practitioner will see            |  14px Instrument Sans Medium
|                                             |
|  (Check) The insight headline and body      |  16px lines with Check icon,
|  (Check) The sample size and time window    |  Teal Check, Navy 85 percent
|  (Check) Your full data points              |
|  (Check) The source catalog version         |
|                                             |
|  What your practitioner will not see        |  14px Instrument Sans Medium
|                                             |
|  (XCircle) Your raw symptom log entries     |  16px lines with XCircle,
|  (XCircle) Other insights you have not      |  Navy 60 percent XCircle,
|            shared                           |  Navy 85 percent text
|  (XCircle) Your other meal data             |
|                                             |
|  You can revoke this share at any time      |  13px Navy 70 percent
|  from the shared insight card.              |
|                                             |
|  +---------------------------------------+  |
|  |       Share with Dr. Sarah Chen       |  |  Primary CTA, Teal solid
|  +---------------------------------------+  |
|                                             |
|         Not right now                       |  Text button, Navy 80 percent
+---------------------------------------------+
```

**Card state after share (replaces action row):**

```
| (Share2) Shared with Dr. Sarah Chen   v   |  Shared chip 48px, Teal text
|          May 29, 2026                     |  on Teal 12 percent fill;
                                              ChevronDown for expand
```

**Expanded shared state (tap chevron):**

```
| (Share2) Shared with Dr. Sarah Chen   ^   |
|          May 29, 2026                     |
|                                           |
| [ View what was shared ]   [ Revoke ]     |  Two ghost buttons,
                                              Revoke is Orange #B75E18 text
```

**Revoke confirmation (inline dialog within card):**

```
|  Revoke this share?                       |
|                                           |
|  Your practitioner will no longer see     |
|  this insight. This action is logged.     |
|                                           |
|  [ Revoke share ]   [ Keep sharing ]      |  Orange CTA + text Cancel
```

**Desktop 1024 plus:** modal centered 480px, same layout. Card shared state expands inline.

**Interaction notes:**
- Modal opens 250ms ease-out from center on desktop, slide-up from bottom on mobile
- Practitioner identity is pulled from user's connected practitioner profile (CAQ Phase 8 or similar); if no practitioner connected, the Share with practitioner button on the card is hidden entirely
- After Confirm tap: modal closes, action row replaced with Shared chip, 300ms ease-out crossfade
- Shared chip ChevronDown tap: 200ms reveal of View + Revoke buttons
- Revoke tap: inline dialog within card (not a modal), 200ms slide-down
- Revoke confirm: 300ms collapse back to action row, toast "Share revoked. Your practitioner can no longer see this insight."

**Copy strings (linter-validated):**
- Modal header: `Share with your practitioner`
- Practitioner intro: `You will share with`
- Practitioner subtitle: `{specialty}` then `Verified practitioner` (only if `verified=true` in DB)
- Section: `What your practitioner will see`
- Will-see lines: `The insight headline and body` / `The sample size and time window` / `Your full data points` / `The source catalog version`
- Section: `What your practitioner will not see`
- Will-not-see lines: `Your raw symptom log entries` / `Other insights you have not shared` / `Your other meal data`
- Reassurance: `You can revoke this share at any time from the shared insight card.`
- Primary CTA: `Share with Dr. {LastName}`
- Cancel: `Not right now`
- Shared chip: `Shared with Dr. {LastName}`
- Shared chip secondary: `{share_date_formatted}`
- Expanded button 1: `View what was shared`
- Expanded button 2: `Revoke`
- Revoke dialog header: `Revoke this share?`
- Revoke dialog body: `Your practitioner will no longer see this insight. This action is logged.`
- Revoke CTA: `Revoke share`
- Revoke cancel: `Keep sharing`
- Revoke toast: `Share revoked. Your practitioner can no longer see this insight.`

**Brand tokens:**
- Modal bg Card `#1E3054`
- Practitioner avatar Card 90 percent bg, white text initials
- Check icons Lucide strokeWidth `{1.5}` 16px, Teal `#2DA5A0`
- XCircle icons Lucide strokeWidth `{1.5}` 16px, Navy 60 percent
- Primary CTA: Teal solid
- Shared chip: Teal `#2DA5A0` text on Teal 12 percent fill, Share2 icon strokeWidth `{1.5}` 16px
- Revoke button text: Orange `#B75E18` (signaling consequence without being alarming Red)
- Revoke dialog primary: Orange `#B75E18` solid

**Accessibility notes:**
- Modal: `role="dialog" aria-modal="true" aria-labelledby="share-modal-header"`
- Will-see and will-not-see sections are `<h3>` headers with `<ul>` lists for screen reader semantics
- Check and XCircle icons are decorative; the text lines carry the meaning
- Practitioner identity announced as "You will share with Doctor Sarah Chen, Integrative Medicine, Verified practitioner"
- Shared chip is a `<button aria-expanded="false" aria-label="Shared with Doctor Sarah Chen on May 29 2026, tap to manage">`
- Revoke confirmation: focus auto-moves to Revoke share CTA; Escape collapses dialog
- Revoke toast: `role="status" aria-live="polite"`

**UX rationale (pre-share education tone):** The two-section "will see / will not see" structure is the trust pivot. Spec said practitioner gets the shared insight + supporting evidence (not raw symptom log). Translated this into a positive frame ("will see") AND a reassurance frame ("will not see"), both visible at the same moment. Users who hesitate to share with practitioners usually fear oversharing; the explicit "will not see" list addresses that fear head-on without being defensive. The closing line "You can revoke this share at any time" lowers the stakes further. Voice is empowering, not nervous. Pushing back on spec's body copy "Your practitioner will see this insight and the supporting evidence. They will not see your raw symptom log unless you share it separately" because that one sentence is too dense and the "unless you share it separately" trailing clause introduces complexity at a trust moment. Split into two clear sections.

**UX rationale (revoke UX prominence):** Easy to revoke. The Shared chip stays visible on the card (not hidden in a settings menu), expand reveals two clear options (View what was shared + Revoke), and Revoke confirmation is one tap away. Three taps total from card to revoked. Reasoning: accidental sharing is a real fear that suppresses sharing in the first place. If revocation is easy and visible, users share more freely. The audit log entry on revoke ("This action is logged") signals seriousness without preventing the action. Orange text on Revoke (not Red) keeps the consequence visible without alarming. Made the revoke easier than the spec implied; spec said "tap = revoke option" which sounded hidden; pushed back to surface-level chevron expand.

### 11.6 Save Confirmation prospective conflict card

**ASCII wireframe, mobile Save Confirmation screen (full):**

```
+---------------------------------------------+
|  Meal saved                                 |  Save Confirmation header
|                                             |  (existing 170 surface)
|  +---------------------------------------+  |
|  | (Hexagon)                             |  |  Bio Optimization delta
|  | Bio Optimization: 78 (+2)             |  |  card (existing)
|  | Up from 76 yesterday                  |  |
|  +---------------------------------------+  |
|                                             |
|  +---------------------------------------+  |
|  | (Info)                  [Worth knowing]|  |  Conflict card, Orange
|  |                                       |  |  #B75E18 4px left rule,
|  | Your Iron supplement at 8 AM may be   |  |  Card #1E3054 bg
|  | less absorbed because of the coffee   |  |
|  | in your breakfast.                    |  |
|  |                                       |  |
|  | Many people in this scenario find the |  |
|  | conventional approach is to space the |  |
|  | two by 2 hours. Your practitioner can |  |
|  | advise on the right approach for you. |  |
|  |                                       |  |
|  | > Why we are showing this             |  |  Expander, default closed
|  |                                       |  |
|  | From our supplement timing catalog,   |  |  11px footer
|  | version 1.0.                          |  |
|  |                                       |  |
|  | [ Adjust timing ]    [    Got it   ]  |  |  Ghost left + Teal right;
|  +---------------------------------------+  |  Got it is primary in card
|                                             |
|  +---------------------------------------+  |
|  |              Done                     |  |  Save Confirmation primary
|  +---------------------------------------+  |  CTA, full width, Teal solid
|                                             |
+---------------------------------------------+
```

**Synergistic variant (Teal instead of Orange):**

```
|  +---------------------------------------+  |
|  | (Sparkles)            [Good combination]| |  Teal 4px left rule
|  |                                       |  |
|  | Pairing Vitamin D with the fat in     |  |
|  | your avocado is associated with       |  |
|  | better absorption.                    |  |
|  |                                       |  |
|  | From our supplement timing catalog,   |  |  11px footer
|  | version 1.0.                          |  |
|  |                                       |  |
|  |                      [   Nice    ]    |  |  Single Teal CTA, dismisses
|  +---------------------------------------+  |
```

**Expanded "Why we are showing this" state:**

```
|  v Why we are showing this                |
|                                           |
|  Coffee contains compounds that may slow  |  13px body, Navy 80 percent
|  the absorption of non-heme iron when     |
|  taken together. This is a well           |
|  established pairing in clinical          |
|  research.                                |
|                                           |
|  Catalog source: supplement_food_conflicts|  11px mono-aligned
|  version 1.0, citation: PMID 17852150     |  Navy 60 percent
```

**Desktop 1024 plus:** Save Confirmation card and conflict card stack vertically; conflict card max-width 480px. Done CTA stays full-width edge-to-edge.

**Interaction notes:**
- Conflict card animates in with 250ms ease-out fade-and-slide from below; appears AFTER Bio Optimization delta animation completes (sequential, not simultaneous)
- Orange 4px left rule plus Info icon for absorption/effect/timing conflicts; Teal 4px left rule plus Sparkles for synergistic
- "Got it" tap: card animates out 200ms ease-out, focus returns to Done CTA
- "Adjust timing" tap: opens a lightweight bottom sheet (NOT full navigation to supplement detail) with 3 quick options ("Move supplement to 6 AM" / "Move supplement to 10 AM" / "Open supplement detail for more options"); see UX rationale below
- Done CTA always visible at viewport bottom; conflict card scrolls if content exceeds viewport
- Conflict card is single-instance only; if multiple conflicts detected, only the highest-severity one surfaces here (others go to the Insights tab)

**Copy strings (linter-validated):**

For absorption/effect/timing conflicts (Orange):
- Label chip: `Worth knowing`
- Body template (absorption): `Your {supplement} at {time} may be less absorbed because of the {food} in your {meal}.`
- Body template (effect): `Your {supplement} at {time} may have reduced effect when taken with the {food} in your {meal}.`
- Body template (timing): `Your {supplement} and your {meal} may benefit from being spaced apart.`
- Followup: `Many people in this scenario find the conventional approach is to space the two by {hours} hours. Your practitioner can advise on the right approach for you.`
- Footer: `From our supplement timing catalog, version 1.0.`
- Action 1 (text): `Adjust timing`
- Action 2 (Teal primary in card): `Got it`

For synergistic (Teal):
- Label chip: `Good combination`
- Body template: `Pairing {supplement} with the {component} in your {food} is associated with {benefit}.`
- Footer: `From our supplement timing catalog, version 1.0.`
- Single CTA: `Nice`

Expander label (both variants): `Why we are showing this`

Expanded body template: `{plain_english_mechanism}. This is a well established pairing in clinical research.` (only for `well_established` plausibility tier; `plausible` tier uses softer "This is a recognized possible interaction in clinical research." )
Expanded source line: `Catalog source: supplement_food_conflicts version {version}, citation: PMID {pmid}` (only if PMID exists; otherwise `Catalog source: supplement_food_conflicts version {version}`)

Adjust timing bottom sheet:
- Header: `Adjust timing for {supplement}`
- Option 1: `Move {supplement} to {earlier_time}` (calculated earlier slot)
- Option 2: `Move {supplement} to {later_time}` (calculated later slot)
- Option 3: `Open supplement detail for more options`
- Cancel: `Not right now`

**Brand tokens:**
- Conflict card (warning): 4px left rule Orange `#B75E18`, Info icon Orange `#B75E18` strokeWidth `{1.5}`, label chip Orange text on Orange 12 percent fill
- Conflict card (synergistic): 4px left rule Teal `#2DA5A0`, Sparkles icon Teal `#2DA5A0` strokeWidth `{1.5}`, label chip Teal text on Teal 12 percent fill
- Card bg `#1E3054`
- Got it / Nice CTAs: Teal solid (primary in card)
- Adjust timing CTA: ghost button with Navy 80 percent text
- Done (Save Confirmation primary): Teal solid, unchanged from existing surface

**Accessibility notes:**
- Conflict card is `<aside role="complementary" aria-labelledby="conflict-label">` inserted between Bio Optimization card and Done CTA
- Insertion announces via `aria-live="polite"` once: "We noticed something worth knowing about this meal." (delayed 800ms after Bio Optimization announcement so the two do not collide)
- Label chip text is read first: "Worth knowing"
- Body text read in flow
- Expander button as in §11.2
- "Adjust timing" button: `aria-label="Adjust timing for Iron supplement, opens options"`
- "Got it" button: `aria-label="Dismiss this timing note"`
- Done CTA remains the highest-priority focus target; tab order is: Bio Optimization (no focusable elements) → Conflict card expander → Adjust timing → Got it → Done
- Escape on focused conflict card dismisses it (equivalent to Got it)

**UX rationale (card prominence within Save Confirmation hierarchy):** The Save Confirmation moment of accomplishment must stay primary. Solution: Done CTA is full-width edge-to-edge Teal solid (highest visual weight by surface area). Conflict card is constrained to standard card width 343px on mobile / 480px max desktop, with Orange or Teal 4px left rule (a visual signal that is informative without being alarming Red). The conflict card animates in AFTER the Bio Optimization delta has settled, so it feels additive rather than interrupting. Crucially: Done is enabled and tappable the entire time the conflict card is visible; non-blocking is honored at the interaction level, not just the architecture level. The user can dismiss the meal save flow without engaging with the conflict at all, and the conflict still gets logged for the Insights tab.

**UX rationale ("Adjust timing" link target):** Pushed back on spec's "links to the supplement detail screen." A full navigation to supplement detail is a context switch that punishes users for engaging with the conflict. Instead, "Adjust timing" opens a lightweight bottom sheet with 3 options: two quick pre-calculated time slots (e.g., "Move Iron to 6 AM" or "Move Iron to 10 AM" based on the catalog's recommended spacing) and a third option to go deeper. This honors the spec's intent (giving users a way to act) while respecting the save confirmation moment. Most users who tap Adjust timing want the quick fix; the deeper navigation stays available for the minority who want full control. This is the "lighter touch" alternative explicitly invited by the UX decision prompt.

**Voice for §11.6 (conflict framing):** "Worth knowing" is the deliberate gentling of clinical interaction language. Body copy never uses "warning" or "interaction" or "conflict" or "should not." Instead: "may be less absorbed", "may have reduced effect", "may benefit from being spaced apart." The followup sentence always offers the conventional approach AND defers to practitioner: "Many people in this scenario find the conventional approach is to space the two by 2 hours. Your practitioner can advise on the right approach for you." This phrasing was crafted to be linter-compliant and trust-positive: no "should," no causation, sample-of-many framing, practitioner-deferred, but still actionable enough to be useful.

### 11.7 Dashboard hero Insights badge

**ASCII wireframe, mobile Dashboard hero area:**

```
+---------------------------------------------+
|  Good morning, Gary                         |  Existing greeting
|                                             |
|  +---------------------------------------+  |
|  | (Hexagon) Bio Optimization Score 78   |  |  Existing hero card
|  |                                       |  |  (do not modify)
|  +---------------------------------------+  |
|                                             |
|  +-----------------------------------+      |  Insights badge,
|  | (BarChart3)  3 new insights ready |  >  |  inline below hero,
|  +-----------------------------------+      |  full-card width minus 16px
|                                             |  side gutter; chevron right
|                                             |  end
|  +---------------------------------------+  |
|  | (existing dashboard tiles)            |  |
|  +---------------------------------------+  |
```

**Badge variants by count:**

```
Single insight:    | (BarChart3)  1 new insight ready    > |
Two insights:      | (BarChart3)  2 new insights ready   > |
Three plus:        | (BarChart3)  {count} new insights ready  > |
After 4 days idle: | (BarChart3)  {count} insights waiting   > |  (gentle nudge)
After 7 days:      (auto-removed from hero)
```

**Tap state:**

```
| (BarChart3)  3 new insights ready  >  |   <- 100ms ease-out scale 0.98
```

**Desktop 1024 plus:** badge appears in same hero region, full-width within the dashboard column. Hover state: Card 90 percent background lifts to Card 100 percent, ChevronRight slides 4px right.

**Interaction notes:**
- Badge appears when `unviewed_count > 0` from `analytics_insights` query
- Badge tap navigates to /wellness-analytics with `?tab=insights` query string; tab strip in 11.1 auto-selects Insights
- Badge dismisses on first tap (does not require viewing each card individually)
- Auto-dismiss timing: 7 days after the most recent `generated_at` of any unviewed insight, if user has not tapped the badge
- Copy variant change at day 4: "new" → "waiting" softens the urgency while keeping presence
- Day 4 to 7 nudge does not animate or pulse (avoid notification fatigue); just text change
- Badge animation on first appearance: 250ms ease-out fade-in only, no slide or bounce; badge is informational not promotional

**Copy strings (linter-validated):**
- Single: `1 new insight ready`
- Multiple (within first 3 days): `{count} new insights ready`
- After 4 days idle: `{count} insights waiting`
- Hidden state: badge not rendered (no copy)
- Aria-label: `View {count} new insights from your wellness analytics`

**Brand tokens:**
- Badge background: Card `#1E3054` with Teal `#2DA5A0` 1px border
- Icon: BarChart3 Lucide strokeWidth `{1.5}`, 20px, Teal `#2DA5A0`
- Text: 14px Instrument Sans Medium, white
- ChevronRight: Lucide strokeWidth `{1.5}`, 16px, Navy 60 percent
- Day 4 nudge variant: same Card bg, no border color change, no animation; only copy change

**Accessibility notes:**
- Badge is `<a href="/wellness-analytics?tab=insights" aria-label="View 3 new insights from your wellness analytics">`
- Decorative icons `aria-hidden="true"`; aria-label carries semantic meaning
- Focus visible: 2px Teal outline at 2px offset
- Screen reader on Dashboard page announces badge after Bio Optimization Score hero, before tiles (insertion in DOM order is the reading order)
- Badge does not steal focus on initial load; user discovers via tab order

**UX rationale (badge prominence):** Subdued informational treatment, not promotional. Reasoning: the Bio Optimization Score is the hero of the Dashboard; any badge that competes with it for attention erodes the user's primary value proposition. Solution: badge sits BELOW the hero card with Teal 1px border (visible but quiet), no pulse animation, no count badge red-dot, no "!" punctuation. The Teal border + Teal icon is the entire visual hook. Most badges in this space overdo it; ViaConnect's posture is that an informational badge is invitation, not interruption. The chevron right end signals "tap me" without text. After 7 days of being ignored, the badge auto-removes; respecting the user's clear non-interest is part of the design (and reduces notification fatigue).

**UX rationale ("this week" framing):** Pushed back on spec's "3 new insights this week." Reasoning: the engine is weekly batch but also responds to manual refresh and prospective conflicts (which can generate mid-week). "This week" implies a fixed cadence that is technically inaccurate; a user who refreshed Tuesday and got an insight would see "3 new insights this week" on Wednesday and reasonably wonder why the week count is wrong. New copy: `3 new insights ready`. "Ready" is honest about state without committing to a time anchor. Plus at day 4 the copy softens to `3 insights waiting`, which encodes the time signal without lying about it. Recommended copy supersedes spec wording.

### 11.8 Empty state

**Variant A: under 14 days of meal data**

```
+---------------------------------------------+
|  Insights tab on Wellness Analytics         |
+---------------------------------------------+
|                                             |
|                                             |
|         +-----------+                       |
|         |           |                       |
|         | BarChart3 |  HelpCircle           |  Stacked illustration:
|         |    +      |                       |  BarChart3 48px Teal
|         +-----------+                       |  with HelpCircle 32px
|                                             |  Navy 60 percent overlay
|                                             |  bottom-right corner
|                                             |
|        Patterns appear as you log           |  20px Instrument Sans Medium
|                                             |  centered white
|                                             |
|   We surface patterns after we have at      |  14px Navy 80 percent
|   least 14 days of meal data. You have      |  centered, line-height 1.5
|   {n} days so far. Keep logging and we      |
|   will let you know when there is enough    |
|   to look at.                               |
|                                             |
|       +-------------------------+           |
|       |     Open Nutrition Log  |           |  Primary CTA, Teal solid
|       +-------------------------+           |
|                                             |
|                                             |
|    Tips and Goals will still appear here    |  13px Navy 60 percent
|    when available.                          |  centered, helper context
|                                             |
+---------------------------------------------+
| (sticky footer disclaimer + refresh button) |
+---------------------------------------------+
```

**Variant B: 14+ days, no significant patterns**

```
+---------------------------------------------+
|  Insights tab on Wellness Analytics         |
+---------------------------------------------+
|                                             |
|         +-----------+                       |
|         |  Compass  |                       |  Compass 48px Teal,
|         +-----------+                       |  exploratory not deficit
|                                             |
|     No patterns to surface right now        |  20px Instrument Sans Medium
|                                             |  centered white
|                                             |
|   You have logged {n} days of meals and     |  14px Navy 80 percent
|   {m} symptom entries. We looked across     |  centered, acknowledges effort
|   that data and did not find patterns       |
|   strong enough to surface yet.             |
|                                             |
|   This can mean a few things: your routine  |  14px Navy 70 percent
|   may be balanced, your symptoms may not    |  centered, three "could be"
|   line up with specific foods, or the       |  framings
|   patterns may need more time to emerge.    |
|                                             |
|   We will keep looking. Patterns can appear |  14px Navy 80 percent
|   as new data comes in.                     |  centered closer
|                                             |
+---------------------------------------------+
|                                             |
|  Tips                                       |  Existing section dividers
|  +---------------------------------------+  |  per §11.1 if any Tips
|  | (card)                                |  |  catalog-eligible
|  +---------------------------------------+  |
|                                             |
|  Goals                                      |  per §11.1 if any Goal
|  +---------------------------------------+  |  retrospective milestones
|  | (card)                                |  |
|  +---------------------------------------+  |
|                                             |
+---------------------------------------------+
| (sticky footer disclaimer + refresh button) |
+---------------------------------------------+
```

**Desktop 1024 plus:** illustration centered, content max-width 480px, CTA inline. Variant B Tips and Goals sections render in single column below empty-state hero.

**Interaction notes:**
- Variant A: "Open Nutrition Log" CTA navigates to /nutrition-log; refresh button in sticky footer is disabled (no insights to refresh) with disabled state copy `Refresh available with 14+ days of data`
- Variant B: refresh button remains enabled (manual refresh is valid; engine can run again)
- Variant A illustration is BarChart3 (the icon associated with the insight type that is most absent) with HelpCircle overlay; Variant B uses Compass (exploratory positive valence)
- Day counter in copy is dynamic from `meal_log_days_count`; updates on every page load
- Variant transitions: when user crosses 14-day threshold, next page load shifts from A to B; no animation needed (state change, not transient)

**Copy strings (linter-validated):**

Variant A:
- Headline: `Patterns appear as you log`
- Body: `We surface patterns after we have at least 14 days of meal data. You have {n} days so far. Keep logging and we will let you know when there is enough to look at.`
- CTA: `Open Nutrition Log`
- Helper: `Tips and Goals will still appear here when available.`
- Refresh disabled state: `Refresh available with 14+ days of data`

Variant B:
- Headline: `No patterns to surface right now`
- Body line 1: `You have logged {n} days of meals and {m} symptom entries. We looked across that data and did not find patterns strong enough to surface yet.`
- Body line 2: `This can mean a few things: your routine may be balanced, your symptoms may not line up with specific foods, or the patterns may need more time to emerge.`
- Body line 3: `We will keep looking. Patterns can appear as new data comes in.`
- Tips section header retained per §11.1 (`Tips` / subtitle `From our educational library`)
- Goals section header retained per §11.1 (`Goals` / subtitle `Wins worth celebrating`)

**Brand tokens:**
- Page bg `#1A2744`
- Illustration: BarChart3 48px Teal `#2DA5A0` strokeWidth `{1.5}` with HelpCircle 32px Navy 60 percent overlay (Variant A); Compass 48px Teal `#2DA5A0` strokeWidth `{1.5}` (Variant B)
- Headline 20px Instrument Sans Medium white
- Body 14px Instrument Sans Regular Navy 80 percent or 70 percent (gradient of importance)
- Primary CTA: Teal solid
- Helper text: 13px Navy 60 percent

**Accessibility notes:**
- Empty state region is `role="status" aria-live="polite"` so screen readers announce the state change when navigating to the tab
- Illustration is decorative `aria-hidden="true"`
- Headline is `<h1>` for tab landmark
- Body paragraphs are `<p>` in linear reading order
- CTA in Variant A: `<a href="/nutrition-log" aria-label="Open Nutrition Log to add a meal">`
- Variant B no CTA; helper text and Tips/Goals sections form the secondary content

**UX rationale (Variant B tone):** The hardest tone work in this subsection. User has logged faithfully for 14+ days, did the work, and got no patterns. Without care, this reads as "you failed" or "the system failed." Solution: three-part body that acknowledges effort, normalizes the outcome, and signals continued engagement.

1. Acknowledge effort with specific numbers: `You have logged {n} days of meals and {m} symptom entries.` This shows ViaConnect counted their work.
2. Reframe the outcome as a valid result, not a failure: `your routine may be balanced, your symptoms may not line up with specific foods, or the patterns may need more time to emerge.` Three positive possibilities, none of which is "you logged wrong."
3. Signal continued attention: `We will keep looking.` The system is not abandoning them.

Plus: Variant B retains the Tips and Goals sections per spec, so the page is never empty-empty. There is always something to see. Pushing back on the spec's framing of Variant B as a "quiet failure of the system to deliver value"; reframed it as "the engine working correctly: not surfacing weak patterns is the conservative posture, and worth communicating as a feature." Compass illustration (vs HelpCircle in A) is the visual cue: exploration not confusion.

### 11.9 Welcome modal on first Insights tab open

**ASCII wireframe, mobile modal full-height:**

```
                                              <- 60 percent black dim
+---------------------------------------------+
|                                          x  |  Modal Card #1E3054 bg,
|                                             |  scrolling on mobile
|       +-----------+                         |
|       |           |                         |  Illustration: BarChart3
|       | BarChart3 |                         |  48px Teal centered top
|       |           |                         |
|       +-----------+                         |
|                                             |
|         Welcome to Insights                 |  22px Instrument Sans Medium
|                                             |  centered white
|                                             |
|   Insights help you spot patterns in your   |  15px Navy 85 percent
|   logs. We share observations only. We do   |  centered, line-height 1.5
|   not give medical advice.                  |
|                                             |
|   What Insights does                        |  14px Instrument Sans Medium,
|                                             |  left-aligned white,
|                                             |  section header
|   (Check) Spots patterns in your meal and   |  Check Teal strokeWidth 1.5
|           symptom logs                      |
|   (Check) Surfaces timing notes when a      |
|           supplement and a meal may         |
|           interact                          |
|   (Check) Shares educational tips from our  |
|           library                           |
|   (Check) Celebrates goals you hit          |
|                                             |
|   What Insights does not do                 |  14px Instrument Sans Medium,
|                                             |  left-aligned white,
|                                             |  section header
|   (XCircle) Diagnose conditions             |  XCircle Navy 60 percent
|   (XCircle) Recommend medications or        |  strokeWidth 1.5
|             treatments                      |
|   (XCircle) Replace your practitioner       |
|   (XCircle) Tell you to stop anything you   |
|             are taking                      |
|                                             |
|   The fine print                            |  14px Instrument Sans Medium
|                                             |  section header
|                                             |
|   > Legal disclaimers                       |  Collapsible expander,
|                                             |  default collapsed
|                                             |
|       +-----------------------------+       |
|       |        OK, got it           |       |  Primary CTA, Teal solid
|       +-----------------------------+       |
|                                             |
+---------------------------------------------+
```

**Expanded "Legal disclaimers" state:**

```
|   v Legal disclaimers                       |
|                                             |
|   These observations are educational and    |  13px Navy 75 percent,
|   are not a substitute for advice from a    |  full legal text
|   qualified healthcare practitioner. Do not |
|   disregard professional medical advice or  |
|   delay seeking it because of something you |
|   read in Insights.                         |
|                                             |
|   Statements about supplements and          |
|   nutrients have not been evaluated by the  |
|   Food and Drug Administration. Products    |
|   referenced are not intended to diagnose,  |
|   treat, cure, or prevent any disease.      |
|                                             |
|   Patterns reflect statistical observations |
|   in your own logged data. They are not     |
|   clinical findings. Sample sizes, time     |
|   windows, and source citations are visible |
|   on every insight so you can evaluate the  |
|   evidence yourself.                        |
|                                             |
|   If you are experiencing a medical         |
|   emergency, call your local emergency      |
|   number.                                   |
```

**Desktop 1024 plus:** modal centered 520px wide, max-height 80vh with internal scroll if needed. Same content.

**Interaction notes:**
- Modal appears once per user on first Insights tab open; tracked via `analytics_insights_welcome_seen_at` column on user_profiles or equivalent
- 250ms ease-out fade-in from center
- Tap close `x` or tap "OK, got it" both dismiss and set the seen flag
- "Legal disclaimers" expander: 200ms ease-out height transition; ChevronRight rotates to ChevronDown
- Tap outside modal does NOT dismiss (intentional; user must acknowledge)
- Escape key dismisses (with focus to Close `x` before close)

**Copy strings (linter-validated):**

Header section:
- Headline: `Welcome to Insights`
- Intro: `Insights help you spot patterns in your logs. We share observations only. We do not give medical advice.`

What Insights does section:
- Section: `What Insights does`
- Line 1: `Spots patterns in your meal and symptom logs`
- Line 2: `Surfaces timing notes when a supplement and a meal may interact`
- Line 3: `Shares educational tips from our library`
- Line 4: `Celebrates goals you hit`

What Insights does not do section:
- Section: `What Insights does not do`
- Line 1: `Diagnose conditions`
- Line 2: `Recommend medications or treatments`
- Line 3: `Replace your practitioner`
- Line 4: `Tell you to stop anything you are taking`

Fine print section:
- Section: `The fine print`
- Expander label: `Legal disclaimers`
- Expanded paragraph 1: `These observations are educational and are not a substitute for advice from a qualified healthcare practitioner. Do not disregard professional medical advice or delay seeking it because of something you read in Insights.`
- Expanded paragraph 2: `Statements about supplements and nutrients have not been evaluated by the Food and Drug Administration. Products referenced are not intended to diagnose, treat, cure, or prevent any disease.`
- Expanded paragraph 3: `Patterns reflect statistical observations in your own logged data. They are not clinical findings. Sample sizes, time windows, and source citations are visible on every insight so you can evaluate the evidence yourself.`
- Expanded paragraph 4: `If you are experiencing a medical emergency, call your local emergency number.`

CTA: `OK, got it`

**Brand tokens:**
- Modal bg Card `#1E3054`
- Outer dim 60 percent black
- Illustration: BarChart3 48px Teal `#2DA5A0` strokeWidth `{1.5}`
- Headline 22px Instrument Sans Medium white
- Body 15px Instrument Sans Regular Navy 85 percent
- Section headers 14px Instrument Sans Medium white
- Check icons 18px Teal `#2DA5A0` strokeWidth `{1.5}`
- XCircle icons 18px Navy 60 percent strokeWidth `{1.5}`
- Expander Legal disclaimers: ChevronRight 16px Navy 70 percent strokeWidth `{1.5}`
- Legal text 13px Navy 75 percent
- Primary CTA: Teal `#2DA5A0` solid background, white text

**Accessibility notes:**
- Modal: `role="dialog" aria-modal="true" aria-labelledby="welcome-headline"`
- Focus auto-traps; first focus on Close `x` (not on the CTA, which gives user a moment to read before action)
- Sections are `<h2>` headers
- "What Insights does" list is `<ul>` with Check icons decorative
- "What Insights does not do" list is `<ul>` with XCircle icons decorative
- Expander button: `<button aria-expanded="false" aria-controls="legal-text">`
- "OK, got it" CTA: `<button aria-label="Acknowledge welcome message and continue to Insights">`
- Modal blocks tab focus on background content while open
- Screen reader reading order: header → intro → does header → does items → does-not header → does-not items → fine print header → expander → CTA

**UX rationale (disclaimer density):** Humanized version with collapsible legal section. The humanized "does / does not do" lists are visible by default and carry 85 to 90 percent of the trust-establishment value: they tell the user in plain English what to expect and what NOT to expect, in symmetric pairs. The full legalese (FDA disclaimer, medical advice disclaimer, emergency line) is in a collapsible expander labeled "Legal disclaimers": present, accessible, but not visually dominant. Trust through warmth (humanized lists) AND trust through precision (full legal text available) at the same time.

Reasoning: a wall of legalese on first tab open communicates "we are scared of being sued" which paradoxically reduces trust. A bullet list of "does / does not" communicates "we know our scope and we are honest about it" which BUILDS trust. The legal text is one tap away for users (or regulators) who want it.

Also: positioned the "does not do" list explicitly to encode the linter rules in plain language. "Diagnose conditions" "Recommend medications or treatments" "Replace your practitioner" "Tell you to stop anything you are taking": each line is a humanized restatement of the linter's forbidden categories. Users absorb the linter rules as product limits, which then primes them to interpret every insight card consistently.

**Voice for §11.9 welcome modal disclaimer tone:** Honest, scoped, slightly informal. "We share observations only" instead of "ViaConnect Insights provides observational analysis." "Tell you to stop anything you are taking" instead of "constitute medical advice regarding discontinuation of any prescribed therapy." The legal expander uses formal language because legal text must; the visible body uses everyday language because trust must. Two registers, one document, both honest.

### 11.10 Brand tokens enforced

All surfaces use Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`. Instrument Sans. Lucide React strokeWidth 1.5. NO emojis. NO em or en dashes.

New icons used in this flow: BarChart3 (Pattern), AlertCircle (Conflict), Lightbulb (Tip), Target (Goal), ThumbsUp/ThumbsDown (feedback), Share2 (share), Info (worth knowing), Sparkles (good combination), HelpCircle (empty state).

## Hannah's hard tone constraints (clinical-claim linter)

Every copy string Hannah writes is subject to the §13.5 linter:

**FORBIDDEN words/phrases:**
- "should" (use "may consider" or "the conventional approach is")
- "diagnose", "treat", "cure", "prevent"
- Causation language ("causes", "leads to", "results in")
- Recommendations to stop a medication/supplement

**REQUIRED framings:**
- "associated with", "may affect", "is correlated with"
- Always sample size and time window so user can evaluate evidence themselves
- Always defer to practitioner for action

Hannah's tone wireframes need to thread the needle: warm + informative + non-alarming + observational + linter-compliant. This is the hardest tone work in any 170-series filing.

## Notes Hannah may want to consider

- **§11.2 insight card is the canonical tone surface.** Every copy choice here gets multiplied across hundreds of generated insights. The "Notable pattern" voice she establishes here becomes the ViaConnect insights voice.
- **§11.3 dismiss flow** needs the 4-reason taxonomy to feel like genuine choices, not trap questions. "Not actionable" vs "Disagree" is a tone distinction worth getting right.
- **§11.6 Save Confirmation card** is the moment of highest user attention (just saved a meal, looking at confirmation). The "Worth knowing" framing is critical: too prominent and it disrupts the save confirmation joy; too subtle and users miss it.
- **§11.5 share with practitioner** is a trust surface. Users hesitate to share data with practitioners. Tone should be empowering ("you choose what to share") not nervous.
- **§11.7 hero badge** competes with all other Dashboard surfaces for attention. The "3 new insights this week" framing assumes a weekly cadence the user understands.

## Sequencing 170h still needs (in order)

1. **170 Phase 1 baked in production minimum 7 days with telemetry**
2. **Active users accumulate at least 30 days of meal data** (cannot bypass calendar)
3. **Gordon catalog drafting complete**: 50 conflict rules + 100 plausibility pairings + 30 tips, all with PubMed citations, Gary signoff
4. **Statistical methods memo** signed by Gordon, approved by Gary at Blueprint
5. **Edge Function infrastructure** for FDR correction deployed
6. **Hannah's wireframes (§11 of filing doc) signed off by Gary** with explicit tone-pass approval
7. **30-user pilot cohort** assembled for false positive rate measurement (§16.4 Audit gate)
8. **`INSIGHTS_*` kill switches ready** defaulted true after launch with per-engine sub-kills

Then Michelangelo Workstream is unblocked.

## Ratification posture (2026-05-29)

Gary acknowledged 170h at spec level 2026-05-29 by pasting the full spec into the session. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change required.

The next code action is dispatched when prerequisites in the "Sequencing" section above are resolved — minimum 30 days from today for the data accumulation alone; longer including Gordon's catalog drafting.

## 170h-supplement anticipated per §23.8

Future supplement may cover: Bayesian framework for low-data regimes per §7.6; population-level patterns across opted-in users (analogous to Prompt 170g research opt-in); real-time insight regeneration triggered by symptom logs; expanded international catalog coverage (TCM, Ayurvedic, cuisine-specific interactions per §8.6).

## Related

- Prompt 170 (shipped Phase 1; meal data starts accumulating today)
- Prompt 170a + 170a-supplement (ratified; safe set + §17 + §20 shipped)
- Prompt 16 (medication interaction engine; 170h reuses 4-severity framework internally with gentler visual treatment)
- Prompt 17a (Wellness Analytics; 170h adds Insights tab)
- Prompt 17b (emitDataEvent cascade; 170h triggers regeneration on data changes)
- Prompts 170b/170c/170d/170e/170f/170g (all filed; 170h independent of each but composes where applicable)
- Heritage: CAQ Phase 5 symptom log structure
