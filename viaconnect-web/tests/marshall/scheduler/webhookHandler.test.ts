import { describe, it, expect, vi } from 'vitest';
import { handleSchedulerWebhook } from '@/lib/marshall/scheduler/webhookHandler';
import type { SchedulerAdapter } from '@/lib/marshall/scheduler/adapters/types';

function adapter(
  verify: (input: { signingSecret: string }) => boolean,
  parse: () => ReturnType<SchedulerAdapter['parseWebhookEvent']>,
): SchedulerAdapter {
  return {
    platform: 'buffer',
    verifyWebhookSignature: (input) => verify(input),
    parseWebhookEvent: () => parse(),
    fetchDraftContent: async () => { throw new Error('not used in tests'); },
    attemptInterception: async () => ({ mechanism: 'buffer_draft_status', succeeded: false }),
    revokeOAuthToken: async () => {},
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabase(insertBehavior: 'ok' | 'dup' | 'err'): { supabase: any; insertedRows: unknown[] } {
  const insertedRows: unknown[] = [];
  const supabase = {
    from(_t: string) {
      return {
        insert(row: unknown) {
          insertedRows.push(row);
          return {
            select() {
              return {
                async maybeSingle() {
                  if (insertBehavior === 'dup') {
                    return { data: null, error: { code: '23505', message: 'duplicate key' } };
                  }
                  if (insertBehavior === 'err') {
                    return { data: null, error: { code: '40000', message: 'bad thing' } };
                  }
                  return { data: { id: 'evt-row-1' }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase, insertedRows };
}

describe('handleSchedulerWebhook', () => {
  it('rejects invalid signature with outcome=rejected_invalid_signature', async () => {
    const a = adapter(() => false, () => { throw new Error('should not parse'); });
    const { supabase } = mockSupabase('ok');
    const r = await handleSchedulerWebhook({
      supabase,
      adapter: a,
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 'secret',
    });
    expect(r.outcome).toBe('rejected_invalid_signature');
  });

  it('rejects parse errors with rejected_parse_error', async () => {
    const a = adapter(() => true, () => { throw new Error('unrecognized payload'); });
    const { supabase } = mockSupabase('ok');
    const r = await handleSchedulerWebhook({
      supabase,
      adapter: a,
      rawBody: Buffer.from('garbage'),
      headers: new Headers(),
      signingSecret: 's',
    });
    expect(r.outcome).toBe('rejected_parse_error');
  });

  it('writes scheduler_events row on fresh insert and returns accepted', async () => {
    const a = adapter(() => true, () => ({
      platform: 'buffer',
      externalEventId: 'evt-42',
      eventType: 'post.ready',
      externalPostId: 'buf_post_1',
      receivedAt: new Date().toISOString(),
      rawPayload: { token: 'eyJ-should-be-scrubbed' },
    }));
    const { supabase, insertedRows } = mockSupabase('ok');
    const r = await handleSchedulerWebhook({
      supabase,
      adapter: a,
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 's',
    });
    expect(r.outcome).toBe('accepted');
    if (r.outcome === 'accepted') {
      expect(r.eventRowId).toBe('evt-row-1');
      expect(r.event.externalEventId).toBe('evt-42');
    }
    // Token-shaped key redacted in the persisted raw_payload
    const serialized = JSON.stringify(insertedRows);
    expect(serialized).toContain('[REDACTED:secret_like_key]');
    expect(serialized).not.toContain('eyJ-should-be-scrubbed');
  });

  it('returns deduplicated when UNIQUE (platform, external_event_id) already exists', async () => {
    const a = adapter(() => true, () => ({
      platform: 'buffer',
      externalEventId: 'evt-42',
      eventType: 'post.ready',
      receivedAt: new Date().toISOString(),
      rawPayload: {},
    }));
    const { supabase } = mockSupabase('dup');
    const r = await handleSchedulerWebhook({
      supabase,
      adapter: a,
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 's',
    });
    expect(r.outcome).toBe('deduplicated');
  });

  it('throws on non-conflict DB errors so caller can route to retry', async () => {
    const a = adapter(() => true, () => ({
      platform: 'buffer',
      externalEventId: 'evt-42',
      eventType: 'post.ready',
      receivedAt: new Date().toISOString(),
      rawPayload: {},
    }));
    const { supabase } = mockSupabase('err');
    await expect(handleSchedulerWebhook({
      supabase,
      adapter: a,
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 's',
    })).rejects.toThrow(/webhook_persist_failed/);
  });

  it('verifyWebhookSignature is called BEFORE parse + insert', async () => {
    const verify = vi.fn(() => false);
    const parse = vi.fn(() => {
      throw new Error('should not reach parse');
    });
    const a: SchedulerAdapter = {
      platform: 'buffer',
      verifyWebhookSignature: verify,
      parseWebhookEvent: parse,
      fetchDraftContent: async () => { throw new Error('unused'); },
      attemptInterception: async () => ({ mechanism: 'buffer_draft_status', succeeded: false }),
      revokeOAuthToken: async () => {},
    };
    const { supabase, insertedRows } = mockSupabase('ok');
    await handleSchedulerWebhook({
      supabase,
      adapter: a,
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 's',
    });
    expect(verify).toHaveBeenCalledOnce();
    expect(parse).not.toHaveBeenCalled();
    expect(insertedRows).toEqual([]);
  });
});
