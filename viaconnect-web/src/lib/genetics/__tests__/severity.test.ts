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

  it('makes the active pill a dark fill with a tier border and white text (204i blank fix)', () => {
    // A solid tier fill washed the label out; the readable active state is a dark
    // navy surface, a tier-colored border + glow, and white text.
    for (const tier of TIERS) {
      const pill = severityToken(tier).pillActive;
      expect(pill).toContain('bg-[#1A2744]'); // dark navy fill, not a light fill
      expect(pill).toContain('text-white'); // legible label
      expect(pill).toContain(`border-[rgb(var(--severity-${tier}))]`); // tier outline
    }
  });

  it('uses the spaced CSS Color 4 alpha form so the translucent values are valid', () => {
    // rgb(R G B / A) via the "_/_" arbitrary-value form, not an ambiguous slash.
    expect(severityToken('high').badge).toContain('rgb(var(--severity-high)_/_0.15)');
  });

  it('the accent is a left edge', () => {
    expect(severityToken('high').accent).toContain('border-l-2');
  });

  it('exposes a translucent row glass tint per tier, stronger for the matched row (204k)', () => {
    for (const tier of TIERS) {
      const token = severityToken(tier);
      // Both glass fills read the tier token, at a low alpha for the resting row
      // and a higher alpha for the matched row.
      expect(token.rowGlass).toContain(`bg-[rgb(var(--severity-${tier})_/_0.10)]`);
      expect(token.rowGlassMatched).toContain(`bg-[rgb(var(--severity-${tier})_/_0.20)]`);
      // The matched mobile card border is the tier token too.
      expect(token.matchedBorder).toContain(`var(--severity-${tier})`);
    }
  });

  it('never uses a brand token or inline traffic-light hex for severity color', () => {
    for (const tier of TIERS) {
      const t = severityToken(tier);
      const all = `${t.badge} ${t.pillActive} ${t.accent} ${t.rowGlass} ${t.rowGlassMatched} ${t.matchedBorder}`;
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
