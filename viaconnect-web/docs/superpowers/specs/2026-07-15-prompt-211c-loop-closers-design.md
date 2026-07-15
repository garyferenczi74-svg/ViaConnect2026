# Prompt 211c Loop Closers (Part 1) Design

Status: DRAFT for Gary review. Prep only. No code ships from this document, and
implementation does not begin until 211b has merged to main (binding order, charter section 2).

| Field | Value |
|---|---|
| Series | FormaVision V2 (Prompt 211), charter `docs/formavision/211-formavision-v2-charter.md` |
| Prompt | 211c, part 1 of 2 (this plan covers two of the four charter pillars) |
| Module owner | Arnold (Body Tracker) under Jeffery orchestration |
| Depends on | 211b honesty layer merged (see Section 6). 211a merged (origin PR #16) |
| Branch | feat/211c-loop-closers off origin/main |

## 1. Scope

This plan covers the two 211c pillars that form the tightest retention loop: set a goal,
then see what is really moving it.

In scope:

1. Interactive goal body. A silhouette morph on the FormaVision 3D avatar. The user drags
   the avatar toward a goal shape; the system infers the underlying girth and composition
   targets, wires them to a Gordon nutrition plan and a supplement protocol, and expresses
   progress as minimum-detectable-change milestones.
2. Causal attribution. A directional, hedged view of how the user's above-noise scan deltas
   relate to their adherence signals, framed as influence and never as a medical claim.

Out of scope (deferred to 211c part 2, a later plan): the posture and asymmetry module, and
the upgraded agent-guided journey. Both remain 211c charter pillars; they are simply not in
this plan.

## 2. Standing constraints inherited

From charter Section 0 and the two CLAUDE.md files. These are non-negotiable and every task
inherits them:

- Lucide React icons at strokeWidth 1.5 only. No emojis anywhere.
- No em dashes and no en dashes in code, comments, test names, or UI copy. Hyphens are fine.
  grep the diff before shipping.
- Design tokens only: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18,
  Instrument Sans. Status colors via severityToken. Agent names via getDisplayName.
- Desktop and mobile in synchronism, responsive from the first line.
- Append-only Supabase migrations, own-row RLS. Never edit an applied migration. Do not touch
  email templates or package.json.
- Resilience everywhere: withTimeout, safeLog, getCircuitBreaker. The 210d guardrails stay
  green on every branch.
- UNKNOWN and estimated stay honest, never 0, never fabricated. Honest disabled states are
  never flipped to look finished.
- Bio Optimization Score is the only score name. No medical claims. No accuracy figure in
  product before the 211b harness pass on a held-out cohort with Gary sign-off (cohortClaimGate).
- Gordon owns all nutrition computation as sole source of truth. No parallel nutrition logic.
- The V1 fallback ladder (cinematic, lite, 2D floor) and the one-source-of-truth rule (avatar
  equals cards equals vector) are never at risk.

## 3. Interactive goal body

### 3.1 Existing surfaces reused

- Avatar and mesh: `src/components/formavision/FormaVision3DAvatar.tsx`,
  `BodyCompositionAvatar.tsx`, `GhostMesh.tsx`, `src/components/body-tracker/scanning/AvatarComparison.tsx`.
- Goal data: the `body_goals` API under `src/app/api/body/goals/`, `useActiveGoal.ts`,
  `src/components/body-tracker/progress/goalModes.ts`, `useActiveBodyGoal`.
- Girth and composition: `/api/body/circumference`, `src/lib/arnold/scanning/circumferencePredictor.ts`,
  `src/lib/body-tracker/circumference.ts`, `useCircumferenceHistory`.
- Honesty (211b): `src/lib/formavision/noise/mdcEngine.ts`, `trendConfidenceBand.ts`,
  `src/components/formavision/WithinNoiseBadge.tsx`, cycle and pregnancy suppression.
- Future self placeholder: `src/components/formavision/FutureSelfPanel.tsx` (a basic version
  exists; this plan extends the projection surface, it does not fork it).

### 3.2 Interaction model

The morph is a live what-if preview. Dragging the avatar never persists anything. The user
adjusts toward a goal shape; the preview updates the inferred targets and a preview plan in
real time. A distinct, explicit commit action turns the previewed shape into the user's active
goal. This avoids accidental goals and keeps the exploratory and committed states clearly separate.

### 3.3 Target inference

Morph parameters map to inferred waist and hip girth targets and an inferred body-fat target,
which are exactly the regions the 211b honesty layer certifies. The morph is clamped to a
physiologically plausible envelope anchored on the user's current scan, so the user cannot drag
to an impossible body and then receive a plan that implies it is attainable. The inference is a
pure function (current scan measurements plus morph parameters in, inferred region targets out)
and is unit tested independently of the UI.

### 3.4 Plan generation

On commit, the inferred targets drive:

- A Gordon nutrition plan. Gordon computes nutrition targets to support the goal. This plan is
  produced by the existing Gordon computation path. No nutrition math is written in this module.
- A supplement protocol. The existing recommendations and protocol engine surfaces supplements
  relevant to the goal. Reuse only.

The commit persists the goal shape target (Section 5.1) and references the generated plan. The
goal body then reads back the active goal and its plan on subsequent visits.

### 3.5 Progress expression

Progress toward the committed goal is expressed as minimum-detectable-change milestones. The
next milestone is the smallest change the honesty layer can distinguish from noise for that
region, computed via `mdcEngine`. Pace is qualitative, derived from `target_pace_preset`. No
predicted dates and no numeric accuracy figures appear. A change that is within noise is never
rendered as progress.

### 3.6 Safety gates

- Pregnancy mode suppresses the entire goal-body projection and plan, with supportive copy.
  This gate fails closed: on loading, error, or ambiguity, the projection is suppressed rather
  than risking a flash of a projection to a pregnant or lactating user. This mirrors the 211b
  pregnancy-mode pattern.
- The 208a weight guardrail framing holds: supportive tone, an optional practitioner check-in,
  no shaming, no single number to chase. The silhouette morph is shape-first by design, which
  is consistent with this guardrail.
- No accuracy number pre-cohort: any surface that would show a numeric precision defers to
  `cohortClaimGate` and renders the honest gated state instead.

## 4. Causal attribution

### 4.1 Engine

A new pure TypeScript engine under `src/lib/formavision/` takes two inputs: the user's
per-region scan-delta timeline filtered to MDC-passed (meaningful) deltas only, and an
adherence-signal timeline. It returns a ranked list of directional signals. Each signal carries
a confidence tier and a bounded copy-template id. The ranking, thresholds, and tier assignment
are pure and unit tested. The engine performs no I/O.

### 4.2 Honesty and minimum signal

- Only above-noise deltas are eligible. A within-noise delta never feeds an attribution.
- A minimum number of eligible data points is required before any attribution is shown. Below
  that threshold the surface renders an honest "not enough signal yet" state, never a fabricated
  or speculative attribution.
- Attribution is n equals 1 (the user's own history versus their own adherence). The copy and
  the confidence tiers reflect that this is a personal pattern, not a proven population effect.

### 4.3 Copy and compliance

Directional and hedged language is used, for example "your waist trend is likely moving
alongside your logging consistency." A fixed, bounded template set generates every string. No
free-form language-model output is rendered as attribution copy, because directional language
must be controlled and signable. Every template string is a Kelsey clearance merge gate and is
copy-locked. No string may cross into a medical claim.

### 4.4 Surface

Attribution renders on the journey timeline and body-tracker progress surface, beside the
existing honesty presentation, so a user sees what changed, whether it was real, and what it is
likely moving alongside, in one place.

## 5. Cross-cutting

### 5.1 Data

- Goal shape target: persisted append-only, either as an extension of `body_goals` or a
  companion `goal_shape_targets` table, decided at task 1 (discovery) after reading the current
  `body_goals` schema. Own-row RLS. The choice is recorded in the plan before any migration is written.
- Attribution: compute-only. No new persistence unless a read-through cache is justified during
  build, in which case it is own-row RLS and additive.

### 5.2 Resilience, telemetry, testing

- All new reads use withTimeout, safeLog, and a circuit breaker where an external call is
  involved, per CLAUDE.md.
- Telemetry events fire for goal-body open, morph interaction, goal commit, and attribution
  view, landing in the 171-series dashboards before the prompt closes (charter Section 4).
- Pure engines (target inference, attribution ranking, milestone computation) are built
  test-first. Honesty invariants are explicitly tested: pregnancy suppression fails closed,
  within-noise is never shown as progress or attribution, no numeric accuracy appears
  pre-cohort. The 210e E2E suite is extended with the new seams.

### 5.3 Human gates

- Kelsey clears every attribution template string and every goal-body copy string before merge.
- Gary escalations per charter Section 5, including any new dependency or model.

## 6. Dependency on 211b

This plan consumes these 211b interfaces, which live on feat/211b-trust and are not yet on main:

- `src/lib/formavision/noise/mdcEngine.ts` and `trendConfidenceBand.ts` (meaningful versus
  within-noise classification, used by both pillars).
- `cohortClaimGate.ts` (no accuracy number pre-cohort).
- Cycle-aware and pregnancy-mode suppression (goal-body safety gate).
- `WithinNoiseBadge` and the noise-presentation pattern (shared honesty UI).

Because the binding order requires 211b to merge before 211c begins, implementation of this plan
starts only after 211b lands on main. Until then this document is prep. When 211b merges,
feat/211c-loop-closers rebases onto the new main and the referenced interfaces are present.

## 7. Task order (for the implementation plan)

1. Discovery: verify the 211b interfaces are present on main, map the concrete adherence signals
   attribution will consume (confirm the source tables), and read the parametric mesh parameters
   and the `body_goals` schema. Record the goal shape target storage decision.
2. Goal shape target model plus the pure target-inference engine (test-first).
3. Morph UI on the avatar (what-if preview, responsive, no persistence).
4. Commit path: persist the goal shape target, generate the Gordon nutrition plan and the
   supplement protocol through the existing engines, read back on revisit.
5. MDC-milestone progress plus the safety gates (pregnancy fail-closed, weight guardrail,
   cohortClaimGate).
6. Attribution engine (pure, test-first).
7. Attribution UI plus the bounded template set and the Kelsey copy lock.
8. Telemetry, 210e E2E seam extension, and the final whole-branch review.

## 8. Open items carried into planning

- The goal shape target storage choice (extend `body_goals` versus a companion table) is
  resolved in task 1 against the real schema.
- The exact adherence signals available (supplement adherence, nutrition logging consistency,
  protocol compliance) are confirmed in task 1. If a needed signal does not exist, the plan is
  adjusted before the attribution engine is built rather than fabricating a signal.
