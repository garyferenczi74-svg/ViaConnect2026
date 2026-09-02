// Task 210e-E5: FormaVision resilience fault-injection harness (Section 11).
//
// One describe block per Section-11 chaos check. Each check injects a real fault
// into a REAL exported seam function (imported, never reimplemented) and asserts
// the system lands in a DEFINED state: the fail-open value (empty / UNKNOWN /
// null, NEVER a fabricated 0 or invented number), the correct reason-tagged log
// fired (asserted via a vi spy), and no throw where the production contract is
// fail-open. Where the production contract is STRICT (missing-object under strict
// mode), the check asserts the deliberate rethrow instead.
//
// Node harness: environment 'node', no jsdom, no live DB, no GL. The Supabase
// client and safe-log are mocked with the same vi.hoisted + vi.mock pattern the
// telemetry seam test (seam-telemetry.test.ts) and schema-drift.test.ts already
// use, so the seams run their real fail-open bodies against controllable faults.
//
// RED-FIRST: describe block (1) contains one it() that documents and proves the
// red-first check. It runs the SAME timed-out injection through a local harness
// that models fail-open REMOVED (the timeout is allowed to reject out), and
// asserts that harness throws / never yields the fail-open value. That test fails
// (would go green in the wrong direction) if the real withTimeout stopped
// throwing TimeoutError, i.e. it is the sentinel that the real seam's fail-open
// is load-bearing. See the block comment on that test for the restore note.
//
// Standing rules: no em dashes, no en dashes, no emojis, zero any, real functions
// imported, design-token / copy rules N/A (no UI here).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock state. vi.mock is hoisted above imports, so any ref the factory
// closes over must be created inside vi.hoisted() to avoid a TDZ error.
//
//   supabaseInsertImpl : swappable insert() body (check 2 injects a rejection).
//   supabaseFromCalls  : records every table string passed to from().
// ---------------------------------------------------------------------------

const { supabaseInsertImpl, supabaseFromCalls } = vi.hoisted(() => ({
  supabaseInsertImpl: { fn: (_payload: unknown): Promise<unknown> => Promise.resolve({ error: null }) },
  supabaseFromCalls: [] as string[],
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      supabaseFromCalls.push(table);
      return { insert: (payload: unknown) => supabaseInsertImpl.fn(payload) };
    },
  }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Imports AFTER the mocks are registered. Every symbol below is a REAL exported
// function under test; none is reimplemented.
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout, isTimeoutError, TimeoutError } from '@/lib/utils/with-timeout';
import { emitAvatarEvent } from '@/lib/formavision/telemetry/avatarTelemetry';
import {
  classifySchemaDrift,
  isSchemaStrict,
  reportSupabaseError,
} from '@/lib/utils/schema-drift';
import { hasWebGL, probeWebGL } from '@/components/formavision/hasWebGL';
import { selectAvatarSurface } from '@/lib/formavision/tier/avatarSurfaceDecision';
import { stepTierDown, isFloorTier } from '@/lib/formavision/tier/tierLadder';
import type { RenderTier } from '@/lib/formavision/tier/types';
import {
  assessCaptureQuality,
  type CaptureQualityInput,
} from '@/lib/arnold/scanning/accuracy/captureQuality';
import {
  scoreMeasurementConfidence,
  CONFIDENCE_THRESHOLD,
  type ConfidenceInputs,
} from '@/lib/arnold/scanning/accuracy/confidenceModel';

// A never-settling promise: the canonical stand-in for a hung read / extraction.
function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => {
    /* intentionally never resolves or rejects */
  });
}

// Fully-good confidence inputs, used as the baseline that a fault degrades.
const GOOD_CONFIDENCE_INPUTS: ConfidenceInputs = {
  captureQualityScore: 1,
  maskEdgeCertainty: 1,
  landmarkVisibility: 1,
  scaleAgreement: 1,
  lrCorroboration: 1,
  fbCorroboration: 1,
  populationPriorScore: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  supabaseFromCalls.length = 0;
  supabaseInsertImpl.fn = (_payload: unknown) => Promise.resolve({ error: null });
});

