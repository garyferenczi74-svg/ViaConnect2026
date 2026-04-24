// Prompt #125 P1: Marshall Scheduler Bridge shared types.
//
// One normalized draft shape + one event shape across all five schedulers.
// Adapters translate platform-specific payloads into these; business logic
// (receipt lookup, composite decision, interception, notification) consumes
// only these types.

export const SCHEDULER_PLATFORMS = [
  'buffer',
  'hootsuite',
  'later',
  'sprout_social',
  'planoly',
] as const;
export type SchedulerPlatform = (typeof SCHEDULER_PLATFORMS)[number];

export const SCHEDULER_COVERAGE_LEVELS = ['full', 'notify_only', 'polling_fallback'] as const;
export type SchedulerCoverageLevel = (typeof SCHEDULER_COVERAGE_LEVELS)[number];

export const SCHEDULER_COVERAGE_BY_PLATFORM: Record<SchedulerPlatform, SchedulerCoverageLevel> = {
  buffer: 'full',
  hootsuite: 'full',
  later: 'polling_fallback',
  sprout_social: 'full',
  planoly: 'notify_only',
};

// ─── Draft ────────────────────────────────────────────────────────────────

export interface SchedulerMediaAttachment {
  kind: 'image' | 'video';
  storageUrl: string;
  altText?: string;
}

export interface SchedulerDraft {
  source: SchedulerPlatform;
  externalId: string;
  practitionerId: string;
  connectionId: string;
  targetPlatforms: string[];
  scheduledAt: string;
  captionText: string;
  hashtags: string[];
  mentionHandles: string[];
  mediaAttachments: SchedulerMediaAttachment[];
  editedAt: string;
  /**
   * Cross-surface content hash. By invariant, the hash of the same caption
   * text on the extension pre-check (#121) and the scheduler bridge (#125)
   * is byte-identical so a clearance receipt issued on either surface
   * resolves on the other. Implementation delegates to the #121 normalizer.
   */
  contentHashSha256: string;
  ingestedAt: string;
  rawPayload: unknown;
}

// ─── Events (webhook + poll ingress) ──────────────────────────────────────

export const SCHEDULER_EVENT_TYPES = [
  'post.created',
  'post.updated',
  'post.ready',
  'post.published',
  'post.rejected',
  'post.deleted',
  'poll.tick',
] as const;
export type SchedulerEventType = (typeof SCHEDULER_EVENT_TYPES)[number];

export interface SchedulerEvent {
  platform: SchedulerPlatform;
  externalEventId: string;
  eventType: SchedulerEventType;
  connectionId?: string;
  externalPostId?: string;
  receivedAt: string;
  rawPayload: unknown;
}

// ─── Composite decision ───────────────────────────────────────────────────

export const SCHEDULER_DECISIONS = [
  'clean',
  'findings_surfaced',
  'blocked',
  'fail_closed',
  'override_accepted',
] as const;
export type SchedulerDecision = (typeof SCHEDULER_DECISIONS)[number];

export interface FindingsSummary {
  total: number;
  bySeverity: Record<'P0' | 'P1' | 'P2' | 'P3' | 'P4', number>;
  ruleIds: string[];
}

export interface CompositeDecision {
  decision: SchedulerDecision;
  reason?: string;
  findingsSummary?: FindingsSummary;
  receiptReusedId?: string | null;
  receiptIssuedId?: string | null;
  visionDeterminationId?: string | null;
  precheckSessionId?: string | null;
  ruleRegistryVersion: string;
  interceptionAttempted: boolean;
}

// ─── Interception ─────────────────────────────────────────────────────────

export const INTERCEPTION_MECHANISMS = [
  'buffer_draft_status',
  'hootsuite_approval_reject',
  'later_reschedule',
  'sprout_approval_reject',
  'planoly_notify_only',
  'manual_block_note',
] as const;
export type InterceptionMechanism = (typeof INTERCEPTION_MECHANISMS)[number];

export interface InterceptionResult {
  mechanism: InterceptionMechanism;
  succeeded: boolean;
  platformResponse?: unknown;
  errorMessage?: string;
}

// ─── Connection ───────────────────────────────────────────────────────────

export const DISCONNECT_REASONS = [
  'user_requested',
  'scope_reduction',
  'token_revoked',
  'platform_error',
  'admin_action',
] as const;
export type DisconnectReason = (typeof DISCONNECT_REASONS)[number];

export interface SchedulerConnection {
  id: string;
  practitionerId: string;
  platform: SchedulerPlatform;
  externalAccountId: string;
  externalAccountLabel: string | null;
  scopesGranted: string[];
  tokenVaultRef: string;
  active: boolean;
  connectedAt: string;
  lastVerifiedAt: string | null;
  lastEventAt: string | null;
}

// ─── Escalation timeline ──────────────────────────────────────────────────
//
// Times measured backwards from the scheduled publish time T.

export const ESCALATION_STAGES = [
  { key: 't_minus_60m', offsetMinutes: -60, channel: 'email_portal' as const },
  { key: 't_minus_30m', offsetMinutes: -30, channel: 'email_portal_sms' as const },
  { key: 't_minus_10m', offsetMinutes: -10, channel: 'steve_rica_queue' as const },
  { key: 't_minus_5m',  offsetMinutes: -5,  channel: 'intercept' as const },
] as const;
export type EscalationStageKey = (typeof ESCALATION_STAGES)[number]['key'];
