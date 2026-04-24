// Prompt #125 P7: Later adapter.
//
// Later API circa 2024:
//   Base URL:    https://app.later.com/api/v2
//   OAuth:       https://app.later.com/oauth/authorize
//                https://app.later.com/oauth/token
//   Webhook sig: when Later delivers a webhook it carries an
//                `x-later-signature` HMAC-SHA256 header; many tiers
//                have no webhook at all so we lean on polling.
//   Posts:       GET /posts?status=scheduled returns queued posts
//                GET /posts/{id} detail
//                PATCH /posts/{id} update (used to reschedule on
//                interception)
//
// Interception per §4.3: on findings, push scheduled_at forward by
// 2 hours via PATCH to buy a remediation window. We do not delete
// or edit content; the original post stays intact, just delayed.

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

const BASE_URL = 'https://app.later.com/api/v2';
const RESCHEDULE_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours

const LATER_EVENT_MAP: Record<string, SchedulerEventType | undefined> = {
  'post.created':   'post.created',
  'post.updated':   'post.updated',
  'post.scheduled': 'post.ready',
  'post.published': 'post.published',
  'post.failed':    'post.rejected',
  'post.deleted':   'post.deleted',
};

interface LaterPost {
  id: string;
  caption?: string;
  scheduled_at?: string; // ISO 8601
  updated_at?: string;
  created_at?: string;
  profile_id?: string;
  social_profile_type?: string;
  media?: Array<{ url?: string; media_type?: string; thumbnail_url?: string }>;
  status?: string;
}

interface LaterWebhookEnvelope {
  event?: string;
  delivery_id?: string;
  data?: { post?: LaterPost; id?: string };
  post?: LaterPost;
}

export function laterAdapter(fetchImpl: typeof fetch = fetch): SchedulerAdapter {
  return {
    platform: 'later',

    verifyWebhookSignature(input: WebhookVerificationInput): boolean {
      const signature = input.headers.get('x-later-signature') ?? input.headers.get('X-Later-Signature');
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
      let envelope: LaterWebhookEnvelope;
      try {
        envelope = JSON.parse(rawBody.toString('utf8')) as LaterWebhookEnvelope;
      } catch {
        throw new Error('later_webhook_json_invalid');
      }
      const eventKey = envelope.event;
      const mappedEventType = eventKey ? LATER_EVENT_MAP[eventKey] : undefined;
      if (!mappedEventType) {
        throw new Error(`later_webhook_unsupported_event:${eventKey ?? 'undefined'}`);
      }
      const post = envelope.data?.post ?? envelope.post;
      const externalPostId = post?.id ?? envelope.data?.id;
      const externalEventId =
        envelope.delivery_id
        ?? headers.get('x-later-delivery-id')
        ?? `${eventKey}:${externalPostId ?? 'no-id'}:${Date.now()}`;
      return {
        platform: 'later',
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
        schedulerLogger.warn('[later] fetchDraftContent non-2xx', {
          status: res.status,
          externalPostId: input.externalPostId,
        });
        throw new Error(`later_fetch_post_failed:${res.status}`);
      }
      const post = (await res.json()) as LaterPost;
      const captionText = post.caption ?? '';
      const scheduledAt = post.scheduled_at ?? new Date().toISOString();
      const editedAt = post.updated_at ?? post.created_at ?? scheduledAt;
      const hashtags = extractHashtags(captionText);
      const mentionHandles = extractMentions(captionText);
      const mediaImages = (post.media ?? [])
        .filter((m) => (m.media_type ?? '').startsWith('image') || m.thumbnail_url)
        .map((m) => ({
          kind: 'image' as const,
          storageUrl: m.url ?? m.thumbnail_url ?? '',
        }))
        .filter((m) => m.storageUrl);
      return buildSchedulerDraft({
        source: 'later',
        externalId: post.id,
        practitionerId: '',
        connectionId: input.connectionId,
        targetPlatforms: post.social_profile_type ? [post.social_profile_type] : [],
        scheduledAt,
        captionText,
        hashtags,
        mentionHandles,
        mediaAttachments: mediaImages,
        editedAt,
        rawPayload: post,
      });
    },

    async attemptInterception(input: InterceptionInput): Promise<InterceptionResult> {
      // Fetch current scheduled_at so we shift forward, not backward.
      let currentScheduledAt: number = Date.now();
      try {
        const readRes = await fetchImpl(`${BASE_URL}/posts/${encodeURIComponent(input.externalPostId)}`, {
          headers: { authorization: `Bearer ${input.accessToken}`, accept: 'application/json' },
        });
        if (readRes.ok) {
          const body = (await readRes.json()) as LaterPost;
          if (body.scheduled_at) {
            const parsed = Date.parse(body.scheduled_at);
            if (!Number.isNaN(parsed)) currentScheduledAt = parsed;
          }
        }
      } catch {
        // Best-effort; fall through to Date.now() baseline.
      }
      const newScheduledAt = new Date(Math.max(currentScheduledAt, Date.now()) + RESCHEDULE_DELAY_MS).toISOString();

      try {
        const res = await fetchImpl(`${BASE_URL}/posts/${encodeURIComponent(input.externalPostId)}`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            scheduled_at: newScheduledAt,
            note: withCompliancePrefix(input.reason),
          }),
        });
        const platformResponse = await safeReadJson(res);
        if (!res.ok) {
          return {
            mechanism: 'later_reschedule',
            succeeded: false,
            platformResponse,
            errorMessage: `later_reschedule_non_2xx:${res.status}`,
          };
        }
        return {
          mechanism: 'later_reschedule',
          succeeded: true,
          platformResponse,
        };
      } catch (err) {
        return {
          mechanism: 'later_reschedule',
          succeeded: false,
          errorMessage: `later_reschedule_exception:${(err as Error).message}`,
        };
      }
    },

    async revokeOAuthToken(input: RevokeTokenInput): Promise<void> {
      try {
        await fetchImpl('https://app.later.com/oauth/revoke', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body: new URLSearchParams({ token: input.accessToken }).toString(),
        });
      } catch (err) {
        schedulerLogger.warn('[later] revoke best-effort failure', {
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
  return `[ViaConnect Marshall hold: ${reason}] rescheduled +2h for compliance review.`;
}

async function safeReadJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    try { return await res.text(); } catch { return null; }
  }
}

/**
 * Poll helper used by the cron worker. Lists queued posts for the
 * connection, returns the raw array so the caller can fan out each
 * into the orchestrator.
 */
export async function fetchLaterQueue(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LaterPost[]> {
  const url = `${BASE_URL}/posts?status=scheduled`;
  const res = await fetchImpl(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`later_queue_fetch_failed:${res.status}`);
  const body = (await res.json()) as { posts?: LaterPost[] } | LaterPost[];
  return Array.isArray(body) ? body : (body.posts ?? []);
}
