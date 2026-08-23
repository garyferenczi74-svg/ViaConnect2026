import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROUTE = path.resolve(__dirname, '..', 'route.ts');

describe('GET /api/genetics/variants source', () => {
  const source = readFileSync(ROUTE, 'utf-8');

  it('returns unauthorized UNKNOWN payload on 401, not empty 0', () => {
    expect(source).toContain('unauthorizedHubPayload()');
    expect(source).toContain('status: 401');
    expect(source).not.toContain('totalVariants: 0');
    expect(source).not.toContain("returning empty");
  });

  it('returns error UNKNOWN payload on throw, not fail-open 0', () => {
    expect(source).toContain('errorHubPayload()');
    expect(source).toContain('status: 500');
    expect(source).toContain('UNKNOWN, not empty 0');
  });

  it('loads observed counts through the read-only hub loader', () => {
    expect(source).toContain("import { loadHubVariants } from '@/lib/genetics/loadHubVariants'");
    expect(source).toContain('loadHubVariants(supabase, user.id)');
    expect(source).not.toContain('.upsert(');
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('markerCount');
    expect(source).not.toContain('HERO_BENTO_META');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
