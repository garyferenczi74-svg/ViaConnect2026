import { describe, expect, it } from 'vitest';
import {
  emptyObservedByPanel,
  formatObservedBadge,
  isHonestEmptyObserved,
  isUnknownObserved,
  mergeObservedByPanel,
  sumObservedCounts,
  unknownObservedByPanel,
} from '../observedPanelCounts';

describe('observedPanelCounts fail-open vs empty', () => {
  it('keeps UNKNOWN distinct from honest empty (never render error as 0)', () => {
    const empty = emptyObservedByPanel().methylation;
    const unknown = unknownObservedByPanel().methylation;

    expect(isHonestEmptyObserved(empty)).toBe(true);
    expect(isUnknownObserved(empty)).toBe(false);
    expect(empty.count).toBe(0);
    expect(formatObservedBadge(empty)).toBe('Not analyzed');
    expect(formatObservedBadge(empty)).not.toBe('0 SNPs');
    expect(formatObservedBadge(empty)).not.toBe('Unanalyzed');
    expect(formatObservedBadge(empty)).not.toBe('Demo');

    expect(isUnknownObserved(unknown)).toBe(true);
    expect(isHonestEmptyObserved(unknown)).toBe(false);
    expect(unknown.count).toBeNull();
    expect(formatObservedBadge(unknown)).toBe('n/a');
    expect(formatObservedBadge(unknown)).not.toBe('0');
    expect(formatObservedBadge(unknown)).not.toContain('0');
  });

  it('does not let a marketing catalog size become an observed badge', () => {
    const observed = mergeObservedByPanel({ methylation: 3 });
    expect(observed.methylation.count).toBe(3);
    expect(observed.methylation.count).not.toBe(20);
    expect(formatObservedBadge(observed.methylation)).toBe('3 SNPs');
  });

  it('sums only known panels so UNKNOWN does not become a 0 header', () => {
    const mixed = mergeObservedByPanel({
      methylation: 4,
      nutrition: null,
    });
    expect(sumObservedCounts(mixed)).toBe(4);
    expect(sumObservedCounts(unknownObservedByPanel())).toBeNull();
    expect(sumObservedCounts(emptyObservedByPanel())).toBe(0);
  });
});
