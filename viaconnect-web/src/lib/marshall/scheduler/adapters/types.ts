// Prompt #125 P1: Scheduler adapter interface.
//
// One adapter per platform (buffer.ts, hootsuite.ts, later.ts, sprout.ts,
// planoly.ts). Each implements the interface below and contains NO business
// logic: protocol translation only. The orchestrator, receipt lookup,
// interception dispatcher, and notification layer remain platform-agnostic.

import type {
  InterceptionResult,
  SchedulerDraft,
  SchedulerEvent,
  SchedulerPlatform,
} from '../types';

export interface WebhookVerificationInput {
  rawBody: Buffer;
  headers: Headers;
  /** Signing secret fetched from Vault by the caller (never from env at call site). */
  signingSecret: string;
}

export interface DraftFetchInput {
  connectionId: string;
  externalPostId: string;
  /** Access token materialized from Vault by the caller. Adapters never read Vault directly. */
  accessToken: string;
}

export interface InterceptionInput {
  connectionId: string;
  externalPostId: string;
  accessToken: string;
  reason: string;
}

export interface RevokeTokenInput {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Adapters are stateless. Every call receives a freshly materialized access
 * token; adapters MUST NOT cache tokens across calls. Any error should be
 * thrown so the caller can route it through the fail-closed path.
 */
export interface SchedulerAdapter {
  readonly platform: SchedulerPlatform;

  /**
   * Verify a webhook delivery. Constant-time comparison required. Returns
   * true only if the signature cleanly matches the raw body under the
   * shared secret.
   */
  verifyWebhookSignature(input: WebhookVerificationInput): boolean;

  /**
   * Parse a verified webhook payload into the normalized SchedulerEvent.
   * Throw if the payload structure is unrecognizable.
   */
  parseWebhookEvent(rawBody: Buffer, headers: Headers): SchedulerEvent;

  /**
   * Fetch the full draft content for a post by platform-side id. Used both
   * on webhook ingress (to get caption + media) and on poll tick for
   * platforms without webhooks.
   */
  fetchDraftContent(input: DraftFetchInput): Promise<SchedulerDraft>;

  /**
   * Attempt to hold / reschedule / reject the given post so it does not
   * publish. Mechanism is per-platform (see InterceptionMechanism union).
   * Must not throw; returns InterceptionResult with succeeded=false on
   * platform-side failure so the caller can fall back to notification.
   */
  attemptInterception(input: InterceptionInput): Promise<InterceptionResult>;

  /**
   * Revoke the OAuth token on the platform side. Best effort: log and
   * proceed with local disconnect even if the platform rejects.
   */
  revokeOAuthToken(input: RevokeTokenInput): Promise<void>;
}
