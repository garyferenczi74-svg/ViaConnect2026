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

  it('yellow payload is a no-op (0% claw-back, no hold)', () => {
    const payload = buildClawbackEventPayload({
      violationId: 'v-3',
      practitionerId: 'p-3',
      productId: 'prod-3',
      severity: 'yellow',
    });
    expect(payload.clawbackPct).toBe(0);
    expect(payload.allSkuHold).toBe(false);
    expect(payload.holdDays).toBe(0);
  });

  it('orange payload is 25% with no hold', () => {
    const payload = buildClawbackEventPayload({
      violationId: 'v-4',
      practitionerId: 'p-4',
      productId: 'prod-4',
      severity: 'orange',
    });
    expect(payload.clawbackPct).toBe(25);
    expect(payload.allSkuHold).toBe(false);
    expect(payload.holdDays).toBe(0);
  });

  it('defaults emittedAt to now when not provided', () => {
    const before = Date.now();
    const payload = buildClawbackEventPayload({
      violationId: 'v-5',
      practitionerId: 'p-5',
      productId: 'prod-5',
      severity: 'red',
    });
    const after = Date.now();
    const emittedMs = new Date(payload.emittedAt).getTime();
    expect(emittedMs).toBeGreaterThanOrEqual(before);
    expect(emittedMs).toBeLessThanOrEqual(after);
  });
});
