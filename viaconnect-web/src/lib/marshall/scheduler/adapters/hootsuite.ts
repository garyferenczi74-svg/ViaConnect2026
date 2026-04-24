// Prompt #125 P6: Hootsuite adapter.
//
// Hootsuite Platform API circa 2024:
//   Base URL:    https://platform.hootsuite.com/v1
//   OAuth:       https://platform.hootsuite.com/oauth2/auth
//                https://platform.hootsuite.com/oauth2/token
//   Webhook sig: HMAC-SHA256 of the raw body with the shared secret,
//                hex in `x-hootsuite-signature` header.
//
// Interception mechanism per §4.2: Enterprise-tier organizations use
// Approval Workflows. The bridge registers as an approver; on
// message.scheduled it evaluates the draft and either approves or
// rejects pending compliance. Non-Enterprise tiers degrade to
// notify-only (interception returns succeeded=false with a clear
// error string so the orchestrator routes to notification).

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

const BASE_URL = 'https://platform.hootsuite.com/v1';

const HOOTSUITE_EVENT_MAP: Record<string, SchedulerEventType | undefined> = {
  'message.created':   'post.created',
  'message.updated':   'post.updated',
  'message.scheduled': 'post.ready',
  'message.published': 'post.published',
  'message.rejected':  'post.rejected',
  'message.deleted':   'post.deleted',
};

interface HootsuiteMessage {
  id: string;
  text?: string;
  body?: string;
  scheduledSendTime?: string; // ISO 8601
  createdDate?: string;
  updatedDate?: string;
  socialProfileIds?: string[];
  socialNetwork?: string;
  media?: Array<{ id?: string; thumbnailUrl?: string; url?: string; mimeType?: string }>;
  state?: string;
}

interface HootsuiteWebhookEnvelope {
  event?: string;
  eventType?: string;
  deliveryId?: string;
  data?: {
    message?: HootsuiteMessage;
    messageId?: string;
  };
  message?: HootsuiteMessage;
}

export function hootsuiteAdapter(fetchImpl: typeof fetch = fetch): SchedulerAdapter {
  return {
    platform: 'hootsuite',

    verifyWebhookSignature(input: WebhookVerificationInput): boolean {
      const signature =
        input.headers.get('x-hootsuite-signature')
        ?? input.headers.get('X-Hootsuite-Signature');
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
      let envelope: HootsuiteWebhookEnvelope;
      try {
        envelope = JSON.parse(rawBody.toString('utf8')) as HootsuiteWebhookEnvelope;
      } catch {
        throw new Error('hootsuite_webhook_json_invalid');
      }
      const eventKey = envelope.event ?? envelope.eventType;
      const mappedEventType = eventKey ? HOOTSUITE_EVENT_MAP[eventKey] : undefined;
      if (!mappedEventType) {
        throw new Error(`hootsuite_webhook_unsupported_event:${eventKey ?? 'undefined'}`);
      }
      const message = envelope.data?.message ?? envelope.message;
      const externalPostId = message?.id ?? envelope.data?.messageId;
      const externalEventId =
        envelope.deliveryId
        ?? headers.get('x-hootsuite-delivery-id')
        ?? `${eventKey}:${externalPostId ?? 'no-id'}:${Date.now()}`;

      return {
        platform: 'hootsuite',
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
        schedulerLogger.warn('[hootsuite] fetchDraftContent non-2xx', {
          status: res.status,
          externalPostId: input.externalPostId,
        });
        throw new Error(`hootsuite_fetch_message_failed:${res.status}`);
      }
      const message = (await res.json()) as HootsuiteMessage;
      const captionText = message.text ?? message.body ?? '';
      const scheduledAt = message.scheduledSendTime ?? new Date().toISOString();
      const editedAt = message.updatedDate ?? message.createdDate ?? scheduledAt;
      const hashtags = extractHashtags(captionText);
      const mentionHandles = extractMentions(captionText);
      const mediaImages = (message.media ?? [])
        .filter((m) => (m.mimeType ?? '').startsWith('image') || m.thumbnailUrl)
        .map((m) => ({
          kind: 'image' as const,
          storageUrl: m.url ?? m.thumbnailUrl ?? '',
        }))
        .filter((m) => m.storageUrl);
      return buildSchedulerDraft({
        source: 'hootsuite',
        externalId: message.id,
        practitionerId: '',
        connectionId: input.connectionId,
        targetPlatforms: message.socialNetwork
          ? [message.socialNetwork]
          : message.socialProfileIds ?? [],
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
      // Hootsuite Approval Workflow: POST a rejection on the message
      // with a compliance comment. On Enterprise-tier accounts this
      // holds the message indefinitely pending re-approval. On non-
      // Enterprise tiers the endpoint 403s; we bubble the status so
      // the orchestrator routes to notification.
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
            comment: withCompliancePrefix(input.reason),
          }),
        });
        const platformResponse = await safeReadJson(res);
        if (!res.ok) {
          return {
            mechanism: 'hootsuite_approval_reject',
            succeeded: false,
            platformResponse,
            errorMessage: `hootsuite_reject_non_2xx:${res.status}`,
          };
        }
        return {
          mechanism: 'hootsuite_approval_reject',
          succeeded: true,
          platformResponse,
        };
      } catch (err) {
        return {
          mechanism: 'hootsuite_approval_reject',
          succeeded: false,
          errorMessage: `hootsuite_reject_exception:${(err as Error).message}`,
        };
      }
    },

    async revokeOAuthToken(input: RevokeTokenInput): Promise<void> {
      try {
        // Hootsuite's revoke endpoint; best effort, never throws.
        await fetchImpl('https://platform.hootsuite.com/oauth2/revoke', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body: new URLSearchParams({ token: input.accessToken }).toString(),
        });
      } catch (err) {
        schedulerLogger.warn('[hootsuite] revoke best-effort failure', {
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
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}
