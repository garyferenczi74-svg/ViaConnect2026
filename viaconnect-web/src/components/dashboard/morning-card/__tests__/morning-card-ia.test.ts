import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { METRIC_LABELS, CONTRIBUTOR_METRICS } from '@/lib/body-tracker/contributor-rows';
import { buildMorningChips } from '@/lib/dashboard/morning-card/contributors';

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

describe('Brief 29 morning card IA', () => {
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
    expect(card).toContain('resolveHonestBosDisplay');
    expect(card).toContain('BOS_INSUFFICIENT_DATA_COPY');
    expect(card).not.toMatch(/compute_bio_optimization_score/);
    expect(card).not.toMatch(/baseline_from_caq/);
  });

  it('uses one TodaysProtocol CTA with no Helix fallback', () => {
    const card = src(CARD);
    const cta = src(CTA);
    expect(card).toContain('firstIncompleteProtocolAction');
    expect(card).toContain('useDailyScheduleView');
    expect(card + cta).not.toMatch(/helix_challenges/);
    expect(card + cta).not.toMatch(/Helix Rewards/);
    expect(card + cta).not.toMatch(/Vitality/);
  });

  it('renders the 7 METRIC_LABELS chips at 390 and 1280 together', () => {
    const chips = src(CHIPS);
    const keys = src(KEYS);
    expect(buildMorningChips().map((c) => c.label)).toEqual(
      CONTRIBUTOR_METRICS.map((k) => METRIC_LABELS[k]),
    );
    expect(keys).toContain('CONTRIBUTOR_METRICS');
    expect(keys).toContain('METRIC_LABELS');
    expect(keys).not.toContain("'regimen'");
    expect(keys).not.toContain("'immune'");
    expect(chips).toContain('grid-cols-4');
    expect(chips).toContain('md:grid-cols-7');
    expect(chips).not.toContain('md:grid-cols-8');
    expect(chips).toContain('min-h-[44px]');
    expect(chips).toContain('strokeWidth={1.5}');
    expect(chips).toContain('href={chip.href}');
  });

  it('drives chip/detail from wearable-tiles last-sync and deep-links to connections', () => {
    const list = src(LIST);
    const card = src(CARD);
    expect(card).toContain('buildMorningChips');
    expect(card).toContain('useWearableTilesSnapshot');
    expect(card).toContain('useSleepTileSynced');
    expect(list).toContain('MORNING_CONTRIBUTOR_PENDING_NOTE');
    expect(list).toContain('data-source-status');
    expect(list).toContain('strokeWidth={1.5}');
    expect(list).toContain('href={row.href}');
    expect(list).not.toMatch(/last_sync/);
    expect(card + list).not.toContain('native_health_bridge');
    expect(card + list).not.toContain('getWearableSource');
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
    expect(all).not.toMatch(/helix_challenges/);
    expect(all).not.toMatch(/Helix Rewards/);
    expect(all).not.toMatch(/Semaglutide/i);
  });
});
