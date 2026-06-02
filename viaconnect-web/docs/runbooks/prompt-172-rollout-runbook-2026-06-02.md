# Prompt 172 Production Rollout Runbook (172d)

**Filed:** 2026-06-02
**Owners:** Gary Ferenczi (rollout gate), Jeffery (orchestrator), Michelangelo (TDD + OBRA)
**Status:** Pre-flight complete after Phase 3 acceptance suite; pending Gary's go on Step 1 BOS line flip.

This runbook documents the rollout sequence for Prompt 172 (NutriVision Conversational Meal Card, Voice, and BOS Personalization Layer). It is the operational companion to the spec at `docs/prompts/prompt-172-master-spec-2026-06-01.md` and the acceptance report at `docs/runbooks/prompt-172-acceptance-report-2026-06-02.md`.

The launch posture for Prompt 172 is direct push to main for Phases 0, 1A, 1B, 1B revisions, hook fix, 2, and 3 (already complete). The BOS line itself is gated behind `BOS_LINE_RENDERING_ENABLED`, which defaults true in development and false in production per spec section 2 preview gate. Step 1 below flips that switch.

## 1. Pre-flight checks

Each item must be GREEN before Step 1 fires.

| Check | Owner | Status |
|-------|-------|--------|
| Acceptance matrix green (`tests/172/acceptance-matrix.test.ts`) | Michelangelo | GREEN: 265 of 265 tests, 0 regressions |
| Marshall scan green (`tests/172/marshall-scan-microcopy.test.ts`) | Marshall via Michelangelo | GREEN: 12 of 12 tests, 0 blocking findings on 22 microcopy keys x 2 variants x 2 surfaces |
| Wellbeing guardrails green (`tests/172/wellbeing-guardrails.test.ts`) | Hannah via Michelangelo | GREEN: 33 of 33 tests, every 170c section 8.4 + section 10 rule mapped to a passing test |
| Vercel preview reviewed and approved | Gary | Pending Gary's review of the Phase 2 preview URL |
| Hannah review recorded (clinical framing on microcopy, BOS line, acknowledgement) | Hannah | Recorded in commit d72c2c17 (Phase 1B revisions) |
| Kelsey review recorded (regulatory framing on microcopy, degraded service, FDA disclaimer) | Kelsey | Recorded in commit d72c2c17 |
| Vercel production deployment of `ab1f388a` successful | Jeffery | Confirm via Vercel dashboard before flip |
| Pre-existing test baseline unchanged (28 fails, 47 skipped) | Michelangelo | CONFIRMED: 28 pre-existing fails, 5197 passing, 47 skipped |

## 2. Rollout steps

The four kill switches the rollout touches:

| Switch | Default | Spec gate | Action |
|--------|---------|-----------|--------|
| `BOS_LINE_RENDERING_ENABLED` | false in production, true in dev | 172 spec section 2, last bullet | Step 1: flip to true in production |
| `PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED` | true | 170c section 10.7 | Step 2: verify defaults |
| `FDA_DISCLAIMER_RENDERING_ENABLED` | true | 170c section 19.6 | Step 3: verify defaults |
| `EATING_DISORDER_SAFETY_MODE_ENABLED` | true | 170c section 8.13 | Step 4: verify defaults; opt-in only |

### Step 1: BOS line rendering (the only switch that actually flips)

1. Open the Vercel project dashboard for `viaconnect-web` (project ID per `.vercel/project.json`).
2. Navigate to **Settings, Environment Variables**.
3. Locate `BOS_LINE_RENDERING_ENABLED`. If absent, add it as a Production-scoped variable.
4. Set the value to `true`. Save.
5. Wait 2 minutes for cache warm-up across the edge network. Vercel does not require a redeploy for env var changes; the next request picks up the new value.
6. Verify the endpoint responds with a 200 status and a populated BOS line:
   - Open Gary's account on `https://viaconnectapp.com`, navigate to NutriVision, log a meal.
   - In the browser DevTools Network tab, confirm `GET /api/nutrition/bos-line/<mealId>` returns 200 with a non null JSON body.
   - Alternatively, run the smoke check via the in-tab DevTools console:
     ```
     fetch('/api/nutrition/bos-line/<meal_id>').then(r => r.json()).then(console.log)
     ```
   - A null body is acceptable for first-time users with no BOS analytics history; verify against a user with at least two `bio_optimization_history` rows.
7. Confirm the MealCard renders the BOS line in the slot above the acknowledgement line (use the `data-bos-line` test selector).

### Step 2: Provider degraded service messaging

1. Confirm `PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED` is either unset (defaults true per `src/lib/compliance/kill-switches.ts`) or explicitly `true` in Vercel Production scope.
2. No action required unless the env was previously overridden to false. If overridden, set it to `true` per the same path as Step 1.
3. Smoke check: when the analyze pipeline returns a degraded kind, the MealCard renders the canonical kind copy. This is exercised by the Phase 2 preview but does not require a production flip.

