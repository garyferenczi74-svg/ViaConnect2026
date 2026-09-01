import { describe, expect, it } from 'vitest';
import { DELETE, GET, PATCH, POST, PUT } from '@/app/api/integrations/clair/[[...path]]/route';
import { isClairConfigured } from '@/lib/wearables/clair/config';

describe('GET /api/integrations/clair/* fail-closed', () => {
  it('returns 501 not_configured for every verb and stays unconfigured', async () => {
    expect(isClairConfigured()).toBe(false);
    const handlers = [GET, POST, PUT, PATCH, DELETE];
    for (const handler of handlers) {
      const res = await handler();
      expect(res.status).toBe(501);
      const body = await res.json();
      expect(body).toEqual({ error: 'not_configured', configured: false });
    }
  });
});
