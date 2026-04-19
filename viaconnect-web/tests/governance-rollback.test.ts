// Prompt #95 Phase 6: pure tests for rollback eligibility.

import { describe, it, expect } from 'vitest';
import { checkRollbackEligibility } from '@/lib/governance/rollback';

const NOW = new Date('2026-05-15T12:00:00.000Z');

describe('checkRollbackEligibility', () => {
  it('rejects non-activated status', () => {
    const r = checkRollbackEligibility({
      status: 'draft',
      activatedAt: null,
      now: NOW,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain('activated status');
  });

  it('rejects submitted_for_approval', () => {
    const r = checkRollbackEligibility({
      status: 'submitted_for_approval',
      activatedAt: null,
      now: NOW,
    });
    expect(r.eligible).toBe(false);
  });

  it('rejects activated with null activated_at (bad data)', () => {
    const r = checkRollbackEligibility({
      status: 'activated',
      activatedAt: null,
      now: NOW,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain('activated_at');
  });

  it('allows rollback within 24 hours (instant window)', () => {
    const recentActivation = new Date(NOW.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    const r = checkRollbackEligibility({
      status: 'activated',
      activatedAt: recentActivation,
      now: NOW,
    });
    expect(r.eligible).toBe(true);
    expect(r.isInstantWindow).toBe(true);
    expect(r.daysSinceActivation).toBeCloseTo(2 / 24, 3);
  });

  it('allows rollback after 24 hours but within 30 days', () => {
    const daysAgo = new Date(NOW.getTime() - 10 * 86_400_000);
    const r = checkRollbackEligibility({
      status: 'activated',
      activatedAt: daysAgo,
      now: NOW,
    });
    expect(r.eligible).toBe(true);
    expect(r.isInstantWindow).toBe(false);
    expect(r.daysSinceActivation).toBeCloseTo(10, 1);
    expect(r.requiresNewProposal).toBe(false);
  });

  it('allows rollback at exactly 24 hours (boundary strict <)', () => {
    const exactly24h = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    const r = checkRollbackEligibility({
      status: 'activated',
      activatedAt: exactly24h,
      now: NOW,
    });
    expect(r.eligible).toBe(true);
    expect(r.isInstantWindow).toBe(false);
  });

  it('rejects rollback beyond 30 days', () => {
    const longAgo = new Date(NOW.getTime() - 31 * 86_400_000);
    const r = checkRollbackEligibility({
      status: 'activated',
      activatedAt: longAgo,
      now: NOW,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain('30 days');
    expect(r.requiresNewProposal).toBe(true);
  });

  it('allows rollback at exactly 30 days (boundary)', () => {
    const exactly30d = new Date(NOW.getTime() - 30 * 86_400_000);
    const r = checkRollbackEligibility({
      status: 'activated',
      activatedAt: exactly30d,
      now: NOW,
    });
    expect(r.eligible).toBe(true);
  });

  it('rejects rollback from terminal states', () => {
    for (const status of ['rolled_back', 'rejected', 'withdrawn', 'expired'] as const) {
      const r = checkRollbackEligibility({
        status,
        activatedAt: new Date(NOW.getTime() - 86_400_000),
        now: NOW,
      });
      expect(r.eligible).toBe(false);
    }
  });

  it('reports daysSinceActivation accurately for sub-day durations', () => {
    const twelveHoursAgo = new Date(NOW.getTime() - 12 * 60 * 60 * 1000);
    const r = checkRollbackEligibility({
      status: 'activated',
      activatedAt: twelveHoursAgo,
      now: NOW,
    });
    expect(r.daysSinceActivation).toBeCloseTo(0.5, 3);
  });
});