### Step 3: FDA disclaimer rendering

1. Confirm `FDA_DISCLAIMER_RENDERING_ENABLED` is either unset (defaults true per `src/lib/compliance/kill-switches.ts`) or explicitly `true` in Vercel Production scope.
2. No action required unless the env was previously overridden to false.
3. Smoke check: every NutriVision result card carries the FDA disclaimer footer; the existing card-footer slot renders unconditionally inside `<FdaDisclaimer slot="card-footer" />`.

### Step 4: Eating disorder safety mode

1. Confirm `EATING_DISORDER_SAFETY_MODE_ENABLED` is either unset (defaults true per `src/lib/compliance/kill-switches.ts`) or explicitly `true` in Vercel Production scope.
2. No action required unless the env was previously overridden to false.
3. The master switch governs whether new opt-in writes are accepted via `/api/safety-mode/opt-in`; users who have already opted in retain their setting regardless. The MealCard renders ratio mode only when the user has the per-user opt-in flag set in `user_safety_preferences`.

## 3. Twenty-four hour monitoring window

For the first 24 hours after Step 1:

1. **Vercel logs**: sample the BOS endpoint p95 latency (`/api/nutrition/bos-line/[mealId]`).
   - Expected: under 200ms p95 given the `Cache-Control: private, max-age=300` header and the two-row read against `bio_optimization_history`.
   - Action if exceeded: check Supabase logs for slow queries on the index `bio_optimization_history(user_id, date desc, compute_seq desc)`. The index was provisioned in the BOS rollout (pre-#172) and should sustain the read.
2. **Sentry-equivalent (`/api/admin/jeffery` error feed)**: sample any new error class.
   - Action if a new error class appears: page Jeffery via the in-app supervisor; if blocking, flip Step 5 rollback.
3. **DB queries**: sample `user_safety_preferences` writes.
   - Expected: no spike beyond the natural opt-in baseline. Spec section 8.13 prohibits gamifying the opt-in, so a sudden increase would indicate a UI regression that surfaces the toggle improperly.
   - Action if spike: review the consumer surface changes in the same window to identify any unintended Settings highlight.

## 4. Rollback procedure

If Step 1 reveals a blocker (BOS line copy mis-rendering, degraded p95, MealCard layout regression):

1. Open Vercel **Settings, Environment Variables**.
2. Locate `BOS_LINE_RENDERING_ENABLED` in Production scope.
3. Set the value to `false`. Save.
4. Wait 2 minutes for propagation.
5. Verify the MealCard no longer renders the BOS line slot:
   - The endpoint returns 200 with a null body when the kill switch is off (per `src/app/api/nutrition/bos-line/[mealId]/route.ts` line 48-53).
   - The MealCard fetch effect short circuits when `isKillSwitchEnabled('BOS_LINE_RENDERING_ENABLED')` reads false at render time.
6. No code revert is required. The other kill switches can be flipped independently if a downstream issue surfaces:
   - Disable degraded service messaging: set `PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED=false`.
   - Disable FDA disclaimer (regulatory escalation only; do not flip without Kelsey approval): `FDA_DISCLAIMER_RENDERING_ENABLED=false`.
   - Disable safety mode opt-in writes (preserves existing opt-ins): `EATING_DISORDER_SAFETY_MODE_ENABLED=false`.

## 5. Post-rollout

1. Mark Prompt 172 SHIPPED in the prompt ledger (per `project_prompt_ledger.md` memory entry pattern).
2. File the post-launch retrospective at `docs/runbooks/prompt-172-post-launch-retro-<date>.md` within 7 days. Coverage:
   - 24h monitoring observations.
   - Any rollback events.
   - Acceptance criteria deltas from the in-spec contract.
   - Deferred items closed or rolled forward to a 172 supplement.
3. Coordinate with Kelsey on the 90-day re-review per 170c section 1.3.

## 6. Reference artifacts

- **Spec**: `docs/prompts/prompt-172-master-spec-2026-06-01.md`
- **Acceptance report**: `docs/runbooks/prompt-172-acceptance-report-2026-06-02.md`
- **Acceptance matrix test**: `tests/172/acceptance-matrix.test.ts`
- **Marshall scan test**: `tests/172/marshall-scan-microcopy.test.ts`
- **Wellbeing guardrails test**: `tests/172/wellbeing-guardrails.test.ts`
- **Hannah review record**: commit `d72c2c17` (Phase 1B review revisions)
- **Kelsey review record**: commit `d72c2c17` (Phase 1B review revisions)
- **Phase 2 production deployment SHA**: `ab1f388a`
- **Husky hook fix SHA**: `77bfd010`
- **Phase 0 (170c primitives + 171a memorialization)**: `80cc4621`
- **Phase 0 supporting artifacts**: `fa4d5d9a`
- **Phase 1A extract refactor**: `1a4b38eb`
- **Phase 1B (microcopy + state machine + safety mode + degraded service)**: `9b9186ba`
