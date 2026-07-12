/**
 * src/lib/formavision/health/__tests__/healthSync.test.ts
 *
 * Prompt 211a Workstream 2: unit tests for the health sync service.
 *
 * The HealthBridge interface is mocked here -- these tests never import the
 * real @perfood/capacitor-healthkit or capacitor-health-connect packages.
 * All native paths are device-untested; this suite tests only the JS-layer
 * logic: flag-gating, RULE 9 honest-omit, unit conversion, per-metric grants,
 * revoked-grant handling, fail-open resilience, and telemetry payload shape.
 *
 * Node-safe: no jsdom, no network, no Supabase calls.
 * Zero any. No em dashes, no en dashes, no emojis.
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import {
  syncHealthData,
  buildCompositionPayload,
  convertMassToKg,
  selectWritableMetrics,
  selectDeniedMetrics,
  type ScanCompositionInput,
} from '../healthSync';
import { LBS_TO_KG, type HealthBridge, type GrantState, type WriteResult } from '../healthBridge';

// ---------------------------------------------------------------------------
// Mock the feature-flag module so we control flag state in each test
// ---------------------------------------------------------------------------
vi.mock('@/lib/config/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockReturnValue(false),
}));

// ---------------------------------------------------------------------------
// Mock the Supabase client so telemetry inserts are captured, not sent
// ---------------------------------------------------------------------------
const mockInsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers to control the feature flag and build mock bridges
// ---------------------------------------------------------------------------

import { isFeatureEnabled } from '@/lib/config/feature-flags';

const mockFlag = isFeatureEnabled as unknown as MockInstance;

function flagOn(): void {
  mockFlag.mockReturnValue(true);
}

function flagOff(): void {
  mockFlag.mockReturnValue(false);
}

/** Build a fully-controllable mock HealthBridge */
function makeBridge(overrides: Partial<{
  isAvailable: () => Promise<boolean>;
  requestWritePermissions: () => Promise<void>;
  checkGrants: () => Promise<GrantState>;
  writeBodyComposition: (p: Parameters<HealthBridge['writeBodyComposition']>[0], g: GrantState) => Promise<WriteResult>;
}>): HealthBridge {
  return {
    isAvailable: overrides.isAvailable ?? (() => Promise.resolve(true)),
    requestWritePermissions: overrides.requestWritePermissions ?? (() => Promise.resolve()),
    checkGrants: overrides.checkGrants ?? (() => Promise.resolve({ weight: true, body_fat: true, lean_mass: true })),
    writeBodyComposition: overrides.writeBodyComposition ?? (() => Promise.resolve({ written: ['body_fat'], skipped: [], failed: [] })),
  };
}

/** Full-triple scan (weight + body_fat + lean_mass all present) */
function fullInput(): ScanCompositionInput {
  return {
    userId: 'user-abc',
    entryDate: '2026-07-01',
    bodyFatPct: 22.5,
    weightLbs: 180.0,
    leanMassLbs: 139.5,
  };
}

/** Pure vision scan: only body_fat present */
function pureScanInput(): ScanCompositionInput {
  return {
    userId: 'user-abc',
    entryDate: '2026-07-01',
    bodyFatPct: 24.1,
    weightLbs: null,
    leanMassLbs: null,
  };
}

// ---------------------------------------------------------------------------
// 1. Unit conversion (pure, no mocks needed)
// ---------------------------------------------------------------------------

describe('LBS_TO_KG constant', () => {
  it('equals exactly 0.45359237 (NIST factor)', () => {
    expect(LBS_TO_KG).toBe(0.45359237);
  });
});

describe('convertMassToKg', () => {
  it('converts 180 lbs to 180 * 0.45359237 kg', () => {
    expect(convertMassToKg(180)).toBeCloseTo(180 * 0.45359237, 10);
  });

  it('returns null for null input (RULE 9: no fabrication)', () => {
    expect(convertMassToKg(null)).toBeNull();
  });

  it('converts 0 lbs to 0 kg (does not substitute; 0 is a genuine zero mass)', () => {
    // Edge: 0 is a real value; the null check in sync prevents writing it as
    // a placeholder, but the converter itself handles 0 correctly.
    expect(convertMassToKg(0)).toBe(0);
  });
});

