import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  CLAIR_COMING_SOON_NOTES,
  CLAIR_HONESTY_DISCLAIMER,
  CLAIR_PARTNER_HOST,
  CLAIR_PARTNER_ORIGIN,
  getClairCreds,
  isAllowedClairHost,
  isClairConfigured,
} from '../config';

describe('Clair config', () => {
  it('stays not configured and never embeds credentials', () => {
    expect(isClairConfigured()).toBe(false);
    expect(getClairCreds()).toBeNull();
    expect(CLAIR_PARTNER_ORIGIN).toBe('https://wearclair.com');
    expect(CLAIR_PARTNER_HOST).toBe('wearclair.com');
    expect(isAllowedClairHost('wearclair.com')).toBe(true);
    expect(isAllowedClairHost('https://other.example')).toBe(false);
    expect(CLAIR_HONESTY_DISCLAIMER).toBe(
      'Clair is not a medical device and is not for contraception.',
    );
    expect(CLAIR_COMING_SOON_NOTES).toContain(CLAIR_HONESTY_DISCLAIMER);
    expect(CLAIR_COMING_SOON_NOTES).toMatch(/JSON, CSV, or HealthKit export/);

    const src = readFileSync(join(process.cwd(), 'src/lib/wearables/clair/config.ts'), 'utf8');
    expect(src).not.toMatch(/placeholder/i);
    expect(src).not.toMatch(/CLAIR_CLIENT_ID\s*=\s*['"][^'"]+['"]/);
    expect(src).not.toMatch(/clientId:\s*['"][^'"]+['"]/);
    expect(src).not.toMatch(/REDIRECT_URI\s*=/);
    expect(src).not.toMatch(/AUTH_URL\s*=/);
    expect(src).not.toContain(['ask', 'clair', '.ai'].join(''));
    expect(src).not.toContain(['prod.ask', 'clair', '.ai'].join(''));
  });
});
