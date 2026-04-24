// Prompt #125 P2: Escalation ladder state machine.
//
// Pure function over (scheduledAt, now, decision, priorActions). Returns
// the next action to fire. Caller is a cron worker that polls once per
// minute, matches current time against due actions, and fires them.
//
// Timeline per §4.6:
//   T-60m: block-risk first warning      (email + portal)
//   T-30m: block-risk second warning     (email + portal + SMS if opt-in)
//   T-10m: Steve Rica queue escalation   (email + Slack + queue)
//   T-5m:  platform interception attempt (adapter attemptInterception)

import type { SchedulerDecision } from './types';

export const ESCALATION_ACTIONS = [
  'notify_t60',
  'notify_t30',
  'notify_t10_steve',
  'intercept_t5',
  'post_publish_noop',
] as const;
export type EscalationAction = (typeof ESCALATION_ACTIONS)[number];

export interface EscalationStateInput {
  scheduledAt: string;
  now: Date;
  decision: SchedulerDecision;
  priorActions: readonly EscalationAction[];
}

export interface EscalationPlan {
  dueNow: EscalationAction[];
  nextDueAt: string | null; // ISO time the caller should re-evaluate
  final: boolean;
}

const OFFSETS_MS: Record<Exclude<EscalationAction, 'post_publish_noop'>, number> = {
  notify_t60: 60 * 60 * 1000,
  notify_t30: 30 * 60 * 1000,
  notify_t10_steve: 10 * 60 * 1000,
  intercept_t5: 5 * 60 * 1000,
};

const ORDERED_ACTIONS: Array<Exclude<EscalationAction, 'post_publish_noop'>> = [
  'notify_t60',
  'notify_t30',
  'notify_t10_steve',
  'intercept_t5',
];

/**
 * Only SURFACE/BLOCK/FAIL_CLOSED decisions feed the ladder. CLEAN and
 * OVERRIDE_ACCEPTED short-circuit with no actions.
 */
export function planEscalation(input: EscalationStateInput): EscalationPlan {
  if (input.decision === 'clean' || input.decision === 'override_accepted') {
    return { dueNow: [], nextDueAt: null, final: true };
  }

  const scheduled = new Date(input.scheduledAt).getTime();
  const nowMs = input.now.getTime();

  // Post has already published with no intercept possibility.
  if (nowMs >= scheduled) {
    const already = new Set(input.priorActions);
    if (already.has('post_publish_noop')) {
      return { dueNow: [], nextDueAt: null, final: true };
    }
    return { dueNow: ['post_publish_noop'], nextDueAt: null, final: true };
  }

  const dueNow: EscalationAction[] = [];
  const already = new Set(input.priorActions);

  for (const action of ORDERED_ACTIONS) {
    const fireAt = scheduled - OFFSETS_MS[action];
    if (nowMs >= fireAt && !already.has(action)) {
      dueNow.push(action);
    }
  }

  // Next due: the earliest action not yet fired and not yet due.
  let nextDueMs: number | null = null;
  for (const action of ORDERED_ACTIONS) {
    if (already.has(action) || dueNow.includes(action)) continue;
    const fireAt = scheduled - OFFSETS_MS[action];
    if (fireAt > nowMs) {
      nextDueMs = fireAt;
      break;
    }
  }
  if (nextDueMs == null) {
    nextDueMs = scheduled;
  }

  const allFired = ORDERED_ACTIONS.every((a) => already.has(a) || dueNow.includes(a));
  return {
    dueNow,
    nextDueAt: new Date(nextDueMs).toISOString(),
    final: allFired && nowMs >= scheduled,
  };
}
