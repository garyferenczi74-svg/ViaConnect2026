import { describe, it, expect, vi } from 'vitest';
import { attemptInterception } from '@/lib/marshall/scheduler/intercept';
import type { SchedulerAdapter } from '@/lib/marshall/scheduler/adapters/types';
import type { InterceptionResult } from '@/lib/marshall/scheduler/types';

function adapter(result: InterceptionResult): SchedulerAdapter {
  return {
    platform: 'buffer',
    verifyWebhookSignature: () => true,
    parseWebhookEvent: () => { throw new Error('unused'); },
    fetchDraftContent: async () => { throw new Error('unused'); },
    attemptInterception: vi.fn(async () => result),
    revokeOAuthToken: async () => {},
  } as SchedulerAdapter;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabase(insertOk = true): { supabase: any; inserts: unknown[] } {
  const inserts: unknown[] = [];
  const supabase = {
    from(_t: string) {
      return {
        insert(row: unknown) {
          inserts.push(row);
          return {
            select() {
              return {
                async single() {
                  if (!insertOk) return { data: null, error: { code: '40000', message: 'db_err' } };
                  return { data: { id: 'int-1' }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase, inserts };
}

describe('attemptInterception', () => {
  it('persists platform response (with secret-key redaction) and returns interceptionId', async () => {
    const { supabase, inserts } = mockSupabase();
    const a = adapter({
      mechanism: 'buffer_draft_status',
      succeeded: true,
      platformResponse: { status: 'draft', access_token: 'eyJshouldNotAppear123' },
    });
    const r = await attemptInterception({
      supabase,
      adapter: a,
      scanId: 'sc-1',
      connectionId: 'c1',
      externalPostId: 'post-1',
      accessToken: 'at',
      reason: 'high_severity_claim',
    });
    expect(r.interceptionId).toBe('int-1');
    expect(r.result.succeeded).toBe(true);
    const serialized = JSON.stringify(inserts);
    expect(serialized).toContain('[REDACTED:secret_like_key]');
    expect(serialized).not.toContain('eyJshouldNotAppear');
  });

  it('returns empty interceptionId but still passes the adapter result through on audit-row failure', async () => {
    const { supabase } = mockSupabase(false);
    const a = adapter({
      mechanism: 'later_reschedule',
      succeeded: false,
      errorMessage: 'later_401',
    });
    const r = await attemptInterception({
      supabase,
      adapter: a,
      scanId: 'sc-1',
      connectionId: 'c1',
      externalPostId: 'post-1',
      accessToken: 'at',
      reason: 'timeout',
    });
    expect(r.interceptionId).toBe('');
    expect(r.result.succeeded).toBe(false);
    expect(r.result.errorMessage).toBe('later_401');
  });
});
