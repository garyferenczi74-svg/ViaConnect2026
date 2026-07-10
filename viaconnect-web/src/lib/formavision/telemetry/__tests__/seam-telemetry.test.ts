// src/lib/formavision/telemetry/__tests__/seam-telemetry.test.ts
//
// Prompt 210e E1: SEAM TEST for the FormaVision TELEMETRY seam.
//
// Seam (from docs/formavision/210e-seam-map.md, Section 5 row "Telemetry"):
//   Producer: avatarTelemetry.ts 12 events, sink INTO analytics_events.
//   Consumer: NO READER EXISTS (emit side wired, dashboard/consume side absent).
//   Status: HALF WIRED. The emit side is what deterministic CI can verify.
//
// Gary's recorded 210e decision GOVERNS this seam: walk step 10 (confirm the 12
// events actually arrive in the dashboard) is satisfied by an SQL verification
// against the analytics_events table with a fixture user, NOT by building an
// admin reader panel. The 12 events have never been verified arriving in live
// analytics_events (210b P8-T2b was held); that live-arrival check is the
// manual / live-smoke step, run on demand, NOT headless CI.
//
// WHAT THIS DETERMINISTIC TEST COVERS (the CI-verifiable half of the seam):
//   (a) ALL_AVATAR_EVENTS is exactly the 12-event catalog (count + names).
//   (b) The emit path's sink is the 'analytics_events' table string constant
//       (emitAvatarEvent routes the insert there and nowhere else).
//   (c) The event payload shape is PII-clean: the property builders emit only
//       coarse enums / counters / durations, and NO field named
//       email / name / weight / measurement / rsid / etc.
//
// WHAT THIS TEST DOES NOT DO (Gary-decided, manual / live-smoke):
//   Live-arrival verification of these 12 events landing in the analytics_events
//   table is the walk-step-10 SQL check against a fixture user. It is NOT run
//   here: this suite never hits a live DB. See 210e-seam-matrix.md, Telemetry row.
//
// Node harness; no JSX, no DOM, no live DB. Mirrors the vi.mock supabase pattern
// already established in avatarTelemetry.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Capture the table name the emit path passes to supabase.from(...). This is
// the seam assertion (b): the sink must be 'analytics_events'. vi.mock is
// hoisted, so the capture ref is created via vi.hoisted() to avoid TDZ errors.
// ---------------------------------------------------------------------------