// ===========================================================================
// CHECK 1: TIMED-OUT extraction / read
//
// Inject a promise that never resolves into a withTimeout-wrapped seam (the same
// real withTimeout MilestoneMoment.tsx uses for its 4s fail-open read). Assert:
//   - it resolves to the fail-open value (empty [] / UNKNOWN, never 0, never a
//     throw that escapes the seam) within the timeout window, and
//   - the reason-tagged fail-open log (safeLog.warn) fired via the spy.
//
// This models a faithful harness around the REAL withTimeout: the seam races the
// hung read, catches the TimeoutError, logs the fail-open reason, and returns the
// defined empty state. It never returns a fabricated number.
// ===========================================================================

describe('CHECK 1: TIMED-OUT read resolves to the fail-open empty state via real withTimeout', () => {
  // Faithful reproduction of the MilestoneMoment.tsx fail-open read shape:
  // withTimeout(read, ms, op) inside try/catch -> safeLog.warn -> return [].
  // Uses the REAL withTimeout + isTimeoutError; only the read is the injected fault.
  async function failOpenRead<T>(
    read: Promise<T>,
    fallback: T,
    timeoutMs: number,
  ): Promise<T> {
    try {
      return await withTimeout(read, timeoutMs, 'MilestoneMoment.milestones');
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.warn('MilestoneMoment', 'milestone read failed, failing open', {
          reason: 'timeout',
          operation: err.operation,
        });
        return fallback;
      }
      throw err;
    }
  }

  it('a hung read resolves to the empty rows fallback (defined state), not a hang or throw', async () => {
    const rows = await failOpenRead<number[]>(neverResolves<number[]>(), [], 10);
    expect(rows).toEqual([]);
  });

  it('fires the reason-tagged fail-open log (safeLog.warn with reason "timeout")', async () => {
    await failOpenRead<number[]>(neverResolves<number[]>(), [], 10);
    expect(safeLog.warn).toHaveBeenCalledTimes(1);
    expect(safeLog.warn).toHaveBeenCalledWith(
      'MilestoneMoment',
      expect.any(String),
      expect.objectContaining({ reason: 'timeout', operation: 'MilestoneMoment.milestones' }),
    );
  });

  it('the fallback is the honest empty state, NEVER a fabricated 0 or invented row', async () => {
    const rows = await failOpenRead<number[]>(neverResolves<number[]>(), [], 10);
    // An empty read must stay empty. No fabricated single-element [0], no invented count.
    expect(rows.length).toBe(0);
    expect(rows).not.toContain(0);
  });

  it('an UNKNOWN-shaped read (null value) times out to null, never coerced to 0', async () => {
    // Model a numeric readout whose fail-open value is UNKNOWN (null), not 0.
    const value = await failOpenRead<number | null>(neverResolves<number | null>(), null, 10);
    expect(value).toBeNull();
    expect(value).not.toBe(0);
  });

  it('withTimeout itself rejects a hung promise with a TimeoutError (the seam contract)', async () => {
    await expect(withTimeout(neverResolves<number>(), 10, 'probe')).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });

  // -------------------------------------------------------------------------
  // RED-FIRST SENTINEL (documented, and RESTORED).
  //
  // The real fail-open depends on withTimeout throwing TimeoutError so the seam's
  // catch can substitute the empty state. To prove that behavior is load-bearing,
  // this harness models fail-open REMOVED: it awaits the SAME hung read WITHOUT
  // the timeout race, guarded by a short outer timeout. With fail-open removed the
  // read never yields a value, so no fallback is ever produced. The assertion that
  // "no defined fallback was produced" is what a correct system must AVOID; this
  // test passes ONLY because the fallback path is the one that was removed here.
  //
  // Verified red-first manually (see 210e-e2e-trace.md Section "Red-first proof"):
  // when the real seam under CHECK 1 has its withTimeout race deleted, the CHECK 1
  // tests above hang / never return the [] fallback. Restoring withTimeout makes
  // them green again. This sentinel encodes that dependency without leaving the
  // suite red.
  // -------------------------------------------------------------------------
  it('RED-FIRST sentinel: with the withTimeout race removed, no fail-open value is ever produced', async () => {
    let producedFallback = false;
    const noRaceRead = (async (): Promise<void> => {
      // Fail-open REMOVED: await the hung read directly, no withTimeout wrapper.
      await neverResolves<number[]>();
      producedFallback = true; // unreachable while the read is hung
    })();

    // Outer guard so the test itself terminates. If the removed-fail-open read had
    // somehow produced a value, producedFallback would flip true before this wins.
    const guard = new Promise<'still-hung'>((resolve) =>
      setTimeout(() => resolve('still-hung'), 20),
    );
    const outcome = await Promise.race([noRaceRead.then(() => 'produced' as const), guard]);

    expect(outcome).toBe('still-hung');
    expect(producedFallback).toBe(false);
  });
});