describe('buildCompositionPayload', () => {
  it('converts weight lbs to kg using 0.45359237 factor', () => {
    const payload = buildCompositionPayload(fullInput());
    expect(payload.weightKg).not.toBeNull();
    expect(payload.weightKg).toBeCloseTo(180.0 * 0.45359237, 10);
  });

  it('converts lean_mass lbs to kg using 0.45359237 factor', () => {
    const payload = buildCompositionPayload(fullInput());
    expect(payload.leanMassKg).not.toBeNull();
    expect(payload.leanMassKg).toBeCloseTo(139.5 * 0.45359237, 10);
  });

  it('passes body_fat_pct through unchanged (already percent)', () => {
    const payload = buildCompositionPayload(fullInput());
    expect(payload.bodyFatPct).toBe(22.5);
  });

  it('RULE 9: weight is null when input is null', () => {
    const payload = buildCompositionPayload(pureScanInput());
    expect(payload.weightKg).toBeNull();
  });

  it('RULE 9: lean_mass is null when input is null', () => {
    const payload = buildCompositionPayload(pureScanInput());
    expect(payload.leanMassKg).toBeNull();
  });

  it('pure scan: only body_fat_pct is non-null', () => {
    const payload = buildCompositionPayload(pureScanInput());
    expect(payload.bodyFatPct).toBe(24.1);
    expect(payload.weightKg).toBeNull();
    expect(payload.leanMassKg).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Grant selection helpers (pure)
// ---------------------------------------------------------------------------

describe('selectWritableMetrics', () => {
  it('returns body_fat only on a pure scan with all grants', () => {
    const payload = buildCompositionPayload(pureScanInput());
    const grants: GrantState = { weight: true, body_fat: true, lean_mass: true };
    expect(selectWritableMetrics(payload, grants)).toEqual(['body_fat']);
  });

  it('returns all three when all are present and granted', () => {
    const payload = buildCompositionPayload(fullInput());
    const grants: GrantState = { weight: true, body_fat: true, lean_mass: true };
    const result = selectWritableMetrics(payload, grants);
    expect(result).toContain('weight');
    expect(result).toContain('body_fat');
    expect(result).toContain('lean_mass');
    expect(result).toHaveLength(3);
  });

  it('excludes a metric when its grant is false even if the value is present', () => {
    const payload = buildCompositionPayload(fullInput());
    const grants: GrantState = { weight: true, body_fat: false, lean_mass: true };
    const result = selectWritableMetrics(payload, grants);
    expect(result).toContain('weight');
    expect(result).not.toContain('body_fat');
    expect(result).toContain('lean_mass');
  });

  it('never includes a metric whose payload value is null, even when granted', () => {
    const payload = buildCompositionPayload(pureScanInput());
    const grants: GrantState = { weight: true, body_fat: true, lean_mass: true };
    const result = selectWritableMetrics(payload, grants);
    // weight and lean_mass are null in a pure scan -- they must never appear
    expect(result).not.toContain('weight');
    expect(result).not.toContain('lean_mass');
  });

  it('returns empty array when no grants are given', () => {
    const payload = buildCompositionPayload(fullInput());
    const grants: GrantState = { weight: false, body_fat: false, lean_mass: false };
    expect(selectWritableMetrics(payload, grants)).toHaveLength(0);
  });
});

describe('selectDeniedMetrics', () => {
  it('returns metrics whose value is present but grant is false', () => {
    const payload = buildCompositionPayload(fullInput());
    const grants: GrantState = { weight: true, body_fat: false, lean_mass: true };
    expect(selectDeniedMetrics(payload, grants)).toEqual(['body_fat']);
  });

  it('does not flag a null-value metric as denied (RULE 9: omit is not a denial)', () => {
    const payload = buildCompositionPayload(pureScanInput());
    const grants: GrantState = { weight: false, body_fat: true, lean_mass: false };
    // weight and lean_mass are null -- they are absent, not denied
    expect(selectDeniedMetrics(payload, grants)).toHaveLength(0);
  });

  it('returns empty when all grants match the present values', () => {
    const payload = buildCompositionPayload(fullInput());
    const grants: GrantState = { weight: true, body_fat: true, lean_mass: true };
    expect(selectDeniedMetrics(payload, grants)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. syncHealthData: flag-off behavior
// ---------------------------------------------------------------------------

describe('syncHealthData: flag off', () => {
  beforeEach(() => {
    flagOff();
    mockInsert.mockClear();
  });

  it('returns immediately without calling the bridge when flag is off', async () => {
    const bridge = makeBridge({
      isAvailable: vi.fn().mockResolvedValue(true),
      writeBodyComposition: vi.fn().mockResolvedValue({ written: [], skipped: [], failed: [] }),
    });
    await syncHealthData(fullInput(), bridge);
    // Bridge should not have been used
    expect(bridge.isAvailable).not.toHaveBeenCalled();
    expect(bridge.writeBodyComposition).not.toHaveBeenCalled();
  });

  it('emits health_sync_skipped with reason flag_off', async () => {
    const bridge = makeBridge({});
    await syncHealthData(fullInput(), bridge);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'formavision.health_sync_skipped',
        properties: expect.objectContaining({ reason: 'flag_off' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// 4. syncHealthData: pure scan writes body_fat ONLY (RULE 9)
// ---------------------------------------------------------------------------

describe('syncHealthData: pure scan (RULE 9)', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('calls writeBodyComposition with a payload where weight and lean_mass are null', async () => {
    const writeBodyCompositionMock = vi.fn().mockResolvedValue({
      written: ['body_fat'],
      skipped: [],
      failed: [],
    });
    const bridge = makeBridge({ writeBodyComposition: writeBodyCompositionMock });

    await syncHealthData(pureScanInput(), bridge);

    expect(writeBodyCompositionMock).toHaveBeenCalledOnce();
    const [payload] = writeBodyCompositionMock.mock.calls[0];
    expect(payload.weightKg).toBeNull();
    expect(payload.leanMassKg).toBeNull();
    expect(payload.bodyFatPct).toBe(24.1);
  });

  it('RULE 9: writeBodyComposition is NOT called with 0 for weight (null stays null)', async () => {
    const writeBodyCompositionMock = vi.fn().mockResolvedValue({
      written: ['body_fat'],
      skipped: [],
      failed: [],
    });
    const bridge = makeBridge({ writeBodyComposition: writeBodyCompositionMock });

    await syncHealthData(pureScanInput(), bridge);

    const [payload] = writeBodyCompositionMock.mock.calls[0];
    // Must NOT be 0 or any fabricated value
    expect(payload.weightKg).not.toBe(0);
    expect(payload.weightKg).toBeNull();
  });

  it('emits health_sync_written with metrics: [body_fat] only', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockResolvedValue({
        written: ['body_fat'],
        skipped: [],
        failed: [],
      }),
    });

    await syncHealthData(pureScanInput(), bridge);

    const writtenCall = mockInsert.mock.calls.find(
      (call) => call[0]?.event === 'formavision.health_sync_written',
    );
    expect(writtenCall).toBeDefined();
    expect(writtenCall![0].properties.metrics).toContain('body_fat');
    expect(writtenCall![0].properties.metrics).not.toContain('weight');
    expect(writtenCall![0].properties.metrics).not.toContain('lean_mass');
  });
});

// ---------------------------------------------------------------------------
// 5. syncHealthData: full triple writes all three with correct unit conversion
// ---------------------------------------------------------------------------

describe('syncHealthData: full triple', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('converts weight 180 lbs to kg using 0.45359237', async () => {
    const writeBodyCompositionMock = vi.fn().mockResolvedValue({
      written: ['weight', 'body_fat', 'lean_mass'],
      skipped: [],
      failed: [],
    });
    const bridge = makeBridge({ writeBodyComposition: writeBodyCompositionMock });

    await syncHealthData(fullInput(), bridge);

    const [payload] = writeBodyCompositionMock.mock.calls[0];
    expect(payload.weightKg).toBeCloseTo(180.0 * 0.45359237, 10);
  });

  it('converts lean_mass 139.5 lbs to kg using 0.45359237', async () => {
    const writeBodyCompositionMock = vi.fn().mockResolvedValue({
      written: ['weight', 'body_fat', 'lean_mass'],
      skipped: [],
      failed: [],
    });
    const bridge = makeBridge({ writeBodyComposition: writeBodyCompositionMock });

    await syncHealthData(fullInput(), bridge);

    const [payload] = writeBodyCompositionMock.mock.calls[0];
    expect(payload.leanMassKg).toBeCloseTo(139.5 * 0.45359237, 10);
  });

  it('emits health_sync_written with all three metrics', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockResolvedValue({
        written: ['weight', 'body_fat', 'lean_mass'],
        skipped: [],
        failed: [],
      }),
    });

    await syncHealthData(fullInput(), bridge);

    const writtenCall = mockInsert.mock.calls.find(
      (call) => call[0]?.event === 'formavision.health_sync_written',
    );
    expect(writtenCall).toBeDefined();
    const metrics = writtenCall![0].properties.metrics;
    expect(metrics).toContain('weight');
    expect(metrics).toContain('body_fat');
    expect(metrics).toContain('lean_mass');
  });
});

// ---------------------------------------------------------------------------
// 6. syncHealthData: per-metric grant -- weight granted, body_fat denied
// ---------------------------------------------------------------------------

describe('syncHealthData: per-metric grant', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('writes only weight when body_fat grant is denied', async () => {
    const grants: GrantState = { weight: true, body_fat: false, lean_mass: true };
    const writeBodyCompositionMock = vi.fn().mockResolvedValue({
      written: ['weight', 'lean_mass'],
      skipped: ['body_fat'],
      failed: [],
    });
    const bridge = makeBridge({
      checkGrants: () => Promise.resolve(grants),
      writeBodyComposition: writeBodyCompositionMock,
    });

    await syncHealthData(fullInput(), bridge);

    // The payload sent to writeBodyComposition should still have bodyFatPct set,
    // but grants.body_fat is false so the bridge skips it. Verify the grants arg.
    const [, grantsArg] = writeBodyCompositionMock.mock.calls[0];
    expect(grantsArg.body_fat).toBe(false);
    expect(grantsArg.weight).toBe(true);
  });

  it('emits health_sync_denied for body_fat when it is present but not granted', async () => {
    const grants: GrantState = { weight: true, body_fat: false, lean_mass: false };
    const bridge = makeBridge({
      checkGrants: () => Promise.resolve(grants),
      writeBodyComposition: vi.fn().mockResolvedValue({
        written: ['weight'],
        skipped: ['body_fat', 'lean_mass'],
        failed: [],
      }),
    });

    await syncHealthData(fullInput(), bridge);

    const deniedCall = mockInsert.mock.calls.find(
      (call) => call[0]?.event === 'formavision.health_sync_denied',
    );
    expect(deniedCall).toBeDefined();
    expect(deniedCall![0].properties.metric).toBe('body_fat');
  });

  it('does not emit health_sync_denied for null-value metrics (RULE 9)', async () => {
    // Pure scan: weight and lean_mass are null. Even if grants are false for
    // them, they should NOT generate a denied event (they are simply absent).
    const grants: GrantState = { weight: false, body_fat: true, lean_mass: false };
    const bridge = makeBridge({
      checkGrants: () => Promise.resolve(grants),
      writeBodyComposition: vi.fn().mockResolvedValue({
        written: ['body_fat'],
        skipped: [],
        failed: [],
      }),
    });

    await syncHealthData(pureScanInput(), bridge);

    const deniedCalls = mockInsert.mock.calls.filter(
      (call) => call[0]?.event === 'formavision.health_sync_denied',
    );
    // No denied events: weight and lean_mass are absent (null), not denied
    expect(deniedCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. syncHealthData: revoked-since-last-run grant
// ---------------------------------------------------------------------------

describe('syncHealthData: revoked grant', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('respects a revoked lean_mass grant on the current run', async () => {
    // grants are read live each sync (no cache). Simulate lean_mass revoked.
    const revokedGrants: GrantState = { weight: true, body_fat: true, lean_mass: false };
    const writeBodyCompositionMock = vi.fn().mockResolvedValue({
      written: ['weight', 'body_fat'],
      skipped: ['lean_mass'],
      failed: [],
    });
    const bridge = makeBridge({
      checkGrants: () => Promise.resolve(revokedGrants),
      writeBodyComposition: writeBodyCompositionMock,
    });

    await syncHealthData(fullInput(), bridge);

    const [, grantsArg] = writeBodyCompositionMock.mock.calls[0];
    expect(grantsArg.lean_mass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. syncHealthData: native call throws -> fail-open
// ---------------------------------------------------------------------------

describe('syncHealthData: fail-open', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('does NOT throw when writeBodyComposition throws', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockRejectedValue(new Error('native crash')),
    });

    // Must not throw
    await expect(syncHealthData(fullInput(), bridge)).resolves.toBeUndefined();
  });

  it('emits health_sync_failed when writeBodyComposition throws', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockRejectedValue(new Error('native crash')),
    });

    await syncHealthData(fullInput(), bridge);

    const failedCall = mockInsert.mock.calls.find(
      (call) => call[0]?.event === 'formavision.health_sync_failed',
    );
    expect(failedCall).toBeDefined();
  });

  it('does NOT throw when checkGrants throws (falls back to all-false)', async () => {
    const writeBodyCompositionMock = vi.fn().mockResolvedValue({ written: [], skipped: [], failed: [] });
    const bridge = makeBridge({
      checkGrants: vi.fn().mockRejectedValue(new Error('grants unavailable')),
      writeBodyComposition: writeBodyCompositionMock,
    });

    await expect(syncHealthData(fullInput(), bridge)).resolves.toBeUndefined();
    // With all grants false, writeBodyComposition should not be called
    // (no writable metrics after grant failure)
    expect(writeBodyCompositionMock).not.toHaveBeenCalled();
  });

  it('does NOT throw when isAvailable throws', async () => {
    const bridge = makeBridge({
      isAvailable: vi.fn().mockRejectedValue(new Error('platform error')),
    });

    await expect(syncHealthData(fullInput(), bridge)).resolves.toBeUndefined();
  });

  it('does not let a sync failure block the caller (returns void, not a rejected promise)', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockRejectedValue(new TypeError('hard crash')),
    });

    const result = await syncHealthData(fullInput(), bridge);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 9. Telemetry PHI rule: no health values in any payload
// ---------------------------------------------------------------------------

describe('syncHealthData: telemetry PHI rule', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('health_sync_written payload contains no numeric weight values', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockResolvedValue({
        written: ['weight', 'body_fat', 'lean_mass'],
        skipped: [],
        failed: [],
      }),
    });

    await syncHealthData(fullInput(), bridge);

    const writtenCall = mockInsert.mock.calls.find(
      (call) => call[0]?.event === 'formavision.health_sync_written',
    );
    expect(writtenCall).toBeDefined();
    const props = writtenCall![0].properties;

    // No numeric health measurement values allowed in telemetry
    const propsJson = JSON.stringify(props);
    // Should not contain exact measurement values from the input
    expect(propsJson).not.toContain('180');     // weightLbs
    expect(propsJson).not.toContain('139.5');   // leanMassLbs
    expect(propsJson).not.toContain('22.5');    // bodyFatPct
  });

  it('health_sync_failed payload contains no measurement values', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockRejectedValue(new Error('crash')),
    });

    await syncHealthData(fullInput(), bridge);

    const failedCall = mockInsert.mock.calls.find(
      (call) => call[0]?.event === 'formavision.health_sync_failed',
    );
    expect(failedCall).toBeDefined();
    const propsJson = JSON.stringify(failedCall![0].properties);
    expect(propsJson).not.toContain('180');
    expect(propsJson).not.toContain('22.5');
    expect(propsJson).not.toContain('139.5');
  });

  it('health_sync_denied payload contains only metric name, no value', async () => {
    const grants: GrantState = { weight: false, body_fat: false, lean_mass: false };
    const bridge = makeBridge({
      checkGrants: () => Promise.resolve(grants),
      writeBodyComposition: vi.fn().mockResolvedValue({ written: [], skipped: [], failed: [] }),
    });

    await syncHealthData(fullInput(), bridge);

    const deniedCalls = mockInsert.mock.calls.filter(
      (call) => call[0]?.event === 'formavision.health_sync_denied',
    );
    for (const call of deniedCalls) {
      const propsJson = JSON.stringify(call[0].properties);
      expect(propsJson).not.toContain('180');
      expect(propsJson).not.toContain('22.5');
      expect(propsJson).not.toContain('139.5');
      // Must contain only the metric name
      expect(call[0].properties).toHaveProperty('metric');
    }
  });
});

// ---------------------------------------------------------------------------
// 10. syncHealthData: no user -> silent skip, no telemetry
// ---------------------------------------------------------------------------

describe('syncHealthData: no user', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('returns immediately when userId is null', async () => {
    const bridge = makeBridge({
      isAvailable: vi.fn(),
    });
    const input = { ...fullInput(), userId: null };
    await syncHealthData(input, bridge);
    expect(bridge.isAvailable).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns immediately when userId is empty string', async () => {
    const bridge = makeBridge({
      isAvailable: vi.fn(),
    });
    const input = { ...fullInput(), userId: '' };
    await syncHealthData(input, bridge);
    expect(bridge.isAvailable).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 11. syncHealthData: not available -> skipped telemetry
// ---------------------------------------------------------------------------

describe('syncHealthData: platform not available', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('emits health_sync_skipped with reason not_available', async () => {
    const bridge = makeBridge({
      isAvailable: () => Promise.resolve(false),
    });

    await syncHealthData(fullInput(), bridge);

    const skippedCall = mockInsert.mock.calls.find(
      (call) => call[0]?.event === 'formavision.health_sync_skipped',
    );
    expect(skippedCall).toBeDefined();
    expect(skippedCall![0].properties.reason).toBe('not_available');
  });
});

// ---------------------------------------------------------------------------
// 12. Helix-invisible: no helix/streak/token/gamification in any output
// ---------------------------------------------------------------------------

describe('syncHealthData: Helix invisible', () => {
  beforeEach(() => {
    flagOn();
    mockInsert.mockClear();
  });

  it('no insert call contains helix/streak/token/gamification in event name or properties', async () => {
    const bridge = makeBridge({
      writeBodyComposition: vi.fn().mockResolvedValue({
        written: ['body_fat'],
        skipped: [],
        failed: [],
      }),
    });

    await syncHealthData(pureScanInput(), bridge);

    const banned = ['helix', 'streak', 'token', 'viatoken', 'gamif', 'leaderboard', 'multiplier'];
    for (const call of mockInsert.mock.calls) {
      const payload = JSON.stringify(call[0]).toLowerCase();
      for (const word of banned) {
        expect(payload).not.toContain(word);
      }
    }
  });
});
