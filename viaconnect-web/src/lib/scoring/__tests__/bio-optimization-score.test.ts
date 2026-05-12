// Tests for src/lib/scoring/bio-optimization-score.ts.
//
// The compute pipeline is the canonical entry point: cooldown -> gather
// 9 sources in parallel -> derive tier -> call Hannah (mocked) ->
// validate output -> persist via SSOT RPC -> log telemetry.
//
// Anthropic SDK is mocked at the module level so no live API call ever
// fires. The Supabase admin client is mocked at the module level so the
// compute module's Promise.all source modules see a predictable client.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks. These MUST be declared before importing the SUT.
// ---------------------------------------------------------------------------

const mockMessagesCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages: { create: typeof mockMessagesCreate };
    constructor(_opts?: unknown) {
      this.messages = { create: mockMessagesCreate };
    }
  }
  return { default: MockAnthropic };
});

// Supabase admin client mock: provides .rpc() and a from() chain stub. The
// 9 source modules are stubbed via vi.mock so the compute pipeline never
// actually touches the from() chain for source reads.
const mockRpc = vi.fn();
const mockClient = {
  rpc: mockRpc,
  from: vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        // Phase F-patch (Fix 2): getPreviousBOS now chains .order() twice
        // (date DESC, compute_seq DESC). The mock returns a second order
        // hop before .limit().
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockClient),
}));

// Source module mocks (the 9 sources). Each returns a controllable shape.
const mockCAQ = vi.fn();
const mockLabs = vi.fn();
const mockGenetics = vi.fn();
const mockNutrition = vi.fn();
const mockSupplements = vi.fn();
const mockBodyTracker = vi.fn();
const mockWearable = vi.fn();
const mockPlugIns = vi.fn();
const mockHelix = vi.fn();

vi.mock('../sources/caq-source', () => ({ getCAQSource: (...a: unknown[]) => mockCAQ(...a) }));
vi.mock('../sources/labs-source', () => ({ getLabsSource: (...a: unknown[]) => mockLabs(...a) }));
vi.mock('../sources/genetics-source', () => ({ getGeneticsSource: (...a: unknown[]) => mockGenetics(...a) }));
vi.mock('../sources/nutrition-source', () => ({ getNutritionSource: (...a: unknown[]) => mockNutrition(...a) }));
vi.mock('../sources/supplements-source', () => ({ getSupplementsSource: (...a: unknown[]) => mockSupplements(...a) }));
vi.mock('../sources/body-tracker-source', () => ({ getBodyTrackerSource: (...a: unknown[]) => mockBodyTracker(...a) }));
vi.mock('../sources/wearable-source', () => ({ getWearableSource: (...a: unknown[]) => mockWearable(...a) }));
vi.mock('../sources/plug-ins-source', () => ({ getPlugInsSource: (...a: unknown[]) => mockPlugIns(...a) }));
vi.mock('../sources/helix-challenges-source', () => ({ getHelixChallengesSource: (...a: unknown[]) => mockHelix(...a) }));

// Cooldown helper mock so we can control its return value per test.
const mockCooldown = vi.fn();
vi.mock('../cooldown', () => ({ isInCooldown: (...a: unknown[]) => mockCooldown(...a) }));

// Telemetry mock so we can assert fire-and-forget logging.
const mockTelemetry = vi.fn().mockResolvedValue(undefined);
vi.mock('../telemetry', () => ({ logBOSWrite: (...a: unknown[]) => mockTelemetry(...a) }));

// Now import the SUT after all vi.mock calls.
import {
  computeBOS,
  BOSCooldownError,
  BOSPreflightError,
  BOSPersistError,
  BOSHannahError,
  BYPASS_SOURCES,
  tierToConfidence,
  mapTriggerSourceToHistorySource,
} from '../bio-optimization-score';
import type { BOSTriggerEvent } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function defaultCAQ(opts: { completed?: boolean; baseline_score?: number } = {}) {
  return {
    completed: opts.completed ?? true,
    completed_at: '2026-05-01T12:00:00Z',
    baseline_score: opts.baseline_score ?? 68,
    version_number: 1,
  };
}

function defaultEngagementSource() {
  return {
    last_engaged_at: null,
    recent_events_7d: 0,
    recent_events_30d: 0,
  };
}

