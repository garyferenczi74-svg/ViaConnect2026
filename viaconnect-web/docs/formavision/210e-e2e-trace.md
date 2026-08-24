# Prompt 210e Task E5: FormaVision End-to-End Trace Evidence (Section 7 + Section 11)

Date: 2026-07-09. Branch: feat/210e-integration (worktree ViaConnect2026-210e).

This document traces the FormaVision Section-7 fixture journey hop by hop and states,
for each hop, exactly what proves it and at what altitude. It is deliberately honest
about the boundary between what deterministic CI proves and what is a live-environment
or walk artifact:

- The full end-to-end capture trace with REAL member photos (camera -> edge-function
  extraction -> live 3D canvas) is a LIVE-ENVIRONMENT / walk artifact. It needs a
  GL-capable browser, a running Next.js server, a seeded and authenticated session,
  the `body-progress-photos` bucket, and the `arnold-vision-analyze` edge function. A
  headless agent runner has none of these, so that trace is run on demand, not in CI.
- The FIXTURE-level and FAULT-level coverage is what the Vitest suites prove
  deterministically, with no live DB, no GL, and no browser. That is the evidence
  captured here.

No fabricated evidence appears in this document. Fixtures are labelled fixtures. Every
"covered by" cell names a real, committed test file that runs green on this branch.

## Coverage legend

- **E5-vitest**: covered by `src/lib/formavision/__tests__/resilience.test.ts` (this task).
- **E2-vitest**: covered by `src/lib/formavision/__tests__/invariants.test.ts` (Section-6 invariants).
- **E1-vitest**: covered by an E1 seam test (`seam-telemetry.test.ts` /
  `seam-region-protocol.test.ts`).
- **unit-vitest**: covered by the seam's own committed unit test(s), enumerated in
  `docs/formavision/210e-seam-matrix.md` (the Automated-test column).
- **E3 @fallback**: covered by the headless-runnable 2D-floor / a11y Playwright specs
  in `tests/e2e/formavision/journey.spec.ts` (tag `@fallback`), which force
  `forceWebGLUnavailable()`.
- **GL-tier @cinematic**: covered ONLY in the GL CI environment by the `@cinematic`
  specs in the same file; each self-skips headless (`cinematicCanvasIsUp`). Live-only.
- **walk-live-smoke**: a manual / live-smoke step (real photos, live DB, or an SQL
  check against a fixture user). Run on demand, never headless CI. Recorded in the
  seam matrix.

## Section-7 fixture trace, hop by hop

The fixture journey is: a seeded fixture user with a synthetic multi-scan history opens
`/body-tracker/composition`; four captures drive extraction with per-field confidence;
the vector persists to the body_tracker tables; mesh params build; each overlay paints
the same avatar from the same numbers; the ring counts up on a region tap; the two-scan
morph and time machine scrub over the fixture history; readouts and Notable Changes
reflect the fixture deltas; a region tap lands the whole-protocol panel; the score hook
resolves; a milestone celebrates; telemetry emits; and a forced fallback drops to lite,
then to the 2D floor with numbers intact.

