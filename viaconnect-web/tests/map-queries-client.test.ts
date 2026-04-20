// Prompt #100 audit remediation: coverage for the pure helper
// exported by queries-client. The async loader functions are exercised
// in e2e; the pill-state mapper is branchy, so every path gets a test.

import { describe, it, expect } from 'vitest';
import { severityToPillState } from '@/lib/map/queries-client';

describe('severityToPillState', () => {
  it('remediated status short-circuits to compliant regardless of severity', () => {
    expect(severityToPillState('black', 'remediated')).toBe('compliant');
    expect(severityToPillState('red', 'remediated')).toBe('compliant');
  });

  it('dismissed status short-circuits to compliant', () => {
    expect(severityToPillState('orange', 'dismissed')).toBe('compliant');
  });

  it('yellow severity maps to monitored', () => {
    expect(severityToPillState('yellow', 'active')).toBe('monitored');
  });

  it('orange severity maps to warning', () => {
    expect(severityToPillState('orange', 'active')).toBe('warning');
  });

  it('red severity maps to violation', () => {
    expect(severityToPillState('red', 'notified')).toBe('violation');
  });

  it('black severity maps to critical', () => {
    expect(severityToPillState('black', 'notified')).toBe('critical');
  });

  it('unknown severity falls through to compliant', () => {
    expect(severityToPillState('purple', 'active')).toBe('compliant');
  });
});
