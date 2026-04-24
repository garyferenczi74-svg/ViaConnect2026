import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { fetchLaterQueue, laterAdapter } from '@/lib/marshall/scheduler/adapters/later';

const SECRET = 'later-secret';
const hmac = (body: Buffer) => createHmac('sha256', SECRET).update(body).digest('hex');

describe('laterAdapter.verifyWebhookSignature', () => {
  it('accepts correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'post.scheduled' }));
    const a = laterAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-later-signature': hmac(body) }),
      signingSecret: SECRET,
    })).toBe(true);
  });

  it('rejects wrong secret', () => {
    const body = Buffer.from('{}');
    const a = laterAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-later-signature': createHmac('sha256', 'other').update(body).digest('hex') }),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('rejects missing header', () => {
    const a = laterAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('accepts sha256= prefix', () => {
    const body = Buffer.from(JSON.stringify({ event: 'post.scheduled' }));
    const a = laterAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-later-signature': `sha256=${hmac(body)}` }),
      signingSecret: SECRET,
    })).toBe(true);
  });
});

describe('laterAdapter.parseWebhookEvent', () => {
  it('maps post.scheduled -> post.ready', () => {
    const body = Buffer.from(JSON.stringify({
      event: 'post.scheduled',
      delivery_id: 'del-1',
      data: { post: { id: 'l_1' } },
    }));
    const a = laterAdapter();
    const evt = a.parseWebhookEvent(body, new Headers());
    expect(evt.platform).toBe('later');
    expect(evt.eventType).toBe('post.ready');
    expect(evt.externalEventId).toBe('del-1');
    expect(evt.externalPostId).toBe('l_1');
  });

  it('maps post.published + post.failed', () => {
    const a = laterAdapter();
    const bodyPub = Buffer.from(JSON.stringify({ event: 'post.published', data: { post: { id: 'p' } } }));
    expect(a.parseWebhookEvent(bodyPub, new Headers()).eventType).toBe('post.published');
    const bodyFail = Buffer.from(JSON.stringify({ event: 'post.failed', data: { post: { id: 'p' } } }));
    expect(a.parseWebhookEvent(bodyFail, new Headers()).eventType).toBe('post.rejected');
  });

  it('throws on unsupported event', () => {
    const a = laterAdapter();
    expect(() => a.parseWebhookEvent(Buffer.from(JSON.stringify({ event: 'story.viewed' })), new Headers()))
      .toThrow(/unsupported_event/);
  });

  it('falls back to header delivery id', () => {
    const body = Buffer.from(JSON.stringify({ event: 'post.scheduled', data: { post: { id: 'p' } } }));
    const a = laterAdapter();
    const evt = a.parseWebhookEvent(body, new Headers({ 'x-later-delivery-id': 'hdr' }));
    expect(evt.externalEventId).toBe('hdr');
  });
});

describe('laterAdapter.fetchDraftContent', () => {
  it('maps a post row into SchedulerDraft', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 'l_42',
      caption: 'Big news #launch @clinic',
      scheduled_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-04-24T12:00:00Z',
      social_profile_type: 'instagram_business',
      media: [{ url: 'https://cdn.example.com/l.jpg', media_type: 'image/jpeg' }],
    }), { status: 200 }));
    const a = laterAdapter(fakeFetch as unknown as typeof fetch);
    const draft = await a.fetchDraftContent({ connectionId: 'c1', externalPostId: 'l_42', accessToken: 'at' });
    expect(draft.source).toBe('later');
    expect(draft.hashtags).toContain('launch');
    expect(draft.mentionHandles).toContain('@clinic');
    expect(draft.targetPlatforms).toEqual(['instagram_business']);
    expect(draft.mediaAttachments).toHaveLength(1);
  });

  it('throws on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('', { status: 404 }));
    const a = laterAdapter(fakeFetch as unknown as typeof fetch);
    await expect(a.fetchDraftContent({ connectionId: 'c1', externalPostId: 'missing', accessToken: 'at' }))
      .rejects.toThrow(/fetch_post_failed:404/);
  });
});

