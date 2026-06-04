# Prompt 173 + 173a Compliance Memo

**Filed:** 2026-06-03 (rebuilt on main from the parked branch's compliance
memo). Every regulated surface introduced by Prompts 173 and 173a, compiled
for Gary's compliance sign-off before public ship.

**Approval posture.** The spec assigns this review to Kelsey (FDA / Health
Canada). There is no Kelsey agent on main; Hannah validated the health copy
during the parked-branch build and Gary owns the final sign-off (he owns
all compliance gates). Nothing here ships live until Gary clears it.

---

## 1. Daily Macros disclaimer (single source)

Source of truth: `src/components/nutrition/MacroDisclaimer.tsx` exporting
`MACRO_DISCLAIMER_TEXT`. The same string mounts on every macro surface
(Nutrition Log Daily Macros card today; Body Tracker GoalWeightTimelineCard
as of Phase 9).

> These daily targets are general wellness estimates for healthy adults,
> not medical, dietetic, or clinical advice, and are not a substitute for
> care from a qualified professional. They have not been evaluated to
> diagnose, treat, cure, or prevent any health condition, and they may not
> fit every situation, including pregnancy, breastfeeding, or a diagnosed
> medical condition. Please talk with a qualified healthcare or nutrition
> professional before making significant changes to your diet.

**Intent breakdown:**

- "general wellness estimates for healthy adults": scopes the audience.
- "not medical, dietetic, or clinical advice": the conventional non-advice
  disclaimer required by both US and Canadian wellness-app posture.
- "not a substitute for care from a qualified professional": standard
  safety clause.
- "not been evaluated to diagnose, treat, cure, or prevent any health
  condition": US FDA structure/function rule for non-drug products. Same
  language reads cleanly against Health Canada's "natural health
  product" advertising posture, which also requires non-diagnostic
  framing for wellness estimates.
- "they may not fit every situation, including pregnancy, breastfeeding,
  or a diagnosed medical condition": Section 7 of the spec asked for
  pregnancy/breastfeeding self-identification because no CAQ signal
  exists for those states; this line covers the gap without collecting
  new data.
- "talk with a qualified healthcare or nutrition professional": jurisdiction-
  neutral referral wording. Reads as "registered dietitian" in Canada
  and "registered dietitian nutritionist" in the US without forcing
  either term on the user.

**Verification:** the disclaimer text is locked by
`tests/weight-goals/macro-disclaimer.test.ts`, which fails the build if
any of the four US/CA anchor phrases is removed or if an em-dash / en-dash
is introduced.

## 2. Sub-18.5 target BMI note (CAQ Weight Goals)

Source: `src/components/caq/WeightGoalsSection.tsx`. Shown when the goal
weight implies a target BMI below 18.5 and the engine routes the user to
the conservative path.

> This target is on the lower side of commonly cited healthy weight
> ranges for your height. That can still be the right choice for some
> people, and it is worth talking through with a healthcare professional
> to make sure it fits your needs.

Non-blocking, calm, non-diagnostic. Routes to a professional + the
conservative engine path. Softened from "below the healthy range" so it
reads as information, not a verdict on the user's body (Hannah review).

## 3. Disordered-eating safety mode copy (CAQ Weight Goals)

Source: `src/components/caq/WeightGoalsSection.tsx`. Shown when the 169b
`profiles.body_scan_de_response` signal is `currently` or `in_the_past`.

> We will keep things focused on steady, maintenance oriented habits
> rather than a target pace. If a weight goal feels stressful, it is
> completely okay to skip it, and a healthcare professional can help you
> set goals that feel right for you.

Triggered by the existing 169b signal via the safeguard stub on main
(`src/lib/body-tracker/disordered-eating-safeguard.ts`). The stub
returns `active: false` whenever the column is absent (current state on
main pre-169b), so the CAQ tone defaults to non-safety until 169b lands
and the column populates.

## 4. Conservative-path note (Nutrition Log Daily Macros card)

Source: `src/components/nutrition/DailyMacroRings.tsx`. Shown when the
active targets row carries `conservative_path = true`.

> We are keeping these targets steady and maintenance oriented for now.
> A healthcare professional can help you set goals that feel right for
> you.

Calm, maintenance-oriented, professional-referral. NO deficit, NO
rate-of-change language. Direction chip is suppressed when this fires.

## 5. Goal-direction labels + validation strings

- Direction labels: `Lose` / `Gain` / `Maintain` (calm, factual, not
  motivational).
- Validation (Weight Goals input):
  - "Please enter a weight greater than zero."
  - "That number looks lower than we would expect for your height.
     Please double check the value and your {unit}."
  - "That target looks higher than expected for your height. Please
     double check the number and your {unit}."

The below-band string reframed as an input-sanity nudge (Hannah review),
since it fires on the BMI 13 typo/unit guard, not a health judgment.

## 6. Safe-range guardrails

Centralized in `src/lib/gordon/macro-config.ts` (`MACRO_CONFIG`) +
`src/lib/weight-goals/guardrails.ts`. All tunable in one place.

