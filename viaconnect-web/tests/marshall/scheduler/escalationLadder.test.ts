import { describe, it, expect } from 'vitest';
import { planEscalation } from '@/lib/marshall/scheduler/escalationLadder';

function at(offsetMin: number, scheduled = '2026-05-01T14:00:00Z'): Date {
  return new Date(new Date(scheduled).getTime() + offsetMin * 60_000);
}

const SCHEDULED = '2026-05-01T14:00:00Z';

describe('planEscalation — short-circuit paths', () => {
  it('CLEAN decision -> no actions, final', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-70),
      decision: 'clean',
      priorActions: [],
    });
    expect(plan.dueNow).toEqual([]);
    expect(plan.final).toBe(true);
  });

  it('OVERRIDE_ACCEPTED -> no actions', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-70),
      decision: 'override_accepted',
      priorActions: [],
    });
    expect(plan.dueNow).toEqual([]);
    expect(plan.final).toBe(true);
  });
});

describe('planEscalation — ladder firing', () => {
  it('T-70min: nothing due; next due at T-60m', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-70),
      decision: 'findings_surfaced',
      priorActions: [],
    });
    expect(plan.dueNow).toEqual([]);
    expect(plan.nextDueAt).toBeTruthy();
    expect(new Date(plan.nextDueAt!).getTime()).toBe(at(-60).getTime());
  });

  it('T-59min: notify_t60 due', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-59),
      decision: 'findings_surfaced',
      priorActions: [],
    });
    expect(plan.dueNow).toContain('notify_t60');
    expect(plan.dueNow).not.toContain('notify_t30');
  });

  it('T-31min with t60 already fired: only t60 waiting, t30 due at T-30', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-31),
      decision: 'blocked',
      priorActions: ['notify_t60'],
    });
    expect(plan.dueNow).toEqual([]);
    expect(new Date(plan.nextDueAt!).getTime()).toBe(at(-30).getTime());
  });

  it('T-4min: all 4 stages due if none prior; includes intercept', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-4),
      decision: 'blocked',
      priorActions: [],
    });
    expect(plan.dueNow).toEqual(['notify_t60', 'notify_t30', 'notify_t10_steve', 'intercept_t5']);
  });

  it('T-4min with all prior fired: nothing due, next due at scheduled', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-4),
      decision: 'blocked',
      priorActions: ['notify_t60', 'notify_t30', 'notify_t10_steve', 'intercept_t5'],
    });
    expect(plan.dueNow).toEqual([]);
    expect(new Date(plan.nextDueAt!).getTime()).toBe(at(0).getTime());
  });

  it('after scheduled time with no prior post_publish_noop: fires it', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(5),
      decision: 'blocked',
      priorActions: ['notify_t60', 'notify_t30', 'notify_t10_steve', 'intercept_t5'],
    });
    expect(plan.dueNow).toEqual(['post_publish_noop']);
    expect(plan.final).toBe(true);
  });

  it('after scheduled with post_publish_noop already: final, nothing due', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(5),
      decision: 'blocked',
      priorActions: ['notify_t60', 'notify_t30', 'notify_t10_steve', 'intercept_t5', 'post_publish_noop'],
    });
    expect(plan.dueNow).toEqual([]);
    expect(plan.final).toBe(true);
  });

  it('FAIL_CLOSED decision flows the ladder like BLOCKED', () => {
    const plan = planEscalation({
      scheduledAt: SCHEDULED,
      now: at(-4),
      decision: 'fail_closed',
      priorActions: [],
    });
    expect(plan.dueNow).toContain('intercept_t5');
  });
});
