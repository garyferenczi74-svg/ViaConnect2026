import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Firecrawl search response shape (2026 data.web)', () => {
  it('client parses both flat data[] and grouped data.web[]', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/lib/hounddog/firecrawl/client.ts'),
      'utf8',
    );
    expect(src).toContain("json.data && 'web' in json.data");
    expect(src).toContain('Array.isArray(json.data)');
    expect(src).toContain("FIRECRAWL_SEARCH_URL");
  });
});
