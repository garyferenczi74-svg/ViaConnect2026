// Prompt #125 P2: Practitioner notification orchestration.
//
// Thin wrapper over the existing emitPractitionerNotificationEvent
// pipeline. Scheduler-specific event codes let the dispatcher route to
// the right templates; context_data carries the scan id + platform +
// scheduled time + finding counts so the template can render without
// a follow-up DB call.

import { emitPractitionerNotificationEvent } from '@/lib/notifications/emit';
import type { CompositeDecision, SchedulerPlatform } from './types';

export type NotifyEventCode =
  | 'marshall.scheduler.findings_surfaced'
  | 'marshall.scheduler.block_risk_t60'
  | 'marshall.scheduler.block_risk_t30'
  | 'marshall.scheduler.block_risk_t10_steve'
  | 'marshall.scheduler.blocked'
  | 'marshall.scheduler.fail_closed'
  | 'marshall.scheduler.override_signed'
  | 'marshall.scheduler.token_expired'
  | 'marshall.scheduler.clean';

export interface NotifyInput {
  eventCode: NotifyEventCode;
  practitionerId?: string;
  legalOps?: boolean;
  scanId: string;
  platform: SchedulerPlatform;
  externalPostId: string;
  scheduledAt: string;
  decision: CompositeDecision['decision'];
  findingsCount?: number;
  bySeverity?: Record<string, number>;
  reason?: string;
  /** Optional inbox_id passthrough for tests. */
  priority?: 'urgent' | 'high' | 'normal' | 'low';
}

const EVENT_PRIORITY: Record<NotifyEventCode, 'urgent' | 'high' | 'normal' | 'low'> = {
  'marshall.scheduler.findings_surfaced': 'high',
  'marshall.scheduler.block_risk_t60': 'high',
  'marshall.scheduler.block_risk_t30': 'urgent',
  'marshall.scheduler.block_risk_t10_steve': 'urgent',
  'marshall.scheduler.blocked': 'urgent',
  'marshall.scheduler.fail_closed': 'urgent',
  'marshall.scheduler.override_signed': 'normal',
  'marshall.scheduler.token_expired': 'high',
  'marshall.scheduler.clean': 'low',
};

export async function notifyPractitioner(input: NotifyInput): Promise<string | null> {
  return emitPractitionerNotificationEvent(input.eventCode, {
    practitioner_id: input.practitionerId,
    legal_ops: input.legalOps ?? false,
    context_ref: `scheduler_scan:${input.scanId}`,
    context_data: {
      scan_id: input.scanId,
      platform: input.platform,
      external_post_id: input.externalPostId,
      scheduled_at: input.scheduledAt,
      decision: input.decision,
      findings_count: input.findingsCount ?? 0,
      by_severity: input.bySeverity ?? {},
      reason: input.reason ?? null,
    },
    priority_override: input.priority ?? EVENT_PRIORITY[input.eventCode],
    source_prompt: 'prompt_125_scheduler_bridge',
  });
}
