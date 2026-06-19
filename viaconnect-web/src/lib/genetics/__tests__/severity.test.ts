// Prompt 204g (2026-06-19): tests for the severity color single source of truth.
// They lock that every tier reads its color from its own --severity-* token (not
// a brand token, not inline traffic-light hex), that the activated pill uses Deep
// Navy text on the solid fill, and that the labels are uppercase.

import { describe, it, expect } from 'vitest';
import { severityToken, severityLabel, type SeverityTier } from '../severity';

const TIERS: SeverityTier[] = ['high', 'moderate', 'low'];

describe('severityToken', () => {
  it('reads each tier color from its own --severity-* token', () => {
    for (const tier of TIERS) {
      const token = severityToken(tier);
      expect(token.badge).toContain(`var(--severity-${tier})`);
      expect(token.pillActive).toContain(`var(--severity-${tier})`);
      expect(token.accent).toContain(`var(--severity-${tier})`);
    }
  });

  it('puts Deep Navy text on the solid activated pill (WCAG AA on each fill)', () => {
    for (const tier of TIERS) {
      expect(severityToken(tier).pillActive).toContain('text-[#1A2744]');
    }
  });

  it('the accent is a left edge', () => {
    expect(severityToken('high').accent).toContain('border-l-2');
  });

  it('never uses a brand token or inline traffic-light hex for severity color', () => {
    for (const tier of TIERS) {
      const all = `${severityToken(tier).badge} ${severityToken(tier).pillActive} ${severityToken(tier).accent}`;
      expect(all).not.toContain('#2DA5A0'); // teal brand
      expect(all).not.toContain('#B75E18'); // orange brand
      // The traffic-light hex lives ONLY in globals.css, never in a class string.
      expect(all).not.toContain('#F87171');
      expect(all).not.toContain('#FBBF24');
      expect(all).not.toContain('#4ADE80');
    }
  });
});

describe('severityLabel', () => {
  it('is the uppercase tier name', () => {
    expect(severityLabel('high')).toBe('HIGH');
    expect(severityLabel('moderate')).toBe('MODERATE');
    expect(severityLabel('low')).toBe('LOW');
  });
});
