// Tests for src/app/api/bos/current/route.ts.
//
// The /api/bos/current endpoint reads the user's most recent
// bio_optimization_history row (by date DESC then compute_seq DESC)
// and reshapes the persisted breakdown jsonb into BOSCurrentResponse.
//
// All Supabase client interactions are mocked at the module level. The
// cookie-aware client from @/lib/supabase/server is the production
// auth seam.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

type MaybeSingleFn = ReturnType<typeof vi.fn>;
let mockMaybeSingle: MaybeSingleFn;
let mockGetUser: ReturnType<typeof vi.fn>;
let mockClient: {
  from: ReturnType<typeof vi.fn>;
  auth: { getUser: ReturnType<typeof vi.fn> };
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockClient,
}));

// Import SUT after mocks.
import { GET } from '../current/route';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function makeBreakdown(opts: {
  caq_completed?: boolean;
  caq_baseline?: number | null;
  labs_present?: boolean;
  genetics_present?: boolean;
  genetics_purchase_with_no_results?: boolean;
  hannah_explanation?: string;
  nutrition_last?: string | null;
} = {}) {
  return {
    diagnostic_foundation: {
      caq: {
        completed: opts.caq_completed ?? true,
        completed_at: '2026-05-01T12:00:00Z',
        baseline_score: opts.caq_baseline ?? 68,
        version_number: 1,
      },
      labs: {
        present: opts.labs_present ?? false,
        uploaded_at: opts.labs_present ? '2026-05-02T08:00:00Z' : null,
        panel_count: opts.labs_present ? 1 : 0,
      },
      genetics: {
        present: opts.genetics_present ?? false,
        processed_at: opts.genetics_present ? '2026-04-15T00:00:00Z' : null,
        panel: opts.genetics_present ? 'genex360_v1' : null,
        // Phase B genetics source attaches source-specific lifecycle info
        // via the bundle, but only the present/processed_at/panel keys
        // travel through to Hannah. The lifecycle hint lives in
        // source_specific (added below for the awaiting-results test).
      },
    },
    engagement_state: {
      nutrition: {
        last_engaged_at: opts.nutrition_last ?? '2026-05-10T20:30:00Z',
        recent_events_7d: 4,
        recent_events_30d: 12,
      },
      supplements: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
      body_tracker: { last_engaged_at: '2026-05-09T07:00:00Z', recent_events_7d: 2, recent_events_30d: 8 },
      wearable: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
      plug_ins: { last_engaged_at: null, recent_events_7d: 0, recent_events_30d: 0 },
      helix_challenges: { last_engaged_at: '2026-05-08T14:00:00Z', recent_events_7d: 1, recent_events_30d: 3 },
    },
    hannah_output: {
      score: 75,
      baseline_from_caq: 68,
      engagement_total: 7,
      engagement: {
        nutrition: { current_contribution_pct: 2.5, velocity_pct: 0.2, ceiling_pct: 8, state: 'in_use' },
        supplements: { current_contribution_pct: 0, velocity_pct: 0, ceiling_pct: 8, state: 'unused' },
        body_tracker: { current_contribution_pct: 1.5, velocity_pct: 0.1, ceiling_pct: 5, state: 'in_use' },
        wearable: { current_contribution_pct: 0, velocity_pct: 0, ceiling_pct: 5, state: 'unused' },
        plug_ins: { current_contribution_pct: 0, velocity_pct: 0, ceiling_pct: 4, state: 'unused' },
        helix_challenges: { current_contribution_pct: 3, velocity_pct: 0.3, ceiling_pct: 6, state: 'in_use' },
      },
      decay_applied: [],
      explanation:
        opts.hannah_explanation ??
        'Your Bio Optimization Score moved up because Nutrition and Body Tracker stayed steady. Keep logging meals to grow the score further.',
    },
    _compute_meta: {
      compute_version: '2.0.0',
      triggered_by: 'daily_log',
      bypass_cooldown: false,
      started_at: '2026-05-11T12:00:00Z',
      finished_at: '2026-05-11T12:00:03Z',
      cooldown_status: 'fresh',
    },
  };
}

function makeHistoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'history-row-1',
    score: 75,
    tier: 1,
    confidence: 0.720,
    compute_version: '2.0.0',
    computed_at: '2026-05-11T12:00:03Z',
    date: '2026-05-11',
    breakdown: makeBreakdown(),
    ...overrides,
  };
}

