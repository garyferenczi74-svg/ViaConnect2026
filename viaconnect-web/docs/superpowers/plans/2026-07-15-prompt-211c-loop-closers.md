# Prompt 211c Loop Closers (Part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the interactive goal body (silhouette morph on the FormaVision avatar, wired to a Gordon nutrition plan and a supplement protocol, with minimum-detectable-change milestone progress) and directional causal attribution (scans versus adherence), the two 211c pillars that form the tightest retention loop.

**Architecture:** Two pure TypeScript engines carry the logic and are built test-first: a target-inference engine that maps morph parameters to inferred girth and body-fat targets clamped to a plausible envelope, and an attribution engine that ranks directional signals between above-noise scan deltas and adherence signals. Both are consumed by React surfaces on the body-tracker and journey pages. All honesty comes from the already-built 211b noise engine (`mdcEngine`), which this plan consumes and never reimplements. Persistence is one append-only companion table (`goal_shape_targets`); attribution is compute-only.

**Tech Stack:** Next.js 14 App Router, TypeScript strict (zero any), Tailwind, Supabase (Postgres, RLS, append-only migrations), React Three Fiber (existing avatar), Vitest.

## Binding precondition (do not start before this is true)

This plan's implementation is gated by the charter binding order. It may not begin until **211b (feat/211b-trust) has merged to main**. This plan consumes 211b interfaces (`mdcEngine`, `trendConfidenceBand`, `cohortClaimGate`, cycle and pregnancy suppression, `WithinNoiseBadge`) that are not on main until then. Task 1 verifies their presence on merged main before any dependent task runs. If 211b has not merged, stop and escalate.

Branch: `feat/211c-loop-closers` (currently off origin/main at 81f14385, 211a merged). When 211b merges, rebase this branch onto the new main before Task 2.

## Global Constraints

Every task inherits these. Copied verbatim from the charter Section 0 and the two CLAUDE.md files.

- Lucide React icons at strokeWidth 1.5 only. No emojis anywhere (code, UI, logs, copy).
- No em dashes and no en dashes anywhere (code, comments, test names, UI copy). Hyphens in compound words are fine. grep the diff before shipping.
- Design tokens only: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans. Status colors via `severityToken`. Agent names via `getDisplayName`. Gordon slug lowercase `gordon`.
- Desktop and mobile in synchronism, responsive Tailwind from the first line. Touch targets min 44x44 px. Inputs text-base (16px). No horizontal overflow. Grids `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`.
- Append-only Supabase migrations, own-row RLS. Never edit an applied migration. Do not touch email templates. Do not touch package.json or package-lock.json (if a dependency is genuinely needed, stop and ask Gary).
- Resilience: every new external call and server-side read uses `withTimeout` / `withAbortTimeout` from `src/lib/utils/with-timeout.ts`, `safeLog` from `src/lib/utils/safe-log.ts`, and `getCircuitBreaker` from `src/lib/utils/circuit-breaker.ts` for external APIs. Reason-tagged fail-open. The 210d guardrails stay green.
- UNKNOWN and estimated stay honest, never 0, never fabricated. Honest disabled states are never flipped to look finished.
- Bio Optimization Score is the only score name. No medical claims. No accuracy figure appears in product before the 211b held-out cohort pass and Gary sign-off (`cohortClaimGate`). Bioavailability copy at 10x to 28x where present.
- Gordon owns all nutrition computation as the sole source of truth. This plan writes no nutrition math; it calls the existing Gordon path.
- The V1 fallback ladder (cinematic, lite, 2D floor) and the one-source-of-truth rule (avatar equals cards equals vector) are never at risk.
- Zero TypeScript `any`. Pure engine files have no I/O.

## Human gates (tracked, not code)

- Kelsey clears every attribution template string and every goal-body copy string before merge (hard merge gate, Task 8).
- Gary escalations per charter Section 5 (any new dependency or model; public wording).

## File Structure

Created:

- `supabase/migrations/<ts>_prompt_211c_goal_shape_targets.sql` - companion goal-shape-target table, own-row RLS, append-only.
- `src/lib/formavision/goalbody/targetInference.ts` - pure: morph params plus current scan to inferred region targets, envelope-clamped.
- `src/lib/formavision/goalbody/milestones.ts` - pure: next MDC-anchored milestone for a region, via `mdcEngine`.
- `src/lib/formavision/goalbody/goalBodyTelemetry.ts` - telemetry events for the goal body (follows `src/lib/formavision/telemetry/avatarTelemetry.ts` pattern).
- `src/lib/formavision/attribution/attributionEngine.ts` - pure: ranks directional signals from MDC-passed scan deltas plus adherence timeline.
- `src/lib/formavision/attribution/attributionCopy.ts` - bounded template set (fixed strings, Kelsey-locked) plus template-id to string resolver.
- `src/lib/formavision/attribution/attributionTelemetry.ts` - telemetry events for the attribution surface.
- `src/hooks/formavision/useGoalShapeTarget.ts` - read and commit the active goal shape target (withTimeout, safeLog).
- `src/hooks/formavision/useCausalAttribution.ts` - read the adherence and scan-delta inputs, run the engine.
- `src/components/formavision/goalbody/GoalBodyMorph.tsx` - the interactive morph surface (what-if preview).
- `src/components/formavision/goalbody/GoalBodyPlanPanel.tsx` - the committed goal plus Gordon plan plus protocol plus milestone.
- `src/components/formavision/attribution/AttributionPanel.tsx` - the directional attribution list.
- `src/app/api/body/goal-shape/route.ts` - GET active shape target, POST commit shape target and trigger plan generation.
- Test files colocated under `__tests__/` beside each unit.

