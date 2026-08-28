import { createElement, type ReactNode } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { METRIC_LABELS, CONTRIBUTOR_METRICS } from '@/lib/body-tracker/contributor-rows';
import { buildMorningChips } from '@/lib/dashboard/morning-card/contributors';
import {
  MORNING_CHIP_FOOTER_KEYS,
  MORNING_CHIP_PRIMARY_KEYS,
} from '@/lib/dashboard/morning-card/keys';
import { MorningChipGrid } from '../MorningChipGrid';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => createElement('a', { href, className, ...rest }, children),
}));

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const CARD = 'src/components/dashboard/morning-card/MorningCard.tsx';
const CHIPS = 'src/components/dashboard/morning-card/MorningChipGrid.tsx';
const CTA = 'src/components/dashboard/morning-card/MorningProtocolCta.tsx';
const LIST = 'src/components/dashboard/morning-card/MorningContributorList.tsx';
const DASH = 'src/components/dashboard/ConsumerDashboard.tsx';
const PAGE = 'src/app/(app)/(consumer)/dashboard/page.tsx';
const KEYS = 'src/lib/dashboard/morning-card/keys.ts';
const BOS = 'src/hooks/use-bos-current.ts';

describe('Brief 29 morning card IA', () => {
  it('mounts MorningCard on /dashboard instead of the BOS engagement hero', () => {
    const dash = src(DASH);
    const page = src(PAGE);
    expect(dash).toContain('MorningCard');
    expect(dash).not.toMatch(/<BOSCard\s*\/>/);
    expect(dash).toContain('HelixRewardsSummary');
    expect(page).toContain('ConsumerDashboard');
  });

  it('mounts Connections BOS and does not slot /api/bos/current into the dial', () => {
    const card = src(CARD);
    const hook = src(BOS);
    expect(card).toContain('ConnectionsBosDial');
    expect(card).toContain('useHannahBosDisplay');
    expect(card).not.toContain('useBOSCurrent');
    expect(card).not.toContain('resolveHonestBosDisplay');
    expect(card).not.toContain('labelForScore');
    expect(hook).toContain("/api/bos/current");
    expect(card).not.toMatch(/compute_bio_optimization_score/);
    expect(card).not.toMatch(/baseline_from_caq/);
  });

  it('keeps protocol off the BOS plate and on TodaysProtocol', () => {
    const card = src(CARD);
    const cta = src(CTA);
    const dash = src(DASH);
    expect(card).not.toContain('MorningProtocolCtaButton');
    expect(card).not.toContain('firstIncompleteProtocolAction');
    expect(card).not.toContain('PROTOCOL_CTA_LOADING_BOUND_MS');
    expect(card).not.toContain('data-home-beat="protocol"');
    expect(card).toContain('useDailyScheduleView');
    expect(dash).toContain('<TodaysProtocol');
    expect(cta).toContain('data-cta-kind="error"');
    expect(cta).toContain('data-cta-retry');
    expect(cta).not.toContain("cta.kind === 'complete'");
    expect(cta).not.toContain("cta.kind === 'unavailable'");
    expect(card + cta).not.toMatch(/helix_challenges/);
    expect(card + cta).not.toMatch(/Helix Rewards/);
    expect(card + cta).not.toMatch(/Vitality/);
  });

  it('renders the 7 METRIC_LABELS as a compact in-score row at 390 and 1280 together', () => {
    const chips = src(CHIPS);
    const keys = src(KEYS);
    const card = src(CARD);
    expect(buildMorningChips().map((c) => c.label)).toEqual(
      CONTRIBUTOR_METRICS.map((k) => METRIC_LABELS[k]),
    );
    expect(keys).toContain('CONTRIBUTOR_METRICS');
    expect(keys).toContain('METRIC_LABELS');
    expect(keys).toContain('MORNING_CHIP_PRIMARY_KEYS');
    expect(keys).toContain('MORNING_CHIP_FOOTER_KEYS');
    expect(keys).not.toContain("'regimen'");
    expect(keys).not.toContain("'immune'");
    expect(chips).toContain('flex flex-wrap');
    expect(chips).toContain('listClassName');
    expect(chips).toContain('MORNING_CARD_CONTRIBUTORS_LABEL');
    expect(chips).toContain('data-morning-contributors="inline"');
    expect(chips).toContain("data-morning-chip-slot={showHeading ? 'honesty' : 'footer'}");
    expect(chips).toContain('showHeading = true');
    expect(chips).not.toContain('grid-cols-4');
    expect(chips).not.toContain('md:grid-cols-7');
    expect(chips).not.toContain('md:grid-cols-8');
    expect(chips).not.toContain('bg-[#1A2744]/70');
    expect(chips).toContain('min-h-[44px]');
    expect(chips).toContain('strokeWidth={1.5}');
    expect(chips).toContain('href={chip.href}');
    expect(chips).toContain('underline-offset-4');
    expect((card.match(/<MorningChipGrid/g) ?? []).length).toBe(2);
  });

  it('places the first five chips under the honesty sentence and Body comp + Steps in the footer', () => {
    const card = src(CARD);
    const jsx = card.indexOf('return (');
    const sentence = card.indexOf('hannahBos.sentence', jsx);
    const primary = card.indexOf('keys={MORNING_CHIP_PRIMARY_KEYS}', jsx);
    const sources = card.indexOf('hannahBos.result.chips', jsx);
    const band = card.indexOf('w-full border-t border-white/10 pt-3', jsx);
    const footer = card.indexOf('keys={MORNING_CHIP_FOOTER_KEYS}', jsx);
    const habit = card.indexOf('<HabitSleepPair', jsx);
    const unknown = card.indexOf('{BOS_UNKNOWN_NEVER_ZERO_COPY}', jsx);

    expect(sentence).toBeGreaterThan(-1);
    expect(primary).toBeGreaterThan(sentence);
    expect(sources).toBeGreaterThan(primary);
    expect(unknown).toBeGreaterThan(sources);
    expect(band).toBeGreaterThan(unknown);
    expect(footer).toBeGreaterThan(band);
    expect(habit).toBeGreaterThan(footer);

    const honestyColumn = card.slice(sentence, sources);
    expect(honestyColumn).toContain('<MorningChipGrid');
    expect(honestyColumn).toContain('MORNING_CHIP_PRIMARY_KEYS');
    expect(honestyColumn).not.toContain('MORNING_CHIP_FOOTER_KEYS');
    expect(honestyColumn).not.toContain('showHeading={false}');
    expect(honestyColumn).not.toContain('listClassName');
    expect(honestyColumn).not.toContain('body_composition');
    expect(honestyColumn).not.toContain('steps');

    const footerGrid = card.lastIndexOf('<MorningChipGrid');
    expect(footerGrid).toBeGreaterThan(sources);
    expect(footerGrid).toBeLessThan(habit);
    const footerBlock = card.slice(band, habit);
    expect(footerBlock).toContain('w-full border-t border-white/10 pt-3');
    expect(footerBlock).toContain('keys={MORNING_CHIP_FOOTER_KEYS}');
    expect(footerBlock).toContain('showHeading={false}');
    expect(footerBlock).toContain('listClassName="justify-center gap-x-6"');
    expect(footerBlock).not.toContain('MORNING_CARD_CONTRIBUTORS_LABEL');
    expect(card).not.toContain('MorningProtocolCtaButton');
  });

  it('renders five honesty chips with the heading and two footer chips without it', () => {
    const chips = buildMorningChips();
    const honesty = renderToStaticMarkup(
      createElement(MorningChipGrid, {
        chips,
        keys: [...MORNING_CHIP_PRIMARY_KEYS],
        selectedKey: null,
        onSelect: () => undefined,
      }),
    );
    const footer = renderToStaticMarkup(
      createElement(MorningChipGrid, {
        chips,
        keys: [...MORNING_CHIP_FOOTER_KEYS],
        showHeading: false,
        selectedKey: null,
        onSelect: () => undefined,
        listClassName: 'justify-center gap-x-6',
      }),
    );

    expect(honesty).toContain('In today&#x27;s score');
    expect(honesty).toContain('data-morning-chip-slot="honesty"');
    expect(honesty).toContain('data-chip="hrv"');
    expect(honesty).toContain('data-chip="sleep"');
    expect(honesty).toContain('data-chip="resting_hr"');
    expect(honesty).toContain('data-chip="recovery"');
    expect(honesty).toContain('data-chip="workouts"');
    expect(honesty).not.toContain('data-chip="body_composition"');
    expect(honesty).not.toContain('data-chip="steps"');
    expect(honesty).toContain('HRV');
    expect(honesty).toContain('Sleep');
    expect(honesty).toContain('Resting HR');
    expect(honesty).toContain('Recovery');
    expect(honesty).toContain('Workouts');
    expect(honesty).not.toContain('Body comp.');
    expect(honesty).not.toContain('md:grid-cols-7');
    expect(honesty).not.toContain('bg-[#1A2744]/70');
    expect(honesty).not.toContain('justify-center');
    expect(honesty).toContain('gap-x-1');

    expect(footer).not.toContain('In today&#x27;s score');
    expect(footer).not.toContain("In today's score");
    expect(footer).toContain('data-morning-chip-slot="footer"');
    expect(footer).toContain('data-chip="body_composition"');
    expect(footer).toContain('data-chip="steps"');
    expect(footer).toContain('Body comp.');
    expect(footer).toContain('Steps');
    expect(footer).toContain('justify-center');
    expect(footer).toContain('gap-x-6');
    expect(footer).not.toContain('data-chip="hrv"');
    expect(footer).not.toContain('md:grid-cols-7');
    expect(footer).not.toContain('bg-[#1A2744]/70');

    expect((honesty.match(/href="\/body-tracker\/connections"/g) ?? []).length).toBe(5);
    expect((footer.match(/href="\/body-tracker\/connections"/g) ?? []).length).toBe(2);
    expect((honesty.match(/min-h-\[44px\]/g) ?? []).length).toBe(5);
    expect((footer.match(/min-h-\[44px\]/g) ?? []).length).toBe(2);
    expect((honesty.match(/stroke-width="1.5"/g) ?? []).length).toBe(5);
    expect((footer.match(/stroke-width="1.5"/g) ?? []).length).toBe(2);
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
    expect(src(CARD)).toContain('bg-[rgba(255,255,255,0.035)]');
    expect(src(CARD)).toContain('backdrop-blur-sm');
    expect(src(CARD)).not.toContain('from-[#1E3054]/60');
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

  it('Brief 49: hero CTA stays one next action, not a homework essay', () => {
    const cta = src(CTA);
    expect(cta).toContain('data-cta-kind="action"');
    expect(cta).not.toContain('buildProtocolHomework');
    expect(cta).not.toContain('schedule-row-homework');
    expect(cta).not.toContain('Educational why is not on file');
    expect(cta).not.toContain('from CAQ');
    expect(cta).not.toContain('from GENEX360');
  });
});
