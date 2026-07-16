# Prompt 211c Loop Closers (Part 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the posture and asymmetry module (MDC-gated observations plus bounded, Kelsey-locked corrective guidance) and the upgraded agent-guided journey (a next-best-action orchestration engine across all pillars plus a Hannah conversational entry grounded in the user's real journey state).

**Architecture:** Two pure TypeScript engines carry the new logic and are built test-first: an asymmetry honesty gate that filters the existing deterministic bilateral checks through the 211b minimum detectable change engine, and a next-best-action ranker that prioritizes signals from every pillar. Posture findings are LLM-derived (Arnold vision assessment over the `POSTURE_DEVIATIONS` knowledge base), so the module reframes them into cleared copy rather than computing them. Corrective guidance and agent rationale come from fixed, bounded, Kelsey-locked template sets, never free-form model output. The conversational entry reuses the existing Hannah ask pipeline with read-only journey grounding.

**Tech Stack:** Next.js 14 App Router, TypeScript strict (zero any), Tailwind, Supabase (Postgres, RLS, append-only migrations), Vitest.

## Binding precondition (do not start before this is true)

Per the charter binding order, this plan may not begin until **211b AND 211c part 1 have merged to main**. The posture and asymmetry tasks (2 to 4) consume the 211b honesty engine (`mdcEngine`). The agent-guided journey tasks (5 to 7) additionally orchestrate the goal body and attribution (part 1) and posture (this plan), so they run last and only after posture has merged. Task 1 verifies the required interfaces are on main before any dependent task runs. If a dependency has not merged, stop and escalate.

Branch: `feat/211c-loop-closers` (shared with part 1). Rebase onto current main before Task 2.

## Global Constraints

Every task inherits these. Copied verbatim from the charter Section 0 and the two CLAUDE.md files.

- Lucide React icons at strokeWidth 1.5 only. No emojis anywhere.
- No em dashes and no en dashes anywhere (code, comments, test names, UI copy). Hyphens are fine. grep the diff before shipping.
- Design tokens only: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans. Status colors via `severityToken`. Agent names via `getDisplayName`. Gordon slug lowercase `gordon`.
- Desktop and mobile in synchronism, responsive Tailwind from the first line. Touch targets min 44x44 px. Inputs text-base (16px). No horizontal overflow.
- Append-only Supabase migrations, own-row RLS. Never edit an applied migration. Do not touch email templates. Do not touch package.json or package-lock.json.
- Resilience: every new external call and server-side read uses `withTimeout` / `withAbortTimeout`, `safeLog`, and `getCircuitBreaker` for external APIs. Reason-tagged fail-open. The 210d guardrails stay green.
- UNKNOWN and estimated stay honest, never 0, never fabricated. Honest disabled states are never flipped to look finished.
- Bio Optimization Score is the only score name. No medical claims. No accuracy figure before the 211b cohort pass and Gary sign-off (`cohortClaimGate`).
- Gordon owns all nutrition computation. Arnold owns movement guidance. Reuse only; no parallel logic.
- The V1 fallback ladder and the one-source-of-truth rule are never at risk.
- Zero TypeScript `any`. Pure engine files have no I/O.

## Human gates (tracked, not code)

- Kelsey clears every posture corrective template string, every next-best-action rationale template, and validates that the Hannah conversational grounding keeps the conversation compliant. Hard merge gate (Tasks 3, 5, 7).
- Kelsey decision on pregnancy-mode suppression of corrective movement guidance (Task 3).
- Gary escalations per charter Section 5.

## File Structure

Created:

