/**
 * Unit tests for populationMatch.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208a Module C Task C2 (2026-06-22).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import {
  populationMatches,
  populationCaveatFor,
  getUserAncestry,
} from '../populationMatch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an admin mock that handles ancestry_context and user_health_context
 * table queries used by getUserAncestry.
 *
 * ancestryContextRow: the row to return from ancestry_context (null if no row).
 * healthContextDemographics: the demographics jsonb to return from user_health_context.
 */
function makeAdminMock(
  ancestryContextRow: { populations: unknown } | null,
  healthContextDemographics: Record<string, unknown> | null = null,
) {
  const makeMaybeSingleChain = (resolvedData: unknown, resolvedError: unknown = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
  });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'ancestry_context') {
        return makeMaybeSingleChain(ancestryContextRow);
      }
      if (table === 'user_health_context') {
        const hcData = healthContextDemographics !== null
          ? { demographics: healthContextDemographics }
          : null;
        return makeMaybeSingleChain(hcData);
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// populationMatches tests
// ---------------------------------------------------------------------------

describe('populationMatches', () => {
  it('returns true when rulePopulations is null (universal rule)', () => {
    expect(populationMatches(null, ['european'])).toBe(true);
  });

  it('returns true when rulePopulations is undefined (universal rule)', () => {
    expect(populationMatches(undefined, ['european'])).toBe(true);
  });

  it('returns true when rulePopulations is empty array (universal rule)', () => {
    expect(populationMatches([], ['european'])).toBe(true);
  });

  it('returns true when there is case-insensitive overlap', () => {
    expect(populationMatches(['European', 'Asian'], ['european'])).toBe(true);
    expect(populationMatches(['EUR'], ['eur'])).toBe(true);
  });

  it('returns false when there is no overlap and userPopulations is non-empty', () => {
    expect(populationMatches(['European'], ['african'])).toBe(false);
    expect(populationMatches(['EUR', 'EAS'], ['AFR'])).toBe(false);
  });

  it('returns true when userPopulations is empty (do-not-penalize unknown ancestry)', () => {
    expect(populationMatches(['European'], [])).toBe(true);
    expect(populationMatches(['EUR', 'EAS'], [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// populationCaveatFor tests
// ---------------------------------------------------------------------------

describe('populationCaveatFor', () => {
  it('returns a caveat when rule is EUR-only and user is AFR (non-matching, known ancestry)', () => {
    const rule = {
      rsid: 'rs1801133',
      validated_populations: ['european'],
      cross_population_caveat: 'This finding was validated primarily in European populations; applicability across other ancestries is less certain.',
    };
    const result = populationCaveatFor(rule, ['african']);
    expect(result).not.toBeNull();
    expect(result?.rsid).toBe('rs1801133');
    expect(result?.caveat).toBe(rule.cross_population_caveat);
  });

  it('returns null when the user ancestry matches the rule populations', () => {
    const rule = {
      rsid: 'rs1801133',
      validated_populations: ['european'],
      cross_population_caveat: 'Validated in European populations only.',
    };
    const result = populationCaveatFor(rule, ['european']);
    expect(result).toBeNull();
  });

  it('returns null when userPopulations is empty (unknown ancestry - do not penalize)', () => {
    const rule = {
      rsid: 'rs1801133',
      validated_populations: ['european'],
      cross_population_caveat: 'Validated in European populations only.',
    };
    const result = populationCaveatFor(rule, []);
    expect(result).toBeNull();
  });

  it('returns null when rule has no validated_populations (universal rule)', () => {
    const rule = {
      rsid: 'rs1801133',
      validated_populations: undefined,
      cross_population_caveat: 'Would be a caveat but rule is universal.',
    };
    const result = populationCaveatFor(rule, ['african']);
    expect(result).toBeNull();
  });

  it('returns null when rule has empty validated_populations (universal rule)', () => {
    const rule = {
      rsid: 'rs1801133',
      validated_populations: [] as string[],
      cross_population_caveat: 'Would be a caveat but rule is universal.',
    };
    const result = populationCaveatFor(rule, ['african']);
    expect(result).toBeNull();
  });

  it('returns null when cross_population_caveat is absent even if no match', () => {
    const rule = {
      rsid: 'rs1801133',
      validated_populations: ['european'],
      cross_population_caveat: null,
    };
    const result = populationCaveatFor(rule, ['african']);
    expect(result).toBeNull();
  });

  it('returns null when cross_population_caveat is empty string even if no match', () => {
    const rule = {
      rsid: 'rs1801133',
      validated_populations: ['european'],
      cross_population_caveat: '',
    };
    const result = populationCaveatFor(rule, ['african']);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getUserAncestry tests
// ---------------------------------------------------------------------------

describe('getUserAncestry', () => {
  it('returns populations from ancestry_context row (lowercased and trimmed)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMock({ populations: ['European', ' East Asian '] }),
    );
    const result = await getUserAncestry('user-123');
    expect(result).toEqual(['european', 'east asian']);
  });

  it('falls back to user_health_context demographics.ethnicity when no ancestry_context row', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMock(null, { ethnicity: ['African American', 'Caribbean'] }),
    );
    const result = await getUserAncestry('user-fallback');
    expect(result).toEqual(['african american', 'caribbean']);
  });

  it('returns empty array when no ancestry_context and no CAQ ethnicity', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMock(null, {}),
    );
    const result = await getUserAncestry('user-no-ancestry');
    expect(result).toEqual([]);
  });

  it('returns empty array (fail-open) when admin client throws', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('DB connection failed');
    });
    const result = await getUserAncestry('user-fail');
    expect(result).toEqual([]);
  });

  it('returns empty array when ancestry_context populations is not an array (falls back to no-ethnicity hc)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      // populations is a string (bad data); fallback hc has no ethnicity
      makeAdminMock({ populations: 'not-an-array' }, {}),
    );
    const result = await getUserAncestry('user-bad-data');
    expect(result).toEqual([]);
  });
});
