/**
 * Unit tests for labEfficacyFlags.ts
 * Prompt 208b Task 4.2: lab-based supplement efficacy flags.
 *
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * A SECOND, independent supplement-flag source alongside the genetic flag: a user
 * supplementing a nutrient whose corresponding biomarker is STILL out-of-range
 * gets a lab_efficacy flag (review dose / form / absorption / cofactor). It is
 * ADDITIVE and fail-open. No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the lab loader + admin client. buildLabEfficacyFlags reads the user's
// confirmed labs via loadLabResults(admin, userId); we drive that return value
// per-case. createAdminClient is mocked so no real DB client is constructed.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ __mockAdmin: true })),
}));

vi.mock('@/lib/labs/loadLabResults', () => ({
  loadLabResults: vi.fn(),
}));

import {
  SUPPLEMENT_BIOMARKER_LINKS,
  isUnderResponding,
  buildLabEfficacyFlags,
  type SupplementBiomarkerLink,
  type LabEfficacyFlag,
} from '../labEfficacyFlags';

import { loadLabResults } from '@/lib/labs/loadLabResults';

// A minimal lab row shaped like LabResultRow (only the fields the engine reads).
function labRow(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Vitamin D, 25-OH',
    value: 20,
    unit: 'ng/mL',
    panelGroup: 'Vitamins and minerals',
    standard: { low: 30, high: 100 },
    geneticOptimal: null,
    gene: null,
    status: 'monitor',
    tier: 'monitor',
    direction: 'low',
    confidence: null,
    collectionDate: '2026-06-01',
    trend: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// SUPPLEMENT_BIOMARKER_LINKS
// ---------------------------------------------------------------------------

describe('SUPPLEMENT_BIOMARKER_LINKS', () => {
  it('contains the well-established supplement -> biomarker pairs (all deficiency = low)', () => {
    const find = (kw: string): SupplementBiomarkerLink | undefined =>
      SUPPLEMENT_BIOMARKER_LINKS.find((l) => l.nutrientKeyword === kw);

    expect(find('vitamin d')).toMatchObject({ biomarker: 'vitamin_d', riskDirection: 'low' });
    expect(find('cholecalciferol')).toMatchObject({ biomarker: 'vitamin_d', riskDirection: 'low' });
    expect(find('iron')).toMatchObject({ biomarker: 'ferritin', riskDirection: 'low' });
    expect(find('ferrous')).toMatchObject({ biomarker: 'ferritin', riskDirection: 'low' });
    expect(find('b12')).toMatchObject({ biomarker: 'vitamin_b12', riskDirection: 'low' });
    expect(find('cobalamin')).toMatchObject({ biomarker: 'vitamin_b12', riskDirection: 'low' });
    expect(find('folate')).toMatchObject({ biomarker: 'folate', riskDirection: 'low' });
    expect(find('magnesium')).toMatchObject({ biomarker: 'magnesium', riskDirection: 'low' });
    expect(find('zinc')).toMatchObject({ biomarker: 'zinc', riskDirection: 'low' });
  });

  it('every link is a deficiency (low) direction', () => {
    for (const l of SUPPLEMENT_BIOMARKER_LINKS) {
      expect(l.riskDirection).toBe('low');
    }
  });
});

// ---------------------------------------------------------------------------
// isUnderResponding (PURE)
// ---------------------------------------------------------------------------

describe('isUnderResponding', () => {
  it('low deficiency: value below range.low -> true (still deficient despite supplementing)', () => {
    expect(isUnderResponding(20, { low: 30, high: 100 }, 'low')).toBe(true);
  });

  it('low deficiency: value within range -> false (responding)', () => {
    expect(isUnderResponding(45, { low: 30, high: 100 }, 'low')).toBe(false);
  });

  it('low deficiency: value exactly at range.low -> false (not below)', () => {
    expect(isUnderResponding(30, { low: 30, high: 100 }, 'low')).toBe(false);
  });

  it('null range -> false (cannot assess)', () => {
    expect(isUnderResponding(20, null, 'low')).toBe(false);
  });

  it('high direction: value above range.high -> true', () => {
    expect(isUnderResponding(120, { low: 30, high: 100 }, 'high')).toBe(true);
  });

  it('high direction: value within range -> false', () => {
    expect(isUnderResponding(80, { low: 30, high: 100 }, 'high')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildLabEfficacyFlags
// ---------------------------------------------------------------------------

describe('buildLabEfficacyFlags', () => {
  it('flags a vitamin D supplement when the vitamin_d lab is still below range', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ value: 18, standard: { low: 30, high: 100 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-1', ['Vitamin D3 5000 IU']);

    expect(flags).toHaveLength(1);
    const flag: LabEfficacyFlag = flags[0];
    expect(flag.flagSource).toBe('lab_efficacy');
    expect(flag.linkedBiomarker).toBe('vitamin_d');
    expect(flag.current).toBe('Vitamin D3 5000 IU');
    expect(flag.reason.toLowerCase()).toContain('vitamin_d');
    expect(flag.reason.toLowerCase()).toContain('dose');
  });

  it('uses geneticOptimal range when present (in preference to standard)', async () => {
    // value 65 is within standard (30-100) but BELOW the genetic-optimal floor (70).
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ value: 65, standard: { low: 30, high: 100 }, geneticOptimal: { low: 70, high: 90 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-genetic', ['vitamin d']);
    expect(flags).toHaveLength(1);
    expect(flags[0].linkedBiomarker).toBe('vitamin_d');
  });

  it('does NOT flag when the lab is in range (responding)', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ value: 55, standard: { low: 30, high: 100 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-2', ['Vitamin D3']);
    expect(flags).toHaveLength(0);
  });

  it('does NOT flag a supplement with no matching biomarker link', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ value: 18, standard: { low: 30, high: 100 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-3', ['CoQ10 200 mg']);
    expect(flags).toHaveLength(0);
  });

  it('does NOT flag when the linked biomarker has no lab for that user', async () => {
    // User supplements iron but has only a vitamin D lab on file.
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ value: 18, standard: { low: 30, high: 100 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-4', ['Ferrous bisglycinate']);
    expect(flags).toHaveLength(0);
  });

  it('returns [] when the user has no labs at all', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const flags = await buildLabEfficacyFlags('user-5', ['Vitamin D3', 'iron']);
    expect(flags).toEqual([]);
  });

  it('fail-open: returns [] when loadLabResults rejects (read error)', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('lab read exploded'));
    const flags = await buildLabEfficacyFlags('user-6', ['Vitamin D3']);
    expect(flags).toEqual([]);
  });

  it('matches the biomarker by its canonical key (ferritin row name -> iron supplement)', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ name: 'Ferritin', value: 8, unit: 'ng/mL', standard: { low: 30, high: 300 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-7', ['Ferrous sulfate 65 mg']);
    expect(flags).toHaveLength(1);
    expect(flags[0].linkedBiomarker).toBe('ferritin');
  });

  it('dedups by (current + linkedBiomarker): same supplement listed twice -> one flag', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ value: 18, standard: { low: 30, high: 100 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-8', ['Vitamin D3', 'Vitamin D3']);
    expect(flags).toHaveLength(1);
  });

  it('emits one flag per distinct (supplement, biomarker) pair', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ name: 'Vitamin D, 25-OH', value: 18, standard: { low: 30, high: 100 } }),
      labRow({ name: 'Ferritin', value: 8, standard: { low: 30, high: 300 } }),
    ]);

    const flags = await buildLabEfficacyFlags('user-9', ['Vitamin D3', 'Ferrous sulfate']);
    expect(flags).toHaveLength(2);
    const linked = flags.map((f) => f.linkedBiomarker).sort();
    expect(linked).toEqual(['ferritin', 'vitamin_d']);
  });

  it('returns [] for an empty supplement list', async () => {
    (loadLabResults as ReturnType<typeof vi.fn>).mockResolvedValue([
      labRow({ value: 18 }),
    ]);
    const flags = await buildLabEfficacyFlags('user-10', []);
    expect(flags).toEqual([]);
  });
});
