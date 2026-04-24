import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { planolyAdapter } from '@/lib/marshall/scheduler/adapters/planoly';

const SECRET = 'planoly-secret';
const hmac = (body: Buffer) => createHmac('sha256', SECRET).update(body).digest('hex');

describe('planolyAdapter.verifyWebhookSignature', () => {
  it('accepts correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'post.scheduled' }));
    const a = planolyAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-planoly-signature': hmac(body) }),
      signingSecret: SECRET,
    })).toBe(true);
  });

  it('rejects wrong secret', () => {
    const body = Buffer.from('{}');
    const a = planolyAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-planoly-signature': createHmac('sha256', 'other').update(body).digest('hex') }),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('rejects missing header', () => {
    const a = planolyAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('accepts sha256= prefix', () => {
    const body = Buffer.from(JSON.stringify({ event: 'post.scheduled' }));
    const a = planolyAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-planoly-signature': `sha256=${hmac(body)}` }),
      signingSecret: SECRET,
    })).toBe(true);
  });
});

describe('planolyAdapter.parseWebhookEvent', () => {
  it('maps post.scheduled -> post.ready', () => {
    const body = Buffer.from(JSON.stringify({
      event: 'post.scheduled',
      delivery_id: 'del-1',
      data: { post: { id: 'pl_1' } },
    }));
    const a = planolyAdapter();
    const evt = a.parseWebhookEvent(body, new Headers());
    expect(evt.platform).toBe('planoly');
    expect(evt.eventType).toBe('post.ready');
    expect(evt.externalEventId).toBe('del-1');
    expect(evt.externalPostId).toBe('pl_1');
  });

  it('maps post.published + post.failed', () => {
    const a = planolyAdapter();
    expect(a.parseWebhookEvent(
      Buffer.from(JSON.stringify({ event: 'post.published', data: { post: { id: 'p' } } })),
      new Headers(),
    ).eventType).toBe('post.published');
    expect(a.parseWebhookEvent(
      Buffer.from(JSON.stringify({ event: 'post.failed', data: { post: { id: 'p' } } })),
      new Headers(),
    ).eventType).toBe('post.rejected');
  });

  it('throws on unsupported event', () => {
    const a = planolyAdapter();
    expect(() => a.parseWebhookEvent(
      Buffer.from(JSON.stringify({ event: 'grid.updated' })),
      new Headers(),
    )).toThrow(/unsupported_event/);
  });

  it('throws on malformed JSON', () => {
    const a = planolyAdapter();
    expect(() => a.parseWebhookEvent(Buffer.from('nope'), new Headers()))
      .toThrow(/json_invalid/);
  });

  it('falls back to header delivery id', () => {
    const body = Buffer.from(JSON.stringify({ event: 'post.scheduled', data: { post: { id: 'p' } } }));
    const a = planolyAdapter();
    const evt = a.parseWebhookEvent(body, new Headers({ 'x-planoly-delivery-id': 'hdr' }));
    expect(evt.externalEventId).toBe('hdr');
  });
});

describe('planolyAdapter.fetchDraftContent', () => {
  it('maps a post row into SchedulerDraft', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 'pl_42',
      caption: 'New launch #fc @clinic',
      scheduled_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-04-24T12:00:00Z',
      social_profile: 'instagram',
      media: [{ url: 'https://cdn.example.com/pl.jpg', mime_type: 'image/jpeg' }],
    }), { status: 200 }));
    const a = planolyAdapter(fakeFetch as unknown as typeof fetch);
    const draft = await a.fetchDraftContent({
      connectionId: 'c1',
      externalPostId: 'pl_42',
      accessToken: 'at',
    });
    expect(draft.source).toBe('planoly');
    expect(draft.hashtags).toContain('fc');
    expect(draft.mentionHandles).toContain('@clinic');
    expect(draft.targetPlatforms).toEqual(['instagram']);
    expect(draft.mediaAttachments).toHaveLength(1);
  });

  it('throws on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('', { status: 404 }));
    const a = planolyAdapter(fakeFetch as unknown as typeof fetch);
    await expect(a.fetchDraftContent({ connectionId: 'c1', externalPostId: 'missing', accessToken: 'at' }))
      .rejects.toThrow(/fetch_post_failed:404/);
  });
});

describe('planolyAdapter.attemptInterception (notify-only by design)', () => {
  it('always returns succeeded=false with planoly_notify_only mechanism, no API call', async () => {
    const fakeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const a = planolyAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1',
      externalPostId: 'pl_1',
      accessToken: 'at',
      reason: 'rule_R.A',
    });
    expect(r.mechanism).toBe('planoly_notify_only');
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toBe('planoly_notify_only_by_design');
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});

describe('planolyAdapter.revokeOAuthToken', () => {
  it('posts to revoke endpoint without throwing on platform error', async () => {
    let capturedInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (_url, init) => {
      capturedInit = init;
      return new Response('', { status: 500 });
    };
    const a = planolyAdapter(fakeFetch);
    await expect(a.revokeOAuthToken({ accessToken: 'at' })).resolves.toBeUndefined();
    expect(capturedInit?.method).toBe('POST');
  });
});
