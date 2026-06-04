# Prompt 173c: CAQ Interstitial Advance Behavior and Quick vs Complete Path

**Filed:** 2026-06-04 (spec dated 2026-06-01)
**Owner:** Gary (gary@farmceuticawellness.com)
**Status:** LOCKED. All design decisions confirmed by Gary in Section 0. Build-ready, no open decision points.

---

## Relationship to prior prompts

Builds on Prompt 173 (CAQ restructure), 173b (interstitial remap + semantic binding), and 173a (macro engine). Does NOT change any locked copy or the macro engine. Adds two engagement mechanics: how interstitials advance and a Quick vs Complete path choice. Everything in 173, 173a, and 173b stands.

## Agents

Jeffery (Orchestrator), Kelsey (compliance review), Michelangelo (TDD / OBRA).

## Stack

Next.js 14+, TypeScript, Tailwind, Supabase (nnhkcufyqjojdbvdrpky, us-east-2), Capacitor (com.farmceutica.viaconnect), Vercel to viaconnectapp.com. WCAG 2.2 AA throughout per 170j precedent. No em-dashes or en-dashes in any UI copy or comment.

---

## 0. Confirmed decisions (locked)

1. **Interstitial advance**: hybrid , tap to advance immediately + reading-time-aware auto-advance (~4s short, ~7s fuller) with subtle progress fill, pause on interaction, respects `prefers-reduced-motion`. NO 3-second timer-only flip. Advance control is NOT removed.
2. **Quick vs Complete path**: offered at start of Phase 1. Quick Start = phases 1, 2, 7. Complete = phases 1 through 7. Quick is resumable and upgradeable.
3. **Quick step numbering**: path-relative (Step 1 of 3) with line noting more phases available. Complete keeps `Phase X of 7`.
4. **Default selection**: do not pre-select Quick. Both options presented evenly. Lead with value of Complete.
5. **Personalization indicator**: positive indicator that rises as phases complete; framed as unlocking precision, never as a failed score.
6. **Canonical Phase 1 title**: `Demographics & Biodata`. Reconcile from "Demographics" or "Your Body Profile" wherever 173/173b used the shorter form.

## 1. Part A: Interstitial advance behavior

### 1.1 Why not a 3-second timer-only flip

20-word body line at 200-250 wpm needs 5-6s comprehension. A 3-second flip removes the screen mid-read for most users and tends to raise drop-off, not lower it.

WCAG 2.2 issues with timer-only auto-flip + no control: 2.2.1 Timing Adjustable, 2.2.2 Pause Stop Hide, 2.3.3 Animation from Interactions. Platform holds WCAG 2.2 AA from 170j; the control stays.

### 1.2 Hybrid behavior (locked)

- **Tap to advance**: visible advance affordance always present. Tap anywhere on interstitial advances. Keeps engaged users fast.
- **Auto-advance, reading-time-aware**:
  ```
  delay_ms = clamp(base_ms + (word_count / words_per_second) * 1000, min_ms, max_ms)
  base_ms = 1500
  words_per_second = 3.5  (about 210 wpm)
  min_ms = 4000
  max_ms = 9000
  ```
  20-word card lands near 7s. Short teaser lands at 4s floor.
- **Progress fill**: subtle indicator over the delay so auto-advance is expected, not abrupt.
- **Pause on interaction**: hover (desktop), touch-hold (mobile), focus (keyboard) all pause.
- **Reduced motion + accessibility**: if `prefers-reduced-motion` is set, do NOT auto-advance. Wait for explicit tap. Provide setting to disable auto-advance globally. Screen-reader users get full copy announced and are never advanced before it finishes.
- **All constants in ONE config module**. No magic numbers in component.

### 1.3 Phase 1 interstitial copy

Phase 1 (`Demographics & Biodata`) interstitial line locked as: `"The more we know, the smarter your protocol gets."` This line also serves as the honest framing for the Quick vs Complete choice in Part B.

## 2. Part B: Quick vs Complete CAQ path

### 2.1 The choice screen

- Presented at start of Phase 1 (Demographics & Biodata), BEFORE user invests in full flow.
- Two options, presented evenly, honest tradeoff framing (speed vs personalization). Lead with value of Complete. Do NOT pre-select Quick.
- **Complete Assessment, recommended**: Phases 1 through 7. Most precise protocol and Bio Optimization Score. Uses line `"The more we know, the smarter your protocol gets."`
- **Quick Start**: Phases 1, 2, 7. Safe goal-based starting protocol in a fraction of the time. Can add remaining phases anytime to deepen.
- No manipulative urgency, no countdown pressure, no dark patterns. Kelsey reviews copy.

### 2.2 What each path includes

**Quick Start (phases 1, 2, 7):**
- Phase 1, Demographics & Biodata: identity + biodata needed for BOS, macros, dosing.
- Phase 2, Lifestyle & Goals: activity level, goals, Weight Goals sub-section that the macro engine in 173/173a requires. Quick MUST always include this.
- Phase 7, Medications, Supplements, and Allergies: the safety screen. Quick MUST always include this. Safety is never skipped.

