# Prompt 173b: CAQ Interstitial Remap and Phase Renumbering (Semantic Binding Confirmed)

**Filed:** 2026-06-03
**Owner:** Gary (gary@farmceuticawellness.com)
**Status:** FILED. §0 item 1 (phase title) ratified: retire `Lifestyle & Functional Assessment`. §0 item 2 (teaser placement) ratified: render on interstitial card. Prompt 173 master now filed (`prompt-173-master-spec-2026-06-01.md`, 2026-06-03), dependency cleared. Ready for kickoff once 173's outstanding DPs ratify.
**Dependency:** Prompt 173 master at `prompt-173-master-spec-2026-06-01.md`. Canonical phase order array referenced in §1 of this prompt must be introduced in `src/config/caq-phases.ts` or equivalent as part of 173's Phase 1 (Build sequence §12 step 1).

---

## Relationship to Prompt 173

Finalizes Decision Point 1 of Prompt 173. Supersedes Prompt 173 Section 3.3 with the confirmed approach and the locked copy. Confirms the new phase numbering used across Prompt 173 and 173a. Everything else in 173 and 173a stands.

## Confirmed Decision

Semantic binding. Each interstitial is bound to its phase and travels with it. The C6 quote ("What you take matters. What you take it with matters more.") stays attached to the Medications, Supplements, and Allergies phase wherever that phase sits. Counts preserved at 16 progress dots and 10 interstitials. No interstitial added or removed.

## Agents

Jeffery (Orchestrator), Kelsey (compliance review of user-facing copy), Michelangelo (TDD / OBRA).

## Stack

Next.js 14+, TypeScript, Tailwind, Supabase (nnhkcufyqjojdbvdrpky, us-east-2), Capacitor (com.farmceutica.viaconnect), Vercel to viaconnectapp.com.

## Delivery Model

Direct push to main. No PRs. Desktop + Mobile simultaneously. No em-dashes, no en-dashes. The `×` multiplication sign in `LIFESTYLE × GENOMICS` kickers is intentional and retained.

---

## 0. Confirm before running

1. **Phase title reconciliation.** Phase moving to position 2 referenced two ways: current long label `Lifestyle & Functional Assessment` and phase-screen display title `Lifestyle & Goals`. This prompt uses `Lifestyle & Goals` user-facing and retires `Lifestyle & Functional Assessment` from display. Confirm or keep the long label somewhere.
2. **Role of teaser lines.** `Sleep, stress, movement, mood. These shape your biology more than most realize.` and `Now let's talk about what brought you here. Your health, your family, your goals.` are read as transition teaser lines leading INTO each phase's interstitial. If they should live on the phase intro screen instead, redirect placement. Copy itself locked as written.

## 1. Binding rule (authoritative)

- Every interstitial keyed to stable phase identifier (`phase_lifestyle`, `phase_family_history`, `phase_meds_supps`), not numeric position.
- Interstitial sequencer renders in order phases appear in canonical phase order array (Prompt 173 §3.3).
- Reordering phases reorders interstitials automatically, no copy edits required.
- Only the two Section 3 phases have locked copy in this prompt; every other interstitial carried over verbatim from 15e, only render order changes.
- Do not add, remove, or rewrite any interstitial other than the two specified.
- C6 interstitial stays bound to Medications, Supplements, and Allergies; copy unchanged.

## 2. New canonical phase order

| New position | Phase id | User-facing title | Moved from |
|---|---|---|---|
| Phase 1 of 7 | `phase_demographics` | Demographics | 1 (unchanged) |
| Phase 2 of 7 | `phase_lifestyle` | Lifestyle & Goals | 7 |
| Phase 3 of 7 | `phase_family_history` | Health Concerns & Family History | 2 |
| Phase 4 of 7 | `phase_physical_symptoms` | Physical Symptoms | 3 |
| Phase 5 of 7 | `phase_neuro_symptoms` | Neuro Symptoms | 4 |
| Phase 6 of 7 | `phase_emotional_symptoms` | Emotional Symptoms | 5 |
| Phase 7 of 7 | `phase_meds_supps` | Medications, Supplements, and Allergies | 6 |

