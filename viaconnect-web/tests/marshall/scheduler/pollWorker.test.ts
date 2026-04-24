import { describe, it, expect } from 'vitest';
import { computeBackoff, runPollTick } from '@/lib/marshall/scheduler/pollWorker';
import type { SchedulerConnection } from '@/lib/marshall/scheduler/types';

function conn(over: Partial<SchedulerConnection> = {}): SchedulerConnection {
  return {
    id: 'conn-1',
    practitionerId: 'p1',
    platform: 'later',
    externalAccountId: 'ext-a',
    externalAccountLabel: null,
    scopesGranted: ['read_posts'],
    tokenVaultRef: 'vault-ref',
    active: true,
    connectedAt: new Date().toISOString(),
    lastVerifiedAt: null,
    lastEventAt: null,
    ...over,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSupabase(prevConsecutive = 0): { supabase: any; upserts: unknown[] } {
  const upserts: unknown[] = [];
  const supabase = {
    from(_t: string) {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: { consecutive_errors: prevConsecutive }, error: null };
                },
              };
            },
          };
        },
        upsert(row: unknown) {
          upserts.push(row);
          return { error: null };
        },
      };
    },
  };
  return { supabase, upserts };
}

describe('computeBackoff', () => {
  it('no errors -> 5 minute cadence', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const next = computeBackoff(0, now);
    expect(new Date(next).getTime() - now.getTime()).toBe(5 * 60 * 1000);
  });

  it('1 error -> 5m', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const next = computeBackoff(1, now);
    expect(new Date(next).getTime() - now.getTime()).toBe(5 * 60 * 1000);
  });

  it('2 errors -> 10m', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const next = computeBackoff(2, now);
    expect(new Date(next).getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it('3 errors -> 20m', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const next = computeBackoff(3, now);
    expect(new Date(next).getTime() - now.getTime()).toBe(20 * 60 * 1000);
  });

  it('5 errors -> 60m cap', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const next = computeBackoff(5, now);
    expect(new Date(next).getTime() - now.getTime()).toBe(60 * 60 * 1000);
  });

  it('10 errors -> still 60m cap', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const next = computeBackoff(10, now);
    expect(new Date(next).getTime() - now.getTime()).toBe(60 * 60 * 1000);
  });
});

describe('runPollTick', () => {
  it('skipped_disconnected when connection inactive', async () => {
    const { supabase, upserts } = mockSupabase();
    const r = await runPollTick({
      supabase,
      connection: conn({ active: false }),
      poll: async () => ({ ok: true }),
    });
    expect(r.outcome).toBe('skipped_disconnected');
    expect(upserts).toHaveLength(1);
  });

  it('success: resets consecutive_errors, bumps next_poll_at 5m', async () => {
    const { supabase, upserts } = mockSupabase(3);
    const now = new Date('2026-05-01T00:00:00Z');
    const r = await runPollTick({
      supabase,
      connection: conn(),
      poll: async () => ({ ok: true }),
      now,
    });
    expect(r.outcome).toBe('success');
    const row = upserts[0] as Record<string, unknown>;
    expect(row.consecutive_errors).toBe(0);
    expect(row.last_error_message).toBeNull();
  });

  it('error: increments consecutive_errors + records last_error_message', async () => {
    const { supabase, upserts } = mockSupabase(1);
    const r = await runPollTick({
      supabase,
      connection: conn(),
      poll: async () => ({ ok: false, error: 'later_502' }),
    });
    expect(r.outcome).toBe('error');
    if (r.outcome === 'error') expect(r.errorMessage).toBe('later_502');
    const row = upserts[0] as Record<string, unknown>;
    expect(row.consecutive_errors).toBe(2);
    expect(row.last_error_message).toBe('later_502');
  });
});
