// Prompt #125 P8: Sprout Social adapter.
//
// Sprout Social API circa 2024:
//   Base URL:    https://api.sproutsocial.com/v1
//   OAuth:       https://api.sproutsocial.com/v1/oauth/authorize
//                https://api.sproutsocial.com/v1/oauth/token
//   Webhook sig: HMAC-SHA256 of the raw body with the shared secret,
//                hex in `x-sprout-signature` header. Premium tier.
//
// Interception per §4.4: Premium-tier organizations use Approval
// Workflows. On publishing.scheduled webhook, the bridge evaluates
// and either approves or rejects-pending-review. Non-Premium tiers
// degrade to notify-only (adapter returns succeeded=false on 403 so
// the orchestrator routes to notification).

import { createHmac, timingSafeEqual } from 'node:crypto';
import { schedulerLogger } from '../logging';
import { buildSchedulerDraft } from '../normalize';
import type {
  DraftFetchInput,
  InterceptionInput,
  RevokeTokenInput,
  SchedulerAdapter,
  WebhookVerificationInput,
} from './types';
import type {
  InterceptionResult,
  SchedulerDraft,
  SchedulerEvent,
  SchedulerEventType,
} from '../types';

const BASE_URL = 'https://api.sproutsocial.com/v1';

const SPROUT_EVENT_MAP: Record<string, SchedulerEventType | undefined> = {
  'publishing.created':   'post.created',
  'publishing.updated':   'post.updated',
  'publishing.scheduled': 'post.ready',
  'publishing.published': 'post.published',
  'publishing.rejected':  'post.rejected',
  'publishing.deleted':   'post.deleted',
};

interface SproutMessage {
  id: string;
  text?: string;
  content?: string;
  scheduled_time?: string; // ISO 8601
  updated_time?: string;
  created_time?: string;
  profile_id?: string;
  profile_ids?: string[];
  network?: string;
  media?: Array<{ url?: string; mime_type?: string; thumbnail_url?: string }>;
  state?: string;
}

interface SproutWebhookEnvelope {
  event?: string;
  delivery_id?: string;
  data?: {
    message?: SproutMessage;
    id?: string;
  };
  message?: SproutMessage;
}

export function sproutAdapter(fetchImpl: typeof fetch = fetch): SchedulerAdapter {
  return {
    platform: 'sprout_social',

    verifyWebhookSignature(input: WebhookVerificationInput): boolean {
      const signature = input.headers.get('x-sprout-signature') ?? input.headers.get('X-Sprout-Signature');
      if (!signature) return false;
      const expected = createHmac('sha256', input.signingSecret).update(input.rawBody).digest('hex');
      const given = signature.startsWith('sha256=') ? signature.slice(7) : signature;
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(given, 'hex');
      if (a.length !== b.length) return false;
      try {
        return timingSafeEqual(a, b);
      } catch {
        return false;
      }
    },

    parseWebhookEvent(rawBody: Buffer, headers: Headers): SchedulerEvent {
      let envelope: SproutWebhookEnvelope;
      try {
        envelope = JSON.parse(rawBody.toString('utf8')) as SproutWebhookEnvelope;
      } catch {
        throw new Error('sprout_webhook_json_invalid');
      }
      const eventKey = envelope.event;
      const mappedEventType = eventKey ? SPROUT_EVENT_MAP[eventKey] : undefined;
      if (!mappedEventType) {
        throw new Error(`sprout_webhook_unsupported_event:${eventKey ?? 'undefined'}`);
      }
      const message = envelope.data?.message ?? envelope.message;
      const externalPostId = message?.id ?? envelope.data?.id;
      const externalEventId =
        envelope.delivery_id
        ?? headers.get('x-sprout-delivery-id')
        ?? `${eventKey}:${externalPostId ?? 'no-id'}:${Date.now()}`;
      return {
        platform: 'sprout_social',
        externalEventId,
        eventType: mappedEventType,
        externalPostId,
        receivedAt: new Date().toISOString(),
        rawPayload: envelope,
      };
    },

    async fetchDraftContent(input: DraftFetchInput): Promise<SchedulerDraft> {
      const url = `${BASE_URL}/messages/${encodeURIComponent(input.externalPostId)}`;
      const res = await fetchImpl(url, {
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: 'application/json',
        },
      });
      if (!res.ok) {
        schedulerLogger.warn('[sprout] fetchDraftContent non-2xx', {
          status: res.status,
          externalPostId: input.externalPostId,
        });
        throw new Error(`sprout_fetch_message_failed:${res.status}`);
      }
      const message = (await res.json()) as SproutMessage;
      const captionText = message.text ?? message.content ?? '';
      const scheduledAt = message.scheduled_time ?? new Date().toISOString();
      const editedAt = message.updated_time ?? message.created_time ?? scheduledAt;
      const hashtags = extractHashtags(captionText);
      const mentionHandles = extractMentions(captionText);
      const mediaImages = (message.media ?? [])
        .filter((m) => (m.mime_type ?? '').startsWith('image') || m.thumbnail_url)
        .map((m) => ({
          kind: 'image' as const,
          storageUrl: m.url ?? m.thumbnail_url ?? '',
        }))
        .filter((m) => m.storageUrl);
      return buildSchedulerDraft({
        source: 'sprout_social',
        externalId: message.id,
        practitionerId: '',
        connectionId: input.connectionId,
        targetPlatforms: message.network
          ? [message.network]
          : message.profile_ids ?? (message.profile_id ? [message.profile_id] : []),
        scheduledAt,
        captionText,
        hashtags,
        mentionHandles,
        mediaAttachments: mediaImages,
        editedAt,
        rawPayload: message,
      });
    },

    async attemptInterception(input: InterceptionInput): Promise<InterceptionResult> {
      // Sprout Approval Workflow reject: POST /messages/{id}/reject.
      // Premium tier: message is held pending re-approval. Non-Premium
      // tier: endpoint 403s; we bubble status so the orchestrator
      // falls back to notification-only.
      const url = `${BASE_URL}/messages/${encodeURIComponent(input.externalPostId)}/reject`;
      try {
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            reason: withCompliancePrefix(input.reason),
            note: withCompliancePrefix(input.reason),
          }),
        });
        const platformResponse = await safeReadJson(res);
        if (!res.ok) {
          return {
            mechanism: 'sprout_approval_reject',
            succeeded: false,
            platformResponse,
            errorMessage: `sprout_reject_non_2xx:${res.status}`,
          };
        }
        return {
          mechanism: 'sprout_approval_reject',
          succeeded: true,
          platformResponse,
        };
      } catch (err) {
        return {
          mechanism: 'sprout_approval_reject',
          succeeded: false,
          errorMessage: `sprout_reject_exception:${(err as Error).message}`,
        };
      }
    },

    async revokeOAuthToken(input: RevokeTokenInput): Promise<void> {
      try {
        await fetchImpl(`${BASE_URL}/oauth/revoke`, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body: new URLSearchParams({ token: input.accessToken }).toString(),
        });
      } catch (err) {
        schedulerLogger.warn('[sprout] revoke best-effort failure', {
          error: (err as Error).message,
        });
      }
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[A-Za-z0-9_]{2,}/g) ?? [];
  return matches.map((m) => m.slice(1));
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@[A-Za-z0-9_.]{2,}/g) ?? [];
  return matches.map((m) => m.toLowerCase());
}

function withCompliancePrefix(reason: string): string {
  return `[ViaConnect Marshall hold: ${reason}] rejected pending compliance review.`;
}

async function safeReadJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try { return await res.text(); } catch { return null; }
  }
}
