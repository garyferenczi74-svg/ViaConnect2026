import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getOuraCreds, getOuraRedirectUri, isOuraConfigured } from '../config';

describe('Oura config', () => {
  const prev = {
    id: process.env.OURA_CLIENT_ID,
    secret: process.env.OURA_CLIENT_SECRET,
    key: process.env.WEARABLE_TOKEN_KEY,
    redirect: process.env.OURA_REDIRECT_URI,
  };

  beforeEach(() => {
    delete process.env.OURA_CLIENT_ID;
    delete process.env.OURA_CLIENT_SECRET;
    delete process.env.WEARABLE_TOKEN_KEY;
    delete process.env.OURA_REDIRECT_URI;
  });

  afterEach(() => {
    process.env.OURA_CLIENT_ID = prev.id;
    process.env.OURA_CLIENT_SECRET = prev.secret;
    process.env.WEARABLE_TOKEN_KEY = prev.key;
    process.env.OURA_REDIRECT_URI = prev.redirect;
  });

  it('is not configured without Vercel secrets', () => {
    expect(getOuraCreds()).toBeNull();
    expect(isOuraConfigured()).toBe(false);
  });

  it('builds redirect from origin and never embeds a client id', () => {
    expect(getOuraRedirectUri('https://app.example.com')).toBe(
      'https://app.example.com/api/integrations/oura/callback',
    );
    const src = readFileSync(join(process.cwd(), 'src/lib/wearables/oura/config.ts'), 'utf8');
    expect(src).not.toMatch(/placeholder/i);
    expect(src).not.toMatch(/OURA_CLIENT_ID\s*=\s*['"][^'"]+['"]/);
    expect(src).not.toMatch(/clientId:\s*['"][^'"]+['"]/);
  });
});
