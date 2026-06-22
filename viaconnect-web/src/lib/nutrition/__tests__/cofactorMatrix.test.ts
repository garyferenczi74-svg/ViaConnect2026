/**
 * Prompt 208b Task 4.5-T2: cofactor / nutrient-interaction engine tests.
 *
 * Pure matcher: given the user's stack nutrients, surface applicable cofactor
 * interactions from nutrient_interactions. BOTH nutrients of a pair must be
 * present. Informational only - never gates. Fail-open (never throws).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks: admin client + safe-log + getSupplementContributions
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  adminFrom: vi.fn(),
  safeLogError: vi.fn(),
  safeLogWarn: vi.fn(),
  safeLogInfo: vi.fn(),
  getSupplementContributions: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mocks.adminFrom }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    error: mocks.safeLogError,
    warn: mocks.safeLogWarn,
    info: mocks.safeLogInfo,
    debug: vi.fn(),
  },
}));

vi.mock('../intakeReconciliation', () => ({
  getSupplementContributions: mocks.getSupplementContributions,
}));

import {
  actionFor,
  cofactorGuidance,
  loadNutrientInteractions,
  buildCofactorGuidance,
  type InteractionRow,
  type CofactorGuidance,
} from '../cofactorMatrix';

// ---------------------------------------------------------------------------
// Builder helper - chainable thenable for admin queries
// ---------------------------------------------------------------------------
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const ret = () => builder;
  for (const m of ['select', 'eq', 'in', 'order', 'limit']) {
    builder[m] = vi.fn(ret);
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminFrom.mockReset();
  mocks.getSupplementContributions.mockReset();
});

// ---------------------------------------------------------------------------
// Fixture rows
// ---------------------------------------------------------------------------
const ironVitCRow: InteractionRow = {
  nutrient_a: 'iron',
  nutrient_b: 'vitamin_c',
  interaction_type: 'synergy',
  mechanism: 'vitamin_c enhances non-heme iron absorption',
  evidence_tier: 1,
};

const calciumIronRow: InteractionRow = {
  nutrient_a: 'calcium',
  nutrient_b: 'iron',
  interaction_type: 'timing_separation',
  mechanism: 'calcium inhibits iron absorption when co-administered',
  evidence_tier: 2,
};

const zincCopperRow: InteractionRow = {
  nutrient_a: 'zinc',
  nutrient_b: 'copper',
  interaction_type: 'inhibition',
  mechanism: 'excess zinc displaces copper at absorptive sites',
  evidence_tier: 1,
};

const magnesiumRow: InteractionRow = {
  nutrient_a: 'magnesium',
  nutrient_b: 'vitamin_d',
  interaction_type: 'synergy',
  mechanism: 'magnesium is required for vitamin D activation',
  evidence_tier: 1,
};

// ===========================================================================
// actionFor
// ===========================================================================
describe('actionFor', () => {
  it('maps synergy to pair_or_cotime', () => {
    expect(actionFor('synergy')).toBe('pair_or_cotime');
  });

  it('maps timing_separation to separate_timing', () => {
    expect(actionFor('timing_separation')).toBe('separate_timing');
  });

  it('maps inhibition to balance_ratio', () => {
    expect(actionFor('inhibition')).toBe('balance_ratio');
  });
});

// ===========================================================================
// cofactorGuidance (pure)
// ===========================================================================
describe('cofactorGuidance', () => {
  it('emits pair_or_cotime when both iron and vitamin_c are present', () => {
    const result = cofactorGuidance(['iron', 'vitamin_c'], [ironVitCRow]);
    expect(result).toHaveLength(1);
    expect(result[0].nutrientA).toBe('iron');
    expect(result[0].nutrientB).toBe('vitamin_c');
    expect(result[0].interactionType).toBe('synergy');
    expect(result[0].action).toBe('pair_or_cotime');
    expect(result[0].mechanism).toBe('vitamin_c enhances non-heme iron absorption');
  });

  it('emits no guidance when only iron is present (vitamin_c missing)', () => {
    const result = cofactorGuidance(['iron'], [ironVitCRow]);
    expect(result).toHaveLength(0);
  });

  it('emits no guidance when only vitamin_c is present (iron missing)', () => {
    const result = cofactorGuidance(['vitamin_c'], [ironVitCRow]);
    expect(result).toHaveLength(0);
  });

  it('emits separate_timing for calcium + iron pair', () => {
    const result = cofactorGuidance(['calcium', 'iron'], [calciumIronRow]);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('separate_timing');
    expect(result[0].interactionType).toBe('timing_separation');
  });

  it('emits balance_ratio for zinc + copper pair', () => {
    const result = cofactorGuidance(['zinc', 'copper'], [zincCopperRow]);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('balance_ratio');
    expect(result[0].interactionType).toBe('inhibition');
  });

  it('normalizes magnesium_supplemental to magnesium for matching', () => {
    const result = cofactorGuidance(['magnesium_supplemental', 'vitamin_d'], [magnesiumRow]);
    expect(result).toHaveLength(1);
    expect(result[0].nutrientA).toBe('magnesium');
    expect(result[0].nutrientB).toBe('vitamin_d');
    expect(result[0].action).toBe('pair_or_cotime');
  });

  it('matches when user set includes lowercase variants', () => {
    const result = cofactorGuidance(['IRON', 'VITAMIN_C'], [ironVitCRow]);
    expect(result).toHaveLength(1);
  });

  it('deduplicates identical (a, b, type) entries', () => {
    const dupeRow: InteractionRow = { ...ironVitCRow };
    const result = cofactorGuidance(['iron', 'vitamin_c'], [ironVitCRow, dupeRow]);
    expect(result).toHaveLength(1);
  });

  it('returns [] for an empty interactions list', () => {
    const result = cofactorGuidance(['iron', 'vitamin_c'], []);
    expect(result).toHaveLength(0);
  });

  it('returns [] for an empty user nutrients list', () => {
    const result = cofactorGuidance([], [ironVitCRow]);
    expect(result).toHaveLength(0);
  });

  it('emits multiple guidance entries when multiple pairs match', () => {
    const result = cofactorGuidance(
      ['iron', 'vitamin_c', 'calcium', 'zinc', 'copper'],
      [ironVitCRow, calciumIronRow, zincCopperRow],
    );
    expect(result).toHaveLength(3);
  });

  it('never throws on garbage input', () => {
    expect(() => cofactorGuidance(null as unknown as string[], [ironVitCRow])).not.toThrow();
    expect(() => cofactorGuidance(['iron'], null as unknown as InteractionRow[])).not.toThrow();
  });
});

// ===========================================================================
// loadNutrientInteractions
// ===========================================================================
describe('loadNutrientInteractions', () => {
  it('maps rows from nutrient_interactions table', async () => {
    mocks.adminFrom.mockReturnValue(
      makeBuilder({
        data: [
          {
            nutrient_a: 'iron',
            nutrient_b: 'vitamin_c',
            interaction_type: 'synergy',
            mechanism: 'enhances absorption',
            evidence_tier: 1,
          },
        ],
        error: null,
      }),
    );
    const rows = await loadNutrientInteractions();
    expect(rows).toHaveLength(1);
    expect(rows[0].nutrient_a).toBe('iron');
    expect(rows[0].nutrient_b).toBe('vitamin_c');
    expect(rows[0].interaction_type).toBe('synergy');
    expect(rows[0].mechanism).toBe('enhances absorption');
    expect(rows[0].evidence_tier).toBe(1);
  });

  it('returns [] (fail-open) on a read error', async () => {
    mocks.adminFrom.mockReturnValue(
      makeBuilder({ data: null, error: { message: 'table missing' } }),
    );
    const rows = await loadNutrientInteractions();
    expect(rows).toEqual([]);
  });

  it('returns [] when data is null', async () => {
    mocks.adminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const rows = await loadNutrientInteractions();
    expect(rows).toEqual([]);
  });

  it('never throws even if the admin client blows up', async () => {
    mocks.adminFrom.mockImplementation(() => {
      throw new Error('client exploded');
    });
    await expect(loadNutrientInteractions()).resolves.toEqual([]);
  });

  it('handles null mechanism and evidence_tier gracefully', async () => {
    mocks.adminFrom.mockReturnValue(
      makeBuilder({
        data: [
          {
            nutrient_a: 'zinc',
            nutrient_b: 'copper',
            interaction_type: 'inhibition',
            mechanism: null,
            evidence_tier: null,
          },
        ],
        error: null,
      }),
    );
    const rows = await loadNutrientInteractions();
    expect(rows[0].mechanism).toBeNull();
    expect(rows[0].evidence_tier).toBeNull();
  });
});

// ===========================================================================
// buildCofactorGuidance
// ===========================================================================
describe('buildCofactorGuidance', () => {
  it('returns guidance when stack has iron + vitamin_c and a synergy row exists', async () => {
    mocks.getSupplementContributions.mockResolvedValue([
      { nutrient: 'iron', amount: 18 },
      { nutrient: 'vitamin_c', amount: 500 },
    ]);
    mocks.adminFrom.mockReturnValue(
      makeBuilder({
        data: [
          {
            nutrient_a: 'iron',
            nutrient_b: 'vitamin_c',
            interaction_type: 'synergy',
            mechanism: 'vitamin_c enhances iron absorption',
            evidence_tier: 1,
          },
        ],
        error: null,
      }),
    );
    const result = await buildCofactorGuidance('u1');
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('pair_or_cotime');
  });

  it('returns [] (fail-open) when getSupplementContributions throws', async () => {
    mocks.getSupplementContributions.mockRejectedValue(new Error('stack read failed'));
    mocks.adminFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
    const result = await buildCofactorGuidance('u1');
    expect(result).toEqual([]);
  });

  it('returns [] (fail-open) when loadNutrientInteractions fails', async () => {
    mocks.getSupplementContributions.mockResolvedValue([
      { nutrient: 'iron', amount: 18 },
    ]);
    mocks.adminFrom.mockImplementation(() => {
      throw new Error('admin down');
    });
    const result = await buildCofactorGuidance('u1');
    expect(result).toEqual([]);
  });

  it('returns [] when the stack is empty', async () => {
    mocks.getSupplementContributions.mockResolvedValue([]);
    mocks.adminFrom.mockReturnValue(
      makeBuilder({
        data: [
          {
            nutrient_a: 'iron',
            nutrient_b: 'vitamin_c',
            interaction_type: 'synergy',
            mechanism: null,
            evidence_tier: null,
          },
        ],
        error: null,
      }),
    );
    const result = await buildCofactorGuidance('u1');
    expect(result).toEqual([]);
  });

  it('never throws (always resolves)', async () => {
    mocks.getSupplementContributions.mockImplementation(() => {
      throw new Error('catastrophe');
    });
    mocks.adminFrom.mockImplementation(() => {
      throw new Error('catastrophe');
    });
    await expect(buildCofactorGuidance('u1')).resolves.toBeDefined();
  });
});