- `src/lib/formavision/posture/asymmetryGate.ts` - pure: filter the deterministic asymmetry checks through `mdcEngine`, keep only above-noise findings.
- `src/lib/formavision/posture/correctiveCopy.ts` - bounded, Kelsey-locked corrective-guidance template set plus resolver.
- `src/lib/formavision/posture/postureTelemetry.ts` - telemetry for the posture module.
- `src/lib/formavision/journey/nextBestAction.ts` - pure: rank next-best-actions across pillar signals.
- `src/lib/formavision/journey/actionRationaleCopy.ts` - bounded, Kelsey-locked agent-rationale template set plus resolver.
- `src/lib/formavision/journey/journeyChatTelemetry.ts` - telemetry for the conversational entry.
- `src/hooks/formavision/usePostureModule.ts` - read the scan asymmetry and posture findings, run the gate.
- `src/hooks/formavision/useNextBestActions.ts` - assemble pillar signals, run the ranker.
- `src/components/formavision/posture/PostureModule.tsx` - the posture and asymmetry module (observations, trend, corrective panel).
- `src/components/formavision/journey/NextBestActionRail.tsx` - the ranked next-best-action surface.
- `src/components/formavision/journey/JourneyChatEntry.tsx` - the Hannah conversational entry.
- Test files colocated under `__tests__/` beside each unit.
- Conditional: `supabase/migrations/<ts>_prompt_211c_posture_findings.sql` - only if Task 1 finds posture findings are not already persisted.

Modified:

- `src/components/body-tracker/scanning/ScanResultsPanel.tsx` - route the existing `AsymmetryReportCard` through the new honesty gate (replace raw free-text recommendations with the Kelsey-locked set).
- `src/components/journey/YourJourneyCoaching.tsx` - mount `NextBestActionRail` and `JourneyChatEntry`.
- `src/app/api/hannah/ask/route.ts` - accept an optional read-only journey-grounding context (additive, backward compatible).
- The 210e E2E suite - add the posture and journey seams.

---

### Task 1: Discovery and interface pinning

**Purpose:** Pin every external signature the later tasks consume and record the posture-persistence decision. Deliverable is a committed discovery note. No feature code.

**Files:**
- Create: `docs/formavision/211c-part2-discovery.md`

**Interfaces:**
- Produces (for every later task): the confirmed signatures and column lists in Step 2.

- [ ] **Step 1: Confirm dependencies merged**

```bash
git log --oneline origin/main | grep -iE '211b|211c' | head
ls src/lib/formavision/noise/mdcEngine.ts
git ls-files | grep -iE 'goalbody|attribution' | grep formavision | head
```

Expected: 211b and 211c part 1 commits on main; `mdcEngine.ts` present; the part-1 goalbody and attribution modules present. If absent, STOP and escalate.

- [ ] **Step 2: Read and record exact signatures into the discovery note**

Record each into `docs/formavision/211c-part2-discovery.md`:

1. `src/lib/arnold/scanning/asymmetryAnalyzer.ts` and `src/lib/arnold/scanning/types.ts` - the `AsymmetryReport` and `AsymmetryCheck` shapes (verified at plan time: `checks[]` with `name`, `leftValue`, `rightValue`, `unit`, `balanceRatioPct`, `status`, `recommendation`; `overallScore`; `flaggedAreas`; `recommendations`). Record the exact `status` union and the four check names.
2. `src/lib/arnold/scanning/accuracyTargets.ts` - the region tolerance in cm for the four bilateral regions (bicep to upperArm, forearm, thigh to upperLeg, calf to lowerLeg). These feed `classifyGirthDelta`.
3. `src/lib/arnold/brain/postureAssessment.ts` - confirm it is a knowledge base (`POSTURE_DEVIATIONS`, `ALIGNMENT_LINES`, `POSTURE_SUMMARY`), not a runtime function. Record how posture findings are produced today (the Arnold vision path) and their runtime shape.
4. Posture persistence: search migrations and the scan-write path for where posture findings are stored. Confirm whether `_body_scan_measurements` or a scan-analysis JSON holds them. Record the storage decision: reuse the existing store, or add `posture_findings` (Task 4 conditional).
5. `src/lib/body-tracker/arnold-recommender.ts` - the exact `generateDailyRecommendations` signature (input, return type) the next-best-action engine consumes.
6. `src/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useJourneyRecommendations.ts` - the `JourneyRec` shape and the hook signature `useJourneyRecommendations(userId, current)`.
7. `src/app/api/hannah/ask/route.ts` - the exact request and response contract, so Task 7 can add an optional read-only grounding field without breaking existing callers.
8. `src/components/body-tracker/scanning/ScanResultsPanel.tsx` and `AsymmetryReportCard.tsx` - the props and mount point Task 4 modifies.
9. `src/components/journey/YourJourneyCoaching.tsx` - the mount point and layout Task 6 extends.
10. `cohortClaimGate` and the pregnancy-suppression module - the function names Tasks 4 and 7 gate on.
11. `src/lib/formavision/telemetry/avatarTelemetry.ts` - the telemetry helper pattern.