Modified:

- The docs discovery note from Task 1 (`docs/formavision/211c-part1-discovery.md`).
- The body-tracker or FormaVision page that hosts the goal body (exact path pinned in Task 1) to mount `GoalBodyMorph` and `GoalBodyPlanPanel`.
- The journey timeline / body-tracker progress surface (exact path pinned in Task 1) to mount `AttributionPanel`.
- The 210e E2E suite to add the two new seams.

---

### Task 1: Discovery and interface pinning

**Purpose:** This plan depends on interfaces that live on the (soon merged) 211b branch and on tables whose exact columns are not yet read. This task pins every external signature the later tasks consume, and records the goal-shape storage decision. Its deliverable is a committed discovery note. No feature code.

**Files:**
- Create: `docs/formavision/211c-part1-discovery.md`

**Interfaces:**
- Produces (for every later task): the confirmed export signatures and column lists listed in Step 2. Later tasks consume these names directly.

- [ ] **Step 1: Confirm 211b merged and interfaces present**

Run, from the repo root:

```bash
git log --oneline -1 origin/main | grep -i 211b || echo "211b NOT on main - STOP and escalate"
ls src/lib/formavision/noise/mdcEngine.ts src/lib/formavision/noise/trendConfidenceBand.ts
git ls-files | grep -iE 'cohortClaimGate|WithinNoiseBadge|pregnanc'
```

Expected: `mdcEngine.ts` and `trendConfidenceBand.ts` exist; `cohortClaimGate`, `WithinNoiseBadge`, and a pregnancy-suppression module are listed. If `mdcEngine` is absent, STOP and escalate (211b has not merged).

- [ ] **Step 2: Read and record exact signatures into the discovery note**

Read each source and copy its exact exported signature into `docs/formavision/211c-part1-discovery.md` under a heading per item. Record:

1. `src/lib/formavision/noise/mdcEngine.ts` - confirm `computeMDC95(band: ErrorBand): number | null`, `classifyGirthDelta(delta, regionToleranceCm): NoiseClassification | null`, `classifyBodyFatDelta(delta, referenceBodyFatPct, toleranceFraction): NoiseClassification | null`. (Verified at plan time; re-confirm no drift.)
2. `src/lib/arnold/scanning/accuracyTargets.ts` - the `RegionToleranceCm` values and the 8 region keys (neck, upperArm, forearm, upperLeg, lowerLeg, chest, waist, hip) and the body-fat `toleranceFraction`.
3. `src/lib/body-tracker/circumference.ts` and `src/lib/arnold/scanning/circumferencePredictor.ts` - the current-scan girth read shape (region keys, units, value type) that `targetInference` will take as input.
4. `src/components/formavision/BodyCompositionAvatar.tsx` and `GhostMesh.tsx` - the exact props (parameter names and types) the morph will drive. Record the morph-parameter surface.
5. `src/lib/body-tracker/arnold-recommender.ts` - the exact recommender entry signature (function name, input, return type) that Task 5 calls for the supplement protocol.
6. The Gordon nutrition computation entry used by the journey today (search `src/lib` for the Gordon nutrition-target path). Record the function name, input, and return type Task 5 calls.
7. The three adherence sources `a_protocol_adherence_log`, `b_nutrient_intake_ledger`, `_dashboard_adherence`: read their migrations, record the exact column names, per-user key, and date column Task 7 reads. Decide which one(s) feed attribution and record why.
8. `cohortClaimGate.ts` and the pregnancy-suppression module - the exact function names and return shapes Task 6 gates on.
9. `src/lib/formavision/telemetry/avatarTelemetry.ts` - the event-emit helper pattern Tasks 3 and 8 telemetry modules follow.
10. The host page paths for the goal body and for attribution (search the body-tracker and journey routes). Record the exact files Task 4 and Task 8 modify.

- [ ] **Step 3: Record the goal-shape storage decision**

In the note, record the decision (locked at plan time): a new append-only companion table `goal_shape_targets` (not an extension of the weight-based `body_goals`), because `body_goals` is lb and driver rate/date only (see `goalModes.ts`) and cannot represent per-region girth plus body-fat shape targets. Record the confirmed `body_goals` primary key and user column so Task 2 can reference the user the same way.

- [ ] **Step 4: Commit**

```bash
git add docs/formavision/211c-part1-discovery.md
git commit -m "docs(211c): part 1 discovery and interface pinning"
```

