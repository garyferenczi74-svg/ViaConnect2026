import { describe, expect, it } from 'vitest';
import { isMthfrFolateTarget, mayShowMthfrFolate } from '../mthfrFolate';

describe('mthfrFolate', () => {
  it('recognizes MTHFR gene and shipped folate rsIDs', () => {
    expect(isMthfrFolateTarget('rs1801133', 'COMT')).toBe(true);
    expect(isMthfrFolateTarget('rs4680', 'MTHFR')).toBe(true);
    expect(isMthfrFolateTarget('rs4680', 'COMT')).toBe(false);
  });

  it('allows folate copy only on remapped genex_m / methylation', () => {
    expect(mayShowMthfrFolate('methylation')).toBe(true);
    expect(mayShowMthfrFolate('genex_m')).toBe(true);
    expect(mayShowMthfrFolate('GENEX-M')).toBe(true);
    expect(mayShowMthfrFolate('nutrition')).toBe(false);
    expect(mayShowMthfrFolate('nutrigen-dx')).toBe(false);
    expect(mayShowMthfrFolate('UNKNOWN')).toBe(false);
    expect(mayShowMthfrFolate(null)).toBe(false);
  });
});
