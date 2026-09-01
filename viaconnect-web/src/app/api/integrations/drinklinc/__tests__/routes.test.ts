import { describe, it, expect } from 'vitest';
import { GET as statusGet, POST as statusPost } from '../route';
import { GET as authorizeGet } from '../authorize/route';
import { GET as callbackGet, POST as callbackPost } from '../callback/route';
import { POST as disconnectPost } from '../disconnect/route';
import { DRINKLINC_COMING_SOON_MESSAGE } from '@/lib/integrations/drinklinc/config';

async function expectComingSoon(res: Response) {
  expect(res.status).toBe(501);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.status).toBe('coming_soon');
  expect(body.connected).toBe(false);
  expect(body.configured).toBe(false);
  expect(body.slug).toBe('drinklinc');
  expect(body.displayName).toBe('LINC');
  expect(body.message).toBe(DRINKLINC_COMING_SOON_MESSAGE);
  expect(body).not.toHaveProperty('access_token');
  expect(JSON.stringify(body)).not.toMatch(/"connected"\s*:\s*true/);
}

describe('DrinkLinc / LINC stub routes', () => {
  it('status authorize callback and disconnect return 501 Coming soon', async () => {
    await expectComingSoon(await statusGet());
    await expectComingSoon(await statusPost());
    await expectComingSoon(await authorizeGet());
    await expectComingSoon(await callbackGet());
    await expectComingSoon(await callbackPost());
    await expectComingSoon(await disconnectPost());
  });
});
