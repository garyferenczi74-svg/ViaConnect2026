import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { GET as statusGet, POST as statusPost } from '../route';
import { GET as authorizeGet } from '../authorize/route';
import { GET as callbackGet, POST as callbackPost } from '../callback/route';
import { POST as disconnectPost } from '../disconnect/route';
import { DRINKLINC_COMING_SOON_MESSAGE } from '@/lib/integrations/drinklinc/config';

const drinklincApiRoot = join(process.cwd(), 'src/app/api/integrations/drinklinc');
const ROUTE_FILES = [
  'route.ts',
  'authorize/route.ts',
  'callback/route.ts',
  'disconnect/route.ts',
] as const;

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
  it('exports runtime as a Next.js string literal in every route file', () => {
    for (const rel of ROUTE_FILES) {
      const src = readFileSync(join(drinklincApiRoot, rel), 'utf8');
      expect(src, rel).toMatch(/export const runtime = ['"]nodejs['"]/);
      expect(src, rel).not.toContain('DRINKLINC_ROUTE_RUNTIME');
    }
    const comingSoon = readFileSync(join(drinklincApiRoot, 'comingSoon.ts'), 'utf8');
    expect(comingSoon).not.toContain('DRINKLINC_ROUTE_RUNTIME');
  });

  it('status authorize callback and disconnect return 501 Coming soon', async () => {
    await expectComingSoon(await statusGet());
    await expectComingSoon(await statusPost());
    await expectComingSoon(await authorizeGet());
    await expectComingSoon(await callbackGet());
    await expectComingSoon(await callbackPost());
    await expectComingSoon(await disconnectPost());
  });
});
