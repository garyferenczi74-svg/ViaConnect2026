import { createElement, type ReactNode } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { METRIC_LABELS, CONTRIBUTOR_METRICS } from '@/lib/body-tracker/contributor-rows';
import { buildMorningChips } from '@/lib/dashboard/morning-card/contributors';
import { MORNING_CHIP_KEYS } from '@/lib/dashboard/morning-card/keys';
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
    expect([...MORNING_CHIP_KEYS]).toEqual([...CONTRIBUTOR_METRICS]);
    expect(keys).toContain('CONTRIBUTOR_METRICS');
    expect(keys).toContain('METRIC_LABELS');
    expect(keys).not.toContain('MORNING_CHIP_PRIMARY_KEYS');
    expect(keys).not.toContain('MORNING_CHIP_FOOTER_KEYS');
    expect(keys).not.toContain("'regimen'");
    expect(keys).not.toContain("'immune'");
    expect(chips).toContain('flex flex-wrap justify-center');
    expect(chips).toContain('text-center');
    expect(chips).not.toContain('listClassName');
    expect(chips).not.toContain('showHeading');
    expect(chips).toContain('MORNING_CARD_CONTRIBUTORS_LABEL');
    expect(chips).toContain('data-morning-contributors="inline"');
    expect(chips).toContain('data-morning-chip-slot="honesty"');
    expect(chips).not.toContain('footer');
    expect(chips).not.toContain('grid-cols-4');
    expect(chips).not.toContain('md:grid-cols-7');
    expect(chips).not.toContain('md:grid-cols-8');
    expect(chips).not.toContain('bg-[#1A2744]/70');
    expect(chips).toContain('CONSUMER_BOS_CHIP');
    expect(src('src/lib/ui/consumerChrome.ts')).toContain('min-h-[44px]');
    expect(chips).toContain('strokeWidth={1.5}');
    expect(chips).toContain('href={chip.href}');
    expect(chips).toContain('underline-offset-4');
    expect((card.match(/<MorningChipGrid/g) ?? []).length).toBe(1);
  });

  it('centers the honesty sentence and brightens plate type on the dark glass', () => {
    const card = src(CARD);
    const chips = src(CHIPS);
    const sentenceOpen = card.indexOf('hannahBos.sentence');
    const sentenceTag = card.lastIndexOf('<p', sentenceOpen);
    const sentenceBlock = card.slice(sentenceTag, sentenceOpen);

    expect(sentenceBlock).toContain('text-center');
    expect(sentenceBlock).toContain('text-white');
    expect(sentenceBlock).toContain('data-bos-honesty="centered"');
    expect(sentenceBlock).not.toContain('text-white/70');
    expect(src('src/lib/scoring/hannah-bos.ts')).toContain(
      'Bio Optimization Score blends only what you actually have today. Missing pieces are left out, not counted as zero.',
    );
    expect(card).toContain('hannahBos.sentence');
    expect(card).toContain('text-white/85');
    expect(card).toContain('CONSUMER_SOURCE_PILL');
    expect(card).toContain('CONSUMER_EYEBROW');
    expect(card).toContain('brightReadout');
    expect(card).not.toContain('text-white/40');
    expect(card).not.toContain('text-white/70');
    expect(chips).toContain('CONSUMER_EYEBROW');
    expect(chips).toContain('CONSUMER_BOS_CHIP');
    expect(chips).toContain('text-white/90');
    expect(chips).not.toContain('text-white/40');
    expect(chips).not.toContain('text-white/70');
    expect(card).not.toMatch(/Vitality|bioavailability|Bio availability/i);
  });

  it('lines the honesty cluster up with the vertical center of the plasma circle', () => {
    const card = src(CARD);
    const chips = src(CHIPS);
    const jsx = card.indexOf('return (');
    const rowOpen = card.indexOf('className="grid', jsx);
    const rowClose = card.indexOf('>', rowOpen);
    const rowClass = card.slice(rowOpen, rowClose);
    const copyOpen = card.indexOf('flex w-full min-w-0 flex-col items-center', jsx);
    const copyClose = card.indexOf('>', copyOpen);
    const copyClass = card.slice(copyOpen, copyClose);
    const pillsOpen = card.indexOf('hannahBos.result.chips.length', jsx);
    const pillsBlock = card.slice(pillsOpen, card.indexOf('<HabitSleepPair', jsx));

    expect(rowClass).toContain('md:items-center');
    expect(rowClass).toContain('justify-items-center');
    expect(rowClass).not.toContain('md:items-start');
    expect(card).not.toContain('md:flex-row md:items-start');
    expect(copyClass).toContain('items-center');
    expect(copyClass).toContain('text-center');
    expect(copyClass).toContain('md:self-center');
    expect(copyClass).toContain('md:translate-y-2.5');
    expect(copyClass).toContain('md:row-start-2');
    expect(card).toContain('md:col-start-1 md:row-start-2');
    expect(card).toContain('data-bos-honesty="centered"');
    expect(chips).toContain('text-center');
    expect(chips).toContain('justify-center');
    expect(pillsBlock).toContain('justify-center');
    expect(pillsBlock).toContain('text-center');
    expect(pillsBlock).toContain('BOS_UNKNOWN_NEVER_ZERO_COPY');
  });

  it('places one In today\'s score row of all seven under the honesty sentence, then source chips', () => {
    const card = src(CARD);
    const jsx = card.indexOf('return (');
    const sentence = card.indexOf('hannahBos.sentence', jsx);
    const grid = card.indexOf('<MorningChipGrid', jsx);
    const sources = card.indexOf('hannahBos.result.chips', jsx);
    const habit = card.indexOf('<HabitSleepPair', jsx);
    const unknown = card.indexOf('{BOS_UNKNOWN_NEVER_ZERO_COPY}', jsx);

    expect(sentence).toBeGreaterThan(-1);
    expect(grid).toBeGreaterThan(sentence);
    expect(sources).toBeGreaterThan(grid);
    expect(unknown).toBeGreaterThan(sources);
    expect(habit).toBeGreaterThan(unknown);

    const honestyColumn = card.slice(sentence, sources);
    expect(honestyColumn).toContain('<MorningChipGrid');
    expect(honestyColumn).not.toContain('MORNING_CHIP_PRIMARY_KEYS');
    expect(honestyColumn).not.toContain('MORNING_CHIP_FOOTER_KEYS');
    expect(honestyColumn).not.toContain('showHeading');
    expect(honestyColumn).not.toContain('listClassName');
    expect(honestyColumn).not.toContain('keys=');

    expect(card).not.toContain('w-full border-t border-white/10 pt-3');
    expect(card).not.toContain('data-morning-chip-slot="footer"');
    expect(card).not.toContain('MORNING_CHIP_PRIMARY_KEYS');
    expect(card).not.toContain('MORNING_CHIP_FOOTER_KEYS');
    expect(card).not.toContain('MorningProtocolCtaButton');
    expect((card.match(/<MorningChipGrid/g) ?? []).length).toBe(1);
  });

  it('renders all seven labels in SSOT order in one honesty slot', () => {
    const chips = buildMorningChips();
    const honesty = renderToStaticMarkup(
      createElement(MorningChipGrid, {
        chips,
        selectedKey: null,
        onSelect: () => undefined,
      }),
    );

    expect(honesty).toContain('In today&#x27;s score');
    expect(honesty).toContain('text-white/80');
    expect(honesty).toContain('text-white/90');
    expect(honesty).not.toContain('text-white/40');
    expect(honesty).not.toContain('text-white/70');
    expect(honesty).toContain('data-morning-chip-slot="honesty"');
    expect(honesty).not.toContain('data-morning-chip-slot="footer"');
    expect((honesty.match(/data-morning-chip-slot=/g) ?? []).length).toBe(1);

    const chipOrder = [
      'data-chip="hrv"',
      'data-chip="sleep"',
      'data-chip="resting_hr"',
      'data-chip="recovery"',
      'data-chip="workouts"',
      'data-chip="body_composition"',
      'data-chip="steps"',
    ];
    const positions = chipOrder.map((token) => honesty.indexOf(token));
    expect(positions.every((index) => index > -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    const labels = ['HRV', 'Sleep', 'Resting HR', 'Recovery', 'Workouts', 'Body comp.', 'Steps'];
    const labelPositions = labels.map((label) => honesty.indexOf(label));
    expect(labelPositions.every((index) => index > -1)).toBe(true);
    expect(labelPositions).toEqual([...labelPositions].sort((a, b) => a - b));

    expect(honesty).not.toContain('md:grid-cols-7');
    expect(honesty).not.toContain('bg-[#1A2744]/70');
    expect(honesty).toContain('justify-center');
    expect(honesty).toContain('text-center');
    expect(honesty).toContain('gap-x-1');
    expect(honesty).toContain('flex-wrap');

    expect((honesty.match(/href="\/body-tracker\/connections"/g) ?? []).length).toBe(7);
    expect((honesty.match(/min-h-\[44px\]/g) ?? []).length).toBe(7);
    expect((honesty.match(/stroke-width="1.5"/g) ?? []).length).toBe(7);
    expect((honesty.match(/In today/g) ?? []).length).toBe(1);
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
