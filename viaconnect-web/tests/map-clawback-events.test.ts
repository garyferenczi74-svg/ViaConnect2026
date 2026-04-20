// Prompt #100 — commission claw-back event shape tests.

import { describe, it, expect } from 'vitest';
import {
  buildClawbackEventPayload,
  clawbackPolicyFor,
  isNoOpClawback,
} from '@/lib/map/clawback-events';

describe('clawbackPolicyFor', () => {
  it('yellow is a no-op', () => {
    expect(clawbackPolicyFor('yellow')).toEqual({ clawbackPct: 0, allSkuHold: false, holdDays: 0 });
  });
  it('orange is 25%', () => {
    expect(clawbackPolicyFor('orange')).toEqual({ clawbackPct: 25, allSkuHold: false, holdDays: 0 });
  });
  it('red is 50%', () => {
    expect(clawbackPolicyFor('red')).toEqual({ clawbackPct: 50, allSkuHold: false, holdDays: 0 });
  });
  it('black is 100% plus 30-day all-SKU hold', () => {
    expect(clawbackPolicyFor('black')).toEqual({ clawbackPct: 100, allSkuHold: true, holdDays: 30 });
  });
});

describe('isNoOpClawback', () => {
  it('only yellow is a no-op', () => {
    expect(isNoOpClawback('yellow')).toBe(true);
    expect(isNoOpClawback('orange')).toBe(false);
    expect(isNoOpClawback('red')).toBe(false);
    expect(isNoOpClawback('black')).toBe(false);
  });
});

describe('buildClawbackEventPayload', () => {
  it('carries violation + practitioner + severity + derived policy', () => {
    const now = new Date('2026-04-20T12:00:00Z');
    const payload = buildClawbackEventPayload({
      violationId: 'v-1',
      practitionerId: 'p-1',
      productId: 'prod-1',
      severity: 'red',
      now,
    });
    expect(payload).toEqual({
      violationId: 'v-1',
      practitionerId: 'p-1',
      productId: 'prod-1',
      severity: 'red',
      clawbackPct: 50,
      allSkuHold: false,
      holdDays: 0,
      emittedAt: '2026-04-20T12:00:00.000Z',
    });
  });

  it('black payload includes all-SKU hold for 30 days', () => {
    const payload = buildClawbackEventPayload({
      violationId: 'v-2',
      practitionerId: 'p-2',
      productId: 'prod-2',
      severity: 'black',
    });
    expect(payload.allSkuHold).toBe(true);
    expect(payload.holdDays).toBe(30);
    expect(payload.clawbackPct).toBe(100);
  });
});
