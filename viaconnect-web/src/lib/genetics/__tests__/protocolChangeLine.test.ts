import { describe, expect, it } from 'vitest';
import { protocolChangeLine } from '../protocolChangeLine';

describe('protocolChangeLine', () => {
  it('returns null when there is no delta', () => {
    expect(protocolChangeLine(null)).toBeNull();
    expect(protocolChangeLine(undefined)).toBeNull();
  });

  it('returns null when changed is false or summary is blank', () => {
    expect(protocolChangeLine({ changed: false, summary: 'Switched folate form' })).toBeNull();
    expect(protocolChangeLine({ changed: true, summary: '' })).toBeNull();
    expect(protocolChangeLine({ changed: true, summary: '   ' })).toBeNull();
  });

  it('returns the summary only for a real protocol delta', () => {
    expect(
      protocolChangeLine({
        changed: true,
        summary: 'Methylfolate replaced folic acid on the protocol.',
      }),
    ).toBe('Methylfolate replaced folic acid on the protocol.');
  });
});
