// Prompt #125 P3: Buffer adapter.
//
// Buffer Publish API circa 2024:
//   Base URL:    https://api.bufferapp.com/1
//   OAuth:       https://bufferapp.com/oauth2/authorize
//                https://api.bufferapp.com/1/oauth2/token.json
//   Revoke:      https://api.bufferapp.com/1/oauth2/token
//   Webhook sig: HMAC-SHA256 of the raw request body against a shared
//                secret, hex-encoded, delivered in the `x-buffer-signature`
//                header. We use timingSafeEqual for comparison.
//   Update read: GET /1/updates/{id}.json
//   Update edit: POST /1/updates/{id}/update.json
//
// Interception mechanism per §4.1: when an update.ready webhook arrives
// and findings remain unresolved, call the update-edit endpoint with
// status='buffer' (the pre-scheduled queue state) and append a
// compliance note to the update text (never mutating the original
// practitioner copy; the note is a prefix comment visible only in the
// Buffer UI's internal notes). If the POST fails, the adapter falls
// back to reporting succeeded=false so the orchestrator routes to
// notification-only.

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

const BASE_URL = 'https://api.bufferapp.com/1';

// Buffer webhook event types we care about. Buffer sends other events
// (comment.*, reply.*) that we ignore.
const BUFFER_EVENT_MAP: Record<string, SchedulerEventType | undefined> = {
  'update.created': 'post.created',
  'update.updated': 'post.updated',
  'update.ready':   'post.ready',
  'update.sent':    'post.published',
  'update.failed':  'post.rejected',
  'update.deleted': 'post.deleted',
};

interface BufferUpdate {
  id: string;
  text: string;
  profile_ids?: string[];
  scheduled_at?: number; // unix seconds
  updated_at?: number;
  created_at?: number;
  media?: {
    link?: string;
    description?: string;
    picture?: string;
    thumbnail?: string;
    photo?: string;
  };
  via?: string;
  user_id?: string;
  profile_service?: string;
}

interface BufferWebhookEnvelope {
  event: string;
  data?: {
    update?: BufferUpdate;
    id?: string;
  };
  // Some deliveries place the update at the envelope root
  id?: string;
  text?: string;
  // Buffer includes an event-id the spec requires for idempotency
  delivery_id?: string;
  event_id?: string;
}

export function bufferAdapter(fetchImpl: typeof fetch = fetch): SchedulerAdapter {
  return {
    platform: 'buffer',

    verifyWebhookSignature(input: WebhookVerificationInput): boolean {
      const signature = input.headers.get('x-buffer-signature') ?? input.headers.get('X-Buffer-Signature');
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
      let envelope: BufferWebhookEnvelope;
      try {
        envelope = JSON.parse(rawBody.toString('utf8')) as BufferWebhookEnvelope;
      } catch {
        throw new Error('buffer_webhook_json_invalid');
      }
      const eventKey = envelope.event;
      const mappedEventType = eventKey ? BUFFER_EVENT_MAP[eventKey] : undefined;
      if (!mappedEventType) {
        throw new Error(`buffer_webhook_unsupported_event:${eventKey ?? 'undefined'}`);
      }
      const update = envelope.data?.update ?? (envelope.id ? { id: envelope.id, text: envelope.text ?? '' } : undefined);
      const externalPostId = update?.id ?? envelope.data?.id;
      const externalEventId =
        envelope.delivery_id
        ?? envelope.event_id
        ?? headers.get('x-buffer-delivery-id')
        ?? headers.get('x-buffer-event-id')
        ?? `${eventKey}:${externalPostId ?? 'no-post-id'}:${Date.now()}`;

      return {
        platform: 'buffer',
        externalEventId,
        eventType: mappedEventType,
        externalPostId,
        receivedAt: new Date().toISOString(),
        rawPayload: envelope,
      };
    },

    async fetchDraftContent(input: DraftFetchInput): Promise<SchedulerDraft> {
      const url = `${BASE_URL}/updates/${encodeURIComponent(input.externalPostId)}.json`;
      const res = await fetchImpl(url, {
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: 'application/json',
        },
      });
      if (!res.ok) {
        schedulerLogger.warn('[buffer] fetchDraftContent non-2xx', {
          status: res.status,
          externalPostId: input.externalPostId,
        });
        throw new Error(`buffer_fetch_update_failed:${res.status}`);
      }
      const update = (await res.json()) as BufferUpdate;
      const scheduledAt = typeof update.scheduled_at === 'number'
        ? new Date(update.scheduled_at * 1000).toISOString()
        : new Date().toISOString();
      const editedAt = typeof update.updated_at === 'number'
        ? new Date(update.updated_at * 1000).toISOString()
        : scheduledAt;
      const hashtags = extractHashtags(update.text ?? '');
      const mentionHandles = extractMentions(update.text ?? '');
      return buildSchedulerDraft({
        source: 'buffer',
        externalId: update.id,
        practitionerId: '', // caller fills from scheduler_connections join
        connectionId: input.connectionId,
        targetPlatforms: inferTargetPlatforms(update),
        scheduledAt,
        captionText: update.text ?? '',
        hashtags,
        mentionHandles,
        mediaAttachments: update.media?.picture || update.media?.photo
          ? [{ kind: 'image', storageUrl: update.media.picture ?? update.media.photo ?? '' }]
          : [],
        editedAt,
        rawPayload: update,
      });
    },

    async attemptInterception(input: InterceptionInput): Promise<InterceptionResult> {
      const url = `${BASE_URL}/updates/${encodeURIComponent(input.externalPostId)}/update.json`;
      try {
        const body = new URLSearchParams({
          // Setting scheduled_at to empty + now=false effectively pulls it
          // out of the publish queue back into drafts.
          scheduled_at: '',
          now: 'false',
          // Compliance note; Buffer exposes `text` back to the UI.
          text: withCompliancePrefix(input.reason),
          utf8: '✓',
        });
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body,
        });
        const platformResponse = await safeReadJson(res);
        if (!res.ok) {
          return {
            mechanism: 'buffer_draft_status',
            succeeded: false,
            platformResponse,
            errorMessage: `buffer_intercept_non_2xx:${res.status}`,
          };
        }
        return {
          mechanism: 'buffer_draft_status',
          succeeded: true,
          platformResponse,
        };
      } catch (err) {
        return {
          mechanism: 'buffer_draft_status',
          succeeded: false,
          errorMessage: `buffer_intercept_exception:${(err as Error).message}`,
        };
      }
    },

    async revokeOAuthToken(input: RevokeTokenInput): Promise<void> {
      try {
        await fetchImpl(`${BASE_URL}/oauth2/token`, {
          method: 'DELETE',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            accept: 'application/json',
          },
        });
      } catch (err) {
        schedulerLogger.warn('[buffer] revoke best-effort failure', {
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

function inferTargetPlatforms(update: BufferUpdate): string[] {
  if (update.profile_service) return [update.profile_service];
  return update.profile_ids ?? [];
}

function withCompliancePrefix(reason: string): string {
  return `[ViaConnect Marshall hold: ${reason}] returned to drafts for compliance review.`;
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
