// Prompt #101 audit remediation: coverage for pill precedence.

import { describe, it, expect } from 'vitest';
import {
  MAP_PILL_PRECEDENCE,
  resolveHigherPriorityPill,
  type MAPPillState,
} from '@/lib/map/types';

const ORDER: readonly MAPPillState[] = [
  'exempt',
  'critical',
  'violation',
  'warning',
  'waived',
  'vip_exempt',
  'monitored',
  'compliant',
];

describe('MAP_PILL_PRECEDENCE', () => {
  it('has a score for every pill state', () => {
    for (const state of ORDER) {
      expect(MAP_PILL_PRECEDENCE[state]).toBeGreaterThan(0);
    }
  });

  it('ordering matches Prompt #101 §5.6 + §6.6', () => {
    for (let i = 0; i < ORDER.length - 1; i += 1) {
      const higher = ORDER[i]!;
      const lower = ORDER[i + 1]!;
      expect(MAP_PILL_PRECEDENCE[higher]).toBeGreaterThan(
        MAP_PILL_PRECEDENCE[lower],
      );
    }
  });

  it('exempt is the top priority (L3/L4 always wins)', () => {
    for (const state of ORDER) {
      if (state === 'exempt') continue;
      expect(MAP_PILL_PRECEDENCE.exempt).toBeGreaterThan(MAP_PILL_PRECEDENCE[state]);
    }
  });

  it('compliant is the lowest priority', () => {
    for (const state of ORDER) {
      if (state === 'compliant') continue;
      expect(MAP_PILL_PRECEDENCE.compliant).toBeLessThan(MAP_PILL_PRECEDENCE[state]);
    }
  });
});

describe('resolveHigherPriorityPill', () => {
  it('is reflexive: same pill wins against itself', () => {
    for (const state of ORDER) {
      expect(resolveHigherPriorityPill(state, state)).toBe(state);
    }
  });

  it('exempt beats every other pill regardless of order', () => {
    for (const state of ORDER) {
      if (state === 'exempt') continue;
      expect(resolveHigherPriorityPill('exempt', state)).toBe('exempt');
      expect(resolveHigherPriorityPill(state, 'exempt')).toBe('exempt');
    }
  });

  it('critical beats violation/warning/waived/vip_exempt/monitored/compliant', () => {
    for (const state of ORDER) {
      if (state === 'exempt' || state === 'critical') continue;
      expect(resolveHigherPriorityPill('critical', state)).toBe('critical');
    }
  });

  it('waived beats vip_exempt but loses to violation', () => {
    expect(resolveHigherPriorityPill('waived', 'vip_exempt')).toBe('waived');
    expect(resolveHigherPriorityPill('waived', 'violation')).toBe('violation');
  });

  it('vip_exempt beats monitored + compliant', () => {
    expect(resolveHigherPriorityPill('vip_exempt', 'monitored')).toBe('vip_exempt');
    expect(resolveHigherPriorityPill('vip_exempt', 'compliant')).toBe('vip_exempt');
  });

  it('exhaustively: for every unordered pair, the higher-precedence wins', () => {
    for (let i = 0; i < ORDER.length; i += 1) {
      for (let j = 0; j < ORDER.length; j += 1) {
        const a = ORDER[i]!;
        const b = ORDER[j]!;
        const expected = MAP_PILL_PRECEDENCE[a] >= MAP_PILL_PRECEDENCE[b] ? a : b;
        expect(resolveHigherPriorityPill(a, b)).toBe(expected);
      }
    }
  });
});