Renumber rule: every `Phase X of 7` label driven by position in canonical order array, never hardcoded.

## 3. Locked copy

### 3.1 Phase 2 of 7 | Lifestyle & Goals (`phase_lifestyle`, moved from 7)

**Transition teaser line**
> Sleep, stress, movement, mood. These shape your biology more than most realize.

**Interstitial card**
- Kicker: `LIFESTYLE × GENOMICS`
- Headline: `Your Life Meets Your DNA`
- Body: `Your lifestyle patterns interact with your genetic variants. We map both to build protocols that fit your actual life.`

**Phase screen**
- Phase label: `Phase 2 of 7`
- Title: `Lifestyle & Goals`
- Subtitle: `Daily habits, routines, and wellness goals`

Holds the `What are your top wellness goals?` component and the Weight Goals sub-section added in Prompt 173. Supplies the activity level used by the macro engine in Prompts 173 and 173a.

### 3.2 Phase 3 of 7 | Health Concerns & Family History (`phase_family_history`, moved from 2)

**Transition teaser line**
> Now let's talk about what brought you here. Your health, your family, your goals.

**Interstitial card**
- Kicker: `WHY THIS MATTERS`
- Headline: `Family History × Genomics`
- Body: `Your family's health patterns are early signals of genetic risk. Combined with GENEX360, they help us prioritize what to screen and what to protect.`

**Phase screen**
- Phase label: `Phase 3 of 7`
- Title: `Health Concerns & Family History`
- Subtitle: `What you're experiencing and what runs in your family.`

### 3.3 Phase 7 of 7 | Medications, Supplements, and Allergies (`phase_meds_supps`, moved from 6)

- C6 interstitial stays bound here. Copy unchanged: `What you take matters. What you take it with matters more.`
- Phase label updates from `Phase 6 of 7` to `Phase 7 of 7`, driven by canonical order array.
- AI protocol engine still runs on completion of this final phase. Still works WITHOUT GENEX360 per Prompt 173 §3.2.

### 3.4 All other phases

- Physical, Neuro, Emotional Symptoms keep existing interstitials + phase copy from locked 15e map. Only phase numbers and render order change per Section 2.
- Single interstitial video (Supabase `DNA HD.mp4`) unchanged. Used for all interstitials.

## 4. Implementation notes

- Single source of order: canonical phase order array from Prompt 173 §3.3. Progress component, interstitial sequencer, phase-label renderer, protocol trigger all read from that one array.
- Stable identifiers everywhere: interstitials, analytics events, saved session state key off the stable phase identifier, never the numeric position. Keeps historical funnel analytics interpretable across the reorder.
- Progress dots: 16 dots total, unchanged. Dot sequence re-derives from new phase order. No dots added or removed.
- Interstitial count: 10 interstitials total, unchanged. Remap reorders them; does not change the count.
- In-flight session remap: a user who started under the old order resumes correctly. Map any stored old position to new order on load using the stable identifier. Same remap required in Prompt 173 §3.4.
- Copy source of truth: §3.1 and §3.2 are authoritative for those two interstitials and supersede divergent text in 15e. Kelsey reviews final user-facing strings.

## 5. Acceptance criteria (Michelangelo, TDD or OBRA)

1. CAQ renders 7 phases in §2 order with correct `Phase X of 7` label on each, driven by canonical order array rather than hardcoded numbers.
2. Lifestyle & Goals interstitial (kicker, headline, body) and teaser render in Phase 2 exactly as locked in §3.1.
3. Health Concerns & Family History interstitial and teaser render in Phase 3 exactly as locked in §3.2.
4. C6 quote renders bound to Medications, Supplements, and Allergies at Phase 7, copy unchanged.
5. Progress dots remain 16 and interstitials remain 10. No interstitial other than the two specified was added, removed, or rewritten.
6. Every interstitial and analytics event keys off a stable phase identifier, not a numeric position.
7. An in-progress CAQ session started under the old order resumes without landing on a broken step.
8. AI protocol engine triggers on completion of the final phase regardless of phase index and still works WITHOUT GENEX360.
9. All copy renders correctly on Desktop and Mobile, no em-dashes or en-dashes appear in any new copy or comment.