function validHannahToolUseResponse(
  score = 75,
  baseline = 68,
  engagementTotal = 7,
) {
  return {
    id: 'msg_test_123',
    usage: { input_tokens: 500, output_tokens: 200 },
    content: [
      {
        type: 'tool_use',
        name: 'report_bos_compute',
        input: {
          score,
          baseline_from_caq: baseline,
          engagement_total: engagementTotal,
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
            'Your Bio Optimization Score moved up because Nutrition and Body Tracker stayed steady. Keep logging meals to grow the score further.',
        },
      },
    ],
  };
}

function trigger(overrides: Partial<BOSTriggerEvent> = {}): BOSTriggerEvent {
  return {
    userId: '00000000-0000-0000-0000-000000000001',
    source: 'daily_log',
    payload: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Anthropic SDK is mocked at the module level (see vi.mock above), but
  // the compute module still asserts ANTHROPIC_API_KEY at runtime. Stub
  // the env var with a placeholder so the runtime guard does not fire.
  process.env.ANTHROPIC_API_KEY = 'test-key-stub';
  mockCooldown.mockResolvedValue({ in_cooldown: false, last_compute_at: null, minutes_remaining: 0 });
  mockCAQ.mockResolvedValue(defaultCAQ());
  mockLabs.mockResolvedValue({ present: false, uploaded_at: null, panel_count: 0 });
  mockGenetics.mockResolvedValue({ present: false, processed_at: null, panel: null });
  mockNutrition.mockResolvedValue(defaultEngagementSource());
  mockSupplements.mockResolvedValue(defaultEngagementSource());
  mockBodyTracker.mockResolvedValue(defaultEngagementSource());
  mockWearable.mockResolvedValue(defaultEngagementSource());
  mockPlugIns.mockResolvedValue(defaultEngagementSource());
  mockHelix.mockResolvedValue(defaultEngagementSource());
  mockMessagesCreate.mockResolvedValue(validHannahToolUseResponse());
  mockRpc.mockResolvedValue({ data: 'history-row-uuid-1', error: null });
});

// ---------------------------------------------------------------------------
// Constants and small helpers
// ---------------------------------------------------------------------------

describe('BYPASS_SOURCES', () => {
  it('includes caq_completed', () => {
    expect(BYPASS_SOURCES).toContain('caq_completed');
  });
});

describe('tierToConfidence', () => {
  it('maps tier 1 -> 0.720', () => {
    expect(tierToConfidence(1)).toBe(0.720);
  });
  it('maps tier 2 -> 0.860', () => {
    expect(tierToConfidence(2)).toBe(0.860);
  });
  it('maps tier 3 -> 0.960', () => {
    expect(tierToConfidence(3)).toBe(0.960);
  });
});

describe('mapTriggerSourceToHistorySource', () => {
  it('maps caq_completed -> caq_initial', () => {
    expect(mapTriggerSourceToHistorySource('caq_completed')).toBe('caq_initial');
  });
  it('maps daily_log -> daily', () => {
    expect(mapTriggerSourceToHistorySource('daily_log')).toBe('daily');
  });
  it('maps nutrition_log -> daily', () => {
    expect(mapTriggerSourceToHistorySource('nutrition_log')).toBe('daily');
  });
  it('maps wearable_sync -> daily', () => {
    expect(mapTriggerSourceToHistorySource('wearable_sync')).toBe('daily');
  });
  it('maps manual_recalc -> recalculation', () => {
    expect(mapTriggerSourceToHistorySource('manual_recalc')).toBe('recalculation');
  });
  it('maps admin_recalc -> recalculation', () => {
    expect(mapTriggerSourceToHistorySource('admin_recalc')).toBe('recalculation');
  });
  it("maps 'recommendation_pipeline' to 'recalculation'", () => {
    expect(mapTriggerSourceToHistorySource('recommendation_pipeline')).toBe('recalculation');
  });
});

// ---------------------------------------------------------------------------
// computeBOS sequence
// ---------------------------------------------------------------------------