const { fromCalls, mockInsert } = vi.hoisted(() => ({
  fromCalls: [] as string[],
  mockInsert: vi.fn(() => Promise.resolve({ error: null })),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      fromCalls.push(table);
      return { insert: mockInsert };
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

// Import AFTER the mocks are registered.
import {
  ALL_AVATAR_EVENTS,
  emitAvatarEvent,
  buildAvatarEventPayload,
  buildAvatarQualitySnapshot,
} from '../avatarTelemetry';
import type {
  AvatarTelemetryEvent,
  AvatarEventPayload,
  AvatarQualitySignals,
} from '../avatarTelemetry';

// ---------------------------------------------------------------------------
// (a) ALL_AVATAR_EVENTS is exactly the 12-event catalog (count + names)
//
// This is the CI half of the "12 events land in analytics_events" walk step:
// CI proves the catalog itself is exactly 12 named events; the live SQL check
// proves those same 12 names arrive in the table.
// ---------------------------------------------------------------------------

const EXPECTED_EVENTS: readonly AvatarTelemetryEvent[] = [
  'formavision.avatar_viewed',
  'formavision.avatar_rotated',
  'formavision.region_selected',
  'formavision.tab_switched',
  'formavision.timeline_scrubbed',
  'formavision.journey_played',
  'formavision.genetics_overlay_viewed',
  'formavision.future_self_toggled',
  'formavision.protocol_opened',
  'formavision.milestone_celebrated',
  'formavision.fallback_tier_served',
  'formavision.avatar_session_ended',
] as const;

describe('TELEMETRY seam (a): ALL_AVATAR_EVENTS is exactly the 12-event catalog', () => {
  it('contains exactly 12 events (count matches the SQL-verified catalog size)', () => {
    expect(ALL_AVATAR_EVENTS.length).toBe(12);
  });

  it('the expected reference catalog is also 12 (guards this test itself)', () => {
    expect(EXPECTED_EVENTS.length).toBe(12);
  });

  it('names match the catalog exactly, in order', () => {
    expect(ALL_AVATAR_EVENTS).toEqual(EXPECTED_EVENTS);
  });

  it('names match the catalog exactly, order-independent (set equality)', () => {
    expect(new Set(ALL_AVATAR_EVENTS)).toEqual(new Set(EXPECTED_EVENTS));
  });

  it('every event is namespaced under formavision. (no stray sink)', () => {
    for (const e of ALL_AVATAR_EVENTS) {
      expect(e.startsWith('formavision.')).toBe(true);
    }
  });

  it('has no duplicate event names', () => {
    expect(new Set(ALL_AVATAR_EVENTS).size).toBe(ALL_AVATAR_EVENTS.length);
  });
});

// ---------------------------------------------------------------------------
// (b) The emit path's sink is the 'analytics_events' table
//
// emitAvatarEvent must route the insert to the 'analytics_events' table and
// nowhere else. This is the seam's producer->sink contract: the SQL walk-step-10
// check queries analytics_events, so the emit path must target that exact table.
// ---------------------------------------------------------------------------

describe('TELEMETRY seam (b): emit sink is the analytics_events table', () => {
  beforeEach(() => {
    fromCalls.length = 0;
    mockInsert.mockClear();
  });

  it('emitAvatarEvent inserts into the analytics_events table', async () => {
    await emitAvatarEvent('fixture-user-id', 'formavision.avatar_viewed');
    expect(fromCalls).toContain('analytics_events');
  });

  it('emitAvatarEvent targets ONLY analytics_events (single sink, no other table)', async () => {
    await emitAvatarEvent('fixture-user-id', 'formavision.region_selected');
    expect(fromCalls).toEqual(['analytics_events']);
  });

  it('calls insert exactly once per emitted event', async () => {
    await emitAvatarEvent('fixture-user-id', 'formavision.protocol_opened');
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('every event in the catalog routes to analytics_events (no per-event drift)', async () => {
    for (const event of ALL_AVATAR_EVENTS) {
      fromCalls.length = 0;
      await emitAvatarEvent('fixture-user-id', event);
      expect(fromCalls).toEqual(['analytics_events']);
    }
  });

  it('does not insert (and never touches the table) when userId is falsy', async () => {
    await emitAvatarEvent('', 'formavision.avatar_viewed');
    expect(fromCalls).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (c) The event payload shape is PII-clean
//
// The property builders must emit only coarse enums / counters / durations.
// No key may be named after (or contain) a PII / raw-biometric field:
// email, name, weight, measurement, rsid, dob, address, phone, height,
// bodyfat, circumference, etc. This protects the analytics_events sink from
// ever receiving raw member biometrics or identity fields.
// ---------------------------------------------------------------------------

// Substrings that must never appear in any payload key. Coarse, case-insensitive.
const BANNED_KEY_SUBSTRINGS: readonly string[] = [
  'email',
  'name', // catches firstname / lastname / displayname / username
  'weight',
  'measurement',
  'rsid',
  'dob',
  'birth',
  'address',
  'phone',
  'height',
  'bodyfat',
  'circumference',
  'genotype',
  'genetic',
  'ssn',
];

// Recursively collect every object key found anywhere in a payload value.
function collectKeys(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      acc.push(key);
      collectKeys(child, acc);
    }
  }
  return acc;
}

function assertKeysArePiiClean(keys: string[]): void {
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const banned of BANNED_KEY_SUBSTRINGS) {
      expect(
        lower.includes(banned),
        `payload key "${key}" contains banned PII substring "${banned}"`,
      ).toBe(false);
    }
  }
}

describe('TELEMETRY seam (c): payload shape is PII-clean (coarse enums/counters/durations only)', () => {
  it('buildAvatarEventPayload emits only the fixed structural keys (no PII columns)', () => {
    const payload: AvatarEventPayload = buildAvatarEventPayload(
      'formavision.avatar_viewed',
      {},
      { page: '/body-tracker/composition', device: 'desktop', sessionId: 'fixture-session' },
    );
    const structuralKeys = Object.keys(payload).sort();
    // Only these top-level columns are ever produced. session_id/device are coarse
    // context, not identity. No user identity or biometric column exists here.
    expect(structuralKeys).toEqual(
      ['device', 'event', 'page', 'properties', 'session_id'].sort(),
    );
  });

  it('top-level payload keys carry no banned PII substrings', () => {
    const payload = buildAvatarEventPayload(
      'formavision.region_selected',
      {},
      { page: '/body-tracker/composition', device: 'mobile', sessionId: 'fixture-session' },
    );
    assertKeysArePiiClean(Object.keys(payload));
  });

  it('buildAvatarQualitySnapshot emits only coarse enums/counters (tier, counts, duration)', () => {
    const snapshot: AvatarQualitySignals = buildAvatarQualitySnapshot('lite', 2, 1, 1234);
    const keys = Object.keys(snapshot).sort();
    // tierServed (enum), stepDownCount + errorCount (counters),
    // timeToFirstInteractiveMs (duration). No PII, no raw biometrics.
    expect(keys).toEqual(
      ['errorCount', 'stepDownCount', 'tierServed', 'timeToFirstInteractiveMs'].sort(),
    );
  });

  it('quality snapshot omits unmeasured fields rather than fabricating them', () => {
    // firstInteractive null -> the duration key must be ABSENT (never invented as 0).
    const snapshot = buildAvatarQualitySnapshot('cinematic', 0, 0, null);
    expect('timeToFirstInteractiveMs' in snapshot).toBe(false);
    // frameRateBucket is never emitted (no genuine rolling fps average exists).
    expect('frameRateBucket' in snapshot).toBe(false);
  });

  it('a realistic view-event payload (quality snapshot spread into properties) is PII-clean end to end', () => {
    // Model the real avatar_viewed emit: coarse quality signals + coarse retention
    // counters spread into properties, exactly the shape the emit path sends.
    const quality = buildAvatarQualitySnapshot('cinematic', 0, 0, 850);
    const properties = {
      ...quality,
      repeatViewCount: 3,
      daysSinceLastView: 7,
    };
    const payload = buildAvatarEventPayload('formavision.avatar_viewed', properties, {
      page: '/body-tracker/composition',
      device: 'desktop',
      sessionId: 'fixture-session',
    });

    const allKeys = [...Object.keys(payload), ...collectKeys(payload)];
    assertKeysArePiiClean(allKeys);
  });

  it('property values in a representative payload are primitives (enums/counters/durations), not nested objects carrying data', () => {
    const quality = buildAvatarQualitySnapshot('lite', 1, 2, 500);
    const properties = { ...quality, repeatViewCount: 2, daysSinceLastView: 0 };
    for (const value of Object.values(properties)) {
      const t = typeof value;
      expect(t === 'string' || t === 'number' || t === 'boolean').toBe(true);
    }
  });

  // NOTE: the PII-substring rule is deliberately applied to payload KEYS only,
  // not to event NAMES. The event catalog is coarse telemetry labels (e.g.
  // 'formavision.genetics_overlay_viewed' records that the genetics overlay was
  // viewed) and is validated as the decided 12-event set in seam check (a) above.
  // Those labels are not fields that can carry a member's raw data, so the
  // PII-key guard does not apply to them.
});
