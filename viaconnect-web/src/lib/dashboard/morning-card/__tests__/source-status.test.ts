import { describe, it, expect } from 'vitest';
import {
  classifySourceStatus,
  sourceStatusFromDisagreement,
  sourceStatusUntilBrief12,
  MORNING_SOURCE_STATUSES,
} from '../source-status';

describe('morning-card sourceStatus', () => {
  it('is the pending | named | disagree triad', () => {
    expect([...MORNING_SOURCE_STATUSES]).toEqual(['pending', 'named', 'disagree']);
  });

  it('stays pending until Brief 12 honest sync', () => {
    expect(sourceStatusUntilBrief12()).toBe('pending');
  });

  it('classifies missing sources as pending', () => {
    expect(
      classifySourceStatus({ hasNamedSource: false, devicesDisagree: false }),
    ).toBe('pending');
    expect(
      classifySourceStatus({ hasNamedSource: false, devicesDisagree: true }),
    ).toBe('pending');
  });

  it('classifies a named source without disagreement as named', () => {
    expect(
      classifySourceStatus({ hasNamedSource: true, devicesDisagree: false }),
    ).toBe('named');
  });

  it('classifies named sources that disagree as disagree', () => {
    expect(
      classifySourceStatus({ hasNamedSource: true, devicesDisagree: true }),
    ).toBe('disagree');
  });

  it('maps Brief 4 disagreement kinds onto the triad', () => {
    expect(sourceStatusFromDisagreement('pending')).toBe('pending');
    expect(sourceStatusFromDisagreement('single')).toBe('named');
    expect(sourceStatusFromDisagreement('agree')).toBe('named');
    expect(sourceStatusFromDisagreement('manual')).toBe('named');
    expect(sourceStatusFromDisagreement('winner')).toBe('disagree');
    expect(sourceStatusFromDisagreement('equal_trust_average')).toBe('disagree');
  });
});
