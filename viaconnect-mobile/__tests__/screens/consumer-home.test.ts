import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../..');

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Expo Home morning card IA', () => {
  it('kills the Vitality hero string and mounts MorningCard', () => {
    const home = src('app/(consumer)/index.tsx');
    const model = src('src/lib/morning-card/model.ts');
    expect(home).toContain('MorningCard');
    expect(home).toContain('bosCurrentUrl');
    expect(home).toContain('readBosCurrentScore');
    expect(model).toContain("/api/bos/current");
    expect(home).not.toMatch(/Vitality/);
    expect(home).not.toMatch(/VitalityScoreCard/);
    expect(home).not.toMatch(/Helix/);
  });

  it('keeps the existing palette and Lucide strokeWidth 1.5 on the card', () => {
    const card = src('src/components/consumer/MorningCard.tsx');
    expect(card).toContain('#1E3054');
    expect(card).toContain('#1A2744');
    expect(card).toContain('#2DA5A0');
    expect(card).toContain('strokeWidth={1.5}');
    expect(card).not.toContain('#224852');
    expect(card).not.toContain('#4ADE80');
    expect(card).not.toMatch(/Vitality/);
    expect(card).not.toMatch(/Helix/);
    expect(card).not.toMatch(/[—–]/);
  });
});
