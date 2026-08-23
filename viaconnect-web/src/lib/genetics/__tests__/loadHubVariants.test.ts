import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LOADER = path.resolve(__dirname, '..', 'loadHubVariants.ts');

describe('loadHubVariants source', () => {
  const source = readFileSync(LOADER, 'utf-8');

  it('is a hub read path: never writes user_variants', () => {
    expect(source).toContain(".from('user_variants')");
    expect(source).toContain(".from('user_epigenetic_markers')");
    expect(source).toContain(".from('lab_biomarkers')");
    expect(source).not.toContain('.upsert(');
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('markerCount');
    expect(source).not.toContain('HERO_BENTO_META');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
