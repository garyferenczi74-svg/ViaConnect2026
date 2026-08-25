import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
const root = process.cwd();
const src = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('Prompt 230 token migration', () => {
  it('the connections card + panel carry no connections-palette inline hex', () => {
    const files = [
      src('src/components/body-tracker/connections/WearableTileCard.tsx'),
      src('src/components/body-tracker/connections/ScoreDetailPanel.tsx'),
      // Task 7 split the DISAGREE/Manual badge chrome (text-copper) out of
      // ScoreDetailPanel.tsx and into ContributorColumn.tsx.
      src('src/components/body-tracker/connections/ContributorColumn.tsx'),
    ].join('\n');
    for (const hex of ['#2DA5A0', '#B75E18', '#1A2744', '#1E3054']) {
      expect(files).not.toContain(hex);
    }
    expect(files).toContain('text-teal');
    expect(files).toContain('text-copper');
  });
  it('tailwind config exposes a Card color and Instrument font', () => {
    const cfg = src('tailwind.config.ts');
    expect(cfg).toContain('#1E3054');
    expect(cfg).toContain('instrument');
  });
});
