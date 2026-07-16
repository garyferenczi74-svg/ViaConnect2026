# Prompt 211c Loop Closers (Part 2) Design

Status: DRAFT for Gary review. Prep only. No code ships from this document. Implementation is
gated: posture/asymmetry may not begin until 211b and 211c part 1 have merged to main; the
agent-guided journey may not begin until posture has merged (it orchestrates across all pillars).

| Field | Value |
|---|---|
| Series | FormaVision V2 (Prompt 211), charter `docs/formavision/211-formavision-v2-charter.md` |
| Prompt | 211c, part 2 of 2 (the two charter pillars deferred from part 1) |
| Module owner | Arnold (Body Tracker) under Jeffery orchestration, with Hannah on the guided journey |
| Depends on | 211b honesty layer merged; 211c part 1 merged (goal body, attribution). See Section 6 |
| Branch | feat/211c-loop-closers (shared with part 1) off origin/main |

## 1. Scope

This plan covers the two 211c pillars deferred from part 1, built posture first, then the
agent-guided journey as the capstone that ties every pillar together.

In scope:

1. Posture and asymmetry module. Surface the existing posture and asymmetry analysis as an
   actionable, corrective module: MDC-gated observations, plus bounded corrective guidance
   (Arnold movement suggestions and Gordon protocol tie-ins), with a hard Kelsey gate.
2. Upgraded agent-guided journey. A next-best-action orchestration engine across all pillars,
   plus a Hannah conversational entry grounded in the user's real journey state.

Out of scope: nothing further in 211c after this. 211d (moat activation) is a separate charter
prompt with its own dependencies.

## 2. Standing constraints inherited

Same as part 1 (charter Section 0 and the two CLAUDE.md files). Summarized:

- Lucide icons at strokeWidth 1.5 only. No emojis. No em dashes or en dashes anywhere.
- Design tokens only. Agent names via getDisplayName. Gordon slug lowercase gordon.
- Desktop and mobile in synchronism, responsive from the first line. 44px touch targets.
- Append-only migrations, own-row RLS. No email templates. No package.json changes.
- Resilience: withTimeout, safeLog, getCircuitBreaker. 210d guardrails stay green.
- UNKNOWN and estimated stay honest, never fabricated. No accuracy figure pre-cohort
  (cohortClaimGate). No medical claims.
- Gordon owns all nutrition computation. Arnold owns movement guidance.
- The V1 fallback ladder and the one-source-of-truth rule are never at risk.

## 3. Posture and asymmetry module

### 3.1 Existing surfaces reused

- Analysis engines: `src/lib/arnold/brain/postureAssessment.ts`,
  `src/lib/arnold/scanning/asymmetryAnalyzer.ts`, `src/lib/arnold/scanning/landmarkDetector.ts`.
- UI: `src/components/body-tracker/scanning/AsymmetryReportCard.tsx`,
  `src/components/body-tracker/photos/PoseGuide.tsx`, `poseConstants.ts`.
- Honesty (211b): `mdcEngine.ts` for gating asymmetry and posture-change deltas.
- Recommendation tie-ins: `src/lib/body-tracker/arnold-recommender.ts` and the Gordon path.

### 3.2 Observation layer (honesty-gated)

The module consumes the existing posture and asymmetry analysis. Every left/right difference and
every posture-metric change over time is passed through the 211b MDC gate. A difference or change
below the minimum detectable change is never flagged as an asymmetry or a trend; it renders as
within-precision using the 211b within-noise pattern. Only above-noise findings are surfaced.
Trend over time is shown honestly, with a "not enough signal yet" state until enough above-noise
data points exist.

### 3.3 Corrective guidance (bounded, Kelsey-locked)

Above-noise findings pair with specific corrective guidance:

- Movement suggestions are owned by Arnold and drawn from a fixed, bounded, Kelsey-locked
  template set. No free-form language-model output prescribes movement.
- Protocol tie-ins are owned by Gordon and the existing recommender. Reuse only.

All guidance is wellness-framed, never treatment or diagnosis. No string may imply a medical
condition or a cure. Every corrective string is a Kelsey clearance merge gate and is copy-locked.
Pregnancy handling is flagged for Kelsey: corrective movement guidance may need suppression in
pregnancy mode, resolved with Kelsey before that copy ships.

### 3.4 Surface

A posture and asymmetry module on the body-tracker surface: mount and extend `AsymmetryReportCard`,
add a posture card and a corrective-guidance panel, responsive, tokens only, honest empty states.

## 4. Agent-guided journey

