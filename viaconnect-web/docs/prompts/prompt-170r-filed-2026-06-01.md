# Prompt 170r: Gordon Educational Content Surfacing (FILED)

**Filed:** 2026-06-01 (launch +0)
**Status:** FILED. NOT YET RATIFIED. NOT YET AUTHORIZED FOR BUILD.
**Spec source:** Gary paste 2026-06-01 with `ultrathink` directive
**Architectural review memorial:** `C:\Users\garyf\.claude\projects\C--WINDOWS-system32\memory\project_prompt_170r_filed.md` (11 concerns + 8 ratification asks + sequencing recommendation)

This file is a verbatim placeholder for the Gary-pasted 170r spec. The architectural review and the 8 ratification asks live in the memory file linked above. Per `[[feedback_no_unsolicited_changes]]` no spec drafting beyond memorialization until Gary ratifies the 8 asks.

## Strategic summary

A proactive educational content engine. Gordon authors 120-150 content cards across 8 taxonomies; a server-side surfacing engine scores cards per-user based on CAQ responses + meal patterns + supplement adherence + 170h insight links + user topic follows; surfaces top-1 daily on a new Dashboard "Learn today" card + Learn tab + 5 inline surfaces (meal save / recipe / insight detail / pantry / plan candidate). Strategic anchor: Bioavailability and Absorption category of 20-25 cards including a foundational "10x to 28x range explained" card that bridges Farmceutica's dual liposomal-micellar delivery story to user-facing education.

No LLM at runtime; all content authored + Kelsey-reviewed + variable-substituted with deterministic templating. Six new Supabase tables, six kill switches, six Helix events, seven admin rollups, two new cron jobs.

## Eleven architectural concerns flagged (full detail in memory file)

1. **FDA/FTC regulatory framing of bioavailability content (LARGEST RISK)** — Need outside counsel before bioavailability cards publish; the "10x to 28x" claim + product links may convert educational content into commercial speech.
2. **170c ratification is a hard prerequisite** not currently on the calendar.
3. **170h soft-dep is harder than the spec acknowledges** — spec equivocates on hard vs. soft; reframe needed.
4. **Content authoring + Kelsey review capacity ask is unprecedented** (500-800hr across 2 people; 3-5x prior 170-series prompts).
5. **Email digest infrastructure provider not specified** — Supabase email locked; SendGrid shelved; AWS SES outbound not provisioned.
6. **Nightly cron aggregate compute not sized** — at 100k users sequential processing exceeds Edge Function timeout.
7. **Variable substitution templating language risks scope creep** — lock vocabulary at Blueprint.
8. **Learn tab as new top-level nav: tab proliferation** — 7+ visible tabs on mobile post-mount.
9. **content_cards table inlines triggers as JSONB** — re-publish penalty for trigger tuning; separate table considered.
10. **Cumulative Helix event inflation** — 170r adds 6; cumulative across 170-series approaching 200-300/day ceiling.
11. **No em / en dash discipline in long-form prose** — 1,200-word content card prose is the highest-frequency em-dash use case; linter rule needed.

## Eight ratification asks for Gary

(Full detail in memory file.)

1. FDA/FTC counsel review of bioavailability framing
2. 170c ratification status confirmation
3. 170h soft-dep reframing
4. Phase split into 170r Phase 1 + supplement-2
5. Email digest provider decision
6. Learn tab placement (top-level vs. nested)
7. Templating language vocabulary freeze at Blueprint
8. 2-engineer staffing confirmation

## Sequencing recommendation

| Option | Phasing | Trade-off |
|---|---|---|
| A: Single Q3 2026 phase per spec | 120-150 cards + email digest all at once | Highest ship-risk; concentrates 4 long poles on one phase |
| **B: Phase split (recommended IF Gary green-lights counsel review)** | Phase 1 Q4 2026 - Q1 2027 (60-80 cards + Learn tab + Dashboard + 2-3 inline) + supplement-2 Q2-Q3 2027 (rest) | Aligns with 170o + 170p precedents; reduces single-phase risk |
| C: Defer to Q4 2026 / Q1 2027 single phase | Wait for 170c + 170h + counsel | Lowest ship-risk; sacrifices "Q3 priority 1" positioning |

## Standing rules

Per spec §21: append-only migrations, zero new package.json deps, no Supabase email touches, Lucide React strokeWidth 1.5, no emojis, Bio Optimization verbatim, Helix Rewards consumer-only, bioavailability "10x to 28x" verbatim site-wide AND across all content cards, no Semaglutide / Retatrutide injectable only / Tesofensine pending FDA, desktop-mobile simultaneous, no em/en dashes anywhere (CRITICAL for 1,200-word content card prose), brand tokens (Navy + Card + Teal + Orange), Instrument Sans typography, direct push to main no PR, Gordon canonical spelling, reading history consumer-only.

## Related

- `project_prompt_170r_filed.md` (architectural review memorial; primary working doc)
- `project_prompt_170c_filed.md` (HARD blocker dep)
- `project_prompt_170h_filed.md` (SOFT blocker dep)
- `project_prompt_170f_shipped.md` (provides recipe view mount point)
- `project_prompt_170p_phase_split.md` (analogous phase split precedent)
- `feedback_bioavailability_spec_28.md` (10x to 28x copy lock)
- `feedback_no_dashes.md` (long-form prose discipline)
- `feedback_jeffery_pre_launch_review.md` (Phase E audit gate)
- `feedback_no_unsolicited_changes.md` (no draft/build until Gary ratifies)