describe('laterAdapter.attemptInterception (reschedule +2h)', () => {
  it('succeeds + shifts scheduled_at forward from current post value', async () => {
    const baseScheduled = '2026-05-01T10:00:00Z';
    const baseMs = Date.parse(baseScheduled);
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    const fakeFetch: typeof fetch = async (url, init) => {
      const method = (init?.method ?? 'GET') as string;
      calls.push({ url: String(url), method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (method === 'GET') {
        return new Response(JSON.stringify({ id: 'l_1', scheduled_at: baseScheduled }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const a = laterAdapter(fakeFetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'l_1', accessToken: 'at', reason: 'rule_R.A',
    });
    expect(r.mechanism).toBe('later_reschedule');
    expect(r.succeeded).toBe(true);

    const patchCall = calls.find((c) => c.method === 'PATCH');
    expect(patchCall).toBeDefined();
    const patchBody = JSON.parse(patchCall!.body ?? '{}') as { scheduled_at: string };
    const newMs = Date.parse(patchBody.scheduled_at);
    // Shifted at least 2 hours past the original scheduled time (or past
    // now if the original was already in the past; either way >= +2h
    // from the larger of the two).
    expect(newMs).toBeGreaterThanOrEqual(Math.max(baseMs, Date.now()) + 2 * 60 * 60 * 1000 - 1000);
  });

  it('returns succeeded=false on PATCH non-2xx', async () => {
    const fakeFetch: typeof fetch = async (_url, init) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return new Response(JSON.stringify({ id: 'l_1', scheduled_at: '2026-05-01T10:00:00Z' }), { status: 200 });
      }
      return new Response('later down', { status: 502 });
    };
    const a = laterAdapter(fakeFetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'l_1', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('502');
  });

  it('tolerates GET failure and still attempts PATCH with now-based baseline', async () => {
    let patchHit = false;
    const fakeFetch: typeof fetch = async (_url, init) => {
      if ((init?.method ?? 'GET') === 'GET') throw new Error('ECONNRESET');
      patchHit = true;
      return new Response('{}', { status: 200 });
    };
    const a = laterAdapter(fakeFetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'l_1', accessToken: 'at', reason: 'x',
    });
    expect(patchHit).toBe(true);
    expect(r.succeeded).toBe(true);
  });

  it('swallows PATCH exception and returns succeeded=false', async () => {
    const fakeFetch: typeof fetch = async (_url, init) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return new Response(JSON.stringify({ id: 'l_1', scheduled_at: '2026-05-01T10:00:00Z' }), { status: 200 });
      }
      throw new Error('ETIMEDOUT');
    };
    const a = laterAdapter(fakeFetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'l_1', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('exception');
  });
});

describe('fetchLaterQueue', () => {
  it('handles array response shape', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify([
      { id: 'a', scheduled_at: '2026-05-01T10:00:00Z' },
      { id: 'b', scheduled_at: '2026-05-02T10:00:00Z' },
    ]), { status: 200 }));
    const rows = await fetchLaterQueue('at', fakeFetch as unknown as typeof fetch);
    expect(rows).toHaveLength(2);
  });

  it('handles { posts: [...] } response shape', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      posts: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    }), { status: 200 }));
    const rows = await fetchLaterQueue('at', fakeFetch as unknown as typeof fetch);
    expect(rows).toHaveLength(3);
  });

  it('throws with status on failure', async () => {
    const fakeFetch = vi.fn(async () => new Response('', { status: 401 }));
    await expect(fetchLaterQueue('at', fakeFetch as unknown as typeof fetch))
      .rejects.toThrow(/queue_fetch_failed:401/);
  });
});

describe('laterAdapter.revokeOAuthToken', () => {
  it('posts to revoke endpoint without throwing on error', async () => {
    let capturedInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (_url, init) => {
      capturedInit = init;
      return new Response('', { status: 500 });
    };
    const a = laterAdapter(fakeFetch);
    await expect(a.revokeOAuthToken({ accessToken: 'at' })).resolves.toBeUndefined();
    expect(capturedInit?.method).toBe('POST');
  });
});