### 4.1 Next-best-action engine

A new pure TypeScript engine takes signals from every pillar (goal body and attribution from part
1, posture from this part, and the nutrition and pillar signals already on the journey) and returns
a ranked next-best-action list. Each action is attributed to its owning agent (Hannah, Arnold, or
Gordon) and carries a bounded rationale template. The engine reuses the existing recommendation
engines (`useJourneyRecommendations`, `arnold-recommender`, and the existing ultrathink
recommendations) as inputs and adds only the prioritization layer. It is pure, unit tested, and
performs no I/O.

Honesty: the engine never surfaces a within-noise or fabricated signal as an action. An input that
the honesty layer classifies within-noise is not eligible to become a next-best-action.

### 4.2 Surface

`YourJourneyCoaching` is elevated to render the ranked next action or actions prominently, each
agent-attributed, above the existing coaching content. The existing coaching components are reused,
not replaced.

### 4.3 Conversational entry

A Hannah chat entry point grounded in the user's current journey state. It reuses the existing
Hannah ask pipeline (`/api/hannah/ask`) and injects a read-only snapshot of the user's journey
context (pillars, active goal, recent above-noise findings) as grounding. Hannah's answers respect
the honesty layer and `cohortClaimGate`: no accuracy figure, no fabricated data, no medical claim.
The existing Hannah compliance and QA directive continues to govern the conversation; the journey
context is grounding only and does not relax it.

## 5. Cross-cutting

### 5.1 Data

Mostly compute and reuse. A small append-only posture-trend table is added only if the posture
assessment results are not already persisted (verified in Task 1). Own-row RLS. The next-best-action
engine and the conversational grounding are compute-only.

### 5.2 Resilience, telemetry, testing

- All new reads use withTimeout, safeLog, and a circuit breaker where an external call is involved.
- Telemetry events fire for `posture_view`, `next_action_view`, and `journey_chat_open`, landing
  in the 171-series dashboards before the prompt closes (charter Section 4).
- Pure engines (MDC-gated asymmetry observation, next-best-action ranking) are built test-first.
  Honesty invariants are explicitly tested: within-noise never surfaced as a finding or an action,
  no accuracy figure pre-cohort, honest empty states. The 210e E2E suite is extended.

### 5.3 Human gates

- Kelsey clears every posture corrective template string, every next-best-action rationale
  template, and validates that the Hannah conversational grounding keeps the conversation
  compliant. Hard merge gate.
- Gary escalations per charter Section 5.

## 6. Dependency chain

This plan sits at the end of the 211c dependency chain:

- Posture and asymmetry consumes the 211b honesty layer (`mdcEngine`) and is additive to the
  body-tracker scan surface. It may begin once 211b and 211c part 1 have merged to main.
- The agent-guided journey orchestrates across the goal body and attribution (part 1) and posture
  (this part). Its next-best-action engine takes all of them as inputs, so it may begin only once
  posture has merged. Within this plan, the journey tasks come last for that reason.

Because the binding order requires each layer to merge before the next begins, this document is
prep. Task 1 verifies the required interfaces are present on main before any dependent task runs.

## 7. Task order (for the implementation plan)

1. Discovery: verify the 211b and 211c part 1 interfaces are present on main; read the posture and
   asymmetry engine output shapes and whether results are persisted; read the Hannah ask pipeline
   contract; read the journey coaching mount points and the recommendation engine signatures.
   Record the posture-trend storage decision.
2. Posture MDC-gated observation layer (pure, test-first).
3. Posture corrective-guidance bounded templates plus the Kelsey copy lock plus Arnold and Gordon
   tie-ins.
4. Posture module surface (AsymmetryReportCard extension, posture card, corrective panel, trend,
   honest states) plus telemetry.
5. Next-best-action engine (pure, test-first), reusing the existing recommendation engines as inputs.
6. Journey surface upgrade: render the ranked next action, agent-attributed.
7. Hannah conversational entry grounded in journey context (reuse the ask pipeline) plus compliance.
8. Telemetry, 210e E2E seam extension, and the final whole-branch review.

## 8. Open items carried into planning

- Whether posture assessment results are already persisted (determines if Task 1 adds a small
  posture-trend table). Resolved in Task 1 against the real code.
- The exact Hannah ask pipeline contract for injecting read-only journey grounding. Confirmed in
  Task 1.
- The exact recommendation engine signatures the next-best-action engine consumes. Confirmed in
  Task 1.
- Kelsey decision on pregnancy-mode suppression of corrective movement guidance.