describe('computeBOS happy path', () => {
  it('returns a BOSResult with the expected shape', async () => {
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(result.id).toBe('history-row-uuid-1');
    expect(result.score).toBe(75);
    expect(result.tier).toBe(1);
    expect(result.confidence).toBe(0.720);
    expect(result.computeVersion).toBe('2.0.0');
    expect(result.breakdown).toBeDefined();
  });

  it('calls every source module exactly once', async () => {
    await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(mockCAQ).toHaveBeenCalledTimes(1);
    expect(mockLabs).toHaveBeenCalledTimes(1);
    expect(mockGenetics).toHaveBeenCalledTimes(1);
    expect(mockNutrition).toHaveBeenCalledTimes(1);
    expect(mockSupplements).toHaveBeenCalledTimes(1);
    expect(mockBodyTracker).toHaveBeenCalledTimes(1);
    expect(mockWearable).toHaveBeenCalledTimes(1);
    expect(mockPlugIns).toHaveBeenCalledTimes(1);
    expect(mockHelix).toHaveBeenCalledTimes(1);
  });

  it('calls compute_bio_optimization_score RPC with mapped source', async () => {
    await computeBOS('00000000-0000-0000-0000-000000000001', trigger({ source: 'daily_log' }));
    expect(mockRpc).toHaveBeenCalledWith('compute_bio_optimization_score', expect.objectContaining({
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_source: 'daily',
      p_compute_version: '2.0.0',
    }));
  });

  it('logs telemetry on a successful write', async () => {
    await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(mockTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        write_target: 'compute_bio_optimization_score_rpc',
        is_canonical: true,
        success: true,
      }),
    );
  });

  it('breakdown contains _compute_meta with model + duration', async () => {
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    const meta = (result.breakdown as { _compute_meta: Record<string, unknown> })._compute_meta;
    expect(meta).toHaveProperty('compute_duration_ms');
    expect(meta).toHaveProperty('input_token_count');
    expect(meta).toHaveProperty('output_token_count');
    expect(meta).toHaveProperty('api_request_id');
  });

  // #161c Item 10: prompt_version bumped from v2.0.0 to v2.0.1 to reflect
  // the decay-numbers-from-constants change.
  it('breakdown._compute_meta.prompt_version is hannah.bos.v2.0.1', async () => {
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    const meta = (result.breakdown as { _compute_meta: { prompt_version: string } })._compute_meta;
    expect(meta.prompt_version).toBe('hannah.bos.v2.0.1');
  });

  // #161c Item 11: BOSBreakdownJSONB widened to its 7-key canonical shape.
  // Persisted breakdown must include every canonical key the route handler
  // reads from /api/bos/current.
  it('persisted breakdown has all 7 canonical keys', async () => {
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    const breakdown = result.breakdown as Record<string, unknown>;
    expect(breakdown).toHaveProperty('diagnostic_foundation');
    expect(breakdown).toHaveProperty('engagement_state');
    expect(breakdown).toHaveProperty('hannah_output');
    expect(breakdown).toHaveProperty('previous');
    expect(breakdown).toHaveProperty('tier');
    expect(breakdown).toHaveProperty('trigger');
    expect(breakdown).toHaveProperty('_compute_meta');
  });
});

// ---------------------------------------------------------------------------
// Cooldown enforcement
// ---------------------------------------------------------------------------