If any item in Step 2 cannot be confirmed (interface missing or changed), STOP and escalate before Task 2. A wrong signature here propagates into every later task.

---

### Task 2: goal_shape_targets table and generated types

**Files:**
- Create: `supabase/migrations/<ts>_prompt_211c_goal_shape_targets.sql`
- Modify: `src/types/supabase.ts` (regenerate; do not hand-edit)

**Interfaces:**
- Produces: table `goal_shape_targets` with columns `id uuid pk`, `user_id uuid`, `created_at timestamptz`, `is_active boolean`, `waist_target_cm numeric null`, `hip_target_cm numeric null`, `body_fat_target_pct numeric null`, `source_scan_id uuid null`, `plan_generated boolean default false`. Own-row RLS. Consumed by Task 5 and `useGoalShapeTarget`.

- [ ] **Step 1: Write the migration (append-only, own-row RLS)**

Create `supabase/migrations/<ts>_prompt_211c_goal_shape_targets.sql` (use the real timestamp when writing):

```sql
-- Prompt 211c part 1: goal shape target (silhouette morph committed goal).
-- Append-only. Own-row RLS. Companion to body_goals (which stays weight-based).
create table if not exists public.goal_shape_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  waist_target_cm numeric,
  hip_target_cm numeric,
  body_fat_target_pct numeric,
  source_scan_id uuid,
  plan_generated boolean not null default false
);

create index if not exists goal_shape_targets_user_active_idx
  on public.goal_shape_targets (user_id, is_active, created_at desc);

alter table public.goal_shape_targets enable row level security;

create policy "own rows select" on public.goal_shape_targets
  for select using (auth.uid() = user_id);
create policy "own rows insert" on public.goal_shape_targets
  for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.goal_shape_targets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration and verify RLS**

Apply via the supabase MCP (`apply_migration`). Then verify with `execute_sql`:

```sql
select relrowsecurity from pg_class where relname = 'goal_shape_targets';
select count(*) from pg_policies where tablename = 'goal_shape_targets';
```

Expected: `relrowsecurity` is true; policy count is 3.

- [ ] **Step 3: Regenerate types**

Regenerate `src/types/supabase.ts` via the generate-types MCP tool. Do not hand-edit.

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors; `goal_shape_targets` present in the generated Database type.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ src/types/supabase.ts
git commit -m "feat(211c): goal_shape_targets table and types"
```

---

### Task 3: Target-inference engine (pure, test-first)

Maps morph parameters and the current scan to inferred region targets, clamped to a plausible envelope. Pure, no I/O.

