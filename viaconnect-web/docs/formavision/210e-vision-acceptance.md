# Prompt 210e Task E6: FormaVision Vision-Walk Acceptance Report (Section 12 / 9 / 14)

Date: 2026-07-09. Branch: feat/210e-integration (worktree ViaConnect2026-210e), synced with merged main.

This is the acceptance shell for FormaVision. It carries three things:

1. THE VISION WALK (Section 12): the single continuous 10-step walkthrough Gary
   performs, once on phone and once on desktop. Each step is a concrete action and
   the honest expected result, with the automated backstop that already guards that
   step named beside it.
2. THE PERFORMANCE PASS METHOD (Section 9): the measured budgets per ladder tier and
   exactly HOW to capture them in a GL environment. The number cells are LEFT EMPTY;
   they are filled from a real run, never estimated here.
3. THE ACCEPTANCE RESULTS TABLES + SIGN-OFF (Section 14): one results table per
   platform with a row per walk step and blank pass / notes cells, a performance
   results table with blank number cells, a compliance-sweep row, a resilience row,
   and Gary's final sign-off line (blank).

Honesty boundary (governs this whole document): the vision walk is Gary's acceptance
ACT. It is not agent-verifiable and no walk result is pre-filled. The performance
numbers require a live GL environment (a GL-capable browser, a running Next.js
server, a seeded and authenticated session); they are not captured by a headless
agent runner and none is fabricated here. What CI proves deterministically is the
per-step BACKSTOP (the E1 / E2 / E5 Vitest contracts, the E3 @fallback specs, the
seam unit tests); what the walk proves is the live experience on real hardware. The
two are complementary, and the seam boundary is recorded in
`docs/formavision/210e-seam-matrix.md` and `docs/formavision/210e-e2e-trace.md`.

Gary's recorded 210e decisions govern and are reflected below verbatim:

- TELEMETRY (walk step 10): confirming the 12 events arrive is an SQL verification
  against the `analytics_events` table with a fixture user, NOT a dashboard build.
- REGION TAP (walk step 6): the tap lands the real whole-protocol Via Cura panel via
  GET /api/protocol/synthesis. Whole-protocol landing is ACCEPTED; there is no
  region-filtered engine (that is deferred to a future prompt).
- 210d finished first (done); the schema-drift gate and strict mode are on this
  branch via merged main.

Surface under walk: the real avatar surface at
`src/app/(app)/(consumer)/body-tracker/composition/page.tsx`, reached from the My
Biology hub (`/body-tracker`, the Body Composition surface). Auth-gated: it needs a
signed-in session, which is why the whole walk is a live act and the Playwright
@fallback job is opt-in until a seeded storage-state fixture is wired.

Legend for the backstop column (same vocabulary as the E5 trace):

- E1-vitest: an E1 seam test (`seam-telemetry.test.ts` / `seam-region-protocol.test.ts`).
- E2-vitest: `src/lib/formavision/__tests__/invariants.test.ts` (Section-6 invariants).
- E5-vitest: `src/lib/formavision/__tests__/resilience.test.ts` (Section-11 faults).
- unit-vitest: the seam's own committed unit test(s), enumerated in the seam matrix.
- E3 @fallback: the headless-runnable 2D-floor / a11y Playwright specs in
  `tests/e2e/formavision/journey.spec.ts` (tag `@fallback`, forces
  `forceWebGLUnavailable()`).
- GL-tier @cinematic: the `@cinematic` specs in the same file; each self-skips
  headless via `cinematicCanvasIsUp()`. Runs only in the GL CI environment.
- this walk: the live act itself; the row's only proof of the live experience.

---

## Part 1: THE VISION WALK (Section 12)

One continuous pass. Gary does not reset between steps; the surface state carries
forward exactly as a member would experience it. Perform the whole sequence once on
a phone and once on a desktop. Where a step's honest expected result is a disabled or
empty state (genetics, future self, null score, single-scan history), that honest
state IS the pass, not a defect.

### Step 1: Open My Biology and run the guided scan (four captures, one bad frame)

Action: from My Biology (`/body-tracker`), open Body Composition and start a scan.
Perform the four guided captures (front, back, left, right). On one capture,
deliberately frame a bad shot (step partly out of frame or turn away).