describe('computeBOS cooldown enforcement', () => {
  it('throws BOSCooldownError when in cooldown and not bypassed', async () => {
    mockCooldown.mockResolvedValue({
      in_cooldown: true,
      last_compute_at: '2026-05-11T11:50:00Z',
      minutes_remaining: 22,
    });
    await expect(
      computeBOS('00000000-0000-0000-0000-000000000001', trigger({ source: 'daily_log' })),
    ).rejects.toThrow(BOSCooldownError);
  });

  it('skips cooldown when trigger.bypassCooldown is true', async () => {
    mockCooldown.mockResolvedValue({
      in_cooldown: true,
      last_compute_at: '2026-05-11T11:50:00Z',
      minutes_remaining: 22,
    });
    const result = await computeBOS(
      '00000000-0000-0000-0000-000000000001',
      trigger({ source: 'daily_log', bypassCooldown: true }),
    );
    expect(result.score).toBe(75);
  });

  it('skips cooldown when trigger.source is in BYPASS_SOURCES (caq_completed)', async () => {
    mockCooldown.mockResolvedValue({
      in_cooldown: true,
      last_compute_at: '2026-05-11T11:50:00Z',
      minutes_remaining: 22,
    });
    const result = await computeBOS(
      '00000000-0000-0000-0000-000000000001',
      trigger({ source: 'caq_completed' }),
    );
    expect(result.score).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// Preflight: CAQ required
// ---------------------------------------------------------------------------

describe('computeBOS preflight', () => {
  it('throws BOSPreflightError when CAQ not completed', async () => {
    mockCAQ.mockResolvedValue(defaultCAQ({ completed: false }));
    await expect(
      computeBOS('00000000-0000-0000-0000-000000000001', trigger()),
    ).rejects.toThrow(BOSPreflightError);
  });
});

// ---------------------------------------------------------------------------
// Tier derivation
// ---------------------------------------------------------------------------

describe('computeBOS tier derivation', () => {
  it('derives tier 1 when only CAQ is completed', async () => {
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(result.tier).toBe(1);
    expect(result.confidence).toBe(0.720);
  });

  it('derives tier 2 when CAQ + labs are present (without genetics)', async () => {
    mockLabs.mockResolvedValue({ present: true, uploaded_at: '2026-05-01T00:00:00Z', panel_count: 1 });
    mockGenetics.mockResolvedValue({ present: false, processed_at: null, panel: null });
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(result.tier).toBe(2);
    expect(result.confidence).toBe(0.860);
  });

  it('derives tier 2 when CAQ + genetics are present (without labs)', async () => {
    mockLabs.mockResolvedValue({ present: false, uploaded_at: null, panel_count: 0 });
    mockGenetics.mockResolvedValue({ present: true, processed_at: '2026-04-15T00:00:00Z', panel: 'genex360_v1' });
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(result.tier).toBe(2);
    expect(result.confidence).toBe(0.860);
  });

  it('derives tier 3 when CAQ + labs + genetics are all present', async () => {
    mockLabs.mockResolvedValue({ present: true, uploaded_at: '2026-05-01T00:00:00Z', panel_count: 1 });
    mockGenetics.mockResolvedValue({ present: true, processed_at: '2026-04-15T00:00:00Z', panel: 'genex360_v1' });
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(result.tier).toBe(3);
    expect(result.confidence).toBe(0.960);
  });
});

// ---------------------------------------------------------------------------
// Hannah validation failure with retry
// ---------------------------------------------------------------------------

describe('computeBOS Hannah validation retry', () => {
  it('retries once when first Hannah response fails validation; succeeds on retry', async () => {
    const bad = validHannahToolUseResponse(101); // score > 100
    const good = validHannahToolUseResponse();
    mockMessagesCreate.mockResolvedValueOnce(bad).mockResolvedValueOnce(good);
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.score).toBe(75);
  });

  it('throws BOSHannahError when retry also fails', async () => {
    const bad = validHannahToolUseResponse(101);
    mockMessagesCreate.mockResolvedValue(bad);
    await expect(
      computeBOS('00000000-0000-0000-0000-000000000001', trigger()),
    ).rejects.toThrow(BOSHannahError);
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// RPC error handling
// ---------------------------------------------------------------------------

describe('computeBOS RPC error handling', () => {
  it('throws BOSPersistError when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc returned 42501' } });
    await expect(
      computeBOS('00000000-0000-0000-0000-000000000001', trigger()),
    ).rejects.toThrow(BOSPersistError);
  });

  it('logs telemetry with success=false on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc returned 42501' } });
    await expect(
      computeBOS('00000000-0000-0000-0000-000000000001', trigger()),
    ).rejects.toThrow(BOSPersistError);
    expect(mockTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        write_target: 'compute_bio_optimization_score_rpc',
        is_canonical: true,
        success: false,
        error_message: expect.stringContaining('rpc returned 42501'),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Score equals baseline + engagement_total within tolerance
// ---------------------------------------------------------------------------

describe('computeBOS score tolerance', () => {
  it('accepts Hannah output where score == baseline + engagement_total exactly', async () => {
    mockMessagesCreate.mockResolvedValue(validHannahToolUseResponse(75, 68, 7));
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(result.score).toBe(75);
  });

  it('accepts Hannah output within 0.5 tolerance', async () => {
    mockMessagesCreate.mockResolvedValue(validHannahToolUseResponse(75.4, 68, 7));
    const result = await computeBOS('00000000-0000-0000-0000-000000000001', trigger());
    expect(result.score).toBe(75.4);
  });
});
