/**
 * src/hooks/journey/__tests__/useEngineAccelerators.test.ts
 *
 * TDD pure-helper tests for useEngineAccelerators (Prompt 208j Task J-T4).
 *
 * Covers:
 *   - liftFromConfidenceScore: boundary values + null safety
 *   - liftFromPriority: all priority strings + null safety
 *   - confLevelFromString: high vs. medium mapping
 *   - confLevelFromPriority: critical/high vs. medium/low mapping
 *   - signalToHub: known patterns + unmapped signals
 *   - healthSignalsToDots: deduplication by hub, unmapped discarded
 *   - activeHubCount: counts distinct hubs in dot array
 *   - hubCountToWord: ordinal word conversion
 *
 * Rules: no em-dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import {
  liftFromConfidenceScore,
  liftFromPriority,
  confLevelFromString,
  confLevelFromPriority,
  signalToHub,
  healthSignalsToDots,
  activeHubCount,
  hubCountToWord,
  finalizeDots,
  recRowToItem,
  ultrathinkRowToItem,
  insightKeyFromHeadline,
  dedupeEngineEntries,
  selectDistinctAccelerators,
  activeHubsFromItems,
  buildConnectionNarrative,
  canInsertInsightKey,
  type RecommendationsRow,
  type UltrathinkRow,
  type MergeEntry,
  type EngineAccItem,
} from '../useEngineAccelerators';

// ---------------------------------------------------------------------------
// liftFromConfidenceScore
// ---------------------------------------------------------------------------

describe('liftFromConfidenceScore', () => {
  it('returns 4 for null', () => {
    expect(liftFromConfidenceScore(null)).toBe(4);
  });

  it('returns 4 for non-finite values', () => {
    expect(liftFromConfidenceScore(NaN)).toBe(4);
    expect(liftFromConfidenceScore(Infinity)).toBe(4);
  });

  it('returns 10 for score >= 0.8', () => {
    expect(liftFromConfidenceScore(0.8)).toBe(10);
    expect(liftFromConfidenceScore(0.95)).toBe(10);
    expect(liftFromConfidenceScore(1.0)).toBe(10);
  });

  it('returns 8 for score in [0.6, 0.8)', () => {
    expect(liftFromConfidenceScore(0.6)).toBe(8);
    expect(liftFromConfidenceScore(0.75)).toBe(8);
  });

  it('returns 6 for score in [0.4, 0.6)', () => {
    expect(liftFromConfidenceScore(0.4)).toBe(6);
    expect(liftFromConfidenceScore(0.55)).toBe(6);
  });

  it('returns 4 for score below 0.4', () => {
    expect(liftFromConfidenceScore(0.0)).toBe(4);
    expect(liftFromConfidenceScore(0.39)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// liftFromPriority
// ---------------------------------------------------------------------------

describe('liftFromPriority', () => {
  it('returns 4 for null', () => {
    expect(liftFromPriority(null)).toBe(4);
  });

  it('returns 10 for "critical"', () => {
    expect(liftFromPriority('critical')).toBe(10);
    expect(liftFromPriority('CRITICAL')).toBe(10);
  });

  it('returns 10 for "high"', () => {
    expect(liftFromPriority('high')).toBe(10);
    expect(liftFromPriority('High')).toBe(10);
  });

  it('returns 7 for "medium"', () => {
    expect(liftFromPriority('medium')).toBe(7);
    expect(liftFromPriority('MEDIUM')).toBe(7);
  });

  it('returns 4 for "low"', () => {
    expect(liftFromPriority('low')).toBe(4);
  });

  it('returns 4 for unknown priority strings', () => {
    expect(liftFromPriority('unknown')).toBe(4);
    expect(liftFromPriority('')).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// confLevelFromString
// ---------------------------------------------------------------------------

describe('confLevelFromString', () => {
  it('returns "high" for "high"', () => {
    expect(confLevelFromString('high')).toBe('high');
    expect(confLevelFromString('High')).toBe('high');
    expect(confLevelFromString('HIGH')).toBe('high');
  });

  it('returns "medium" for null', () => {
    expect(confLevelFromString(null)).toBe('medium');
  });

  it('returns "medium" for any other string', () => {
    expect(confLevelFromString('low')).toBe('medium');
    expect(confLevelFromString('medium')).toBe('medium');
    expect(confLevelFromString('')).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// confLevelFromPriority
// ---------------------------------------------------------------------------

describe('confLevelFromPriority', () => {
  it('returns "high" for "critical"', () => {
    expect(confLevelFromPriority('critical')).toBe('high');
  });

  it('returns "high" for "high"', () => {
    expect(confLevelFromPriority('high')).toBe('high');
  });

  it('returns "medium" for "medium"', () => {
    expect(confLevelFromPriority('medium')).toBe('medium');
  });

  it('returns "medium" for "low"', () => {
    expect(confLevelFromPriority('low')).toBe('medium');
  });

  it('returns "medium" for null', () => {
    expect(confLevelFromPriority(null)).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// signalToHub
// ---------------------------------------------------------------------------

describe('signalToHub', () => {
  it('maps genetics signals', () => {
    expect(signalToHub('MTHFR variant detected')).toBe('Genetics');
    expect(signalToHub('COMT gene profile')).toBe('Genetics');
    expect(signalToHub('genetic marker rs1801133')).toBe('Genetics');
  });

  it('maps lab signals', () => {
    expect(signalToHub('Lab results pending')).toBe('Labs');
    expect(signalToHub('Blood panel elevated')).toBe('Labs');
    expect(signalToHub('Homocysteine marker high')).toBe('Labs');
  });

  it('maps assessment signals', () => {
    expect(signalToHub('CAQ assessment score')).toBe('CAQ');
    expect(signalToHub('Fatigue reported in assessment')).toBe('CAQ');
    expect(signalToHub('Questionnaire symptom')).toBe('CAQ');
  });

  it('maps biology signals', () => {
    expect(signalToHub('HRV below target')).toBe('Biology');
    expect(signalToHub('Recovery score dropping')).toBe('Biology');
    expect(signalToHub('Resting heart rate elevated')).toBe('Biology');
  });

  it('maps nutrition signals', () => {
    expect(signalToHub('Nutrition intake low')).toBe('Nutrition');
    expect(signalToHub('Diet protein insufficient')).toBe('Nutrition');
    expect(signalToHub('Calorie deficit')).toBe('Nutrition');
  });

  it('maps supplement signals', () => {
    expect(signalToHub('Magnesium supplement added')).toBe('Supplements');
    expect(signalToHub('Zinc mineral supplement')).toBe('Supplements');
    expect(signalToHub('Iron supplement indicated')).toBe('Supplements');
  });

  it('returns null for unmapped signals', () => {
    expect(signalToHub('Unknown signal xyz')).toBeNull();
    expect(signalToHub('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// healthSignalsToDots
// ---------------------------------------------------------------------------

describe('healthSignalsToDots', () => {
  it('maps signals to dots', () => {
    const dots = healthSignalsToDots(['MTHFR variant', 'Lab panel result']);
    expect(dots).toHaveLength(2);
    expect(dots[0].hub).toBe('Genetics');
    expect(dots[1].hub).toBe('Labs');
  });

  it('deduplicates by hub - first match wins', () => {
    const dots = healthSignalsToDots([
      'MTHFR variant',
      'Another genetic signal',
    ]);
    const geneticsDots = dots.filter((d) => d.hub === 'Genetics');
    expect(geneticsDots).toHaveLength(1);
    expect(geneticsDots[0].label).toBe('MTHFR variant');
  });

  it('discards unmapped signals', () => {
    const dots = healthSignalsToDots(['Unknown signal xyz', 'MTHFR variant']);
    expect(dots).toHaveLength(1);
    expect(dots[0].hub).toBe('Genetics');
  });

  it('returns empty array for empty input', () => {
    expect(healthSignalsToDots([])).toEqual([]);
  });

  it('stores the original signal string as the label', () => {
    const dots = healthSignalsToDots(['Homocysteine blood marker']);
    expect(dots[0].label).toBe('Homocysteine blood marker');
  });
});

// ---------------------------------------------------------------------------
// activeHubCount
// ---------------------------------------------------------------------------

describe('activeHubCount', () => {
  it('returns 0 for empty array', () => {
    expect(activeHubCount([])).toBe(0);
  });

  it('counts distinct hubs', () => {
    expect(
      activeHubCount([
        { hub: 'Genetics', label: 'x' },
        { hub: 'Labs', label: 'y' },
        { hub: 'Genetics', label: 'z' },
      ]),
    ).toBe(2);
  });

  it('returns 1 when all dots share a hub', () => {
    expect(
      activeHubCount([
        { hub: 'Biology', label: 'a' },
        { hub: 'Biology', label: 'b' },
      ]),
    ).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// hubCountToWord
// ---------------------------------------------------------------------------

describe('hubCountToWord', () => {
  it('converts 0 to "zero"', () => {
    expect(hubCountToWord(0)).toBe('zero');
  });

  it('converts 1 to "one"', () => {
    expect(hubCountToWord(1)).toBe('one');
  });

  it('converts 2 to "two"', () => {
    expect(hubCountToWord(2)).toBe('two');
  });

  it('converts 3 to "three"', () => {
    expect(hubCountToWord(3)).toBe('three');
  });

  it('converts 9 to "nine"', () => {
    expect(hubCountToWord(9)).toBe('nine');
  });

  it('returns string representation for 10+', () => {
    expect(hubCountToWord(10)).toBe('10');
    expect(hubCountToWord(12)).toBe('12');
  });
});

// ---------------------------------------------------------------------------
// Fix 1: omega signal routing
// ---------------------------------------------------------------------------

describe('signalToHub - omega routing fix', () => {
  it('routes "Omega 3 supplement" to Supplements, not Labs', () => {
    expect(signalToHub('Omega 3 supplement')).toBe('Supplements');
  });

  it('routes "Omega-3 supplement" to Supplements', () => {
    expect(signalToHub('Omega-3 supplement')).toBe('Supplements');
  });

  it('routes "omega panel" to Labs (via panel keyword)', () => {
    expect(signalToHub('omega panel not on file')).toBe('Labs');
  });

  it('routes "omega lab test" to Labs (via lab keyword)', () => {
    expect(signalToHub('omega lab test')).toBe('Labs');
  });
});

// ---------------------------------------------------------------------------
// Fix 2: honest missing dot for sourceless engine recs
// ---------------------------------------------------------------------------

describe('finalizeDots', () => {
  it('returns a single missing dot when real array is empty', () => {
    const dots = finalizeDots([]);
    expect(dots).toHaveLength(1);
    expect(dots[0].missing).toBe(true);
    expect(dots[0].label).toBe('No data sources on file yet');
  });

  it('returns real dots unchanged when they exist', () => {
    const real = [
      { hub: 'Genetics' as const, label: 'MTHFR variant' },
      { hub: 'Labs' as const, label: 'Homocysteine high' },
    ];
    const dots = finalizeDots(real);
    expect(dots).toHaveLength(2);
    expect(dots[0].missing).toBeUndefined();
    expect(dots[1].missing).toBeUndefined();
  });
});

describe('recRowToItem - missing dot injected for recommendations table rows', () => {
  const baseRow: RecommendationsRow = {
    product_name: 'Magnesium Elite',
    reason: 'Support muscle recovery',
    category: 'supplement',
    confidence_level: 'high',
    confidence_score: 0.9,
    priority_rank: 1,
  };

  it('yields exactly one missing dot (no health_signals on recommendations table)', () => {
    const item = recRowToItem(baseRow);
    expect(item.dots).toHaveLength(1);
    expect(item.dots[0].missing).toBe(true);
    expect(item.dots[0].label).toBe('No data sources on file yet');
  });

  it('source is "recommendations"', () => {
    const item = recRowToItem(baseRow);
    expect(item.source).toBe('recommendations');
  });
});

describe('ultrathinkRowToItem - real dots kept, no missing dot injected', () => {
  const rowWithSignals: UltrathinkRow = {
    farmceutica_product: 'MTHFR+',
    rationale: 'Support methylation cycle',
    health_signals: ['MTHFR variant detected', 'Homocysteine blood marker'],
    priority: 'high',
    rank: 1,
    bioavailability_note: null,
  };

  it('yields real health_signal dots without injecting a missing dot', () => {
    const item = ultrathinkRowToItem(rowWithSignals);
    expect(item.dots.length).toBeGreaterThanOrEqual(1);
    const hasMissing = item.dots.some((d) => d.missing === true);
    expect(hasMissing).toBe(false);
  });

  it('yields missing dot when health_signals is empty', () => {
    const rowNoSignals: UltrathinkRow = { ...rowWithSignals, health_signals: [] };
    const item = ultrathinkRowToItem(rowNoSignals);
    expect(item.dots).toHaveLength(1);
    expect(item.dots[0].missing).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Prompt 213: Journey accelerator cardinality + connection map
// ---------------------------------------------------------------------------

function mkItem(
  headline: string,
  dots: EngineAccItem['dots'],
  id?: string,
): EngineAccItem {
  return {
    id: id ?? `id-${insightKeyFromHeadline(headline)}`,
    insightKey: insightKeyFromHeadline(headline),
    headline,
    body: `${headline} body`,
    tag: 'SUPPLEMENT',
    pts: 10,
    derivedPts: 'derived',
    conf: 'high',
    dots,
    source: 'ultrathink_recommendations',
  };
}

describe('Prompt 213 insightKeyFromHeadline', () => {
  it('normalizes Replenish NAD+ variants to one key', () => {
    expect(insightKeyFromHeadline('Replenish NAD+')).toBe('replenish-nad');
    expect(insightKeyFromHeadline('  replenish nad+ ')).toBe('replenish-nad');
  });
});

describe('Prompt 213 dedupeEngineEntries / selectDistinctAccelerators', () => {
  it('collapses four identical Replenish NAD+ rows to one insight', () => {
    const dup = mkItem('Replenish NAD+', [
      { hub: 'CAQ', label: 'Fatigue reported' },
    ]);
    const entries: MergeEntry[] = [0, 1, 2, 3].map((i) => ({
      item: { ...dup, id: `row-${i}` },
      rank: i + 1,
    }));
    const unique = dedupeEngineEntries(entries);
    expect(unique).toHaveLength(1);
    expect(unique[0].item.headline).toBe('Replenish NAD+');

    const selected = selectDistinctAccelerators(entries, 4);
    expect(selected).toHaveLength(1);
    expect(selected.map((s) => s.headline)).toEqual(['Replenish NAD+']);
  });

  it('keeps four distinct product headlines', () => {
    const entries: MergeEntry[] = [
      { item: mkItem('Replenish NAD+', [{ hub: 'CAQ', label: 'Fatigue' }]), rank: 1 },
      { item: mkItem('Omega 3 Elite', [{ hub: 'Labs', label: 'Omega panel' }]), rank: 2 },
      { item: mkItem('Anchor Sleep', [{ hub: 'Biology', label: 'Recovery' }]), rank: 3 },
      { item: mkItem('Zone 2 Block', [{ hub: 'Biology', label: 'Load ready' }]), rank: 4 },
    ];
    const selected = selectDistinctAccelerators(entries, 4);
    expect(selected).toHaveLength(4);
    const keys = new Set(selected.map((s) => s.insightKey));
    expect(keys.size).toBe(4);
  });

  it('does not pad sparse engine results by cloning the first insight', () => {
    const entries: MergeEntry[] = [
      { item: mkItem('Replenish NAD+', [{ hub: 'CAQ', label: 'Fatigue' }]), rank: 1 },
    ];
    const selected = selectDistinctAccelerators(entries, 4);
    expect(selected).toHaveLength(1);
    expect(selected.every((s) => s.headline === 'Replenish NAD+')).toBe(true);
  });
});

describe('Prompt 213 activeHubsFromItems + buildConnectionNarrative', () => {
  it('lights exactly the hubs present across the insight set', () => {
    const items = [
      mkItem('A', [{ hub: 'CAQ', label: 'Fatigue' }]),
      mkItem('B', [{ hub: 'Genetics', label: 'MTHFR' }, { hub: 'Labs', label: 'Homocysteine' }]),
      mkItem('C', [{ hub: 'CAQ', label: 'dup' }, { hub: 'Supplements', label: 'Stack gap' }]),
    ];
    expect(activeHubsFromItems(items)).toEqual(['CAQ', 'Genetics', 'Labs', 'Supplements']);
  });

  it('ignores missing-marked dots when lighting spokes', () => {
    const items = [
      mkItem('A', [{ hub: 'CAQ', label: 'No data yet', missing: true }]),
      mkItem('B', [{ hub: 'Biology', label: 'Recovery' }]),
    ];
    expect(activeHubsFromItems(items)).toEqual(['Biology']);
  });

  it('uses singular caption for one insight and plural for many', () => {
    const one = [mkItem('Replenish NAD+', [{ hub: 'CAQ', label: 'Fatigue' }])];
    const many = [
      mkItem('Replenish NAD+', [{ hub: 'CAQ', label: 'Fatigue' }]),
      mkItem('Omega 3 Elite', [{ hub: 'Labs', label: 'Omega' }]),
    ];
    expect(buildConnectionNarrative(one, ['CAQ'])).toContain('The Replenish NAD+ insight');
    expect(buildConnectionNarrative(one, ['CAQ'])).toContain('one of your hubs');
    expect(buildConnectionNarrative(many, ['CAQ', 'Labs'])).toContain('These 2 insights');
    expect(buildConnectionNarrative(many, ['CAQ', 'Labs'])).toContain('two of your hubs');
  });
});

describe('Prompt 213 canInsertInsightKey (writer reject duplicate)', () => {
  it('rejects a second insert with an identical insight_key', () => {
    const existing = new Set(['replenish-nad', 'omega-3-elite']);
    expect(canInsertInsightKey(existing, 'replenish-nad')).toBe(false);
    expect(canInsertInsightKey(existing, 'Replenish-NAD')).toBe(false);
    expect(canInsertInsightKey(existing, 'zone-2-movement-block')).toBe(true);
  });

  it('rejects empty keys', () => {
    expect(canInsertInsightKey(new Set(), '')).toBe(false);
  });
});
