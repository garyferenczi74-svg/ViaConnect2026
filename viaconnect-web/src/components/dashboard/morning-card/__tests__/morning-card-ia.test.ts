import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const CARD = 'src/components/dashboard/morning-card/MorningCard.tsx';
const CHIPS = 'src/components/dashboard/morning-card/MorningChipGrid.tsx';
const CTA = 'src/components/dashboard/morning-card/MorningProtocolCta.tsx';
const LIST = 'src/components/dashboard/morning-card/MorningContributorList.tsx';
const DASH = 'src/app/(app)/(consumer)/dashboard/page.tsx';
const KEYS = 'src/lib/dashboard/morning-card/keys.ts';
const BOS = 'src/hooks/use-bos-current.ts';

describe('Brief 1 morning card IA', () => {
  it('mounts MorningCard on /dashboard instead of the BOS engagement hero', () => {
    const dash = src(DASH);
    expect(dash).toContain('MorningCard');
    expect(dash).not.toMatch(/<BOSCard\s*\/>/);
    expect(dash).toContain('HelixRewardsSummary');
  });

  it('reuses /api/bos/current and does not rewrite score math', () => {
    const card = src(CARD);
    const hook = src(BOS);
    expect(card).toContain('useBOSCurrent');
    expect(hook).toContain("/api/bos/current");
    expect(card).not.toMatch(/compute_bio_optimization_score/);
    expect(card).not.toMatch(/baseline_from_caq/);
  });

  it('uses one TodaysProtocol CTA with no Helix fallback', () => {
    const card = src(CARD);
    const cta = src(CTA);
    expect(card).toContain('firstIncompleteProtocolAction');
    expect(card).toContain('useDailyScheduleView');
    expect(card + cta).not.toMatch(/helix/i);
    expect(card + cta).not.toMatch(/Vitality/);
  });

  it('renders eight marketing chips at 390 and 1280 together', () => {
    const chips = src(CHIPS);
    const keys = src(KEYS);
    expect(keys).toContain("'recovery'");
    expect(keys).toContain("'sleep'");
    expect(keys).toContain("'strain'");
    expect(keys).toContain("'regimen'");
    expect(keys).toContain("'nutrients'");
    expect(keys).toContain("'symptoms'");
    expect(keys).toContain("'metabolic'");
    expect(keys).toContain("'immune'");
    expect(chips).toContain('grid-cols-4');
    expect(chips).toContain('md:grid-cols-8');
    expect(chips).toContain('min-h-[44px]');
    expect(chips).toContain('strokeWidth={1.5}');
  });

  it('keeps contributor sources pending until Brief 12', () => {
    const list = src(LIST);
    const card = src(CARD);
    expect(card).toContain('buildMorningChips');
    expect(list).toContain('MORNING_CONTRIBUTOR_PENDING_NOTE');
    expect(list).toContain('data-source-status');
    expect(list).toContain('strokeWidth={1.5}');
    expect(list).not.toMatch(/last_sync/);
  });

  it('keeps the existing ViaConnect palette and does not swap the wordmark', () => {
    const all = src(CARD) + src(CHIPS) + src(CTA) + src(LIST);
    expect(all).toContain('#1E3054');
    expect(all).toContain('#1A2744');
    expect(all).toContain('#2DA5A0');
    expect(all).not.toContain('#224852');
    expect(all).not.toContain('#4ADE80');
    expect(all).not.toContain('font-serif');
    expect(all).not.toMatch(/ViaConnect/);
    expect(all).not.toMatch(/Vitality/);
    expect(all).not.toMatch(/Helix/);
    expect(all).not.toMatch(/Semaglutide/i);
  });
});