Expected result: the three good captures accept and drive extraction with per-field
confidence (high / moderate / low / null). The deliberately bad frame does NOT
silently accept: the quality gate surfaces it and the SPECIFIC retake prompt renders,
naming the blocking issue (for example "full body not in frame" or "no person
detected"), and the capture is re-taken before the scan proceeds. No measurement is
invented for the missing region: UNKNOWN stays null, never 0.

Backstop: E5-vitest (CHECK 5 `assessCaptureQuality` + `scoreMeasurementConfidence`;
partial and aborted captures land pass=false with the blocking issue enumerated) plus
unit-vitest (`captureQuality.test.ts`, `silhouetteToQualityInput.test.ts`,
`confidenceModel.test.ts`, `runScanAnalysis.inmemory.test.ts`). The live camera plus
`arnold-vision-analyze` edge round trip and the specific retake-prompt RENDER are
this walk (walk-live-smoke; not headless CI).

### Step 2: Materialize intro

Action: watch the avatar materialize as the scan completes.

Expected result: the avatar assembles and the measurement callouts stagger in on
their own mount (they are not fabricated ahead of the data). The intro plays the
avatar into its first resting state; under reduced motion it snaps to the resting
state with the same information, no invented frames.

Backstop: unit-vitest (`measurementCallouts.test.ts` staggered mount;
`mountBodyGeometry.test.ts`) and E2-vitest (NO-FABRICATION: no invented intermediate
state). The live materialize animation on the 3D canvas is GL-tier @cinematic.

### Step 3: Rotate, select Upper Waist, read the ring count-up with change-since-first

Action: rotate the avatar. Select the Upper Waist region (via the Select Body Part
control). Read the measurement ring as it counts up.

Expected result: the ring counts up to the REAL Upper Waist circumference for the
selected region, and shows the change since the first scan. A null circumference
renders no fabricated value (the ring shows the honest UNKNOWN state, never 0). The
count-up target equals the stored circumference the cards use.

Backstop: unit-vitest (`measurementRingController.test.ts`, `ringLoopForRegion.test.ts`
for the count-up target; `scanToParamVector.test.ts` for the shared number) and
E2-vitest (ONE-SOURCE: avatar ring meters == stored inches). The animated count-up
over the live GL ring is GL-tier @cinematic. The `measurement-ring-readout` testid
landed in E3b, so the @cinematic spec now asserts the counted-up NUMBER directly
(journey.spec.ts); executing that assertion is the GL-tier first cinematic run.

### Step 4: Switch Body Fat / Muscle / Measurements overlays (same numbers as the cards)

Action: switch across the three overlays (Body Fat, Muscle, Measurements) using the
section toggle.

Expected result: each overlay paints the SAME avatar from the SAME numbers the cards
show. The avatar tint for a region matches the card status color for that region;
unknown regions render neutral, never guessed. The grid does not remount between
overlays; the numbers are identical to the readout cards because they read the same
scan and circumference hooks.

Backstop: E2-vitest (ONE-SOURCE: avatar tint == card status color) and unit-vitest
(`composSegmentTints.test.ts`, `segmentTints.test.ts`, `measurementCallouts.test.ts`).
The overlay switch on the 2D floor is covered headless by E3 @fallback (three tabs
switch without remounting the grid); the live overlay PAINT on the 3D canvas is
GL-tier @cinematic.

### Step 5: Scrub the Time Machine first-to-today, then play

Action: open the Time Machine. Scrub from the first scan to today. Then press play.

Expected result: the journey scrubs across the real scan history; snap points sit on
REAL scans only (cap 60 plus the genuine earliest scan, 210a Gate 4). Interpolated
states between scans are LABELLED as transitions, not presented as measured scans.
Play animates first-to-today. Under reduced motion the scrub snaps scan to scan (no
invented intermediate scan). If only one scan exists, the honest single-scan invite
is shown instead and this step is not applicable.

Backstop: unit-vitest (`journeyTimeline.test.ts`, `scrubController.test.ts`,
`useCompositionHistory.test.ts`, `useCircumferenceHistory.test.ts`;
`lerpParamVector.test.ts` for labelled interpolation) and E2-vitest (NO-FABRICATION:
no invented intermediate scans at snap points). The scrubber being keyboard-reachable
when a journey exists is E3 @fallback; the live scrub and play over the 3D canvas is
GL-tier @cinematic (an honest data gate, not a GL gate, hides this step when fewer
than two scans are seeded).

### Step 6: Read body fat and Notable Changes, tap the biggest-change region for the protocol

Action: read the Body Fat readout and Notable Changes. Tap the region with the
biggest change.

Expected result: the deltas read latest-vs-first with canonical polarity (fat down is
an improvement, girth changes carry the correct direction, shoulder width is neutral,
never scored as progress); a null on either side omits that delta, never shows 0. The
region tap opens the REAL whole-protocol Via Cura panel via GET
/api/protocol/synthesis. Per Gary's decision the landing is the whole user protocol,
NOT a region-filtered one; a null synthesis lands the honest-disabled empty state,
never a fabricated protocol.

Backstop: E2-vitest (SIGN-INTEGRITY, NO-FABRICATION) and unit-vitest
(`compositionDeltas.test.ts`) for the readouts; E1-vitest
(`seam-region-protocol.test.ts`: the tap calls GET /api/protocol/synthesis, no
region-filtered path, honest-disabled on null) and unit-vitest
(`RegionProtocolPanel.test.ts`) for the tap. The live readout render and the live
panel open on the 3D surface are GL-tier @cinematic.

### Step 7: Read the agents narration, the Bio Optimization Score reflection, and the milestone

Action: read the agent narration on the surface, the Bio Optimization Score
reflection, and any milestone moment that celebrates.

Expected result: the narration is deterministic templated copy attributed via
getDisplayName (for example Arnold, Hannah), fail-open, with a first-scan welcome on
null deltas; it never uses a banned term or an em/en dash. The score reflects the Bio
Optimization Score read from `/api/bos/current` (the SSOT), with no parallel compute;
a null score and a null baseline render honestly. "Bio Optimization Score" is the
only score name shown. A milestone, if present, celebrates only (it is mounted only
in the consumer composition page; it never writes a practitioner or Helix credit
here). A missing or timed-out milestone read fails open and renders nothing.

Backstop: E2-vitest (COPY-LOCKS: "Bio Optimization Score" is the only score name, no
dashes; PERSONA-INTEGRITY via getDisplayName), E5-vitest (CHECK 1 timed-out milestone
read fails open; CHECK 2 dropped write fails open, no PII), and unit-vitest
(`AgentNarration.test.ts`, `current.test.ts`, `use-bos-current-fetch.test.ts`,
`BOSMovementReadout.test.ts`, `MilestoneMoment.test.ts`). The live narration, score,
and milestone rendering on the 3D surface are GL-tier @cinematic. The milestone
data-layer absence from practitioner views is this walk (route-grouping fact,
walk-live-smoke). Note: Kelsey clearance of the narration copy is a Section-10
compliance item (see the compliance sweep row).

### Step 8: Open genetics and future self (honest disabled states)

Action: open the Genetics overlay and the Future Self panel.

Expected result: with no genetics data and no goal set, BOTH render honest
data-driven DISABLED states: the genetics overlay shows its absent-state CTA with
zero fabricated bands, and the future-self panel shows its disabled toggle with no
projected body (ghost default OFF). These are not feature flags; the surfaces are
always mounted and activate only when real data arrives. The honest disabled state IS
the pass.

Backstop: E2-vitest (NO-FABRICATION: no OVAL_HEX region color leaks in either honest
genetics state; honest-disabled future self with no goal / no current scan) and
unit-vitest (`GeneticsOverlay.test.ts`, `FutureSelfPanel.test.ts`,
`projectFutureSelfVector.test.ts`, `ghostBody.test.ts`). The honest-disabled states
are reachable headless via E3 @fallback (`genetics-overlay-absent`,
`future-self-toggle-disabled`); the live 3D render of them is GL-tier @cinematic.

### Step 9: Force the fallback ladder (reduced motion, then lite, then 2D floor with numbers intact)

Action: force the step-down. Enable reduced motion. Then force the runtime tier down
(throttle the device / GPU so the frame-budget monitor trips), watching it go
cinematic to lite to the 2D floor.

Expected result: the tier steps down ONE rung at a time and stays there (sticky, no
step-up): cinematic to lite (lite genuinely reduces segment density), then lite to
the 2D floor. There is NO blank frame during the step-down. On the 2D floor the
`SegmentalHeatMap` renders and every readout number survives intact (body fat,
Notable Changes, the region numbers). Reduced motion preserves information parity
(honest states and numbers present). The floor never recovers to 3D mid-session.

Backstop: E5-vitest (CHECK 4 `stepTierDown` cinematic to lite sticky; `hasWebGL`
false under no-DOM; `isFloorTier('2d')`) and unit-vitest (`tierLadder.test.ts`,
`frameBudgetMonitor.test.ts`, `capabilityProbe.test.ts`, `hasWebGL.test.ts`,
`AvatarErrorBoundary.test.ts`, `RenderTierProvider.test.ts`). The forced WebGL-fail
landing on the 2D floor with numbers intact, plus reduced-motion and keyboard
information parity, is E3 @fallback (runs headless: it forces the fallback via
`forceWebGLUnavailable()`). The live lite render (reduced density on the 3D canvas)
and the visual verification of "no blank frame" during the runtime step-down are
GL-tier @cinematic / this walk.

### Step 10: Confirm the telemetry events arrived (Gary-decided SQL check)

Action: after the full walk, run the Gary-decided SQL check against `analytics_events`
for the fixture user, and confirm the FormaVision events for this session are present.

Expected result: the 12-event avatar catalog (`ALL_AVATAR_EVENTS`, length 12) has
emitted into `analytics_events` for the fixture user and only there. The rows are
PII-clean (coarse enums, counters, durations; no email / name / weight / measurement
/ rsid values). This is an SQL verification against the table, NOT a dashboard build:
there is no reader surface in scope by Gary's decision. The 12 events arriving live
has never been verified before (210b P8-T2b was held), so this step is the live
first-arrival confirmation.

Backstop: E1-vitest (`seam-telemetry.test.ts`: `ALL_AVATAR_EVENTS` is exactly the
12-event catalog; the emit sink is the `analytics_events` table and nowhere else; the
payload shape is PII-clean) and E5-vitest (CHECK 2 dropped emit fails open, no PII).
The LIVE arrival of the 12 events in `analytics_events` is this walk (the Gary-decided
walk-step-10 SQL check against a fixture user; never headless CI, no live DB in the
suite).

Walk-step count: 10 (this is the single continuous Section-12 walkthrough).

---

## Part 2: PERFORMANCE PASS METHOD (Section 9)

These budgets are MEASURED IN A GL ENVIRONMENT, not headless CI. A headless agent box
has no GL-capable browser and no running server, so it cannot produce a real frame
duration or a real time-to-first-interactive-avatar; any number captured there would
be the 2D floor only and would mis-report a real GL run. The method below is the exact
tooling so Gary or a GL runner captures real numbers into the results table in Part 3.
The number cells in Part 3 are LEFT EMPTY and are never pre-filled.

### Tiers under test

- cinematic: the full Section-7 3D path, on CAPABLE hardware.
- lite: the reduced-density path, on a MID profile (the tier the capability probe
  resolves to on a clearly low-power device, or the tier reached after one runtime
  step-down).
- 2D floor: the `SegmentalHeatMap` baseline (WebGL unavailable or a caught render
  error), the honest floor with the readout numbers intact.

### Metrics and their budgets

The budget cells below are LEFT EMPTY. Gary or the GL runner fills the target budget
alongside the measured value from a real run, so the comparison is honest and not
anchored to a number invented in this document.

| Metric | What it measures | Budget (fill from Section 9 / run) |
|---|---|---|
| Time-to-first-interactive-avatar | From navigation to the avatar being mounted AND interactive (rotatable), per tier. | (leave empty) |
| Sustained frame bucket (rotate / morph) | The frame-duration bucket held during an active rotate and during a two-scan morph, per tier. Reported as the sustained bucket, not a single best frame. | (leave empty) |
| Memory across tab switches | Heap growth across repeated switches away from and back to the composition surface, per tier (must not grow unbounded). | (leave empty) |
| Memory across repeated mounts | Heap growth across repeated mount / unmount of the avatar surface, per tier (must return to baseline; no per-mount leak). | (leave empty) |

### How to measure (exact method and tooling)

1. Environment: a GL-capable browser via Playwright, the built Next.js app running,
   and a seeded and authenticated session on
   `/body-tracker/composition`. This is the same live surface the walk uses.

2. Time-to-first-interactive-avatar: bracket the interval with `performance.now()`
   markers. Mark T0 at navigation start; mark T1 when the avatar is both mounted and
   interactive (the 3D canvas is present inside `avatar-container` AND a rotate input
   is accepted). Capture the interval from a Playwright trace
   (`context.tracing.start({ screenshots: true, snapshots: true })`) so the timeline
   is auditable frame by frame. Repeat per tier by forcing the initial tier
   (`RenderTierProvider` `initialTier`, or the capability-probe conditions) so
   cinematic, lite, and the 2D floor are each measured.

3. Sustained frame bucket (rotate / morph): drive a real rotate and a real two-scan
   morph, and read the frame durations the runtime monitor already samples. The
   monitor is `FrameBudgetMonitor` in `FormaVisionCanvas` (line 597), feeding the pure
   `createFrameBudgetSampler` in `src/lib/formavision/tier/frameBudgetMonitor.ts`.
   Under `frameloop="demand"` (FormaVisionCanvas line 663) frames are produced only
   during an active sequence, so the inter-frame delta is the true frame duration ONLY
   while the rotate / morph runs; idle gaps larger than `DEFAULT_IDLE_GAP_MS` (250ms)
   are discarded by the sampler and must be excluded from the bucket. Report the
   sustained bucket over the active window. The over-budget threshold the code uses is
   `DEFAULT_FRAME_BUDGET_MS` (34ms, just slower than 30fps); a healthy 60fps frame
   (about 16.7ms) is comfortably under it.

4. Memory across tab switches and repeated mounts: with the Playwright trace running,
   switch away from and back to the surface repeatedly, and separately mount / unmount
   the avatar surface repeatedly. Sample the heap at a fixed point in each cycle
   (`performance.memory` where available, or the CDP `Memory`/`HeapProfiler` domain
   via the Chromium DevTools Protocol) and record the growth across cycles per tier.
   The pass condition is bounded growth that returns toward baseline, not a per-cycle
   leak.

### Runtime step-down verified (throttled run triggers a tier drop with no blank frame)

Method: on capable hardware, throttle the run (CPU / GPU throttling via the Playwright
CDP session, or a heavy concurrent load) so the sampled frame duration sustains over
budget for a full window. The sampler emits ONE budget-miss after
`DEFAULT_OVER_BUDGET_WINDOW` (20) consecutive over-budget frames (roughly 0.7s at
30fps of sustained jank, the hysteresis that prevents thrash on a momentary hitch).
That single signal reaches the provider through `useReportBudgetMiss`, which applies
`stepTierDown` once (cinematic to lite to 2d, sticky, never up). Verify from the trace
that the tier dropped exactly one rung on the sustained miss and that NO blank frame
appeared during the transition (the previous tier keeps painting until the new tier
mounts). Record the result in the resilience row of Part 3.

The budget-miss signal used above is the real one wired in the app: the monitor lives
inside the r3f Canvas and reports DOWN as a prop (`useReportBudgetMiss` ->
`onBudgetMissed`) because the Canvas does not see React context across the reconciler
boundary. That is the `RenderTierProvider` budget-miss signal named in the E6 brief;
this method reads it rather than inventing a parallel measurement.

---

## Part 3: ACCEPTANCE RESULTS TABLES + SIGN-OFF (Section 14)

All pass / notes / number cells are LEFT BLANK for Gary. Nothing in this section is
pre-filled. A step's row is marked pass by Gary when the honest expected result in
Part 1 is observed on that platform; an honest disabled or empty state is a pass, not
a defect.

### 3.1 Walk results, PHONE

| Step | Walk action (short) | Backstop (already green) | Pass | Notes |
|---|---|---|---|---|
| 1 | Guided scan, four captures, one bad frame, specific retake prompt | E5-vitest CHECK 5 + unit-vitest; live capture = this walk | | |
| 2 | Materialize intro | unit-vitest + E2-vitest; live anim = GL @cinematic | | |
| 3 | Rotate, select Upper Waist, ring count-up with change-since-first | unit-vitest + E2-vitest ONE-SOURCE; live ring = GL @cinematic | | |
| 4 | Switch Body Fat / Muscle / Measurements overlays, same numbers as cards | E2-vitest ONE-SOURCE + unit-vitest; switch = E3 @fallback; paint = GL @cinematic | | |
| 5 | Time Machine scrub first-to-today, then play | unit-vitest + E2-vitest NO-FABRICATION; keyboard = E3 @fallback; live scrub = GL @cinematic | | |
| 6 | Read body fat + Notable Changes, tap biggest-change region for whole-protocol | E2-vitest + E1-vitest seam-region-protocol + unit-vitest; live panel = GL @cinematic | | |
| 7 | Agents narration + Bio Optimization Score reflection + milestone | E2-vitest COPY-LOCKS + E5-vitest + unit-vitest; live render = GL @cinematic | | |
| 8 | Genetics + future self honest-disabled states | E2-vitest NO-FABRICATION + unit-vitest; states = E3 @fallback; live = GL @cinematic | | |
| 9 | Force fallback: reduced motion to lite to 2D floor, numbers intact | E5-vitest CHECK 4 + unit-vitest; 2D floor + a11y = E3 @fallback; live lite = GL @cinematic | | |
| 10 | Confirm 12 telemetry events in analytics_events (SQL check) | E1-vitest seam-telemetry + E5-vitest CHECK 2; live arrival = this walk (SQL) | | |

### 3.2 Walk results, DESKTOP

| Step | Walk action (short) | Backstop (already green) | Pass | Notes |
|---|---|---|---|---|
| 1 | Guided scan, four captures, one bad frame, specific retake prompt | E5-vitest CHECK 5 + unit-vitest; live capture = this walk | | |
| 2 | Materialize intro | unit-vitest + E2-vitest; live anim = GL @cinematic | | |
| 3 | Rotate, select Upper Waist, ring count-up with change-since-first | unit-vitest + E2-vitest ONE-SOURCE; live ring = GL @cinematic | | |
| 4 | Switch Body Fat / Muscle / Measurements overlays, same numbers as cards | E2-vitest ONE-SOURCE + unit-vitest; switch = E3 @fallback; paint = GL @cinematic | | |
| 5 | Time Machine scrub first-to-today, then play | unit-vitest + E2-vitest NO-FABRICATION; keyboard = E3 @fallback; live scrub = GL @cinematic | | |
| 6 | Read body fat + Notable Changes, tap biggest-change region for whole-protocol | E2-vitest + E1-vitest seam-region-protocol + unit-vitest; live panel = GL @cinematic | | |
| 7 | Agents narration + Bio Optimization Score reflection + milestone | E2-vitest COPY-LOCKS + E5-vitest + unit-vitest; live render = GL @cinematic | | |
| 8 | Genetics + future self honest-disabled states | E2-vitest NO-FABRICATION + unit-vitest; states = E3 @fallback; live = GL @cinematic | | |
| 9 | Force fallback: reduced motion to lite to 2D floor, numbers intact | E5-vitest CHECK 4 + unit-vitest; 2D floor + a11y = E3 @fallback; live lite = GL @cinematic | | |
| 10 | Confirm 12 telemetry events in analytics_events (SQL check) | E1-vitest seam-telemetry + E5-vitest CHECK 2; live arrival = this walk (SQL) | | |

### 3.3 Performance results (measured in a GL environment; number cells blank)

Fill Measured and Budget from a real GL run per Part 2. Do not pre-fill.

| Metric | Tier | Measured | Budget | Pass |
|---|---|---|---|---|
| Time-to-first-interactive-avatar | cinematic (capable HW) | | | |
| Time-to-first-interactive-avatar | lite (mid profile) | | | |
| Time-to-first-interactive-avatar | 2D floor (baseline) | | | |
| Sustained frame bucket (rotate) | cinematic (capable HW) | | | |
| Sustained frame bucket (rotate) | lite (mid profile) | | | |
| Sustained frame bucket (morph) | cinematic (capable HW) | | | |
| Sustained frame bucket (morph) | lite (mid profile) | | | |
| Memory across tab switches | cinematic (capable HW) | | | |
| Memory across tab switches | lite (mid profile) | | | |
| Memory across repeated mounts | cinematic (capable HW) | | | |
| Memory across repeated mounts | lite (mid profile) | | | |

### 3.4 Compliance sweep (Section 10)

| Item | Method | Result | Notes |
|---|---|---|---|
| Security-advisor sweep (Kelsey) | Section-10 compliance pass over the FormaVision surfaces, API routes, and the telemetry sink; includes Kelsey clearance of the agent-narration copy (`agentNarration.ts`), which the seam map records as pending. | | |

### 3.5 Resilience (Section 11, cites E5)

| Item | Method | Result | Notes |
|---|---|---|---|
| Section-11 fault landings | The five chaos checks land defined, reason-tagged states with no fabricated number, proven by `src/lib/formavision/__tests__/resilience.test.ts` (E5, 27 tests green; trace in `docs/formavision/210e-e2e-trace.md`). Confirm the same landings hold in the live walk (timed-out read fails open, dropped write silent-and-logged, missing object reason-tagged, WebGL loss to the 2D floor, interrupted capture to a retake). | | |
| Runtime step-down, no blank frame | Per Part 2 (throttled run trips one sticky tier drop via the `RenderTierProvider` budget-miss signal, no blank frame). | | |

### 3.6 Gary sign-off

Gary sign-off (phone + desktop walk complete, performance numbers captured,
compliance and resilience confirmed):

________________________________________   Date: __________

---

## Open items (gated; must land or be captured before the row above can pass)

Everything here is a real gate carried from E1 through E5, not a placeholder. None is
fabricated as done.

1. First GL cinematic run: the three E3b testids LANDED (`formavision-avatar-canvas`
   on the r3f 3D canvas root, `measurement-ring-readout` on the `MeasurementRing`
   value text, `select-body-part` on the Select Body Part control), so the
   cinematic-vs-floor discriminator is now EXACT (not a canvas-presence proxy) and
   the ring count-up VALUE (walk step 3) is asserted directly. Remaining open part:
   execute the first `@cinematic` run in a GL-capable environment to capture results.

2. Seeded-auth storage-state before @fallback becomes a hard gate: the
   `formavision-fallback-playwright` job is `continue-on-error: true` because the
   composition route is auth-gated and needs a seeded / authenticated session plus
   Supabase env a bare runner does not assume. It flips to a hard gate once the
   storage-state fixture in `tests/e2e/formavision/fixtures.ts` ("Fixture-scan seeding
   approach") is wired. Source: E4 report and `210e-e2e-suite.md`.

3. Live-photo capture trace: the real camera to `arnold-vision-analyze` edge function
   to live 3D canvas round trip (walk step 1) is a live-environment / walk artifact;
   it needs a GL-capable browser, a running server, a seeded session, the
   `body-progress-photos` bucket, and the edge function. Not headless CI. Source: E5
   trace, honesty boundary.

4. Performance numbers: every number cell in 3.3 is captured from a real GL run per
   Part 2 (Playwright trace + `performance.now()` markers + the `RenderTierProvider`
   budget-miss signal). None is filled in this document.

5. GL-tier @cinematic first green run and visual-regression baselines: the full
   Section-7 cinematic trace has never been executed green anywhere; its first green
   run must happen in the GL CI environment (after item 1 lands so the ring / canvas
   assertions are exact). The VR baselines (default, each overlay, ring, morph
   midpoint, 2D floor) are gated behind `FORMAVISION_VR=1` and are captured and
   committed ONLY in the GL CI environment
   (`FORMAVISION_VR=1 npx playwright test tests/e2e/formavision/journey.spec.ts --update-snapshots`);
   NO baseline PNG is captured by a headless box (it would capture the 2D floor only
   and mis-diff a later GL run). Source: E3 and E4 reports.

6. Telemetry live first-arrival SQL check (walk step 10): the 12 events arriving in
   `analytics_events` has never been verified live (210b P8-T2b was held). The
   Gary-decided SQL check against a fixture user is the confirmation; it is not a
   dashboard build. Source: seam matrix Telemetry row, E1 report.

7. Kelsey clearance of the agent-narration copy: the seam map records Kelsey clearance
   of `agentNarration.ts` copy as pending; it is part of the Section-10 compliance
   sweep row (3.4). Source: seam map Section 10, seam matrix Agents row.

8. Gary's walk: the two continuous 10-step passes (phone and desktop) are Gary's
   acceptance act. The results tables in 3.1 and 3.2 and the sign-off line in 3.6 stay
   blank until Gary performs them.

## References

- Seam map (STEP 0, producer/consumer file:line): `docs/formavision/210e-seam-map.md`.
- Seam matrix (per-seam automated test, live-smoke boundary):
  `docs/formavision/210e-seam-matrix.md`.
- E2E suite (CI jobs, strict mode, planted-phantom guardrail):
  `docs/formavision/210e-e2e-suite.md`.
- E2E trace (Section-7 hop-by-hop backstops, Section-11 fault matrix, red-first proof):
  `docs/formavision/210e-e2e-trace.md`.
- Planted-phantom proof: `docs/formavision/210e-planted-phantom-proof.md`.