## 6. Out of scope and unchanged

- Changes phase order, numbering, and the two specified interstitials only.
- Does NOT change any CAQ questions, the Weight Goals sub-section (Prompt 173), or the macro engine (173 and 173a).
- No new dependency. No package.json change. No edits to applied migrations. Supabase email templates untouched.

## 7. Build sequence

1. Confirm Section 0 (two items).
2. Ensure canonical phase order array from Prompt 173 §3.3 reflects Section 2 order with stable phase identifiers.
3. Bind each interstitial to its phase identifier. Lock §3.1 and §3.2 copy. Leave other interstitials carried over from 15e.
4. Drive every `Phase X of 7` label and progress dots from canonical order array.
5. Add or verify in-flight session remap by stable identifier.
6. Kelsey reviews user-facing copy. Michelangelo's tests green across §5.
7. Push to main.

---

## Live-state findings memorialized for future-me

- Current CAQ interstitial config at `src/config/caq-interstitials.ts`. Positions hardcoded in `subtext` strings (e.g., `"Phase 2 of 7 | Health Concerns & Family History"`) AND in `dotPosition` numeric fields. No central canonical phase order array exists today; that array is supposed to come from Prompt 173 §3.3 which is NOT yet filed in `docs/prompts/`.
- Current order in code: 1.Demographics, 2.Family History, 3.Physical, 4.Neuro, 5.Emotional, 6.Medications, 7.Lifestyle. Section 2 of 173b reorders these.
- Phase 2 (Family History) and Phase 7 (Lifestyle) interstitials in code ALREADY use the locked §3.1 and §3.2 copy verbatim (matching kickers, headlines, bodies). Only the phase position labels need to change.
- C6 (medications) interstitial copy exactly matches §3.3 verbatim. Only the position label (`Phase 6 of 7` → `Phase 7 of 7`) needs to update.
- Three post-CAQ interstitials beyond the 7 phase ones: `caq-complete` (P1, dot 15), `packages-intro` (P2, dot 0), `welcome-dashboard` (P3, dot 0). Total 10 confirmed.
- `CAQ_TOTAL_DOTS = 16`. Dot sequence: C1=1, C2=3, C3=5, C4=7, C5=9, C6=11, C7=13, P1=15. Spacing of 2 between phase interstitials suggests phase content sits at odd or interleaving positions.
- Phase 6 (Medications/Supplements) has a dedicated component subtree at `src/components/caq/phase6/` (`WhatYouAreTaking`, `SupplementSearchBar`, `BrandProductAutocomplete`, `BrandProductSearch`, `SupplementPhotoUpload`). The directory name `phase6` is a numeric position identifier that will be stale after the remap (Medications becomes Phase 7). Per §1 binding rule, components should key off stable phase identifier `phase_meds_supps` not the numeric `phase6`. Directory rename is in scope to enforce the stable-id rule but adds risk of import-path churn; recommendation deferred to ratification.
- `src/lib/caq/fetchPreviousCAQ.ts`, `src/lib/caq/complete-caq.ts`, `src/lib/caq/calculateDeltas.ts`, `src/lib/caq/supplement-save-state.ts` likely also touch phase ordering or position-based logic. Audit required before Phase 0 dispatch.

## Open gates

1. **Prompt 173 master dependency.** RESOLVED 2026-06-03. Prompt 173 master filed at `prompt-173-master-spec-2026-06-01.md`. Canonical phase order array delivery sits inside 173's Build sequence §12 step 1.
2. **§0 Item 1, Phase title.** RESOLVED 2026-06-03: retire `Lifestyle & Functional Assessment` everywhere; user-facing surface uses `Lifestyle & Goals`.
3. **§0 Item 2, Teaser line placement.** RESOLVED 2026-06-03: teaser lines render on the interstitial card above the kicker.
4. **`phase6/` directory rename.** OPEN. Stable-id rule says directories should key off `phase_meds_supps` not numeric. Confirm whether to rename `src/components/caq/phase6/` to `src/components/caq/phase-meds-supps/` (or keep numeric path and accept the stale name as internal only).