- [ ] **Step 3: Commit**

```bash
git add docs/formavision/211c-part2-discovery.md
git commit -m "docs(211c): part 2 discovery and interface pinning"
```

If any item cannot be confirmed, STOP and escalate before Task 2.

---

### Task 2: Asymmetry honesty gate (pure, test-first)

Filters the deterministic asymmetry checks through the 211b MDC engine so a left/right difference below the minimum detectable change is never flagged, regardless of the ratio threshold.

**Files:**
- Create: `src/lib/formavision/posture/asymmetryGate.ts`
- Test: `src/lib/formavision/posture/__tests__/asymmetryGate.test.ts`

**Interfaces:**
- Consumes: `classifyGirthDelta` from `src/lib/formavision/noise/mdcEngine.ts`; the `AsymmetryCheck` shape (Task 1).
- Produces: `gateAsymmetry(input: GateInput): GatedFinding[]`, consumed by `usePostureModule` (Task 4).

Types:

```ts
export interface AsymmetryCheckLite {
  name: string;
  leftValue: number;
  rightValue: number;
  regionToleranceCm: number; // from accuracyTargets for this region
}
export interface GateInput { checks: AsymmetryCheckLite[]; }
export interface GatedFinding {
  name: string;
  deltaCm: number;          // abs(left - right)
  aboveNoise: boolean;      // true only when classifyGirthDelta === MEANINGFUL
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { gateAsymmetry } from '../asymmetryGate';

describe('gateAsymmetry', () => {
  it('keeps only above-noise findings (delta >= MDC95)', () => {
    // tol 2 -> MDC95 = 1.96 * sqrt(2) * 1 ~= 2.77 cm
    const out = gateAsymmetry({ checks: [
      { name: 'Bicep circumference', leftValue: 34, rightValue: 30, regionToleranceCm: 2 }, // delta 4 -> above
      { name: 'Calf circumference', leftValue: 38, rightValue: 37, regionToleranceCm: 2 },  // delta 1 -> within noise
    ]});
    const bicep = out.find((f) => f.name === 'Bicep circumference')!;
    const calf = out.find((f) => f.name === 'Calf circumference')!;
    expect(bicep.aboveNoise).toBe(true);
    expect(calf.aboveNoise).toBe(false);
    expect(bicep.deltaCm).toBe(4);
  });

  it('treats an unusable band (tolerance 0) as not above noise, never throws', () => {
    const out = gateAsymmetry({ checks: [
      { name: 'Thigh circumference', leftValue: 60, rightValue: 50, regionToleranceCm: 0 },
    ]});
    expect(out[0].aboveNoise).toBe(false);
  });

  it('returns an empty list for no checks', () => {
    expect(gateAsymmetry({ checks: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/formavision/posture/__tests__/asymmetryGate.test.ts`
Expected: FAIL with "gateAsymmetry is not a function".

- [ ] **Step 3: Write the minimal implementation**

