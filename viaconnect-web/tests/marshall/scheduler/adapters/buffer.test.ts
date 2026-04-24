import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { bufferAdapter } from '@/lib/marshall/scheduler/adapters/buffer';

const SECRET = 'test-webhook-secret';

function hmac(body: Buffer): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

describe('bufferAdapter.verifyWebhookSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'update.ready', data: { update: { id: 'u1', text: 'hi' } } }));
    const a = bufferAdapter();
    const headers = new Headers({ 'x-buffer-signature': hmac(body) });
    expect(a.verifyWebhookSignature({ rawBody: body, headers, signingSecret: SECRET })).toBe(true);
  });

  it('rejects a body signed with wrong secret', () => {
    const body = Buffer.from('{"event":"update.ready"}');
    const wrongSig = createHmac('sha256', 'other-secret').update(body).digest('hex');
    const a = bufferAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-buffer-signature': wrongSig }),
      signingSecret: SECRET,
    })).toBe(false);
  });

  it('rejects when header is absent', () => {
    const body = Buffer.from('{}');
    const a = bufferAdapter();
    expect(a.verifyWebhookSignature({ rawBody: body, headers: new Headers(), signingSecret: SECRET })).toBe(false);
  });

  it('accepts sha256= prefix on the signature header', () => {
    const body = Buffer.from(JSON.stringify({ event: 'update.created' }));
    const sig = `sha256=${hmac(body)}`;
    const a = bufferAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-buffer-signature': sig }),
      signingSecret: SECRET,
    })).toBe(true);
  });

  it('rejects truncated signatures (length mismatch)', () => {
    const body = Buffer.from('{}');
    const a = bufferAdapter();
    expect(a.verifyWebhookSignature({
      rawBody: body,
      headers: new Headers({ 'x-buffer-signature': hmac(body).slice(0, 20) }),
      signingSecret: SECRET,
    })).toBe(false);
  });
});

describe('bufferAdapter.parseWebhookEvent', () => {
  it('parses a valid update.ready envelope into a SchedulerEvent', () => {
    const body = Buffer.from(JSON.stringify({
      event: 'update.ready',
      delivery_id: 'del-42',
      data: { update: { id: 'buf_123', text: 'Try our supplement.' } },
    }));
    const a = bufferAdapter();
    const evt = a.parseWebhookEvent(body, new Headers());
    expect(evt.platform).toBe('buffer');
    expect(evt.eventType).toBe('post.ready');
    expect(evt.externalEventId).toBe('del-42');
    expect(evt.externalPostId).toBe('buf_123');
  });

  it('maps update.sent to post.published and update.failed to post.rejected', () => {
    const a = bufferAdapter();
    const bodySent = Buffer.from(JSON.stringify({ event: 'update.sent', data: { update: { id: 'b1', text: 'ok' } } }));
    expect(a.parseWebhookEvent(bodySent, new Headers()).eventType).toBe('post.published');
    const bodyFail = Buffer.from(JSON.stringify({ event: 'update.failed', data: { update: { id: 'b1', text: 'ok' } } }));
    expect(a.parseWebhookEvent(bodyFail, new Headers()).eventType).toBe('post.rejected');
  });

  it('throws on unsupported event types', () => {
    const a = bufferAdapter();
    const body = Buffer.from(JSON.stringify({ event: 'comment.created' }));
    expect(() => a.parseWebhookEvent(body, new Headers())).toThrow(/unsupported_event/);
  });

  it('throws on malformed JSON', () => {
    const a = bufferAdapter();
    expect(() => a.parseWebhookEvent(Buffer.from('not-json'), new Headers())).toThrow(/json_invalid/);
  });

  it('falls back to header-provided delivery id when payload omits it', () => {
    const a = bufferAdapter();
    const body = Buffer.from(JSON.stringify({ event: 'update.ready', data: { update: { id: 'b1', text: '' } } }));
    const evt = a.parseWebhookEvent(body, new Headers({ 'x-buffer-delivery-id': 'hdr-1' }));
    expect(evt.externalEventId).toBe('hdr-1');
  });
});

describe('bufferAdapter.fetchDraftContent', () => {
  it('maps a Buffer update row into SchedulerDraft with hashtags/mentions', async () => {
    const now = Math.floor(Date.now() / 1000);
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 'buf_1',
      text: 'Support your methylation with #wellness @clinic_x',
      profile_ids: ['pi_1'],
      profile_service: 'instagram',
      scheduled_at: now,
      updated_at: now - 60,
      media: { picture: 'https://cdn.example.com/img.jpg' },
    }), { status: 200 }));
    const a = bufferAdapter(fakeFetch as unknown as typeof fetch);
    const draft = await a.fetchDraftContent({
      connectionId: 'c1',
      externalPostId: 'buf_1',
      accessToken: 'at',
    });
    expect(draft.source).toBe('buffer');
    expect(draft.hashtags).toContain('wellness');
    expect(draft.mentionHandles).toContain('@clinic_x');
    expect(draft.targetPlatforms).toEqual(['instagram']);
    expect(draft.mediaAttachments).toHaveLength(1);
    expect(draft.mediaAttachments[0].storageUrl).toBe('https://cdn.example.com/img.jpg');
    expect(draft.contentHashSha256).toBeTruthy();
  });

  it('throws with status on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('nope', { status: 404 }));
    const a = bufferAdapter(fakeFetch as unknown as typeof fetch);
    await expect(a.fetchDraftContent({ connectionId: 'c1', externalPostId: 'missing', accessToken: 'at' }))
      .rejects.toThrow(/fetch_update_failed:404/);
  });
});

describe('bufferAdapter.attemptInterception', () => {
  it('returns succeeded=true on 2xx POST', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const a = bufferAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1',
      externalPostId: 'buf_1',
      accessToken: 'at',
      reason: 'disease_claim',
    });
    expect(r.mechanism).toBe('buffer_draft_status');
    expect(r.succeeded).toBe(true);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('returns succeeded=false with status on non-2xx', async () => {
    const fakeFetch = vi.fn(async () => new Response('err', { status: 500 }));
    const a = bufferAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'buf_1', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('500');
  });

  it('swallows network exceptions and returns succeeded=false', async () => {
    const fakeFetch = vi.fn(async () => { throw new Error('ECONNRESET'); });
    const a = bufferAdapter(fakeFetch as unknown as typeof fetch);
    const r = await a.attemptInterception({
      connectionId: 'c1', externalPostId: 'buf_1', accessToken: 'at', reason: 'x',
    });
    expect(r.succeeded).toBe(false);
    expect(r.errorMessage).toContain('exception');
  });
});

describe('bufferAdapter.revokeOAuthToken', () => {
  it('calls DELETE on the revoke endpoint and does not throw on platform error', async () => {
    let capturedInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (_url, init) => {
      capturedInit = init;
      return new Response('', { status: 401 });
    };
    const a = bufferAdapter(fakeFetch);
    await expect(a.revokeOAuthToken({ accessToken: 'at' })).resolves.toBeUndefined();
    expect(capturedInit?.method).toBe('DELETE');
  });
});
