import { describe, it, expect } from 'vitest';
import {
  canTransition,
  validateTransition,
  allowedNextStatuses,
  VALID_RECORDATION_TRANSITIONS,
} from '@/lib/customs/recordationStateMachine';

describe('recordationStateMachine — happy paths', () => {
  it('draft → pending_fee is permitted', () => {
    expect(canTransition({ from: 'draft', to: 'pending_fee' }).ok).toBe(true);
  });

  it('pending_fee → under_review is permitted', () => {
    expect(canTransition({ from: 'pending_fee', to: 'under_review' }).ok).toBe(true);
  });

  it('under_review → active is permitted', () => {
    expect(canTransition({ from: 'under_review', to: 'active' }).ok).toBe(true);
  });

  it('active → grace_period is permitted (CBP expiration reached)', () => {
    expect(canTransition({ from: 'active', to: 'grace_period' }).ok).toBe(true);
  });

  it('grace_period → active is permitted (renewal filed + fees paid)', () => {
    expect(canTransition({ from: 'grace_period', to: 'active' }).ok).toBe(true);
  });

  it('grace_period → expired is permitted (90 days lapse)', () => {
    expect(canTransition({ from: 'grace_period', to: 'expired' }).ok).toBe(true);
  });
});

describe('recordationStateMachine — rejections', () => {
  it('draft → active is rejected (must pass through pending_fee + under_review)', () => {
    const r = canTransition({ from: 'draft', to: 'active' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('transition_not_permitted');
  });

  it('active → draft is rejected (cannot regress)', () => {
    const r = canTransition({ from: 'active', to: 'draft' });
    expect(r.ok).toBe(false);
  });

  it('expired → active is rejected (re-application required)', () => {
    const r = canTransition({ from: 'expired', to: 'active' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('transition_not_permitted');
  });

  it('withdrawn is terminal', () => {
    expect(canTransition({ from: 'withdrawn', to: 'active' }).ok).toBe(false);
    expect(canTransition({ from: 'withdrawn', to: 'draft' }).ok).toBe(false);
    expect(allowedNextStatuses('withdrawn')).toHaveLength(0);
  });

  it('identical-state transition is rejected', () => {
    const r = canTransition({ from: 'active', to: 'active' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('identical_state');
  });
});

describe('recordationStateMachine — withdrawn-from-any-non-terminal', () => {
  it.each([
    ['draft'],
    ['pending_fee'],
    ['under_review'],
    ['active'],
    ['grace_period'],
    ['expired'],
  ] as const)('%s -> withdrawn is permitted', (from) => {
    expect(canTransition({ from, to: 'withdrawn' }).ok).toBe(true);
  });
});

describe('recordationStateMachine — helpers', () => {
  it('validateTransition throws on bad transition', () => {
    expect(() => validateTransition({ from: 'draft', to: 'active' })).toThrow();
  });

  it('allowedNextStatuses returns the right set', () => {
    const fromGrace = allowedNextStatuses('grace_period');
    expect(fromGrace).toContain('active');
    expect(fromGrace).toContain('expired');
    expect(fromGrace).toContain('withdrawn');
    expect(fromGrace).toHaveLength(3);
  });

  it('all 7 statuses are represented as keys in the transition map', () => {
    const keys = Array.from(VALID_RECORDATION_TRANSITIONS.keys());
    expect(keys.sort()).toEqual(
      ['active', 'draft', 'expired', 'grace_period', 'pending_fee', 'under_review', 'withdrawn'].sort(),
    );
  });
});
