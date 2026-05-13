import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  return {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ insert: mocks.insert }) }),
}));

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  mocks.insert.mockClear();
  process.env.GEMINI_API_KEY = 'TK';
  process.env.USDA_FDC_API_KEY = 'TK';
  process.env.ADMIN_HEALTH_TOKEN = 'secret';
});

import { GET } from '../route';

function req(token?: string): NextRequest {
  const url = new URL('http://localhost/api/admin/health/ai-stack');
  if (token) url.searchParams.set('token', token);
  return new Request(url) as unknown as NextRequest;
}

describe('GET /api/admin/health/ai-stack', () => {
  it('rejects missing token', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns healthy/healthy and writes 2 rows when both providers OK', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ foods: [{ fdcId: 1, description: 'Apple' }] }), { status: 200 }));
    const res = await GET(req('secret'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.gemini.status).toBe('healthy');
    expect(json.usda.status).toBe('healthy');
    expect(mocks.insert).toHaveBeenCalledTimes(2);
  });

  it('marks gemini down when Gemini returns 500', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    const res = await GET(req('secret'));
    const json = await res.json();
    expect(json.gemini.status).toBe('down');
  });

  it('redacts key= query param from Gemini errorMessage on 500', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('Error contacting upstream: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=SECRET123 returned 500', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ foods: [] }), { status: 200 }));
    const res = await GET(req('secret'));
    const json = await res.json();
    expect(json.gemini.errorMessage).not.toContain('SECRET123');
    expect(json.gemini.errorMessage).toContain('REDACTED');
  });
});