```ts
import { classifyGirthDelta } from '../noise/mdcEngine';

export interface AsymmetryCheckLite {
  name: string;
  leftValue: number;
  rightValue: number;
  regionToleranceCm: number;
}
export interface GateInput { checks: AsymmetryCheckLite[]; }
export interface GatedFinding {
  name: string;
  deltaCm: number;
  aboveNoise: boolean;
}

export function gateAsymmetry(input: GateInput): GatedFinding[] {
  return input.checks.map((c) => {
    const deltaCm = Math.abs(c.leftValue - c.rightValue);
    const cls = classifyGirthDelta(deltaCm, c.regionToleranceCm);
    return { name: c.name, deltaCm, aboveNoise: cls === 'MEANINGFUL' };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/formavision/posture/__tests__/asymmetryGate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/formavision/posture/asymmetryGate.ts src/lib/formavision/posture/__tests__/asymmetryGate.test.ts
git commit -m "feat(211c): asymmetry honesty gate (MDC-filtered findings)"
```

---

### Task 3: Corrective-guidance bounded copy (Kelsey-locked)

Replaces the analyzer's free-text recommendations with a fixed, cleared template set. Movement suggestions are Arnold-owned; protocol tie-ins reference the existing recommender by id, not new copy.

**Files:**
- Create: `src/lib/formavision/posture/correctiveCopy.ts`
- Test: `src/lib/formavision/posture/__tests__/correctiveCopy.test.ts`

**Interfaces:**
- Consumes: the asymmetry `status` union and posture deviation keys (Task 1).
- Produces: `resolveCorrective(id: string, vars: { region: string }): string`, consumed by `PostureModule` (Task 4).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { CORRECTIVE_TEMPLATES, resolveCorrective } from '../correctiveCopy';

