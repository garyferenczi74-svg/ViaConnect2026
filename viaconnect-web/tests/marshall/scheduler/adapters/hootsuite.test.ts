import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { hootsuiteAdapter } from '@/lib/marshall/scheduler/adapters/hootsuite';

const SECRET = 'hootsuite-secret';

function hmac(body: Buffer): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

describe('hootsuiteAdapter.verifyWebhookSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'message.scheduled', data: { message: { id: 'm1' } } }));
    const a = hootsuiteAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-hootsuite-signature': hmac(body) }),
      signingSecret: SECRET,
    })).toBe(true);
  });

  it('rejects wrong secret', () => {
    const body = Buffer.from('{}');
    const wrongSig = createHmac('sha256', 'other').update(body).digest('hex');
    const a = hootsuiteAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-hootsuite-signature': wrongSig }),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('rejects when header missing', () => {
    const a = hootsuiteAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('accepts sha256= prefix', () => {
    const body = Buffer.from(JSON.stringify({ event: 'message.scheduled' }));
    const a = hootsuiteAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-hootsuite-signature': `sha256=${hmac(body)}` }),
      signingSecret: SECRET,
    })).toBe(true);
  });

  it('rejects truncated signature (length mismatch)', () => {
    const body = Buffer.from('{}');
    const a = hootsuiteAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-hootsuite-signature': hmac(body).slice(0, 10) }),
      signingSecret: SECRET,
    })).toBe(false);
  });
});

describe('hootsuiteAdapter.parseWebhookEvent', () => {
  it('maps message.scheduled -> post.ready with deliveryId', () => {
    const body = Buffer.from(JSON.stringify({
      event: 'message.scheduled',
      deliveryId: 'del-7',
      data: { message: { id: 'hs_123', text: 'hi' } },
    }));
    const a = hootsuiteAdapter();
    const evt = a.parseWebhookEvent(body, new Headers());
    expect(evt.platform).toBe('hootsuite');
    expect(evt.eventType).toBe('post.ready');
    expect(evt.externalEventId).toBe('del-7');
    expect(evt.externalPostId).toBe('hs_123');
  });

  it('maps message.published + message.rejected', () => {
    const a = hootsuiteAdapter();
    const bodyPub = Buffer.from(JSON.stringify({ event: 'message.published', data: { message: { id: 'm' } } }));
    expect(a.parseWebhookEvent(bodyPub, new Headers()).eventType).toBe('post.published');
    const bodyRej = Buffer.from(JSON.stringify({ event: 'message.rejected', data: { message: { id: 'm' } } }));
    expect(a.parseWebhookEvent(bodyRej, new Headers()).eventType).toBe('post.rejected');
  });

  it('throws on unsupported event type', () => {
    const a = hootsuiteAdapter();
    const body = Buffer.from(JSON.stringify({ event: 'workspace.updated' }));
    expect(() => a.parseWebhookEvent(body, new Headers())).toThrow(/unsupported_event/);
  });

  it('throws on malformed JSON', () => {
    const a = hootsuiteAdapter();
    expect(() => a.parseWebhookEvent(Buffer.from('nope'), new Headers())).toThrow(/json_invalid/);
  });

  it('falls back to header delivery id when payload omits it', () => {
    const body = Buffer.from(JSON.stringify({ event: 'message.scheduled', data: { message: { id: 'm' } } }));
    const a = hootsuiteAdapter();
    const evt = a.parseWebhookEvent(body, new Headers({ 'x-hootsuite-delivery-id': 'hdr-99' }));
    expect(evt.externalEventId).toBe('hdr-99');
  });

  it('reads eventType field when event is absent', () => {
    const body = Buffer.from(JSON.stringify({ eventType: 'message.scheduled', data: { message: { id: 'm' } } }));
    const a = hootsuiteAdapter();
    const evt = a.parseWebhookEvent(body, new Headers());
    expect(evt.eventType).toBe('post.ready');
  });
});

describe('hootsuiteAdapter.fetchDraftContent', () => {
  it('maps a message into SchedulerDraft using text + socialNetwork', async () => {
    const scheduled = '2026-05-01T10:00:00Z';
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 'hs_42',
      text: 'Our peptide stack at #farmceutica for @wellness folks',
      scheduledSendTime: scheduled,
      updatedDate: '2026-04-24T12:00:00Z',
      socialNetwork: 'twitter',
      media: [{ url: 'https://cdn.example.com/hs.jpg', mimeType: 'image/jpeg' }],
    }), { status: 200 }));
    const a = hootsuiteAdapter(fakeFetch as unknown as typeof fetch);
    const draft = await a.fetchDraftContent({
      connectionId: 'c1',
      externalPostId: 'hs_42',
      accessToken: 'at',
    });
    expect(draft.source).toBe('hootsuite');
    expect(draft.captionText).toContain('peptide stack');
    expect(draft.hashtags).toContain('farmceutica');
    expect(draft.mentionHandles).toContain('@wellness');
    expect(draft.targetPlatforms).toEqual(['twitter']);
    expect(draft.mediaAttachments).toHaveLength(1);
    expect(draft.mediaAttachments[0].storageUrl).toBe('https://cdn.example.com/hs.jpg');
    expect(draft.scheduledAt).toBe(scheduled);
  });

  it('prefers `body` when `text` is absent', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 'hs_1',
      body: 'Body field caption',
      scheduledSendTime: '2026-05-01T10:00:00Z',
    }), { status: 200 }));
    const a = hootsuiteAdapter(fakeFetch as unknown as typeof fetch);
    const draft = await a.fetchDraftContent({ connectionId: 'c1', externalPostId: 'hs_1', accessToken: 'at' });
    expect(draft.captionText).toBe('Body field caption');
  });

  it('throws with status on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('nope', { status: 404 }));
    const a = hootsuiteAdapter(fakeFetch as unknown as typeof fetch);
    await expect(a.fetchDraftContent({ connectionId: 'c1', externalPostId: 'missing', accessToken: 'at' }))
      .rejects.toThrow(/fetch_message_failed:404/);
  });
});

describe('hootsuiteAdapter.attemptInterception (Approval Workflow reject)', () => {
  it('returns succeeded=true on 2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const a = hootsuiteAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'hs_42', accessToken: 'at', reason: 'disease_claim',
    });
    expect(r.mechanism).toBe('hootsuite_approval_reject');
    expect(r.succeeded).toBe(true);
  });

  it('gracefully degrades on 403 (non-Enterprise tier)', async () => {
    const fakeFetch = vi.fn(async () => new Response('not on this tier', { status: 403 }));
    const a = hootsuiteAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'hs_42', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('403');
  });

  it('swallows exceptions and returns succeeded=false', async () => {
    const fakeFetch = vi.fn(async () => { throw new Error('ETIMEDOUT'); });
    const a = hootsuiteAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'hs_42', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('exception');
  });
});

describe('hootsuiteAdapter.revokeOAuthToken', () => {
  it('posts to revoke endpoint and does not throw on error', async () => {
    let capturedInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (_url, init) => {
      capturedInit = init;
      return new Response('', { status: 500 });
    };
    const a = hootsuiteAdapter(fakeFetch);
    await expect(a.revokeOAuthToken({ accessToken: 'at' })).resolves.toBeUndefined();
    expect(capturedInit?.method).toBe('POST');
  });
});