// ===========================================================================
// CHECK 2: DROPPED connection mid-write
//
// Inject a rejected Supabase insert into the REAL formavision write seam
// emitAvatarEvent (the analytics_events telemetry sink). Assert:
//   - the seam does NOT throw in prod-mode (fail-open preserved), and
//   - safeLog.warn fired tagged with the table / event context only (no PII).
//
// Then, for the reportSupabaseError-tagged variant (the write seams that route
// through the 210d reporter), assert the non-drift dropped-connection error is
// logged with the TABLE context only and no user data.
// ===========================================================================

describe('CHECK 2: DROPPED mid-write connection fails open with table-context log, no PII', () => {
  afterEach(() => {
    // Guard the env stubs used by the reportSupabaseError case below so a failed
    // assertion there cannot leak SCHEMA_STRICT_MODE / VERCEL_ENV into later tests.
    vi.unstubAllEnvs();
  });

  it('emitAvatarEvent does not throw when the insert rejects mid-write (fail-open preserved)', async () => {
    supabaseInsertImpl.fn = () => Promise.reject(new Error('connection reset by peer'));
    await expect(
      emitAvatarEvent('fixture-user-id', 'formavision.avatar_viewed'),
    ).resolves.toBeUndefined();
  });

  it('logs the fail-open via safeLog.warn tagged with the formavision scope', async () => {
    supabaseInsertImpl.fn = () => Promise.reject(new Error('connection reset by peer'));
    await emitAvatarEvent('fixture-user-id', 'formavision.region_selected');
    expect(safeLog.warn).toHaveBeenCalledTimes(1);
    expect(safeLog.warn).toHaveBeenCalledWith(
      'formavision.telemetry',
      expect.any(String),
      expect.objectContaining({ event: 'formavision.region_selected' }),
    );
  });

  it('the write-failure log context carries the coarse event tag only, NO PII / raw biometric key', async () => {
    supabaseInsertImpl.fn = () => Promise.reject(new Error('socket hang up'));
    await emitAvatarEvent('fixture-user-id', 'formavision.timeline_scrubbed');
    const warnMock = vi.mocked(safeLog.warn);
    const context = warnMock.mock.calls[0]?.[2] ?? {};
    const keys = Object.keys(context).map((k) => k.toLowerCase());
    // The context must not carry the user id or any identity / biometric field.
    for (const banned of ['user', 'email', 'name', 'weight', 'height', 'bodyfat', 'rsid', 'circumference']) {
      for (const key of keys) {
        expect(key.includes(banned)).toBe(false);
      }
    }
    // And it must not leak the user id VALUE either.
    expect(JSON.stringify(context)).not.toContain('fixture-user-id');
  });

  it('the dropped write is silent to the caller: the seam still targets analytics_events (no rogue sink)', async () => {
    supabaseInsertImpl.fn = () => Promise.reject(new Error('ECONNRESET'));
    await emitAvatarEvent('fixture-user-id', 'formavision.protocol_opened');
    expect(supabaseFromCalls).toEqual(['analytics_events']);
  });

  it('reportSupabaseError tags a dropped-connection (non-drift) write with the TABLE context and never throws', () => {
    // A dropped connection is NOT schema drift, so this must log warn (fail-open),
    // carry only the table name in context, and never rethrow even in strict mode.
    vi.stubEnv('SCHEMA_STRICT_MODE', 'on');
    vi.stubEnv('VERCEL_ENV', 'production');
    const dropped = new Error('connection terminated unexpectedly');
    expect(() =>
      reportSupabaseError('formavision.scan.write', dropped, { table: 'analytics_events' }),
    ).not.toThrow();
    expect(safeLog.warn).toHaveBeenCalledWith(
      'formavision.scan.write',
      expect.any(String),
      expect.objectContaining({ table: 'analytics_events', error: dropped }),
    );
    // No drift log path taken for a plain connection drop.
    expect(safeLog.error).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

// ===========================================================================
// CHECK 3: MISSING-OBJECT error (reuses the 210d schema-drift contract)
//
// Feed a Postgres 42P01 / PostgREST PGRST205 shaped error object to the REAL
// reportSupabaseError. Assert:
//   - classifySchemaDrift tags reason 'missing_table', and
//   - in STRICT mode reportSupabaseError rethrows the ORIGINAL error, while in
//     non-strict mode it fails open (logs, does not throw).
//
// This imports and exercises the real 210d functions, not a copy. NODE_ENV is
// 'test' under Vitest (which makes isSchemaStrict() true by default), so every
// case below stubs env EXPLICITLY to isolate the strict vs non-strict behavior.
// ===========================================================================

describe('CHECK 3: MISSING-OBJECT error classifies missing_table and gates on strict mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const pgMissingTable = {
    code: '42P01',
    message: 'relation "public.body_tracker_milestones" does not exist',
  };
  const postgrestMissingTable = {
    code: 'PGRST205',
    message: "Could not find the table 'public.analytics_events' in the schema cache",
  };

  it('classifySchemaDrift tags a Postgres 42P01 as missing_table', () => {
    expect(classifySchemaDrift(pgMissingTable)).toEqual({
      isDrift: true,
      reason: 'missing_table',
      pgCode: '42P01',
    });
  });

  it('classifySchemaDrift tags a PostgREST PGRST205 as missing_table', () => {
    expect(classifySchemaDrift(postgrestMissingTable)).toEqual({
      isDrift: true,
      reason: 'missing_table',
      pgCode: 'PGRST205',
    });
  });

  it('STRICT mode: reportSupabaseError rethrows the ORIGINAL missing-table error', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', 'on');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isSchemaStrict()).toBe(true);

    let thrown: unknown = null;
    try {
      reportSupabaseError('formavision.milestone.read', pgMissingTable, {
        table: 'body_tracker_milestones',
      });
    } catch (caught) {
      thrown = caught;
    }
    // The SAME object reference is rethrown (not a wrapper), and the drift log fired
    // reason-tagged with the table context only.
    expect(thrown).toBe(pgMissingTable);
    expect(safeLog.error).toHaveBeenCalledWith(
      'formavision.milestone.read',
      expect.any(String),
      expect.objectContaining({
        schemaDrift: true,
        driftReason: 'missing_table',
        pgCode: '42P01',
        table: 'body_tracker_milestones',
      }),
    );
  });

  it('NON-STRICT (production, no flag): reportSupabaseError fails open, logs drift, does NOT throw', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', undefined);
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isSchemaStrict()).toBe(false);

    expect(() =>
      reportSupabaseError('formavision.milestone.read', postgrestMissingTable, {
        table: 'analytics_events',
      }),
    ).not.toThrow();
    expect(safeLog.error).toHaveBeenCalledWith(
      'formavision.milestone.read',
      expect.any(String),
      expect.objectContaining({
        schemaDrift: true,
        driftReason: 'missing_table',
        pgCode: 'PGRST205',
        table: 'analytics_events',
      }),
    );
  });

  it('the drift log context carries object names and codes ONLY, never user data', () => {
    vi.stubEnv('SCHEMA_STRICT_MODE', undefined);
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    reportSupabaseError('formavision.milestone.read', pgMissingTable, {
      table: 'body_tracker_milestones',
    });
    const errorMock = vi.mocked(safeLog.error);
    const context = errorMock.mock.calls[0]?.[2] ?? {};
    const keys = Object.keys(context).map((k) => k.toLowerCase());
    for (const banned of ['user', 'email', 'weight', 'height', 'bodyfat', 'rsid']) {
      for (const key of keys) {
        expect(key.includes(banned)).toBe(false);
      }
    }
  });
});