| # | Hop | What lands / defined state | Covered by | Notes |
|---|-----|----------------------------|------------|-------|
| 1 | Four captures -> extraction with confidence | Quality gate surfaces a bad frame as a retake; per-field confidence written (high / moderate / low / null). UNKNOWN stays null, never 0. | E5-vitest (CHECK 5, `assessCaptureQuality` + `scoreMeasurementConfidence`); unit-vitest (`captureQuality.test.ts`, `silhouetteToQualityInput.test.ts`, `confidenceModel.test.ts`, `runScanAnalysis.inmemory.test.ts`) | Live camera + `arnold-vision-analyze` edge round trip and the specific retake-prompt render: walk-live-smoke. |
| 2 | Extraction -> body_tracker write | Vector persists to `body_scan_measurements` + `body_tracker_circumference` (+ hip in `body_tracker_weight.hips_in`). Dropped mid-write fails open, table-tagged, no PII. | E5-vitest (CHECK 2, `emitAvatarEvent` dropped-write + `reportSupabaseError` table-tag); unit-vitest (`scanCircumferenceWrite.test.ts`) | The live write to the real tables under an authenticated session is walk-live-smoke. |
| 3 | Vector contract (write == read) | Same body_tracker contract, no translation layer; nulls preserved; estimated flag derived from null; `toMeters` never returns 0. | E2-vitest (ONE-SOURCE invariant); unit-vitest (`scanToParamVector.test.ts`) | Structural equality proven against the real exported functions, not a pixel read. |
| 4 | Vector -> mesh params | Mesh builds; UNKNOWN regions use template defaults and are carried in `estimatedRingIds` to the render layer (never guessed as a number). | unit-vitest (`buildBodyGeometry.test.ts`, `buildBodyGeometrySegment.test.ts`, `mountBodyGeometry.test.ts`) | The mesh geometry math is pure and fully unit-covered; the live 3D mount is GL-tier @cinematic. |
| 5 | Mesh -> each overlay | Muscle / measurements / genetics overlays read the SAME scan and circumference hooks as the cards; unknown regions render neutral. | E2-vitest (ONE-SOURCE); unit-vitest (`composSegmentTints.test.ts`, `segmentTints.test.ts`, `measurementCallouts.test.ts`, `measurementRingController.test.ts`); E3 @fallback (overlay switch on the 2D floor) | Live overlay paint on the 3D canvas is GL-tier @cinematic ("the three overlays paint the same avatar from the same numbers"). |
| 6 | Ring (region tap count-up) | The measurement ring counts up to the real circumference for the tapped region; a null circumference renders no fabricated value. | unit-vitest (`measurementRingController.test.ts`, `ringLoopForRegion.test.ts`) | The animated count-up over a live GL ring is GL-tier @cinematic ("select a region for the ring count-up"). |
| 7 | Two-scan morph | Interpolated states are labelled transitions; snap points sit on real scans only; reduced-motion snaps scan to scan (no invented intermediate scan). | E2-vitest (NO-FABRICATION: no invented intermediate scans at snap points); unit-vitest (`lerpParamVector.test.ts`, `morphController.test.ts`, `morphPositions.test.ts`) | The live morph animation and its VR midpoint baseline are GL-tier @cinematic. |
| 8 | Time machine | Journey scrubs across the fixture history; cap 60 plus the genuine earliest scan (210a Gate 4); interpolations labelled. | unit-vitest (`journeyTimeline.test.ts`, `scrubController.test.ts`, `useCompositionHistory.test.ts`, `useCircumferenceHistory.test.ts`); E3 @fallback (scrubber keyboard-reachable when a journey exists) | Live scrub / play over the fixture history on the 3D canvas is GL-tier @cinematic. |
| 9 | Readouts / Notable Changes | Deltas computed latest-vs-first with canonical polarity; direction never re-derived in the UI; shoulderWidth neutral; null on either side omits the delta (never 0). | E2-vitest (SIGN-INTEGRITY, NO-FABRICATION); unit-vitest (`compositionDeltas.test.ts`) | The live readout render reflecting the fixture deltas is GL-tier @cinematic; the numbers themselves are proven at the data layer. |
| 10 | Region-tap protocol | The tap opens `GET /api/protocol/synthesis` (the real whole-protocol Via Cura engine), never a region-filtered path; null synthesis lands the honest-disabled empty state. | E1-vitest (`seam-region-protocol.test.ts`); unit-vitest (`RegionProtocolPanel.test.ts`) | Gary-decided: whole-protocol landing ACCEPTED (no region-filtered engine). Live panel open on the 3D surface is GL-tier @cinematic. |
| 11 | Score hook | BOS movement readout reads `/api/bos/current` (SSOT) with no parallel compute; null score and null baseline render honestly. Bio Optimization Score is the only score name. | E2-vitest (COPY-LOCKS: score-name lock); unit-vitest (`current.test.ts`, `use-bos-current-fetch.test.ts`, `BOSMovementReadout.test.ts`) | The live readout resolving to an honest state on the 3D surface is GL-tier @cinematic. |
| 12 | Milestone | `body_tracker_milestones` read is celebrate-only and mounted ONLY in the (consumer) composition page; a timed-out or missing-object read fails open (renders nothing), reason-tagged. | E5-vitest (CHECK 1 timed-out read fail-open; CHECK 3 missing-object strict/non-strict); unit-vitest (`MilestoneMoment.test.ts`) | The `MilestoneMoment.tsx` seam uses the real `withTimeout(4s)` fail-open read that CHECK 1 models. Data-layer absence from practitioner views is walk-live-smoke (route-grouping fact). |
| 13 | Telemetry | The 12-event catalog emits into `analytics_events` and nowhere else; payload is PII-clean (coarse enums / counters / durations); a dropped emit fails open. | E1-vitest (`seam-telemetry.test.ts`); E5-vitest (CHECK 2 dropped emit fails open, no PII) | Gary-decided: walk step 10 (the 12 events actually arriving) is an SQL check against `analytics_events` with a fixture user, NOT a dashboard build: walk-live-smoke. |
| 14 | Forced fallback -> lite | Sustained frame-budget miss steps the tier cinematic -> lite (sticky, no step-up); lite genuinely reduces segment density. | E5-vitest (CHECK 4 `stepTierDown` cinematic -> lite, sticky); unit-vitest (`tierLadder.test.ts`, `frameBudgetMonitor.test.ts`, `capabilityProbe.test.ts`) | The live lite render (reduced density on the 3D canvas) is GL-tier @cinematic. |
| 15 | Forced fallback -> 2D floor | WebGL unavailable or a caught render error latches `fellBack` and renders the `SegmentalHeatMap` 2D floor with readout numbers intact; never recovers mid-session. | E5-vitest (CHECK 4 `hasWebGL` false under no-DOM, `isFloorTier`); unit-vitest (`hasWebGL.test.ts`, `AvatarErrorBoundary.test.ts`, `RenderTierProvider.test.ts`); E3 @fallback (forced WebGL-fail lands on the 2D floor, no r3f canvas, numbers survive, keyboard + reduced-motion parity) | The 2D floor is the one fallback tier that IS runnable headless (E3 @fallback forces `forceWebGLUnavailable()`). |

