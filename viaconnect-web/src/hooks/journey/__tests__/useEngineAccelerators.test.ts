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