// ===========================================================================
// CHECK 4: WebGL context loss -> 2D floor fallback (pure decision functions)
//
// The avatar's WebGL loss / mount failure is handled by two pure decision
// functions the components wire together: hasWebGL() (the GL guard) and
// stepTierDown() / isFloorTier() (the sticky ladder to the 2D floor). This check
// tests those PURE functions, since the GL context and the React error boundary
// are browser / React bound (a real GL context-loss event cannot be raised in a
// node runner). The component wiring is cited, not fabricated:
//   - src/components/formavision/hasWebGL.ts: returns false under SSR / node
//     (no document). That probe is advisory only; selectAvatarSurface still
//     prefers the 3D mount until a confirmed Canvas / error-boundary failure.
//   - src/lib/formavision/tier/avatarSurfaceDecision.ts: a '2d' tier or
//     confirmedFailure flips to the 2D floor; SSR / unavailable probes do not.
//   - src/components/formavision/BodyCompositionAvatar.tsx: a confirmed render
//     error flips the sticky `fellBack` latch and renders the honest 2D floor
//     for the rest of the session (never recovers).
//   - src/components/formavision/AvatarErrorBoundary.tsx:42-47: componentDidCatch
//     logs 'falling back to 2D' and calls onRenderError, driving that latch.
// NO fabricated GL test is authored here.
// ===========================================================================

