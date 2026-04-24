// Prompt #125 P9: Planoly adapter (notify-only).
//
// Planoly API is limited and tier-dependent. Per §4.5 Planoly coverage
// is "notify-only" by design: interception always reports
// succeeded=false with mechanism='planoly_notify_only' so the
// orchestrator falls back to practitioner notification via the
// standard notify.ts pipeline. No API call is made on the hold path;
// there's nothing the Planoly API can accept to stop a scheduled
// post in-flight.
//
// Planoly API circa 2024:
//   Base URL:    https://api.planoly.com/v1
//   OAuth:       https://api.planoly.com/oauth/authorize
//                https://api.planoly.com/oauth/token
//   Webhook sig: when delivered, HMAC-SHA256 on `x-planoly-signature`
//                (many tiers have no webhook at all; polling is the
//                primary ingress).
//
// The practitioner portal and Trust + Compliance disclosure both
// explicitly state Planoly is notify-only so the coverage expectation
// is honest.

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

const BASE_URL = 'https://api.planoly.com/v1';

const PLANOLY_EVENT_MAP: Record<string, SchedulerEventType | undefined> = {
  'post.created':   'post.created',
  'post.updated':   'post.updated',
  'post.scheduled': 'post.ready',
  'post.published': 'post.published',
  'post.failed':    'post.rejected',
  'post.deleted':   'post.deleted',
};

interface PlanolyPost {
  id: string;
  caption?: string;
  scheduled_at?: string;
  updated_at?: string;
  created_at?: string;
  social_profile?: string;
  media?: Array<{ url?: string; mime_type?: string; thumbnail_url?: string }>;
}

interface PlanolyWebhookEnvelope {
  event?: string;
  delivery_id?: string;
  data?: { post?: PlanolyPost; id?: string };
  post?: PlanolyPost;
}

export function planolyAdapter(fetchImpl: typeof fetch = fetch): SchedulerAdapter {
  return {
    platform: 'planoly',

    verifyWebhookSignature(input: WebhookVerificationInput): boolean {
      const signature = input.headers.get('x-planoly-signature') ?? input.headers.get('X-Planoly-Signature');
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
      let envelope: PlanolyWebhookEnvelope;
      try {
        envelope = JSON.parse(rawBody.toString('utf8')) as PlanolyWebhookEnvelope;
      } catch {
        throw new Error('planoly_webhook_json_invalid');
      }
      const eventKey = envelope.event;
      const mappedEventType = eventKey ? PLANOLY_EVENT_MAP[eventKey] : undefined;
      if (!mappedEventType) {
        throw new Error(`planoly_webhook_unsupported_event:${eventKey ?? 'undefined'}`);
      }
      const post = envelope.data?.post ?? envelope.post;
      const externalPostId = post?.id ?? envelope.data?.id;
      const externalEventId =
        envelope.delivery_id
        ?? headers.get('x-planoly-delivery-id')
        ?? `${eventKey}:${externalPostId ?? 'no-id'}:${Date.now()}`;
      return {
        platform: 'planoly',
        externalEventId,
        eventType: mappedEventType,
        externalPostId,
        receivedAt: new Date().toISOString(),
        rawPayload: envelope,
      };
    },

    async fetchDraftContent(input: DraftFetchInput): Promise<SchedulerDraft> {
      const url = `${BASE_URL}/posts/${encodeURIComponent(input.externalPostId)}`;
      const res = await fetchImpl(url, {
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: 'application/json',
        },
      });
      if (!res.ok) {
        schedulerLogger.warn('[planoly] fetchDraftContent non-2xx', {
          status: res.status,
          externalPostId: input.externalPostId,
        });
        throw new Error(`planoly_fetch_post_failed:${res.status}`);
      }
      const post = (await res.json()) as PlanolyPost;
      const captionText = post.caption ?? '';
      const scheduledAt = post.scheduled_at ?? new Date().toISOString();
      const editedAt = post.updated_at ?? post.created_at ?? scheduledAt;
      const hashtags = extractHashtags(captionText);
      const mentionHandles = extractMentions(captionText);
      const mediaImages = (post.media ?? [])
        .filter((m) => (m.mime_type ?? '').startsWith('image') || m.thumbnail_url)
        .map((m) => ({
          kind: 'image' as const,
          storageUrl: m.url ?? m.thumbnail_url ?? '',
        }))
        .filter((m) => m.storageUrl);
      return buildSchedulerDraft({
        source: 'planoly',
        externalId: post.id,
        practitionerId: '',
        connectionId: input.connectionId,
        targetPlatforms: post.social_profile ? [post.social_profile] : [],
        scheduledAt,
        captionText,
        hashtags,
        mentionHandles,
        mediaAttachments: mediaImages,
        editedAt,
        rawPayload: post,
      });
    },

    /**
     * By design: Planoly interception is always "notify only". We make
     * no API call; the orchestrator + escalation ladder route to the
     * notification pipeline when succeeded=false. The mechanism value
     * matches the scheduler_interceptions.mechanism CHECK constraint.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async attemptInterception(input: InterceptionInput): Promise<InterceptionResult> {
      return {
        mechanism: 'planoly_notify_only',
        succeeded: false,
        errorMessage: 'planoly_notify_only_by_design',
      };
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
        schedulerLogger.warn('[planoly] revoke best-effort failure', {
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