## Section 11 resilience fault matrix (E5)

Each Section-11 chaos check lands the system in a DEFINED state with a reason-tagged log
and no fabricated number. All are covered by `src/lib/formavision/__tests__/resilience.test.ts`,
which injects a real fault into a REAL exported seam function.

| Chaos check | Injected fault | Defined landing state | Reason-tagged log | Real function(s) imported |
|-------------|----------------|-----------------------|-------------------|---------------------------|
| 1. Timed-out extraction / read | A never-resolving promise raced by the real `withTimeout` (the MilestoneMoment 4s read shape) | Fail-open empty `[]` / UNKNOWN `null` within the timeout; never 0, never a hang, never a throw that escapes | `safeLog.warn('MilestoneMoment', ..., { reason: 'timeout', operation })` | `withTimeout`, `isTimeoutError`, `TimeoutError` (`src/lib/utils/with-timeout.ts`) |
| 2. Dropped mid-write connection | A rejected Supabase `insert` (`connection reset`, `ECONNRESET`, `socket hang up`) into the real `emitAvatarEvent` write seam | Seam resolves `undefined` (no throw, fail-open preserved); still targets `analytics_events` only | `safeLog.warn('formavision.telemetry', ..., { event })` with the coarse event tag only, no PII / user-id; also `reportSupabaseError` table-tagged | `emitAvatarEvent` (`avatarTelemetry.ts`); `reportSupabaseError` (`schema-drift.ts`) |
| 3. Missing-object error | A Postgres 42P01 / PostgREST PGRST205 shaped error to the real `reportSupabaseError` | STRICT: rethrows the ORIGINAL error; NON-STRICT: fails open (logs, no throw). Classified `missing_table`. | `safeLog.error(scope, ..., { schemaDrift: true, driftReason: 'missing_table', pgCode, table })`, object-name + code context only | `classifySchemaDrift`, `isSchemaStrict`, `reportSupabaseError` (`schema-drift.ts`, the 210d contract) |
| 4. WebGL context loss | No-DOM node runner (the WebGL-unavailable condition); modeled direct drop to `'2d'` | Fail-open to the 2D floor: `hasWebGL()` false, `stepTierDown` descends cinematic -> lite -> 2d (sticky), `isFloorTier('2d')` true | Component wiring cited (not fabricated): `AvatarErrorBoundary.componentDidCatch` logs "falling back to 2D"; `BodyCompositionAvatar` `fellBack` latch | `hasWebGL` (`components/formavision/hasWebGL.ts`); `stepTierDown`, `isFloorTier` (`tier/tierLadder.ts`) |
| 5. Interrupted capture | A partial capture (lost hips + ankles) and a fully aborted capture (no person) to the real quality gate | Retake / estimated state: `pass = false` with the blocking issue enumerated; degraded confidence falls below `CONFIDENCE_THRESHOLD` -> UNKNOWN, never a fabricated pass or 0 | The gate returns the issue list (`full body not in frame`, `no person detected`); the caller marks affected measurements estimated (RULE 9) | `assessCaptureQuality` (`accuracy/captureQuality.ts`); `scoreMeasurementConfidence`, `CONFIDENCE_THRESHOLD` (`accuracy/confidenceModel.ts`) |

