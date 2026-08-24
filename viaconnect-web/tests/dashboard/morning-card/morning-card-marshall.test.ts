import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', 'src', 'components', 'dashboard', 'morning-card');

const FILES = [
  'MorningCard.tsx',
  'MorningChipGrid.tsx',
  'MorningProtocolCta.tsx',
  'MorningContributorList.tsx',
];

describe('morning card Marshall scan', () => {
  for (const file of FILES) {
    const p = path.join(ROOT, file);
    it(`${file} exists and contains no em dashes, en dashes, or emojis`, () => {
      expect(existsSync(p), `expected ${file} to exist`).toBe(true);
      const src = readFileSync(p, 'utf-8');
      expect(src, `em dash found in ${file}`).not.toMatch(/—/);
      expect(src, `en dash found in ${file}`).not.toMatch(/–/);
      expect(src, `emoji found in ${file}`).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    });

    it(`${file} never uses Vitality or Helix Rewards`, () => {
      const src = readFileSync(p, 'utf-8');
      expect(src).not.toMatch(/Vitality/i);
      expect(src).not.toMatch(/Helix Rewards/i);
      expect(src).not.toMatch(/helix_challenges/);
    });
  }
});