- Goal-weight plausibility band: target BMI 13 to 60 (rejects implausible
  typos / unit confusion). Below 18.5 surfaces the Section 2 note +
  routes conservative.
- Calorie floor on the Lose path: never below the greater of the sex
  floor and the user's BMR. Sex floors: female 1200, male 1500 kcal/day.
- Deficit cap 600 kcal/day; surplus cap 500 kcal/day.
- Weekly rate cap: 1% of body weight per week. Body Tracker
  GoalWeightTimelineCard respects the same cap so the timeline never
  implies a faster pace than the macros support.
- Protein: 0.8 g per pound of LBM with the goal multiplier (Loss 0.9 /
  Maintain 0.8 / Gain 1.0), 40% kcal sanity ceiling, fat hormonal floor
  0.6 g/kg of current weight.
- Healthy fat floor enforced across every dietary choice including keto.

## 7. Decisions requiring Gary's ratification

- UNSPECIFIED biological sex: uses the Mifflin-St Jeor average sex term
  (-78) for BMR AND the FEMALE calorie floor (1200) as the conservative
  choice. Labeled an estimate via `basis.sexEstimated`. Gary ratifies for
  the compliance record.
- PREGNANCY / BREASTFEEDING: no CAQ or profile signal exists, and the
  spec says do not invent new collection. The engine cannot auto-route
  pregnant/breastfeeding users to the conservative path on that basis
  alone (the DE-mode, under-18, and sub-18.5-BMI paths still apply).
  The Section 1 disclaimer carries the general professional-referral
  safety net. If Gary wants explicit pregnancy/breastfeeding handling,
  it needs a new CAQ signal (a separate prompt).
- UNDER 18: derived from date of birth; routes to the conservative
  (maintenance) path with the professional-referral posture. No
  aggressive deficit/surplus.
- DIETARY CHOICE default: when no choice is captured the engine treats
  the user as `balanced` and records the effective value on the
  `nutrition_targets.dietary_choice` column. When the CAQ selector +
  `/settings/nutrivision` mirror lands (Hannah-owned future phase), the
  default no longer fires for users who have made an explicit choice.

## 8. What 173 and 173a did NOT touch (reaffirmed)

- Supabase email templates, `package.json` (no new deps), prior applied
  migrations, the "10x to 28x" bioavailability copy, Helix consumer-only
  scoping.
- Legacy nutrition text exception (`/api/nutrition/analyze-text` +
  `/nutrition/log-meal`) is unchanged; macro adherence excludes legacy
  text meals by construction.

## 8b. Preliminary-protocol disclaimer (Prompt 173c, Quick path)

Source: `src/lib/caq/confidence.ts` exporting `getPersonalizationCopy('preliminary')`. Surfaces alongside the macros + protocol output whenever the Quick path produced the active row (phases 1, 2, 7 only).

> Your starting protocol is ready. Add the symptom phases to deepen the personalization.

**Why this satisfies the spec.** 173c §2.4 requires a calm disclaimer on Quick-derived protocols that the result is a starting point that becomes more precise as more phases are completed. The copy frames Quick as a positive starting point (NOT a failed score per 173c §0.5) and routes the user toward upgrading without any urgency, countdown, or dark pattern.

**Kelsey scope.** The disclaimer is generic wellness framing; it names no compound, drug, peptide, ingredient, or SNP. It carries the same posture as Section 1: not medical / dietetic / clinical advice, professional referral implied through the broader MacroDisclaimer (which renders on the same surface).

**Tests** at `tests/caq/confidence.test.ts` lock the preliminary, standard, and full strings against any future revision that would frame the partial result as failed / incomplete / missing / deficient / inadequate (case-insensitive substring guard).

## 9. Marshall dictionary scan posture

Per `feedback_marshall_dictionary_predelivery_scan`, every public-copy
prompt runs the Marshall dictionary scan (`unapproved_peptides` + rule
files) pre-delivery; any hit is a hard block. The disclaimer + safety
copy in Sections 1 to 4 are generic wellness language and name no
compounds, ingredients, peptides, drugs, or SNPs, so Marshall scan is
expected to pass cleanly. If a future revision introduces a named
compound or therapy term in this memo, route through the Marshall agent
before changing the source-of-truth string.

## 10. Sign-off checklist for Gary

- [ ] Section 1 MACRO_DISCLAIMER_TEXT reads correctly in production
      typography on both Nutrition Log and Body Tracker.
- [ ] Section 2 sub-18.5 note fires only when goal BMI < 18.5 and
      reads as non-diagnostic.
- [ ] Section 3 DE safety mode copy still fires when 169b column is
      populated and the user reports active history.
- [ ] Section 6 guardrail constants reflect intent (no surprise tuning).
- [ ] Section 7 unspecified-sex floor + pregnancy/breastfeeding posture
      ratified for the compliance record.
- [ ] Marshall scan reports zero hits on Sections 1 to 4.