## Red-first proof

Requirement (E5 brief): verify at least once that a test fails if the fail-open were
removed, then restore. This was performed against CHECK 1 (the timed-out read), whose
fail-open depends on the real `withTimeout` race throwing `TimeoutError` so the seam's
catch can substitute the empty state.

Procedure (real, captured):

1. The committed `resilience.test.ts` was copied to a scratch file
   `src/lib/formavision/__tests__/_redproof_scratch.test.ts`.
2. In the scratch copy, the fail-open was REMOVED from the CHECK 1 `failOpenRead`
   harness: the `withTimeout(read, ms, op)` race was deleted and replaced with a bare
   `await read`, so the injected never-resolving read is awaited directly with no timeout.
3. `npx --no-install vitest run src/lib/formavision/__tests__/_redproof_scratch.test.ts -t "CHECK 1" --testTimeout=1500`
   produced (RED):

   ```
   Test Files  1 failed (1)
        Tests  4 failed | 2 passed | 21 skipped (27)
   ```

   The 4 fail-open cases (empty-rows fallback, reason-tagged log, honest-empty-state,
   UNKNOWN-null) each failed with `Error: Test timed out in 1500ms` because, with the
   `withTimeout` race removed, the hung read never yields the fallback. (The 2 that
   still passed are the `withTimeout`-contract assertion, which does not depend on the
   removed harness, and the in-suite RED-FIRST sentinel, which tests the removed path
   on purpose.)
4. The scratch file was DELETED (restore). The committed `resilience.test.ts` runs
   green: `Test Files 1 passed (1) / Tests 27 passed (27)`.

This proves the real `withTimeout`-backed fail-open is load-bearing: remove it and the
timed-out-read guarantees go red; restore it and they go green. The committed suite
also carries an always-green in-file sentinel documenting this dependency without
leaving the suite red (`RED-FIRST sentinel: with the withTimeout race removed, no
fail-open value is ever produced`).

## Honesty boundary summary

- What CI proves headless: every fixture-level equality and honesty invariant (E2), the
  telemetry and region-tap seam contracts (E1), the five resilience fault landings (E5),
  the 2D-floor + a11y fallback path (E3 @fallback), and every seam's own unit tests.
- What is live-only or walk-smoke: the real-photo capture -> edge-function extraction
  round trip, the live writes to the body_tracker tables, every `@cinematic` GL render
  (canvas mount, overlay paint, ring count-up, morph, time-machine scrub, live readouts,
  protocol panel), the 12-event arrival SQL check against `analytics_events` (walk step
  10), and the milestone data-layer absence from practitioner views. These are recorded
  in `docs/formavision/210e-seam-matrix.md` and run on demand.
- No number rendered by FormaVision is fabricated at any hop: UNKNOWN stays null, a
  failed capture is a retake, a dropped write is silent-and-logged, a missing object is
  reason-tagged (and strict-mode-fatal in test / preview), and every fallback tier keeps
  the real readout numbers intact.
