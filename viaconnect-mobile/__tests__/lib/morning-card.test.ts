import {
  MARKETING_CHIP_KEYS,
  bosCurrentUrl,
  buildMorningChips,
  classifySourceStatus,
  firstIncompleteProtocolAction,
  readBosCurrentScore,
  sourceStatusUntilBrief12,
} from '../../src/lib/morning-card/model';

describe('Expo morning-card model', () => {
  it('exports eight marketing keys and no Helix', () => {
    expect([...MARKETING_CHIP_KEYS]).toEqual([
      'recovery',
      'sleep',
      'strain',
      'regimen',
      'nutrients',
      'symptoms',
      'metabolic',
      'immune',
    ]);
    expect(MARKETING_CHIP_KEYS).not.toContain('helix_challenges');
  });

  it('keeps live chips pending until Brief 12', () => {
    expect(sourceStatusUntilBrief12()).toBe('pending');
    const chips = buildMorningChips();
    expect(chips).toHaveLength(8);
    expect(chips.every((c) => c.sourceStatus === 'pending')).toBe(true);
    expect(
      chips.every((c) => c.contributors.every((row) => row.displayValue === 'Pending')),
    ).toBe(true);
  });

  it('classifies pending named disagree', () => {
    expect(classifySourceStatus({ hasNamedSource: false, devicesDisagree: false })).toBe(
      'pending',
    );
    expect(classifySourceStatus({ hasNamedSource: true, devicesDisagree: false })).toBe(
      'named',
    );
    expect(classifySourceStatus({ hasNamedSource: true, devicesDisagree: true })).toBe(
      'disagree',
    );
  });

  it('picks the first incomplete protocol item with no Helix fallback', () => {
    const cta = firstIncompleteProtocolAction([
      { slotId: '1', name: 'MTHFR+', dose: null, timeOfDay: 'morning', taken: true },
      { slotId: '2', name: 'NAD+', dose: null, timeOfDay: 'afternoon', taken: false },
    ]);
    expect(cta.kind).toBe('action');
    expect(cta.label).toBe('Take NAD+');
    expect(cta.label).not.toMatch(/Helix/i);
  });

  it('reads score from /api/bos/current payload and never fabricates 0', () => {
    expect(bosCurrentUrl()).toBe('/api/bos/current');
    expect(bosCurrentUrl('https://www.viaconnectapp.com/')).toBe(
      'https://www.viaconnectapp.com/api/bos/current',
    );
    expect(readBosCurrentScore({ score: 72 })).toBe(72);
    expect(readBosCurrentScore({ score: null })).toBeNull();
    expect(readBosCurrentScore({ score: '87' })).toBeNull();
    expect(readBosCurrentScore(null)).toBeNull();
  });
});