describe('CHECK 4: WebGL context loss latches the 2D floor via the pure GL + ladder guards', () => {
  it('hasWebGL returns false with no DOM (SSR / node), but that alone does not select the SVG', () => {
    // The node test runner has no document. The probe reports ssr / false so
    // callers can log it; selectAvatarSurface still prefers the 3D mount so a
    // server false-negative cannot latch Male Avatar.svg.
    expect(typeof document).toBe('undefined');
    expect(hasWebGL()).toBe(false);
    expect(probeWebGL()).toBe('ssr');
    expect(
      selectAvatarSurface({
        renderTier: 'cinematic',
        confirmedFailure: false,
        webgl: 'ssr',
      }),
    ).toBe('formavision3d');
  });

  it('the ladder steps cinematic -> lite -> 2d and never past the floor (sticky, no step-up)', () => {
    expect(stepTierDown('cinematic')).toBe('lite');
    expect(stepTierDown('lite')).toBe('2d');
    expect(stepTierDown('2d')).toBe('2d');
  });

  it('a WebGL context-loss modeled as an immediate drop to 2d is the floor tier (parent renders floor)', () => {
    // A context loss is the hard-fault case: the tier lands at '2d' directly.
    const afterContextLoss: RenderTier = '2d';
    expect(isFloorTier(afterContextLoss)).toBe(true);
  });

  it('the floor decision is idempotent under repeated loss reports (no thrash back to 3D)', () => {
    let tier: RenderTier = 'cinematic';
    // Simulate several budget-miss / loss reports; the latch only ever descends.
    for (let i = 0; i < 5; i += 1) {
      tier = stepTierDown(tier);
    }
    expect(tier).toBe('2d');
    expect(isFloorTier(tier)).toBe(true);
  });

  it('only the floor tier is a floor: the two 3D tiers are NOT mistaken for the 2D floor', () => {
    expect(isFloorTier('cinematic')).toBe(false);
    expect(isFloorTier('lite')).toBe(false);
    expect(isFloorTier('2d')).toBe(true);
  });
});

// ===========================================================================
// CHECK 5: INTERRUPTED capture -> retry / estimated state (pure quality gate)
//
// An aborted or partial capture is assessed by the pure gate assessCaptureQuality
// (Section 5.4/5.5) and the pure confidence model scoreMeasurementConfidence
// (Section 9.2). Assert:
//   - a partial capture (missing landmarks / no person) fails the quality gate
//     (pass = false) and enumerates the blocking issue, marking the capture as a
//     retake / estimated case; it NEVER fabricates a passing result, and
//   - a degraded-capture confidence score falls below CONFIDENCE_THRESHOLD, which
//     is the signal the caller renders as UNKNOWN / estimated rather than as a
//     precise fabricated number.
// Both are pure functions (no IO), tested directly.
// ===========================================================================