describe('corrective copy', () => {
  it('resolves each finding tier to a cleared string', () => {
    for (const id of ['minor_imbalance', 'moderate_imbalance', 'significant_imbalance']) {
      expect(resolveCorrective(id, { region: 'arms' })).toBeTruthy();
    }
  });
  it('contains no dashes, no diagnosis, no treatment language', () => {
    const banned = /[–—]|diagnos|treat|cure|scoliosis|physical therapist|clinically/i;
    for (const t of Object.values(CORRECTIVE_TEMPLATES)) {
      expect(banned.test(t)).toBe(false);
    }
  });
  it('is wellness framed and suggestion toned', () => {
    expect(CORRECTIVE_TEMPLATES.moderate_imbalance).toMatch(/you could|consider adding|general wellness/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/formavision/posture/__tests__/correctiveCopy.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the bounded copy (Kelsey-locked)**

```ts
// KELSEY COPY LOCK: cleared, wellness-framed, non-medical corrective guidance.
// No diagnosis, no treatment, no clinical or condition language. Do not add,
// edit, or interpolate free text. Any change requires Kelsey re-clearance.
export const CORRECTIVE_TEMPLATES: Record<string, string> = {
  minor_imbalance:
    'Your {region} look close to even. This is common day-to-day variation and needs nothing from you.',
  moderate_imbalance:
    'Your {region} show a noticeable side-to-side difference. For general wellness you could add a little single-side movement on the smaller side.',
  significant_imbalance:
    'Your {region} show a larger side-to-side difference. Consider checking in with a movement professional if it stays this way across scans.',
};

export function resolveCorrective(id: string, vars: { region: string }): string {
  const t = CORRECTIVE_TEMPLATES[id];
  if (!t) return '';
  return t.replace('{region}', vars.region);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/formavision/posture/__tests__/correctiveCopy.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Kelsey gate note and commit**

Route `correctiveCopy.ts` to Kelsey for clearance (hard merge gate). Record the pregnancy-suppression decision in the discovery note. Then:

```bash
git add src/lib/formavision/posture/correctiveCopy.ts src/lib/formavision/posture/__tests__/correctiveCopy.test.ts
git commit -m "feat(211c): Kelsey-locked corrective-guidance copy"
```

---

### Task 4: Posture and asymmetry module surface

The module: gated asymmetry observations, posture findings reframed into cleared copy, trend over time, corrective panel, honest empty states. Routes the existing `AsymmetryReportCard` through the gate.

**Files:**
- Create: `src/components/formavision/posture/PostureModule.tsx`
- Create: `src/hooks/formavision/usePostureModule.ts`
- Create: `src/lib/formavision/posture/postureTelemetry.ts`
- Modify: `src/components/body-tracker/scanning/ScanResultsPanel.tsx`
- Conditional create: `supabase/migrations/<ts>_prompt_211c_posture_findings.sql` (only if Task 1 found posture findings are not persisted; own-row RLS, append-only, then regenerate types and verify RLS the same way part 1 Task 2 did)
- Test: `__tests__/PostureModule.test.tsx`, `__tests__/postureTelemetry.test.ts`

**Interfaces:**
- Consumes: `gateAsymmetry` (Task 2), `resolveCorrective` (Task 3), `analyzeAsymmetry` output (Task 1), `cohortClaimGate` and pregnancy suppression (Task 1), the within-noise pattern from 211b.
- Produces: the mounted module.

- [ ] **Step 1: Write the failing tests (honesty invariants first)**

Assertions:
1. Only `aboveNoise` findings render as flagged; within-noise findings render with the 211b within-precision pattern, never as an imbalance.
2. Each flagged finding shows its corrective guidance via `resolveCorrective` (Kelsey-locked), never the analyzer's raw recommendation string.
3. Posture findings render reframed (no `POSTURE_DEVIATIONS` raw strings like "clinically significant" or "Scoliosis" reach the DOM).
4. Trend shows an honest "not enough signal yet" state below the minimum data points.
5. Pregnancy mode suppresses corrective movement guidance (fail closed on loading and error) if Task 1/Kelsey required it.
6. No numeric accuracy string renders while `cohortClaimGate` is closed.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/formavision/posture/__tests__/`
Expected: FAIL (components not implemented).

- [ ] **Step 3: Implement `usePostureModule`**

Reads the current scan asymmetry (via the existing analyzer output) and posture findings, maps them into `AsymmetryCheckLite` with region tolerances (Task 1), runs `gateAsymmetry`, and reads the trend history from the persistence source (Task 1). `withTimeout` plus `safeLog`, fail-open to empty.

- [ ] **Step 4: Implement `PostureModule` and `postureTelemetry`**

Render gated observations, reframed posture findings, the corrective panel (Kelsey-locked copy), trend, and honest empty states. Gates: pregnancy suppression first (fail closed), then `cohortClaimGate` for any number, then within-noise pattern. Tokens only, responsive, 44px targets, Lucide 1.5. Emit `posture_view` telemetry (follows `avatarTelemetry.ts`).

- [ ] **Step 5: Route `ScanResultsPanel` through the gate**

Modify `ScanResultsPanel.tsx` so the existing `AsymmetryReportCard` receives gated findings and Kelsey-locked corrective copy instead of the analyzer's raw recommendations. Additive and backward compatible; do not delete the card.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run src/components/formavision/posture/__tests__/` and `npx tsc --noEmit`.
Expected: PASS, clean. If the conditional migration was added, verify RLS via `execute_sql` (relrowsecurity true, 3 policies).

- [ ] **Step 7: Commit**

```bash
git add src/components/formavision/posture/ src/hooks/formavision/usePostureModule.ts src/lib/formavision/posture/postureTelemetry.ts src/components/body-tracker/scanning/ScanResultsPanel.tsx
git commit -m "feat(211c): posture and asymmetry module (gated, corrective, trend)"
```

---

### Task 5: Next-best-action engine (pure, test-first)

Ranks next-best-actions across pillar signals; each action carries an owning agent and a bounded rationale template id.

**Files:**
- Create: `src/lib/formavision/journey/nextBestAction.ts`
- Create: `src/lib/formavision/journey/actionRationaleCopy.ts`
- Test: `src/lib/formavision/journey/__tests__/nextBestAction.test.ts`, `__tests__/actionRationaleCopy.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure). The hook (Task 6) adapts pillar data into `PillarSignal[]`.
- Produces: `rankNextBestActions(input: NextActionInput): RankedAction[]`, consumed by `useNextBestActions` (Task 6); `resolveRationale(id, vars)` from the copy module.

Types:

```ts
export type AgentOwner = 'hannah' | 'arnold' | 'gordon';
export interface PillarSignal {
  pillar: 'goal_body' | 'attribution' | 'posture' | 'nutrition';
  owner: AgentOwner;
  priority: number;        // caller-supplied base priority
  aboveNoise: boolean;     // honesty gate: within-noise signals are ineligible
  rationaleId: string;     // resolves to a Kelsey-locked rationale template
}
export interface NextActionInput { signals: PillarSignal[]; limit: number; }
export interface RankedAction {
  pillar: PillarSignal['pillar'];
  owner: AgentOwner;
  rationaleId: string;
  rank: number;            // 1-based
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { rankNextBestActions } from '../nextBestAction';

const sig = (pillar: any, owner: any, priority: number, aboveNoise = true, rationaleId = 'r') =>
  ({ pillar, owner, priority, aboveNoise, rationaleId });

describe('rankNextBestActions', () => {
  it('excludes within-noise signals entirely', () => {
    const out = rankNextBestActions({ signals: [sig('posture', 'arnold', 10, false)], limit: 3 });
    expect(out).toEqual([]);
  });
  it('ranks by priority descending and assigns 1-based rank', () => {
    const out = rankNextBestActions({ signals: [
      sig('nutrition', 'gordon', 5),
      sig('goal_body', 'hannah', 9),
      sig('attribution', 'hannah', 7),
    ], limit: 3 });
    expect(out.map((a) => a.pillar)).toEqual(['goal_body', 'attribution', 'nutrition']);
    expect(out.map((a) => a.rank)).toEqual([1, 2, 3]);
  });
  it('caps at the limit', () => {
    const out = rankNextBestActions({ signals: [
      sig('nutrition', 'gordon', 5), sig('goal_body', 'hannah', 9),
      sig('attribution', 'hannah', 7), sig('posture', 'arnold', 6),
    ], limit: 2 });
    expect(out).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/formavision/journey/__tests__/nextBestAction.test.ts`
Expected: FAIL with "rankNextBestActions is not a function".

- [ ] **Step 3: Implement the engine**

```ts
export type AgentOwner = 'hannah' | 'arnold' | 'gordon';
export interface PillarSignal {
  pillar: 'goal_body' | 'attribution' | 'posture' | 'nutrition';
  owner: AgentOwner;
  priority: number;
  aboveNoise: boolean;
  rationaleId: string;
}
export interface NextActionInput { signals: PillarSignal[]; limit: number; }
export interface RankedAction {
  pillar: PillarSignal['pillar'];
  owner: AgentOwner;
  rationaleId: string;
  rank: number;
}

export function rankNextBestActions(input: NextActionInput): RankedAction[] {
  const eligible = input.signals.filter((s) => s.aboveNoise === true);
  const sorted = [...eligible].sort((a, b) => b.priority - a.priority);
  const capped = sorted.slice(0, Math.max(0, input.limit));
  return capped.map((s, i) => ({
    pillar: s.pillar,
    owner: s.owner,
    rationaleId: s.rationaleId,
    rank: i + 1,
  }));
}
```

- [ ] **Step 4: Implement the bounded rationale copy (Kelsey-locked)**

`actionRationaleCopy.ts`: a fixed `ACTION_RATIONALE_TEMPLATES` map keyed by `rationaleId`, each a cleared, non-medical, agent-appropriate sentence, plus `resolveRationale(id, vars)`. Include the same dash-clean and no-medical-claim test as Task 3 Step 1 (a `__tests__/actionRationaleCopy.test.ts`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/formavision/journey/__tests__/`
Expected: PASS.

- [ ] **Step 6: Kelsey gate note and commit**

Route `actionRationaleCopy.ts` to Kelsey (hard merge gate). Then:

```bash
git add src/lib/formavision/journey/nextBestAction.ts src/lib/formavision/journey/actionRationaleCopy.ts src/lib/formavision/journey/__tests__/
git commit -m "feat(211c): next-best-action engine and Kelsey-locked rationale copy"
```

---

### Task 6: Journey surface renders the ranked next action

**Files:**
- Create: `src/hooks/formavision/useNextBestActions.ts`
- Create: `src/components/formavision/journey/NextBestActionRail.tsx`
- Modify: `src/components/journey/YourJourneyCoaching.tsx`
- Test: `__tests__/NextBestActionRail.test.tsx`

**Interfaces:**
- Consumes: `rankNextBestActions` and `resolveRationale` (Task 5); `useJourneyRecommendations` and `generateDailyRecommendations` (Task 1); the part-1 goal-body and attribution signals; `gateAsymmetry` output (Task 2).
- Produces: the mounted rail on `YourJourneyCoaching`.

- [ ] **Step 1: Write the failing test**

Assert: the rail renders the ranked actions in order, each with its owning agent name via `getDisplayName`; a within-noise pillar signal never appears; an empty signal set renders the honest "you are all caught up" state; each action shows its `resolveRationale` string.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/formavision/journey/__tests__/NextBestActionRail.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `useNextBestActions`**

Assemble `PillarSignal[]` from the existing pillar sources: `useJourneyRecommendations` and `generateDailyRecommendations` for nutrition and protocol, the part-1 goal-body and attribution hooks, and `usePostureModule` gated findings. Mark each signal `aboveNoise` from its honesty classification. Run `rankNextBestActions` with a limit (for example 3). `withTimeout` plus `safeLog`, fail-open to empty.

- [ ] **Step 4: Implement `NextBestActionRail` and mount it**

Render the ranked actions prominently, agent-attributed via `getDisplayName`, above the existing coaching content in `YourJourneyCoaching.tsx`. Reuse existing coaching components; do not replace them. Tokens only, responsive, 44px targets. Emit a `next_action_view` telemetry event.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run src/components/formavision/journey/__tests__/` and `npx tsc --noEmit`.
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/formavision/useNextBestActions.ts src/components/formavision/journey/NextBestActionRail.tsx src/components/journey/YourJourneyCoaching.tsx
git commit -m "feat(211c): agent-attributed next-best-action rail on the journey"
```

---

### Task 7: Hannah conversational entry grounded in journey context

**Files:**
- Create: `src/components/formavision/journey/JourneyChatEntry.tsx`
- Create: `src/lib/formavision/journey/journeyChatTelemetry.ts`
- Modify: `src/app/api/hannah/ask/route.ts` (additive optional grounding), `src/components/journey/YourJourneyCoaching.tsx`
- Test: `src/app/api/hannah/ask/__tests__/route.grounding.test.ts`, `__tests__/JourneyChatEntry.test.tsx`

**Interfaces:**
- Consumes: the Hannah ask contract (Task 1); the read-only journey context (pillars, active goal, above-noise findings) from the part-1 and Task-6 hooks; `cohortClaimGate`.
- Produces: the mounted chat entry.

- [ ] **Step 1: Write the failing tests**

Assert: (a) the existing `/api/hannah/ask` behavior is unchanged when no grounding is sent (backward compatible); (b) when a read-only grounding snapshot is sent, it is injected as context and never as an instruction that relaxes the Hannah compliance directive; (c) the grounding carries no accuracy figure and no fabricated value; (d) `JourneyChatEntry` opens the Hannah pipeline with the current journey snapshot and emits `journey_chat_open`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/app/api/hannah/ask/__tests__/route.grounding.test.ts src/components/formavision/journey/__tests__/JourneyChatEntry.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add optional grounding to the ask route**

Modify `route.ts` to accept an optional `journeyContext` field (read-only snapshot). When present, append it to the model context as grounding only; the existing Hannah compliance and QA directive still governs and is not overridden. Validate the snapshot is read-only data (no free instructions). Keep the field optional so existing callers are unaffected. `withTimeout` plus `safeLog` preserved.

- [ ] **Step 4: Implement `JourneyChatEntry` and telemetry**

A chat entry on the journey that opens the Hannah pipeline pre-seeded with the read-only journey snapshot (pillars, active goal, above-noise findings). No accuracy figure in the snapshot (`cohortClaimGate`). Tokens only, responsive, 44px. Emit `journey_chat_open`.

- [ ] **Step 5: Mount and run all tests**

Mount `JourneyChatEntry` on `YourJourneyCoaching.tsx`. Run the two test files and `npx tsc --noEmit`.
Expected: PASS, clean.

- [ ] **Step 6: Kelsey validation and commit**

Route the grounding approach and any new visible copy to Kelsey to confirm the conversation stays compliant. Then:

```bash
git add src/components/formavision/journey/JourneyChatEntry.tsx src/lib/formavision/journey/journeyChatTelemetry.ts src/app/api/hannah/ask/route.ts src/components/journey/YourJourneyCoaching.tsx
git commit -m "feat(211c): Hannah conversational entry grounded in journey context"
```

---

### Task 8: E2E seams, dash audit, and closeout

**Files:**
- Modify: the 210e E2E suite (path pinned in Task 1)

- [ ] **Step 1: Add the E2E seams**

Extend the 210e E2E suite with: (a) posture module with above-noise and within-noise findings, corrective panel present, trend empty state; (b) next-best-action rail ordering and the caught-up empty state; (c) Hannah journey chat opens with grounding and shows no accuracy figure. Assert honesty invariants at the E2E level.

- [ ] **Step 2: Run the full suite and the dash audit**

Run: `npx vitest run` (full), `npx tsc --noEmit`, and:

```bash
# ripgrep handles unicode reliably (grep -P fails on some Windows locales).
git diff origin/main -- '*.ts' '*.tsx' '*.sql' | rg -n $'[–—]' && echo "DASH FOUND - FIX" || echo "dash-clean"
```

Expected: full suite green, tsc clean, dash-clean, no emojis.

- [ ] **Step 3: Telemetry verification**

Confirm `posture_view`, `next_action_view`, and `journey_chat_open` land in the 171-series dashboards (charter Section 4).

- [ ] **Step 4: Commit**

```bash
git add <e2e-suite-paths>
git commit -m "test(211c): E2E seams for posture and agent-guided journey"
```

- [ ] **Step 5: Final whole-branch review**

Dispatch the final whole-branch review on the most capable model. Confirm: honesty invariants hold (within-noise never surfaced as a finding or an action, no accuracy number pre-cohort), no raw posture knowledge-base strings reach the DOM, Kelsey copy locks intact on all three template sets, Arnold owns movement and Gordon owns nutrition, the Hannah grounding never relaxes the compliance directive, RLS own-row, resilience on every read, dash and emoji clean. Then hand off via superpowers:finishing-a-development-branch.

---

## Self-Review

Spec coverage: asymmetry MDC gate (Task 2), corrective Kelsey-locked copy (Task 3), posture module surface with reframed findings and trend (Task 4), conditional posture persistence (Tasks 1, 4), next-best-action engine (Task 5), agent rationale copy (Task 5), journey rail (Task 6), Hannah conversational grounding (Task 7), telemetry (Tasks 4, 6, 7, 8), E2E seams (Task 8), dependency verification (Task 1). All spec sections map to a task.

Deferred-by-design (resolved in Task 1, not placeholders): posture persistence, the Hannah ask contract, the recommender signatures, and the exact mount points. These are external interfaces on the merging dependency branches; Task 1 pins each and later tasks consume the pinned names.

Type consistency: `gateAsymmetry` / `GatedFinding` (Task 2) reused in Task 4; `resolveCorrective` (Task 3) reused in Task 4; `rankNextBestActions` / `RankedAction` / `PillarSignal` (Task 5) reused in Task 6; `resolveRationale` (Task 5) reused in Task 6; the Hannah `journeyContext` field (Task 7) is additive. `classifyGirthDelta` consumed from the real `mdcEngine` (verified at plan time).
