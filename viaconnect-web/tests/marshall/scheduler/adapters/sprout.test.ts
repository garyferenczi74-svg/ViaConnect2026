import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { sproutAdapter } from '@/lib/marshall/scheduler/adapters/sprout';

const SECRET = 'sprout-secret';
const hmac = (body: Buffer) => createHmac('sha256', SECRET).update(body).digest('hex');

describe('sproutAdapter.verifyWebhookSignature', () => {
  it('accepts correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'publishing.scheduled' }));
    const a = sproutAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-sprout-signature': hmac(body) }),
      signingSecret: SECRET,
    })).toBe(true);
  });

  it('rejects wrong secret', () => {
    const body = Buffer.from('{}');
    const a = sproutAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-sprout-signature': createHmac('sha256', 'other').update(body).digest('hex') }),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('rejects missing header', () => {
    const a = sproutAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('accepts sha256= prefix', () => {
    const body = Buffer.from(JSON.stringify({ event: 'publishing.scheduled' }));
    const a = sproutAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-sprout-signature': `sha256=${hmac(body)}` }),
      signingSecret: SECRET,
    })).toBe(true);
  });

  it('rejects truncated signature', () => {
    const body = Buffer.from('{}');
    const a = sproutAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-sprout-signature': hmac(body).slice(0, 10) }),
      signingSecret: SECRET,
    })).toBe(false);
  });
});

describe('sproutAdapter.parseWebhookEvent', () => {
  it('maps publishing.scheduled -> post.ready', () => {
    const body = Buffer.from(JSON.stringify({
      event: 'publishing.scheduled',
      delivery_id: 'd-1',
      data: { message: { id: 's_1', text: 'hi' } },
    }));
    const a = sproutAdapter();
    const evt = a.parseWebhookEvent(body, new Headers());
    expect(evt.platform).toBe('sprout_social');
    expect(evt.eventType).toBe('post.ready');
    expect(evt.externalEventId).toBe('d-1');
    expect(evt.externalPostId).toBe('s_1');
  });

  it('maps publishing.published + publishing.rejected', () => {
    const a = sproutAdapter();
    const bodyPub = Buffer.from(JSON.stringify({ event: 'publishing.published', data: { message: { id: 's' } } }));
    expect(a.parseWebhookEvent(bodyPub, new Headers()).eventType).toBe('post.published');
    const bodyRej = Buffer.from(JSON.stringify({ event: 'publishing.rejected', data: { message: { id: 's' } } }));
    expect(a.parseWebhookEvent(bodyRej, new Headers()).eventType).toBe('post.rejected');
  });

  it('throws on unsupported event', () => {
    const a = sproutAdapter();
    expect(() => a.parseWebhookEvent(
      Buffer.from(JSON.stringify({ event: 'listening.matched' })),
      new Headers(),
    )).toThrow(/unsupported_event/);
  });

  it('throws on malformed JSON', () => {
    const a = sproutAdapter();
    expect(() => a.parseWebhookEvent(Buffer.from('nope'), new Headers()))
      .toThrow(/json_invalid/);
  });

  it('falls back to header delivery id', () => {
    const body = Buffer.from(JSON.stringify({ event: 'publishing.scheduled', data: { message: { id: 's' } } }));
    const a = sproutAdapter();
    const evt = a.parseWebhookEvent(body, new Headers({ 'x-sprout-delivery-id': 'hdr' }));
    expect(evt.externalEventId).toBe('hdr');
  });
});

describe('sproutAdapter.fetchDraftContent', () => {
  it('maps a message row into SchedulerDraft using text + network', async () => {
    const scheduled = '2026-05-01T10:00:00Z';
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 's_42',
      text: 'Launch post #launch @team',
      scheduled_time: scheduled,
      updated_time: '2026-04-24T12:00:00Z',
      network: 'linkedin',
      media: [{ url: 'https://cdn.example.com/s.jpg', mime_type: 'image/jpeg' }],
    }), { status: 200 }));
    const a = sproutAdapter(fakeFetch as unknown as typeof fetch);
    const draft = await a.fetchDraftContent({ connectionId: 'c1', externalPostId: 's_42', accessToken: 'at' });
    expect(draft.source).toBe('sprout_social');
    expect(draft.hashtags).toContain('launch');
    expect(draft.mentionHandles).toContain('@team');
    expect(draft.targetPlatforms).toEqual(['linkedin']);
    expect(draft.mediaAttachments).toHaveLength(1);
    expect(draft.scheduledAt).toBe(scheduled);
  });

  it('falls back to content field when text is absent', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 's_1', content: 'Content field caption', scheduled_time: '2026-05-01T10:00:00Z',
    }), { status: 200 }));
    const a = sproutAdapter(fakeFetch as unknown as typeof fetch);
    const draft = await a.fetchDraftContent({ connectionId: 'c1', externalPostId: 's_1', accessToken: 'at' });
    expect(draft.captionText).toBe('Content field caption');
  });

  it('throws on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('', { status: 404 }));
    const a = sproutAdapter(fakeFetch as unknown as typeof fetch);
    await expect(a.fetchDraftContent({ connectionId: 'c1', externalPostId: 'missing', accessToken: 'at' }))
      .rejects.toThrow(/fetch_message_failed:404/);
  });
});

describe('sproutAdapter.attemptInterception (Approval Workflow reject)', () => {
  it('returns succeeded=true on 2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const a = sproutAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 's_42', accessToken: 'at', reason: 'rule_R.A',
    });
    expect(r.mechanism).toBe('sprout_approval_reject');
    expect(r.succeeded).toBe(true);
  });

  it('gracefully degrades on 403 (non-Premium tier)', async () => {
    const fakeFetch = vi.fn(async () => new Response('not on this tier', { status: 403 }));
    const a = sproutAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 's_42', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('403');
  });

  it('swallows exception and returns succeeded=false', async () => {
    const fakeFetch = vi.fn(async () => { throw new Error('ETIMEDOUT'); });
    const a = sproutAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 's_42', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('exception');
  });
});

describe('sproutAdapter.revokeOAuthToken', () => {
  it('posts to revoke endpoint; never throws on platform error', async () => {
    let capturedInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (_url, init) => {
      capturedInit = init;
      return new Response('', { status: 500 });
    };
    const a = sproutAdapter(fakeFetch);
    await expect(a.revokeOAuthToken({ accessToken: 'at' })).resolves.toBeUndefined();
    expect(capturedInit?.method).toBe('POST');
  });
});
