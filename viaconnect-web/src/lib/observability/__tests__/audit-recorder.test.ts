import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { recordAudit } from '../audit-recorder';

describe('recordAudit', () => {
  beforeEach(() => { insertMock.mockClear(); fromMock.mockClear(); });

  it('inserts one row with the given fields', async () => {
    await recordAudit({
      requestId: 'req-1', userId: 'u1', route: '/api/nutrition/analyze-text',
      provider: 'google', model: 'gemini-2.5-flash', outcome: 'success',
      httpStatus: 200, inputChars: 30, latencyMs: 421, costUsd: 0,
    });
    expect(fromMock).toHaveBeenCalledWith('ai_route_audit');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.request_id).toBe('req-1');
    expect(row.provider).toBe('google');
    expect(row.outcome).toBe('success');
    expect(row.cost_usd).toBe(0);
  });

  it('never throws on Supabase failure', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'boom' } });
    await expect(recordAudit({
      requestId: 'req-2', route: '/api/nutrition/analyze-text',
      provider: 'google', outcome: 'failure', httpStatus: 503,
    })).resolves.toBeUndefined();
  });

  it('newRequestId returns a unique-ish string', async () => {
    const { newRequestId } = await import('../audit-recorder');
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
});