**Files:**
- Create: `src/lib/formavision/goalbody/targetInference.ts`
- Test: `src/lib/formavision/goalbody/__tests__/targetInference.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure).
- Produces: `inferTargets(input: MorphInput): InferredTargets` and the `MorphInput` / `InferredTargets` types, consumed by `GoalBodyMorph` (Task 4) and the commit path (Task 5).

Types:

```ts
export interface CurrentScan {
  waistCm: number;
  hipCm: number;
  bodyFatPct: number;
}
export interface MorphInput {
  current: CurrentScan;
  // normalized morph handle values in [-1, 1]; negative shrinks a region.
  waistMorph: number;
  hipMorph: number;
  leannessMorph: number;
}
export interface InferredTargets {
  waistTargetCm: number;
  hipTargetCm: number;
  bodyFatTargetPct: number;
  clamped: boolean; // true if any target hit the plausible envelope
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { inferTargets } from '../targetInference';

const base = { waistCm: 90, hipCm: 100, bodyFatPct: 25 };

describe('inferTargets', () => {
  it('maps zero morph to the current scan unchanged', () => {
    const r = inferTargets({ current: base, waistMorph: 0, hipMorph: 0, leannessMorph: 0 });
    expect(r.waistTargetCm).toBe(90);
    expect(r.hipTargetCm).toBe(100);
    expect(r.bodyFatTargetPct).toBe(25);
    expect(r.clamped).toBe(false);
  });

  it('shrinks waist for negative waist morph', () => {
    const r = inferTargets({ current: base, waistMorph: -1, hipMorph: 0, leannessMorph: 0 });
    expect(r.waistTargetCm).toBeLessThan(90);
    expect(r.waistTargetCm).toBeGreaterThan(0);
  });

  it('clamps to the plausible envelope and flags it', () => {
    // an extreme leanness pull cannot drive body fat below the floor
    const r = inferTargets({ current: base, waistMorph: 0, hipMorph: 0, leannessMorph: -1 });
    expect(r.bodyFatTargetPct).toBeGreaterThanOrEqual(8);
    expect(r.clamped).toBe(true);
  });

  it('never returns non-finite or negative measurements', () => {
    const r = inferTargets({ current: base, waistMorph: -5, hipMorph: -5, leannessMorph: -5 });
    for (const v of [r.waistTargetCm, r.hipTargetCm, r.bodyFatTargetPct]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/formavision/goalbody/__tests__/targetInference.test.ts`
Expected: FAIL with "inferTargets is not a function".

- [ ] **Step 3: Write the minimal implementation**

```ts
// Pure target inference for the silhouette-morph goal body. No I/O.
// Morph handles are normalized to [-1, 1]; a full negative pull maps to the
// maximum plausible reduction per region, then everything is clamped to a
// physiological envelope anchored on the current scan.

export interface CurrentScan { waistCm: number; hipCm: number; bodyFatPct: number; }
export interface MorphInput {
  current: CurrentScan;
  waistMorph: number;
  hipMorph: number;
  leannessMorph: number;
}
export interface InferredTargets {
  waistTargetCm: number;
  hipTargetCm: number;
  bodyFatTargetPct: number;
  clamped: boolean;
}

// Maximum plausible single-goal reductions and floors. Conservative and honest.
const MAX_GIRTH_REDUCTION_FRAC = 0.2; // at most 20% girth change toward a goal
const BODY_FAT_FLOOR_PCT = 8;
const BODY_FAT_MAX_REDUCTION_PCT = 12;

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

export function inferTargets(input: MorphInput): InferredTargets {
  const { current } = input;
  let clamped = false;

  const applyGirth = (currentCm: number, morph: number): number => {
    const m = clampUnit(morph);
    if (m !== morph) clamped = true;
    // negative morph reduces girth; positive increases up to the same envelope
    const delta = -m * (currentCm * MAX_GIRTH_REDUCTION_FRAC);
    const target = currentCm + delta;
    const floor = currentCm * (1 - MAX_GIRTH_REDUCTION_FRAC);
    const ceil = currentCm * (1 + MAX_GIRTH_REDUCTION_FRAC);
    const bounded = Math.max(floor, Math.min(ceil, target));
    if (bounded !== target) clamped = true;
    return bounded;
  };

  const waistTargetCm = applyGirth(current.waistCm, input.waistMorph);
  const hipTargetCm = applyGirth(current.hipCm, input.hipMorph);

  const lm = clampUnit(input.leannessMorph);
  if (lm !== input.leannessMorph) clamped = true;
  const bfDelta = -lm * BODY_FAT_MAX_REDUCTION_PCT; // negative morph => leaner
  let bodyFatTargetPct = current.bodyFatPct + bfDelta;
  if (bodyFatTargetPct < BODY_FAT_FLOOR_PCT) {
    bodyFatTargetPct = BODY_FAT_FLOOR_PCT;
    clamped = true;
  }

  return { waistTargetCm, hipTargetCm, bodyFatTargetPct, clamped };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/formavision/goalbody/__tests__/targetInference.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/formavision/goalbody/targetInference.ts src/lib/formavision/goalbody/__tests__/targetInference.test.ts
git commit -m "feat(211c): pure target-inference engine for the goal body"
```

---

### Task 4: MDC-anchored milestone helper (pure, test-first)

Given a current value, a committed target, and the region tolerance, returns the next milestone (the smallest above-noise step) and a qualitative status. Pure, consumes `mdcEngine`.

**Files:**
- Create: `src/lib/formavision/goalbody/milestones.ts`
- Test: `src/lib/formavision/goalbody/__tests__/milestones.test.ts`

**Interfaces:**
- Consumes: `computeMDC95` from `src/lib/formavision/noise/mdcEngine.ts` (signature pinned in Task 1).
- Produces: `nextMilestone(input: MilestoneInput): Milestone`, consumed by `GoalBodyPlanPanel` (Task 6).

Types:

```ts
export interface MilestoneInput {
  currentCm: number;
  targetCm: number;
  regionToleranceCm: number;
}
export interface Milestone {
  stepCm: number | null;      // the MDC95 step size, null when band insufficient
  nextValueCm: number | null; // current moved one MDC step toward target
  reached: boolean;           // current is already within one MDC of target
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { nextMilestone } from '../milestones';

describe('nextMilestone', () => {
  it('returns one MDC step toward the target', () => {
    // MDC95 = 1.96 * sqrt(2) * (tol/2); tol 3 -> step ~4.157
    const r = nextMilestone({ currentCm: 90, targetCm: 80, regionToleranceCm: 3 });
    expect(r.stepCm).toBeCloseTo(1.96 * Math.SQRT2 * 1.5, 3);
    expect(r.nextValueCm).toBeCloseTo(90 - r.stepCm!, 3);
    expect(r.reached).toBe(false);
  });

  it('flags reached when target is within one MDC step', () => {
    const r = nextMilestone({ currentCm: 90, targetCm: 89, regionToleranceCm: 3 });
    expect(r.reached).toBe(true);
    expect(r.nextValueCm).toBe(89); // when reached, nextValue clamps to the target
  });

  it('returns nulls when the band is insufficient', () => {
    const r = nextMilestone({ currentCm: 90, targetCm: 80, regionToleranceCm: 0 });
    expect(r.stepCm).toBeNull();
    expect(r.nextValueCm).toBeNull();
    expect(r.reached).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/formavision/goalbody/__tests__/milestones.test.ts`
Expected: FAIL with "nextMilestone is not a function".

- [ ] **Step 3: Write the minimal implementation**

```ts
import { computeMDC95 } from '../noise/mdcEngine';

export interface MilestoneInput {
  currentCm: number;
  targetCm: number;
  regionToleranceCm: number;
}
export interface Milestone {
  stepCm: number | null;
  nextValueCm: number | null;
  reached: boolean;
}

export function nextMilestone(input: MilestoneInput): Milestone {
  const mdc = computeMDC95({ toleranceCm: input.regionToleranceCm });
  if (mdc === null) return { stepCm: null, nextValueCm: null, reached: false };

  const remaining = input.targetCm - input.currentCm;
  if (Math.abs(remaining) <= mdc) {
    return { stepCm: mdc, nextValueCm: input.targetCm, reached: true };
  }
  const direction = remaining < 0 ? -1 : 1;
  const nextValueCm = input.currentCm + direction * mdc;
  return { stepCm: mdc, nextValueCm, reached: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/formavision/goalbody/__tests__/milestones.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/formavision/goalbody/milestones.ts src/lib/formavision/goalbody/__tests__/milestones.test.ts
git commit -m "feat(211c): MDC-anchored milestone helper"
```

---

### Task 5: Goal-shape API and commit path

GET the active shape target; POST a committed shape target, which persists the row and triggers Gordon plan plus protocol generation through the existing engines. No nutrition math here.

**Files:**
- Create: `src/app/api/body/goal-shape/route.ts`
- Create: `src/hooks/formavision/useGoalShapeTarget.ts`
- Test: `src/app/api/body/goal-shape/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `goal_shape_targets` (Task 2); `inferTargets` types (Task 3); the Gordon nutrition entry and `arnold-recommender` entry (signatures pinned in Task 1).
- Produces: `POST /api/body/goal-shape` accepting `{ waistTargetCm, hipTargetCm, bodyFatTargetPct, sourceScanId }` and returning `{ id, planGenerated }`; `GET` returning the active target or null. `useGoalShapeTarget()` returns `{ active, commit, loading }`.

- [ ] **Step 1: Write the failing test (auth-gated, own-row, commit deactivates prior)**

```ts
import { describe, it, expect, vi } from 'vitest';
// Mock the supabase server client and the Gordon/recommender entries pinned in Task 1.
// Assert: POST without a user -> 401; POST with a user inserts one active row and
// sets prior active rows is_active=false; GET returns the active row for auth.uid() only.
```

Write concrete assertions using the project's existing route-test harness pattern (copy the structure from an existing `src/app/api/body/goals/__tests__` test, confirmed in Task 1). The test mocks `createClient` and asserts the insert payload and the deactivation update. Assert the Gordon and recommender entries are called exactly once on commit.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/body/goal-shape/__tests__/route.test.ts`
Expected: FAIL (route not implemented).

- [ ] **Step 3: Implement the route**

Implement `route.ts`:
- `createClient` (server), `getUser`; 401 when no user.
- GET: select the latest `is_active` row for `user_id = auth.uid()`, wrapped in `withTimeout(4000)`, `safeLog` on error, fail-open to null.
- POST: validate the body (finite positive girths, body fat in [8, 60]); within a best-effort sequence, set prior active rows `is_active = false`, insert the new row, then call the Gordon nutrition entry and the `arnold-recommender` entry (signatures from Task 1) to generate the plan, set `plan_generated = true` on success. Each external call wrapped in `withTimeout` plus `safeLog`, reason-tagged fail-open (a plan-generation failure still returns the committed target with `planGenerated: false`, never a 500 that loses the commit).
- No nutrition math inline.

- [ ] **Step 4: Implement the hook**

`useGoalShapeTarget.ts`: react-query read of GET; `commit` mutation to POST; returns `{ active, commit, loading }`. `withTimeout` on the fetch, `safeLog` on error.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/app/api/body/goal-shape/__tests__/route.test.ts`
Expected: PASS. Then `npx tsc --noEmit` clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/body/goal-shape/ src/hooks/formavision/useGoalShapeTarget.ts
git commit -m "feat(211c): goal-shape commit API and hook (Gordon plan + protocol)"
```

---

### Task 6: Goal-body surfaces (morph preview, plan panel, safety gates)

The interactive morph (what-if), the committed plan panel with the MDC milestone, and the safety gates (pregnancy fail-closed, weight guardrail, no number pre-cohort).

**Files:**
- Create: `src/components/formavision/goalbody/GoalBodyMorph.tsx`
- Create: `src/components/formavision/goalbody/GoalBodyPlanPanel.tsx`
- Create: `src/lib/formavision/goalbody/goalBodyTelemetry.ts`
- Modify: the goal-body host page (path pinned in Task 1)
- Test: `__tests__/GoalBodyMorph.test.tsx`, `__tests__/GoalBodyPlanPanel.test.tsx`, `__tests__/goalBodyTelemetry.test.ts`

**Interfaces:**
- Consumes: `inferTargets` (Task 3), `nextMilestone` (Task 4), `useGoalShapeTarget` (Task 5), `BodyCompositionAvatar` / `GhostMesh` props (Task 1), `cohortClaimGate` and pregnancy suppression (Task 1), `WithinNoiseBadge`.
- Produces: mounted surfaces on the host page.

- [ ] **Step 1: Write the failing tests (honesty invariants first)**

Assertions:
1. `GoalBodyMorph` drives the avatar props from `inferTargets` output and shows a "preview, not saved" affordance; dragging never calls `commit`.
2. Committing calls `useGoalShapeTarget().commit` once with the inferred targets.
3. `GoalBodyPlanPanel` in pregnancy mode renders the suppression copy and no projection (fail closed: also suppressed on the loading and error branches).
4. The panel shows a within-noise state via `WithinNoiseBadge` when the latest region delta is within noise, and never renders it as progress.
5. No numeric accuracy string renders while `cohortClaimGate` is closed.
6. Weight-guardrail copy present (supportive, practitioner check-in), no shaming, no single chase-number.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/formavision/goalbody/__tests__/`
Expected: FAIL (components not implemented).

- [ ] **Step 3: Implement `GoalBodyMorph`**

Sliders (waist, hip, leanness), each min-h-[44px], responsive (`grid-cols-1 sm:grid-cols-3`). On change, call `inferTargets` and pass results to `BodyCompositionAvatar` / `GhostMesh` (props from Task 1). Show the "what-if preview" label and a distinct Commit button. Emit `goalBodyTelemetry` open and morph events. Design tokens only. Lucide icons at 1.5.

- [ ] **Step 4: Implement `GoalBodyPlanPanel`**

Reads `useGoalShapeTarget().active` plus the region deltas. Renders: the committed targets, the Gordon plan and protocol summary (from the committed row), and the next MDC milestone via `nextMilestone` with qualitative pace. Gates in order: pregnancy suppression first (fail closed on loading/error/ambiguity), then `cohortClaimGate` for any number, then within-noise via `WithinNoiseBadge`. Weight-guardrail copy block. Emit a commit telemetry event.

- [ ] **Step 5: Implement `goalBodyTelemetry.ts`**

Follow the `avatarTelemetry.ts` pattern (Task 1). Events: `goal_body_open`, `goal_body_morph`, `goal_body_commit`. Own-row, fail-open, no PII in payload.

- [ ] **Step 6: Mount on the host page and run all tests**

Mount both components on the host page (Task 1 path), additive, responsive, behind the existing body-tracker layout. Run `npx vitest run src/components/formavision/goalbody/__tests__/` and `npx tsc --noEmit`.
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/formavision/goalbody/ src/lib/formavision/goalbody/goalBodyTelemetry.ts <host-page>
git commit -m "feat(211c): goal-body morph, plan panel, safety gates, telemetry"
```

---

### Task 7: Attribution engine (pure, test-first)

Ranks directional signals from MDC-passed scan deltas and the adherence timeline. Pure, no I/O.

**Files:**
- Create: `src/lib/formavision/attribution/attributionEngine.ts`
- Test: `src/lib/formavision/attribution/__tests__/attributionEngine.test.ts`

**Interfaces:**
- Consumes: `NoiseClassification` from `mdcEngine` (Task 1).
- Produces: `rankAttributions(input: AttributionInput): AttributionSignal[]`, consumed by `useCausalAttribution` (Task 8).

Types:

```ts
export type ConfidenceTier = 'emerging' | 'moderate' | 'strong';
export interface RegionDelta {
  region: string;               // e.g. 'waist'
  deltaCm: number;
  classification: 'MEANINGFUL' | 'WITHIN_NOISE';
  atIso: string;                // date of the later scan
}
export interface AdherencePoint { atIso: string; adherenceFraction: number; } // 0..1
export interface AttributionInput {
  region: string;
  deltas: RegionDelta[];        // chronological, one region
  adherence: AdherencePoint[];  // chronological
  minPoints: number;            // minimum eligible points before any signal (e.g. 3)
}
export interface AttributionSignal {
  region: string;
  tier: ConfidenceTier;
  direction: 'favorable' | 'unfavorable';
  templateId: string;           // resolves to Kelsey-locked copy (Task 8)
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { rankAttributions } from '../attributionEngine';

const mk = (region: string, deltas: any[], adherence: any[], minPoints = 3) =>
  ({ region, deltas, adherence, minPoints });

describe('rankAttributions', () => {
  it('returns nothing below the minimum eligible points', () => {
    const out = rankAttributions(mk('waist',
      [{ region: 'waist', deltaCm: -2, classification: 'MEANINGFUL', atIso: '2026-01-02' }],
      [{ atIso: '2026-01-01', adherenceFraction: 0.9 }], 3));
    expect(out).toEqual([]);
  });

  it('ignores within-noise deltas entirely', () => {
    const deltas = [1, 2, 3].map((d) => ({ region: 'waist', deltaCm: -0.1, classification: 'WITHIN_NOISE', atIso: `2026-01-0${d}` }));
    const adherence = [1, 2, 3].map((d) => ({ atIso: `2026-01-0${d}`, adherenceFraction: 0.9 }));
    expect(rankAttributions(mk('waist', deltas as any, adherence))).toEqual([]);
  });

  it('emits a favorable signal when meaningful reduction tracks high adherence', () => {
    const deltas = [1, 2, 3].map((d) => ({ region: 'waist', deltaCm: -2, classification: 'MEANINGFUL', atIso: `2026-01-0${d}` }));
    const adherence = [1, 2, 3].map((d) => ({ atIso: `2026-01-0${d}`, adherenceFraction: 0.9 }));
    const out = rankAttributions(mk('waist', deltas as any, adherence));
    expect(out).toHaveLength(1);
    expect(out[0].direction).toBe('favorable');
    expect(['emerging', 'moderate', 'strong']).toContain(out[0].tier);
    expect(out[0].templateId).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/formavision/attribution/__tests__/attributionEngine.test.ts`
Expected: FAIL with "rankAttributions is not a function".

- [ ] **Step 3: Implement the engine**

```ts
export type ConfidenceTier = 'emerging' | 'moderate' | 'strong';
export interface RegionDelta { region: string; deltaCm: number; classification: 'MEANINGFUL' | 'WITHIN_NOISE'; atIso: string; }
export interface AdherencePoint { atIso: string; adherenceFraction: number; }
export interface AttributionInput { region: string; deltas: RegionDelta[]; adherence: AdherencePoint[]; minPoints: number; }
export interface AttributionSignal { region: string; tier: ConfidenceTier; direction: 'favorable' | 'unfavorable'; templateId: string; }

function tierForCount(n: number): ConfidenceTier {
  if (n >= 6) return 'strong';
  if (n >= 4) return 'moderate';
  return 'emerging';
}

export function rankAttributions(input: AttributionInput): AttributionSignal[] {
  const eligible = input.deltas.filter((d) => d.classification === 'MEANINGFUL');
  if (eligible.length < input.minPoints) return [];

  const meanAdherence =
    input.adherence.length === 0
      ? 0
      : input.adherence.reduce((s, a) => s + a.adherenceFraction, 0) / input.adherence.length;

  // Directional, hedged: a favorable body change (reduction) that coincides with
  // high adherence yields a favorable signal. This is association, tier-capped by
  // sample size, never a causal or medical claim. Copy is resolved in Task 8.
  const netDelta = eligible.reduce((s, d) => s + d.deltaCm, 0);
  const favorable = netDelta < 0; // reduction in girth is the favorable direction
  const highAdherence = meanAdherence >= 0.5;
  if (!highAdherence && favorable) {
    // change without adherence support: do not attribute to adherence
    return [];
  }

  return [
    {
      region: input.region,
      tier: tierForCount(eligible.length),
      direction: favorable ? 'favorable' : 'unfavorable',
      templateId: favorable ? 'favorable_tracks_adherence' : 'unfavorable_despite_adherence',
    },
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/formavision/attribution/__tests__/attributionEngine.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/formavision/attribution/attributionEngine.ts src/lib/formavision/attribution/__tests__/attributionEngine.test.ts
git commit -m "feat(211c): pure directional attribution engine"
```

---

### Task 8: Attribution surface, bounded copy, Kelsey lock, telemetry

**Files:**
- Create: `src/lib/formavision/attribution/attributionCopy.ts`
- Create: `src/lib/formavision/attribution/attributionTelemetry.ts`
- Create: `src/hooks/formavision/useCausalAttribution.ts`
- Create: `src/components/formavision/attribution/AttributionPanel.tsx`
- Modify: the attribution host surface (path pinned in Task 1)
- Test: `__tests__/attributionCopy.test.ts`, `__tests__/AttributionPanel.test.tsx`

**Interfaces:**
- Consumes: `rankAttributions` (Task 7); the adherence source columns and `classifyGirthDelta` (Task 1); telemetry pattern (Task 1).
- Produces: mounted `AttributionPanel` on the host surface.

- [ ] **Step 1: Write the failing copy test (bounded set, dash-clean, no medical claims)**

```ts
import { describe, it, expect } from 'vitest';
import { ATTRIBUTION_TEMPLATES, resolveTemplate } from '../attributionCopy';

describe('attribution copy', () => {
  it('resolves every engine templateId to a locked string', () => {
    for (const id of ['favorable_tracks_adherence', 'unfavorable_despite_adherence']) {
      expect(resolveTemplate(id, { region: 'waist' })).toBeTruthy();
    }
  });
  it('contains no em or en dashes and no medical-claim verbs', () => {
    const banned = /[–—]|cure|treat|diagnose|prevent disease/i;
    for (const t of Object.values(ATTRIBUTION_TEMPLATES)) {
      expect(banned.test(t)).toBe(false);
    }
  });
  it('uses hedged directional language, never causal', () => {
    expect(ATTRIBUTION_TEMPLATES.favorable_tracks_adherence).toMatch(/likely moving alongside/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/formavision/attribution/__tests__/attributionCopy.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the bounded copy (Kelsey-locked)**

```ts
// KELSEY COPY LOCK: every string below is a compliance-cleared, directional,
// hedged, non-medical template. Do not add, edit, or interpolate free text.
// Any change requires Kelsey re-clearance before merge.
export const ATTRIBUTION_TEMPLATES: Record<string, string> = {
  favorable_tracks_adherence:
    'Your {region} trend is likely moving alongside your protocol consistency.',
  unfavorable_despite_adherence:
    'Your {region} trend is holding steady even with strong consistency. Your next scans will tell us more.',
};

export function resolveTemplate(id: string, vars: { region: string }): string {
  const t = ATTRIBUTION_TEMPLATES[id];
  if (!t) return '';
  return t.replace('{region}', vars.region);
}
```

- [ ] **Step 4: Implement the hook, panel, and telemetry**

- `useCausalAttribution.ts`: reads the adherence source (columns from Task 1) and the region scan-delta history, classifies deltas with `classifyGirthDelta`, calls `rankAttributions`. `withTimeout` plus `safeLog`, fail-open to an empty list.
- `AttributionPanel.tsx`: renders each signal via `resolveTemplate`; renders the honest "not enough signal yet" empty state when the list is empty; responsive; tokens only; a tier chip via `severityToken`. Emits an attribution-view telemetry event.
- `attributionTelemetry.ts`: follows the `avatarTelemetry.ts` pattern; event `attribution_view`.

- [ ] **Step 5: Mount and run all tests**

Mount `AttributionPanel` on the host surface (Task 1). Run `npx vitest run src/lib/formavision/attribution/__tests__/ src/components/formavision/attribution/__tests__/` and `npx tsc --noEmit`.
Expected: PASS, clean.

- [ ] **Step 6: Kelsey gate and commit**

Route `attributionCopy.ts` and every goal-body copy string to Kelsey for clearance. Do not merge until cleared. Then:

```bash
git add src/lib/formavision/attribution/ src/hooks/formavision/useCausalAttribution.ts src/components/formavision/attribution/ <host-surface>
git commit -m "feat(211c): attribution surface, bounded Kelsey-locked copy, telemetry"
```

---

### Task 9: E2E seams, dash audit, and closeout

**Files:**
- Modify: the 210e E2E suite (path pinned in Task 1)

- [ ] **Step 1: Add the two E2E seams**

Extend the 210e E2E suite with: (a) open goal body, morph, commit, see plan and milestone; (b) view attribution with sufficient and insufficient signal. Assert the honesty invariants at the E2E level: pregnancy suppression, no number pre-cohort, within-noise never shown as progress, honest empty attribution state.

- [ ] **Step 2: Run the full suite and the dash audit**

Run: `npx vitest run` (full), `npx tsc --noEmit`, and the dash audit:

```bash
# ripgrep handles unicode reliably (grep -P fails on some Windows locales).
git diff origin/main -- '*.ts' '*.tsx' '*.sql' | rg -n $'[–—]' && echo "DASH FOUND - FIX" || echo "dash-clean"
```

Expected: full suite green, tsc clean, dash-clean, no emojis.

- [ ] **Step 3: Telemetry verification**

Confirm the new events (`goal_body_open`, `goal_body_morph`, `goal_body_commit`, `attribution_view`) land in the 171-series dashboards per charter Section 4.

- [ ] **Step 4: Commit**

```bash
git add <e2e-suite-paths>
git commit -m "test(211c): E2E seams for goal body and attribution"
```

- [ ] **Step 5: Final whole-branch review**

Dispatch the final whole-branch review (subagent-driven-development final step) on the most capable model. Confirm: honesty invariants hold on every path, Gordon is the only nutrition source, no accuracy number pre-cohort, Kelsey copy lock intact, RLS own-row, resilience on every read, dash and emoji clean. Then hand off via superpowers:finishing-a-development-branch.

---

## Self-Review

Spec coverage: goal body morph (Tasks 3, 6), target inference (Task 3), Gordon plus protocol plan (Task 5), MDC milestones (Tasks 4, 6), pregnancy and guardrail and cohort gates (Task 6), attribution engine (Task 7), directional hedged Kelsey-locked copy (Task 8), attribution surface (Task 8), storage decision and migration (Tasks 1, 2), telemetry (Tasks 6, 8, 9), E2E seams (Task 9), 211b dependency verification (Task 1). All spec sections map to a task.

Deferred-by-design (resolved in Task 1, not placeholders): exact adherence columns, Gordon and recommender entry signatures, avatar morph props, and host-page paths. These are external interfaces on the merging 211b branch; Task 1 pins each into the discovery note and later tasks consume the pinned names. This is the honest maximum given the 211b merge gate.

Type consistency: `inferTargets` / `InferredTargets` (Task 3) reused in Tasks 5 and 6; `nextMilestone` / `Milestone` (Task 4) reused in Task 6; `rankAttributions` / `AttributionSignal` / `templateId` (Task 7) reused in Task 8; `goal_shape_targets` columns (Task 2) reused in Task 5. `computeMDC95` / `classifyGirthDelta` consumed from the real `mdcEngine` (verified at plan time).