**Complete (phases 1 through 7)**: adds Health Concerns & Family History (3), Physical Symptoms (4), Neuro Symptoms (5), Emotional Symptoms (6) for full personalization.

### 2.3 Numbering, dots, interstitials adapt to selected path

- Derive path from filtered view of canonical phase order array from 173b. Quick filters to identifiers `phase_demographics`, `phase_lifestyle`, `phase_meds_supps`.
- Step labels path-relative in Quick: `Step 1 of 3`, `Step 2 of 3`, `Step 3 of 3` + line like `"4 more phases available for a complete protocol."` Complete keeps `Phase X of 7`.
- Progress dots derive from selected path. Quick shows fewer dots. Counts NOT hardcoded.
- Interstitials filtered by same set. Quick shows only interstitials bound to phases 1, 2, 7. Semantic binding from 173b makes this automatic. No interstitial is rewritten.
- AI protocol engine triggers on completion of LAST phase in SELECTED path. In Quick that is Phase 7 (Medications, Supplements, and Allergies), already last. Engine still works WITHOUT GENEX360.

### 2.4 Resumable, upgradeable, positive personalization indicator

- Quick is NOT a dead end. After finishing Quick, user can complete remaining phases anytime. Completing them recomputes protocol + macros.
- Personalization indicator rises as phases complete, framed as unlocking precision (`"Add the symptom phases to deepen your protocol"`), never as failed/deficient score. This is the re-engagement loop.
- Protocol engine handles partial input gracefully. With Quick, phases 3-6 absent. Engine produces a protocol from available data + marks as preliminary or baseline confidence. NO code path may assume all phases present.
- Brief calm disclaimer on Quick-derived protocol: starting point that becomes more precise as more phases are completed. Kelsey reviews.

### 2.5 Tier and data

- Path choice is membership-tier agnostic. NOT gated by Free, Gold, or Platinum.
- Store selection on CAQ session: `caq_path` enum (`quick` | `complete`) + flag/timestamp set when Quick user later upgrades to complete. Append-only migration, RLS on, user-scoped. Protocol engine reads `caq_path` + set of completed phases to determine confidence.

## 3. Acceptance criteria

1. Interstitials present visible advance affordance, advance on tap (incl. anywhere), otherwise auto-advance after §1.2 delay with visible progress fill.
2. Auto-advance pauses on interaction, disabled under `prefers-reduced-motion`, can be turned off in settings. Screen-reader users never advanced before copy finishes.
3. All advance constants in ONE config module.
4. Choice screen appears at start of Phase 1, presents both options evenly, does not pre-select Quick, leads with Complete. No manipulative urgency.
5. Quick Start runs phases 1, 2, 7 ONLY and ALWAYS includes Weight Goals subsection (Phase 2) and safety screen (Phase 7).
6. Quick uses path-relative numbering (Step X of 3) with "more phases available" line. Complete uses Phase X of 7.
7. Progress dots + interstitials derive from selected path. Quick shows only dots + interstitials for phases 1, 2, 7. Counts NOT hardcoded. No interstitial rewritten.
8. Protocol engine triggers on completion of LAST phase in selected path, produces protocol from partial input in Quick, marks confidence as preliminary, still works WITHOUT GENEX360. NO path assumes all phases present.
9. Quick user can complete remaining phases later. Doing so recomputes protocol + macros + raises personalization indicator, framed positively.
10. `caq_path` stored with RLS on via append-only migration. Path choice NOT gated by membership tier.
11. Renders correctly on Desktop + Mobile, meets WCAG 2.2 AA, no em-dashes or en-dashes.
12. No new dependency. No package.json change. No edits to applied migrations. Supabase email templates untouched.
13. Phase 1 title reads `Demographics & Biodata` consistently across CAQ.

## 4. Out of scope and unchanged

- No CAQ question content changes. No locked interstitial copy changes (173b). No macro engine changes (173, 173a).
- No change to BOS weighting. Completing more phases improves protocol personalization + confidence, NOT score formula.

## 5. Build sequence

1. Build hybrid interstitial advance component (tap, reading-time auto, progress fill, pause, reduced-motion, settings). Centralize constants.
2. Build Quick vs Complete choice screen at start of Phase 1, even framing, no pre-selection.
3. Filter canonical phase order array by selected path. Drive step labels, dots, interstitials from filtered set.
4. Make protocol engine partial-input aware with confidence level; confirm trigger fires on last phase of selected path.
5. Add `caq_path` storage + upgrade flag via append-only migration, RLS on. Build personalization indicator + resume-to-upgrade flow.
6. Reconcile Phase 1 title to `Demographics & Biodata` across CAQ.
7. Kelsey reviews choice-screen copy + preliminary-protocol disclaimer. Michelangelo tests green across §3.
8. Push to main.
