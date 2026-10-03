import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock('@/lib/utils/with-timeout', () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
  isTimeoutError: () => false,
}));

const info = vi.fn();
const errorLog = vi.fn();

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: (...args: unknown[]) => info(...args),
    warn: vi.fn(),
    error: (...args: unknown[]) => errorLog(...args),
  },
}));

import { POST } from '../route';

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const MESSAGE = '22222222-2222-4222-8222-222222222222';

function request(body: unknown): Request {
  return new Request('http://localhost/api/ai/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function chain(result: { data: unknown; error: { code?: string } | null }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(result),
    insert: () => builder,
    single: () => Promise.resolve(result),
  };
  return builder;
}

describe('POST /api/ai/report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: USER } });
  });

  it('returns 401 when the session is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      request({ surface: 'advisor', messageId: MESSAGE, reason: 'offensive' }),
    );
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown reason', async () => {
    const res = await POST(
      request({ surface: 'advisor', messageId: MESSAGE, reason: 'spam' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the advisor message is not the caller row', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    const res = await POST(
      request({ surface: 'advisor', messageId: MESSAGE, reason: 'offensive' }),
    );
    expect(res.status).toBe(404);
  });

  it('saves an advisor report and does not log the note', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'ultrathink_advisor_conversations') {
        return chain({ data: { id: MESSAGE, message_role: 'assistant' }, error: null });
      }
      return chain({ data: { id: '33333333-3333-4333-8333-333333333333' }, error: null });
    });

    const res = await POST(
      request({
        surface: 'advisor',
        messageId: MESSAGE,
        reason: 'offensive',
        note: 'patient name Jane Doe should not be logged',
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; id: string };
    expect(body.ok).toBe(true);
    expect(body.id).toBe('33333333-3333-4333-8333-333333333333');

    const logged = JSON.stringify(info.mock.calls);
    expect(logged).not.toContain('Jane Doe');
    expect(logged).not.toContain(USER.id);
    expect(info).toHaveBeenCalledWith(
      'api.ai.report',
      'saved',
      expect.objectContaining({ reason: 'offensive', surface: 'advisor' }),
    );
  });

  it('returns 400 when the advisor row is a user message', async () => {
    mockFrom.mockReturnValue(
      chain({ data: { id: MESSAGE, message_role: 'user' }, error: null }),
    );
    const res = await POST(
      request({ surface: 'advisor', messageId: MESSAGE, reason: 'inaccurate' }),
    );
    expect(res.status).toBe(400);
  });
});
