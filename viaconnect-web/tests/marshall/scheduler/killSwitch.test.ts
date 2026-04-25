import { describe, it, expect, vi } from 'vitest';
import { attemptInterception } from '@/lib/marshall/scheduler/intercept';
import { handleSchedulerWebhook } from '@/lib/marshall/scheduler/webhookHandler';
import type { SchedulerAdapter } from '@/lib/marshall/scheduler/adapters/types';

// ─── Helpers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabaseForIntercept(opts: { mode?: string; insertOk?: boolean }): { supabase: any; inserts: unknown[] } {
  const inserts: unknown[] = [];
  const supabase = {
    from(table: string) {
      if (table === 'scheduler_platform_states') {
        return {
          select: () => ({
            eq: () => ({
              async maybeSingle() {
                return { data: opts.mode ? { mode: opts.mode } : null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'scheduler_interceptions') {
        return {
          insert(row: unknown) {
            inserts.push(row);
            return {
              select: () => ({
                async single() {
                  return { data: { id: 'int-1' }, error: opts.insertOk === false ? { code: '40000' } : null };
                },
              }),
            };
          },
        };
      }
      return {};
    },
  };
  return { supabase, inserts };
}

function adapter(): SchedulerAdapter {
  return {
    platform: 'buffer',
    verifyWebhookSignature: () => true,
    parseWebhookEvent: () => ({
      platform: 'buffer',
      externalEventId: 'evt-1',
      eventType: 'post.ready',
      externalPostId: 'post-1',
      receivedAt: new Date().toISOString(),
      rawPayload: {},
    }),
    fetchDraftContent: async () => { throw new Error('unused'); },
    attemptInterception: vi.fn(async () => ({ mechanism: 'buffer_draft_status' as const, succeeded: true })),
    revokeOAuthToken: async () => {},
  };
}

// ─── Intercept kill-switch ────────────────────────────────────────────────

describe('attemptInterception kill-switch', () => {
  it('scan_only mode short-circuits: adapter never called + succeeded=false', async () => {
    const { supabase } = mockSupabaseForIntercept({ mode: 'scan_only' });
    const a = adapter();
    const r = await attemptInterception({
      supabase, adapter: a, scanId: 's1', connectionId: 'c1',
      externalPostId: 'p1', accessToken: 'at', reason: 'rule',
    });
    expect(r.result.succeeded).toBe(false);
    expect(r.result.mechanism).toBe('manual_block_note');
    expect(r.result.errorMessage).toBe('platform_mode:scan_only');
    expect(a.attemptInterception).not.toHaveBeenCalled();
  });

  it('disabled mode short-circuits too', async () => {
    const { supabase } = mockSupabaseForIntercept({ mode: 'disabled' });
    const a = adapter();
    const r = await attemptInterception({
      supabase, adapter: a, scanId: 's1', connectionId: 'c1',
      externalPostId: 'p1', accessToken: 'at', reason: 'rule',
    });
    expect(r.result.succeeded).toBe(false);
    expect(r.result.errorMessage).toBe('platform_mode:disabled');
    expect(a.attemptInterception).not.toHaveBeenCalled();
  });

  it('active mode calls adapter as usual', async () => {
    const { supabase } = mockSupabaseForIntercept({ mode: 'active' });
    const a = adapter();
    const r = await attemptInterception({
      supabase, adapter: a, scanId: 's1', connectionId: 'c1',
      externalPostId: 'p1', accessToken: 'at', reason: 'rule',
    });
    expect(r.result.succeeded).toBe(true);
    expect(a.attemptInterception).toHaveBeenCalledOnce();
  });

  it('missing platform-state row defaults to active (fail-safe)', async () => {
    const { supabase } = mockSupabaseForIntercept({});
    const a = adapter();
    const r = await attemptInterception({
      supabase, adapter: a, scanId: 's1', connectionId: 'c1',
      externalPostId: 'p1', accessToken: 'at', reason: 'rule',
    });
    expect(a.attemptInterception).toHaveBeenCalledOnce();
    expect(r.result.succeeded).toBe(true);
  });
});

// ─── Webhook kill-switch ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabaseForWebhook(opts: { mode?: string }): { supabase: any; eventInserted: boolean } {
  let eventInserted = false;
  const supabase = {
    from(table: string) {
      if (table === 'scheduler_platform_states') {
        return {
          select: () => ({
            eq: () => ({
              async maybeSingle() {
                return { data: opts.mode ? { mode: opts.mode } : null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'scheduler_events') {
        return {
          insert() {
            eventInserted = true;
            return {
              select: () => ({
                async maybeSingle() { return { data: { id: 'evt-row' }, error: null }; },
              }),
            };
          },
        };
      }
      return {};
    },
    _eventInserted() { return eventInserted; },
  };
  return { supabase, get eventInserted() { return eventInserted; } };
}

describe('handleSchedulerWebhook kill-switch', () => {
  it('disabled mode: returns platform_disabled outcome, no event persisted', async () => {
    const state = mockSupabaseForWebhook({ mode: 'disabled' });
    const r = await handleSchedulerWebhook({
      supabase: state.supabase,
      adapter: adapter(),
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 's',
    });
    expect(r.outcome).toBe('platform_disabled');
    expect(state.eventInserted).toBe(false);
  });

  it('scan_only mode: event IS still persisted (ingestion continues; intercept layer skips)', async () => {
    const state = mockSupabaseForWebhook({ mode: 'scan_only' });
    const r = await handleSchedulerWebhook({
      supabase: state.supabase,
      adapter: adapter(),
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 's',
    });
    expect(r.outcome).toBe('accepted');
    expect(state.eventInserted).toBe(true);
  });

  it('active mode: normal flow', async () => {
    const state = mockSupabaseForWebhook({ mode: 'active' });
    const r = await handleSchedulerWebhook({
      supabase: state.supabase,
      adapter: adapter(),
      rawBody: Buffer.from('{}'),
      headers: new Headers(),
      signingSecret: 's',
    });
    expect(r.outcome).toBe('accepted');
    expect(state.eventInserted).toBe(true);
  });
});
