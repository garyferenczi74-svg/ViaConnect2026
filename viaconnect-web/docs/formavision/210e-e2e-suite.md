# Prompt 210e Task E4: FormaVision E2E Suite (CI wiring, strict mode, guardrail)

Date: 2026-07-09. Branch: feat/210e-integration (worktree ViaConnect2026-210e).

This document describes the FormaVision (Section 7) verification suite: what runs
in CI now, what is the GL-environment tier (documented, not run headless), how
strict mode is wired, and the planted-phantom guardrail result. It closes the
Guardrails / CI seam row of `docs/formavision/210e-seam-matrix.md`, which recorded
that as of that matrix there was "no Playwright job, no drift check, no migration
parity, no strict mode" for FormaVision. The drift check and migration parity are
the 210d `schema-drift.yml` gates (already on this branch via merged main); this
task adds the FormaVision E2E job and the strict-mode wiring beside them.

## CI job (additive, stands alone)

`.github/workflows/formavision-e2e.yml` (repo root, beside `ci.yml` and
`schema-drift.yml`; neither of those two files was modified). Two jobs:

### 1. `formavision-vitest`: HARD GATE, runs in CI now

Runs the three node-safe FormaVision Vitest suites that require no browser, no GL,
and no live DB:

- `src/lib/formavision/telemetry/__tests__/seam-telemetry.test.ts` (E1), the
  TELEMETRY seam: `ALL_AVATAR_EVENTS` is exactly the 12-event catalog; the emit
  sink is the `analytics_events` table and nothing else; the payload shape is
  PII-clean (coarse enums / counters / durations only).
- `src/components/formavision/__tests__/seam-region-protocol.test.ts` (E1), the
  REGION-TAP seam: the tap calls `GET /api/protocol/synthesis` (the whole-protocol
  Via Cura engine), never a region-filtered path, and falls back to the
  honest-disabled empty state on null synthesis.
- `src/lib/formavision/__tests__/invariants.test.ts` (E2), the Section-6
  invariants: ONE-SOURCE (avatar == card == stored vector), NO-FABRICATION,
  SIGN-INTEGRITY, PERSONA-INTEGRITY, COPY-LOCKS ("Bio Optimization Score" is the
  only score name, no em/en dashes).

Result under strict mode (real local run, `SCHEMA_STRICT_MODE=on`,
`npx --no-install vitest run <the 3 files>`):

```
 Test Files  3 passed (3)
      Tests  51 passed (51)
```

### 2. `formavision-fallback-playwright`: OPT-IN, non-blocking

Installs Chromium and runs ONLY the `@fallback` tag from
`tests/e2e/formavision/journey.spec.ts` (`npx playwright test --grep @fallback`).
The `@fallback` tier forces WebGL unavailable (`forceWebGLUnavailable`), which is
the honest 2D floor: it asserts the `SegmentalHeatMap` floor renders, that NO r3f
canvas mounts inside the avatar container, that the readout numbers survive the
fallback, and that keyboard and reduced-motion information parity hold.

This job is `continue-on-error: true` (does not gate merge) and is honest about
why: the specs navigate to the auth-gated `/body-tracker/composition` surface,
which needs a running Next.js server plus a seeded / authenticated session and
Supabase env a bare runner does not assume. The job starts the built app, waits
for it to listen, then runs the `@fallback` grep, so it CAN run on demand; it is
not a hard gate until a seeded storage-state fixture is wired (see
`tests/e2e/formavision/fixtures.ts`, "Fixture-scan seeding approach").

## GL-environment tier (documented, NOT run headless)

- `@cinematic` (the full Section-7 3D trace) requires a GL-capable browser and a
  live 3D canvas. Every `@cinematic` step self-skips when no canvas mounts
  (`cinematicCanvasIsUp`), so a GL-less run enumerates but does not execute them.
  They are not selected by the CI Playwright job (which greps `@fallback` only).
- Visual-regression baselines (`toHaveScreenshot`) are gated behind
  `FORMAVISION_VR=1` and skipped by default. A headless box has no GL, so its
  baselines would capture the 2D floor only and mis-report a later GL run;
  therefore NO baseline PNGs are captured by an unattended run. Capture and commit
  VR baselines only in the GL CI environment:
  `FORMAVISION_VR=1 npx playwright test tests/e2e/formavision/journey.spec.ts --update-snapshots`.
  Key states per the E3 brief: default, each overlay, ring, morph midpoint, 2D
  floor.

## Strict-mode wiring (Prompt 210d)

The `formavision-vitest` job sets `SCHEMA_STRICT_MODE=on`. `isSchemaStrict()` in
`src/lib/utils/schema-drift.ts` returns true when that flag is `on` (and also when
`NODE_ENV=test`, which Vitest sets). When strict mode is on and a Supabase call
hits a missing-object schema-drift error (missing table / column / function / enum
value / bucket), `reportSupabaseError` rethrows the original error instead of
swallowing it via the fail-open pattern, so the drift fails the run. Setting the
flag explicitly makes the gate environment-independent (it does not rely on
Vitest's default `NODE_ENV`) and matches the 210d contract that a missing-object
error must fail the E2E run.

## Planted-phantom guardrail result

`docs/formavision/210e-planted-phantom-proof.md` documents the full procedure and
the REAL captured scanner output. Summary: a scratch file referencing the
nonexistent table `formavision_phantom_e4_proof` was added under `src`, and
`scripts/schema/scan-code-refs.mjs` (the 210d `schema-drift.yml` scanner):

- clean tree, gated: `scan-code-refs: OK. 80 known finding(s), all baselined; scanned 3004 files.` (exit 0)
- phantom planted, no baseline: `scan-code-refs: FAIL. 81 schema drift finding(s) ... (scanned 3005 files)` (exit 1), with the new finding
  `[table] formavision_phantom_e4_proof (src/lib/formavision/__phantom_e4_scratch.ts:8)`
- phantom removed, gated: back to `80 known finding(s) ... scanned 3004 files` (exit 0)

The scratch file was deleted; NO phantom reference is committed. This proves the
210d drift gate catches a brand-new phantom table reference before merge, and the
same scan protects every FormaVision Supabase target (the `analytics_events`
telemetry sink included).

## Seam matrix reference

Seam names, producer/consumer file:line, and per-seam automated-test coverage:
`docs/formavision/210e-seam-matrix.md`. The Telemetry and Region-tap rows carry
Gary's recorded 210e decisions (telemetry walk-step-10 is an SQL verification
against `analytics_events`, not a dashboard build; region tap is whole-protocol
landing, no region-filtered engine); the two E1 seam tests above verify the
CI-provable half of each, and the live-arrival / live-smoke halves remain manual
per that matrix.
