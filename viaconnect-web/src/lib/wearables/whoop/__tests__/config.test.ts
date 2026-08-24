import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getWhoopCreds, getWhoopRedirectUri, isWhoopConfigured } from '../config';

describe('Whoop config', () => {
  const prev = {
    id: process.env.WHOOP_CLIENT_ID,
    secret: process.env.WHOOP_CLIENT_SECRET,
    key: process.env.WEARABLE_TOKEN_KEY,
    redirect: process.env.WHOOP_REDIRECT_URI,
  };

  beforeEach(() => {
    delete process.env.WHOOP_CLIENT_ID;
    delete process.env.WHOOP_CLIENT_SECRET;
    delete process.env.WEARABLE_TOKEN_KEY;
    delete process.env.WHOOP_REDIRECT_URI;
  });

  afterEach(() => {
    process.env.WHOOP_CLIENT_ID = prev.id;
    process.env.WHOOP_CLIENT_SECRET = prev.secret;
    process.env.WEARABLE_TOKEN_KEY = prev.key;
    process.env.WHOOP_REDIRECT_URI = prev.redirect;
  });

  it('is not configured without Vercel secrets', () => {
    expect(getWhoopCreds()).toBeNull();
    expect(isWhoopConfigured()).toBe(false);
  });

  it('builds redirect from origin and never embeds a client id', () => {
    expect(getWhoopRedirectUri('https://app.example.com')).toBe(
      'https://app.example.com/api/integrations/whoop/callback',
    );
    const src = readFileSync(join(process.cwd(), 'src/lib/wearables/whoop/config.ts'), 'utf8');
    expect(src).not.toMatch(/placeholder/i);
    expect(src).not.toMatch(/WHOOP_CLIENT_ID\s*=\s*['"][^'"]+['"]/);
    expect(src).not.toMatch(/clientId:\s*['"][^'"]+['"]/);
  });
});