function chainForRow(row: unknown | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order2 = vi.fn().mockReturnValue({ limit });
  const order1 = vi.fn().mockReturnValue({ order: order2 });
  const lte = vi.fn().mockReturnValue({ order: order1 });
  const eq = vi.fn().mockReturnValue({ order: order1, lte });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, maybeSingle };
}

function installAuthedClient(historyRow: unknown | null, weekAgoRow: unknown | null = null) {
  const latest = chainForRow(historyRow);
  const prior = chainForRow(weekAgoRow);
  mockMaybeSingle = latest.maybeSingle;
  let calls = 0;
  const from = vi.fn().mockImplementation(() => {
    calls += 1;
    return calls === 1 ? latest : prior;
  });
  mockClient = {
    from,
    auth: { getUser: mockGetUser },
  };
}

function installUnauthedClient() {
  mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
  mockClient = {
    from: vi.fn(),
    auth: { getUser: mockGetUser },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1', email: 'gary@example.com' } },
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('current auth', () => {
  it('returns 401 when no user session', async () => {
    installUnauthedClient();
    const res = await GET(new Request('https://example.com/api/bos/current'));
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Pre-compute shape (no history row)
// ---------------------------------------------------------------------------

describe('current pre-compute shape', () => {
  it('returns score=null, baseline=null, tier=1, confidence=0.720 when no history row exists', async () => {
    installAuthedClient(null);
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.score).toBeNull();
    expect(body.baseline).toBeNull();
    expect(body.tier).toBe(1);
    expect(body.confidence).toBe(0.720);
    expect(body.confidence_display).toBe('72%');
    expect(body.computed_at).toBeNull();
    expect(body.weekly_delta).toBeNull();
    expect(body.compute_version).toBe('2.0.0');
  });

  it('emits 3 incomplete accuracy_pills in pre-compute state', async () => {
    installAuthedClient(null);
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(body.accuracy_pills).toHaveLength(3);
    expect(body.accuracy_pills[0]).toMatchObject({
      key: 'caq',
      state: 'incomplete',
      destination_key: 'caq_resume',
      confidence_unlocked_pct: 72,
    });
    expect(body.accuracy_pills[1]).toMatchObject({
      key: 'labs',
      state: 'incomplete',
      destination_key: 'labs_upload',
      confidence_unlocked_pct: 86,
    });
    expect(body.accuracy_pills[2]).toMatchObject({
      key: 'genetics',
      state: 'incomplete',
      destination_key: 'genex360_purchase',
      confidence_unlocked_pct: 96,
    });
  });

  it('emits 6 unused engagement_pills in fixed order in pre-compute state', async () => {
    installAuthedClient(null);
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(body.engagement_pills).toHaveLength(6);
    const keys = body.engagement_pills.map((p: { key: string }) => p.key);
    expect(keys).toEqual([
      'nutrition',
      'supplements',
      'body_tracker',
      'wearable',
      'plug_ins',
      'helix_challenges',
    ]);
    for (const pill of body.engagement_pills) {
      expect(pill.state).toBe('unused');
      expect(pill.velocity_pct).toBe(0);
      expect(pill.ceiling_pct).toBe(0);
      expect(pill.current_contribution_pct).toBe(0);
      expect(pill.last_engaged_at).toBeNull();
    }
  });

  it('emits the default hannah_explanation in pre-compute state', async () => {
    installAuthedClient(null);
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.hannah_explanation).toBe(
      'Complete your CAQ to see your Bio Optimization Score.',
    );
  });
});

// ---------------------------------------------------------------------------
// Full shape from a valid breakdown
// ---------------------------------------------------------------------------

describe('current full shape with valid history row', () => {
  it('returns score + tier + confidence from the history row', async () => {
    installAuthedClient(makeHistoryRow());
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(body.score).toBe(75);
    expect(body.tier).toBe(1);
    expect(body.confidence).toBe(0.720);
    expect(body.confidence_display).toBe('72%');
    expect(body.computed_at).toBe('2026-05-11T12:00:03Z');
    expect(body.weekly_delta).toBeNull();
    expect(body.compute_version).toBe('2.0.0');
  });

  it('returns score=null (never NaN) when the history score is uncomputable', async () => {
    installAuthedClient(makeHistoryRow({ score: Number.NaN }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.score).toBeNull();
    expect(body.score).not.toBe(0);
    expect(String(body.score)).not.toBe('NaN');
  });

  it('returns weekly_delta from a persisted week-ago score without rewriting math', async () => {
    installAuthedClient(
      makeHistoryRow({ score: 80, date: '2026-08-24' }),
      { score: 74, date: '2026-08-17' },
    );
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.score).toBe(80);
    expect(body.weekly_delta).toBe(6);
  });

  it('coerces a PostgREST numeric string score and confidence to numbers (Prompt 196a)', async () => {
    // numeric columns serialize from PostgREST as strings. The onboarding poll
    // gates navigation on typeof score === "number", so an un-coerced string
    // hung the post-CAQ analysis screen. The route must return a number.
    installAuthedClient(makeHistoryRow({ score: '60.00', confidence: '0.860' }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(body.score).toBe(60);
    expect(typeof body.score).toBe('number');
    expect(body.confidence).toBe(0.86);
    expect(body.confidence_display).toBe('86%');
  });

  it('passes baseline through from breakdown.diagnostic_foundation.caq.baseline_score', async () => {
    installAuthedClient(makeHistoryRow({ breakdown: makeBreakdown({ caq_baseline: 65 }) }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.baseline).toBe(65);
  });

  it('passes hannah_explanation through from breakdown.hannah_output.explanation', async () => {
    const custom = 'Your Nutrition lever climbed because you logged 4 meals this week. Keep it up.';
    installAuthedClient(
      makeHistoryRow({ breakdown: makeBreakdown({ hannah_explanation: custom }) }),
    );
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.hannah_explanation).toBe(custom);
  });
});

// ---------------------------------------------------------------------------
// Tier state machines
// ---------------------------------------------------------------------------

describe('current accuracy_pills tier 1 state machine', () => {
  it('CAQ complete, labs absent, genetics absent: [complete, incomplete, incomplete]', async () => {
    installAuthedClient(makeHistoryRow({
      tier: 1,
      confidence: 0.720,
      breakdown: makeBreakdown({ caq_completed: true, labs_present: false, genetics_present: false }),
    }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(body.accuracy_pills.map((p: { state: string }) => p.state)).toEqual([
      'complete',
      'incomplete',
      'incomplete',
    ]);
    expect(body.accuracy_pills[2].destination_key).toBe('genex360_purchase');
  });
});

describe('current accuracy_pills tier 2 state machine', () => {
  it('CAQ + Labs complete, genetics absent: [complete, complete, incomplete] with genex360_purchase', async () => {
    installAuthedClient(makeHistoryRow({
      tier: 2,
      confidence: 0.860,
      breakdown: makeBreakdown({ caq_completed: true, labs_present: true, genetics_present: false }),
    }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(body.tier).toBe(2);
    expect(body.confidence).toBe(0.860);
    expect(body.confidence_display).toBe('86%');
    expect(body.accuracy_pills.map((p: { state: string }) => p.state)).toEqual([
      'complete',
      'complete',
      'incomplete',
    ]);
    expect(body.accuracy_pills[2].destination_key).toBe('genex360_purchase');
  });
});

describe('current accuracy_pills tier 3 state machine', () => {
  it('CAQ + Labs + Genetics complete: [complete, complete, complete] no destination', async () => {
    installAuthedClient(makeHistoryRow({
      tier: 3,
      confidence: 0.960,
      breakdown: makeBreakdown({ caq_completed: true, labs_present: true, genetics_present: true }),
    }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    expect(body.tier).toBe(3);
    expect(body.confidence).toBe(0.960);
    expect(body.confidence_display).toBe('96%');
    expect(body.accuracy_pills.map((p: { state: string }) => p.state)).toEqual([
      'complete',
      'complete',
      'complete',
    ]);
    expect(body.accuracy_pills[2].destination_key).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Genetics awaiting-results lifecycle state
// ---------------------------------------------------------------------------

describe('current genetics awaiting_results state', () => {
  it('returns awaiting_results when purchase exists but no profile yet', async () => {
    const breakdown = makeBreakdown({ genetics_present: false });
    // Annotate the breakdown with the purchase-without-results signal.
    // The compute module's Phase B genetics source emits this via the
    // source_specific channel; the read API derives the lifecycle from
    // the genetics object plus the optional lifecycle_status hint.
    (breakdown.diagnostic_foundation.genetics as Record<string, unknown>).lifecycle_status = 'awaiting_results';
    installAuthedClient(makeHistoryRow({ breakdown }));

    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.accuracy_pills[2].state).toBe('awaiting_results');
    expect(body.accuracy_pills[2].destination_key).toBe('genex360_status');
  });
});

// ---------------------------------------------------------------------------
// Engagement pill mapping
// ---------------------------------------------------------------------------

describe('current engagement_pills mapping', () => {
  it('maps Hannah engagement.nutrition to engagement_pills[0]', async () => {
    installAuthedClient(makeHistoryRow());
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    const nutrition = body.engagement_pills[0];
    expect(nutrition.key).toBe('nutrition');
    expect(nutrition.label).toBe('Nutrition');
    expect(nutrition.state).toBe('in_use');
    expect(nutrition.velocity_pct).toBe(0.2);
    expect(nutrition.ceiling_pct).toBe(8);
    expect(nutrition.current_contribution_pct).toBe(2.5);
    expect(nutrition.last_engaged_at).toBe('2026-05-10T20:30:00Z');
    expect(nutrition.destination_key).toBe('nutrition_log');
  });

  it('emits exactly 6 engagement_pills in the fixed canonical order', async () => {
    installAuthedClient(makeHistoryRow());
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    const orderedKeys = body.engagement_pills.map((p: { key: string }) => p.key);
    expect(orderedKeys).toEqual([
      'nutrition',
      'supplements',
      'body_tracker',
      'wearable',
      'plug_ins',
      'helix_challenges',
    ]);
  });

  it('maps each engagement pill destination_key correctly', async () => {
    installAuthedClient(makeHistoryRow());
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    const byKey = Object.fromEntries(
      body.engagement_pills.map((p: { key: string; destination_key: string }) => [p.key, p.destination_key]),
    );
    expect(byKey.nutrition).toBe('nutrition_log');
    expect(byKey.supplements).toBe('supplements_protocol');
    expect(byKey.body_tracker).toBe('body_tracker');
    expect(byKey.wearable).toBe('wearable_dashboard');
    expect(byKey.plug_ins).toBe('plug_ins_directory');
    expect(byKey.helix_challenges).toBe('helix_challenges');
  });

  it('carries last_engaged_at through from engagement_state', async () => {
    installAuthedClient(makeHistoryRow());
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();

    const supplements = body.engagement_pills[1];
    expect(supplements.last_engaged_at).toBeNull();
    const bodyTracker = body.engagement_pills[2];
    expect(bodyTracker.last_engaged_at).toBe('2026-05-09T07:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// Confidence display mapping
// ---------------------------------------------------------------------------

describe('current confidence_display mapping', () => {
  it('0.720 maps to 72%', async () => {
    installAuthedClient(makeHistoryRow({ tier: 1, confidence: 0.720 }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.confidence_display).toBe('72%');
  });

  it('0.860 maps to 86%', async () => {
    installAuthedClient(makeHistoryRow({
      tier: 2,
      confidence: 0.860,
      breakdown: makeBreakdown({ labs_present: true }),
    }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.confidence_display).toBe('86%');
  });

  it('0.960 maps to 96%', async () => {
    installAuthedClient(makeHistoryRow({
      tier: 3,
      confidence: 0.960,
      breakdown: makeBreakdown({ labs_present: true, genetics_present: true }),
    }));
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.confidence_display).toBe('96%');
  });
});

// ---------------------------------------------------------------------------
// #161a Item 5: sanitization of hannah_explanation at the API boundary
// ---------------------------------------------------------------------------

describe('current hannah_explanation sanitization', () => {
  it('strips a script block injected into the persisted explanation', async () => {
    const injected =
      '<script>alert(1)</script>Your score went up.';
    installAuthedClient(
      makeHistoryRow({ breakdown: makeBreakdown({ hannah_explanation: injected }) }),
    );
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.hannah_explanation.toLowerCase()).not.toContain('<script');
    expect(body.hannah_explanation).toContain('Your score went up.');
  });

  it('passes a clean explanation through unchanged after sanitization', async () => {
    const clean = 'Your Nutrition lever climbed because you logged 4 meals this week.';
    installAuthedClient(
      makeHistoryRow({ breakdown: makeBreakdown({ hannah_explanation: clean }) }),
    );
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.hannah_explanation).toBe(clean);
  });

  it('falls back to the pre compute exemplar when sanitization yields the empty string', async () => {
    // An attacker who supplies pure markup ends up with the empty
    // string after sanitization. We then fall back to the pre compute
    // exemplar rather than show empty text, matching the || operator
    // semantics in the route handler.
    const pureMarkup = '<script>alert(1)</script>';
    installAuthedClient(
      makeHistoryRow({ breakdown: makeBreakdown({ hannah_explanation: pureMarkup }) }),
    );
    const res = await GET(new Request('https://example.com/api/bos/current'));
    const body = await res.json();
    expect(body.hannah_explanation).toBe('Complete your CAQ to see your Bio Optimization Score.');
  });
});
