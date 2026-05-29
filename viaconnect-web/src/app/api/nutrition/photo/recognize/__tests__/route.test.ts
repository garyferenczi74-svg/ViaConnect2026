// Prompt #170 Phase 1j: tests for POST /api/nutrition/photo/recognize.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const VALID_UUID = '11111111-2222-4333-8444-555555555555';

const mocks = vi.hoisted(() => ({
  supabaseAuth: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
  detectMeal: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: mocks.supabaseAuth } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
    from: () => ({}),
  }),
}));

vi.mock('@/lib/nutrition/vision/detect', () => ({
  detectMeal: mocks.detectMeal,
}));

vi.mock('@/lib/observability/audit-recorder', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  newRequestId: () => 'req-test',
}));

import { POST } from '../route';

function makeReq(opts: {
  clientId?: string;
  deviceClass?: string;
  omitImage?: boolean;
  imageMime?: string;
}): NextRequest {
  const fd = new FormData();
  if (!opts.omitImage) {
    fd.append(
      'image',
      new File([new Uint8Array([0xff, 0xd8, 0xff])], 'meal.jpg', {
        type: opts.imageMime ?? 'image/jpeg',
      }),
    );
  }
  fd.append('captured_at', '2026-05-28T10:00:00.000Z');
  if (opts.clientId !== undefined) fd.append('client_id', opts.clientId);
  if (opts.deviceClass !== undefined) fd.append('device_class', opts.deviceClass);
  return new Request('http://localhost/api/nutrition/photo/recognize', {
    method: 'POST',
    body: fd,
  }) as unknown as NextRequest;
}

beforeEach(() => {
  mocks.supabaseAuth.mockReset();
  mocks.supabaseAuth.mockResolvedValue({ data: { user: { id: 'u1' } } });
  mocks.detectMeal.mockReset();
});

describe('POST /api/nutrition/photo/recognize', () => {
  it('returns 401 when no session', async () => {
    mocks.supabaseAuth.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ clientId: VALID_UUID, deviceClass: 'web' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when image missing', async () => {
    const res = await POST(
      makeReq({ omitImage: true, clientId: VALID_UUID, deviceClass: 'web' }),
    );
    expect(res.status).toBe(400);
  });

  it('happy path returns recognition + providers_called + from_cache', async () => {
    mocks.detectMeal.mockResolvedValueOnce({
      recognition: {
        items: [{
          id: 'logmeal-x',
          foodName: 'salad',
          boundingBox: { x: 0, y: 0, w: 100, h: 100 },
          confidence: 0.7,
        }],
        providerPrimary: 'logmeal',
        mealConfidence: 0.7,
        warnings: [],
      },
      fromCache: 'sha256_exact',
      providersCalled: [],
      warnings: [],
      totalLatencyMs: 5,
    });
    const res = await POST(makeReq({ clientId: VALID_UUID, deviceClass: 'web' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.recognition.items).toHaveLength(1);
    expect(json.from_cache).toBe('sha256_exact');
    expect(Array.isArray(json.providers_called)).toBe(true);
  });
});