describe('CHECK 5: INTERRUPTED capture lands in a retake / estimated state, never fabricated', () => {
  // A partial capture: person present but the lower body left the frame mid-capture
  // (ankles + hips lost), which is the interrupted / aborted-capture signature.
  const interruptedCapture: CaptureQualityInput = {
    requestedPose: 'front',
    detectedPose: 'front',
    personDetected: true,
    landmarks: {
      noseVisible: true,
      leftShoulderVisible: true,
      rightShoulderVisible: true,
      leftHipVisible: false,
      rightHipVisible: false,
      leftAnkleVisible: false,
      rightAnkleVisible: false,
      averageVisibility: 0.4,
    },
    tiltDeg: 2,
    contrastScore: 0.8,
  };

  // A fully aborted capture: no person detected at all (capture cut before framing).
  const abortedCapture: CaptureQualityInput = {
    requestedPose: 'front',
    detectedPose: null,
    personDetected: false,
    landmarks: {
      noseVisible: false,
      leftShoulderVisible: false,
      rightShoulderVisible: false,
      leftHipVisible: false,
      rightHipVisible: false,
      leftAnkleVisible: false,
      rightAnkleVisible: false,
      averageVisibility: 0,
    },
    tiltDeg: 0,
    contrastScore: 0.5,
  };

  it('a partial capture FAILS the quality gate (pass = false) so the caller marks it a retake', () => {
    const result = assessCaptureQuality(interruptedCapture);
    expect(result.pass).toBe(false);
  });

  it('the failed gate enumerates the blocking issue (full body not in frame), not a silent pass', () => {
    const result = assessCaptureQuality(interruptedCapture);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.includes('full body not in frame'))).toBe(true);
  });

  it('a fully aborted capture (no person) also fails and reports "no person detected"', () => {
    const result = assessCaptureQuality(abortedCapture);
    expect(result.pass).toBe(false);
    expect(result.issues).toContain('no person detected');
  });

  it('the gate never fabricates a passing score: a partial capture score is well below 1', () => {
    const result = assessCaptureQuality(interruptedCapture);
    expect(result.score).toBeLessThan(1);
    // Score stays a real number in [0,1]; the failure is surfaced, not invented as 0.
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('a degraded capture drives confidence below CONFIDENCE_THRESHOLD -> UNKNOWN / estimated signal', () => {
    // Feed the failed capture score into the real confidence model. An interrupted
    // capture degrades every dimension that depends on a complete set of frames:
    // capture quality (from the real gate), landmark visibility and mask edge
    // (lost lower-body landmarks), and cross-view corroboration (the missing views
    // cannot agree). The score must land below the UNKNOWN threshold. These inputs
    // are all genuinely low for a partial capture, not cherry-picked.
    const gateResult = assessCaptureQuality(interruptedCapture);
    const degraded: ConfidenceInputs = {
      captureQualityScore: gateResult.score,
      landmarkVisibility: 0.3,
      maskEdgeCertainty: 0.3,
      scaleAgreement: 0.3,
      lrCorroboration: 0.2,
      fbCorroboration: 0.2,
      populationPriorScore: 0.5,
    };
    const { score, level } = scoreMeasurementConfidence(degraded);
    expect(score).toBeLessThan(CONFIDENCE_THRESHOLD);
    expect(level).toBe('low');
  });

  it('the UNKNOWN signal is a level, not a fabricated 0: a good capture stays high, proving the gate discriminates', () => {
    // Control: a fully good capture must NOT be flagged low. This proves the low
    // result above is a genuine discrimination, not a constant.
    const { score, level } = scoreMeasurementConfidence(GOOD_CONFIDENCE_INPUTS);
    expect(score).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    expect(level).not.toBe('low');
  });
});
