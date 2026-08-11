import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Assert Prompt 212 wearable code never writes Gordon nutrition tables.
 */
function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe('Gordon isolation', () => {
  it('wearable modules do not write nutrition_targets or meals', () => {
    const root = join(process.cwd(), 'src/lib/wearables');
    const files = walk(root);
    const banned = [
      /from\(['"]nutrition_targets['"]\)/,
      /from\(['"]meals['"]\)/,
      /from\(['"]user_meals['"]\)/,
      /gordon-score/,
      /nutrition\/generate-targets/,
    ];
    for (const file of files) {
      // Skip this test file itself
      if (file.includes('gordon-isolation')) continue;
      const src = readFileSync(file, 'utf8');
      for (const b of banned) {
        expect(b.test(src), `${file} must not match ${b}`).toBe(false);
      }
    }
  });
});
