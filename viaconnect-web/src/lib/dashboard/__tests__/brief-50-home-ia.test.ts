import { createElement, type ReactNode } from 'react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HomeBeatEntry } from '@/components/dashboard/HomeBeatEntry';
import {
  HOME_ADMIN_CC_HREF,
  HOME_ADMIN_CC_LABEL,
  HOME_BEAT_ORDER,
  HOME_CONNECTIONS_HREF,
  HOME_CONNECTIONS_LABEL,
  HOME_CONSUMER_HANNAH_HREF,
  HOME_CONSUMER_HANNAH_LABEL,
  homeCommandCenterHref,
  homeCommandCenterLabel,
} from '@/lib/dashboard/home-beats';
import { PROTOCOL_CTA_LOADING_BOUND_MS } from '@/lib/dashboard/morning-card/protocol-cta';
import { Plug } from 'lucide-react';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function sha256(rel: string): string {
  return createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
}

function beatIndex(haystack: string, beat: string): number {
  const dataAttr = haystack.indexOf(`data-home-beat="${beat}"`);
  if (dataAttr !== -1) return dataAttr;
  return haystack.indexOf(`beat="${beat}"`);
}

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

const PAGE = 'src/app/(app)/(consumer)/dashboard/page.tsx';
const DASH = 'src/components/dashboard/ConsumerDashboard.tsx';
const CARD = 'src/components/dashboard/morning-card/MorningCard.tsx';
const CTA = 'src/components/dashboard/morning-card/MorningProtocolCta.tsx';
const PROTOCOL = 'src/components/dashboard/TodaysProtocol.tsx';
const CHIPS = 'src/components/dashboard/morning-card/MorningChipGrid.tsx';
const ENTRY = 'src/components/dashboard/HomeBeatEntry.tsx';
const BEATS = 'src/lib/dashboard/home-beats.ts';
const HOMEWORK = 'src/lib/supplements/protocolHomework.ts';
const HOMEWORK_TEST = 'src/lib/supplements/__tests__/protocolHomework49.test.ts';
const SCHEDULE_CARD = 'src/components/supplements/ScheduleSupplementCard.tsx';
const SIDEBAR = 'src/components/layout/Sidebar.tsx';

const HOME = src(DASH);
const PAGE_SRC = src(PAGE);
const CARD_SRC = src(CARD);
const CTA_SRC = src(CTA);
const PROTOCOL_SRC = src(PROTOCOL);
const CHIPS_SRC = src(CHIPS);
const ENTRY_SRC = src(ENTRY);

const HOME_WIDTHS = [390, 1280] as const;

describe('Brief 50 desktop Home uses the same IA as mobile', () => {
  it.each(HOME_WIDTHS)('locks bos + protocol only on home at %d', (width) => {
    expect(width === 390 || width === 1280).toBe(true);
    expect(HOME_BEAT_ORDER).toEqual(['bos', 'protocol']);

    const bos = beatIndex(CARD_SRC, 'bos');
    const protocolOnCard = beatIndex(CARD_SRC, 'protocol');
    const protocol = beatIndex(PROTOCOL_SRC, 'protocol');
    const connections = beatIndex(HOME, 'connections');
    const commandCenter = beatIndex(HOME, 'command-center');
    const scores = HOME.indexOf('<DailyScoresPanel');
    const schedule = HOME.indexOf('<TodaysProtocol');

    expect(bos).toBeGreaterThan(-1);
    expect(protocolOnCard).toBe(-1);
    expect(protocol).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(HOME.indexOf('<MorningCard'));
    expect(connections).toBe(-1);
    expect(commandCenter).toBe(-1);
    expect(scores).toBeGreaterThan(HOME.indexOf('<MorningCard'));
    expect(schedule).toBeGreaterThan(HOME.indexOf('<MorningCard'));

    expect(HOME).toContain('data-home-beats="true"');
    expect(HOME).toContain('<MorningCard');
    expect(HOME).not.toContain('HomeBeatEntry');
    expect(HOME).not.toContain('beat="connections"');
    expect(HOME).not.toContain('beat="command-center"');
    expect(HOME).not.toContain('homeCommandCenterHref');
    expect(HOME).not.toContain('homeCommandCenterLabel');
    expect(HOME).not.toContain('HOME_ADMIN_CC_LABEL');
    expect(HOME).not.toContain('Jeffery™ Command Center');
    expect(HOME).not.toContain('/admin/jeffery');
    expect(ENTRY_SRC).toContain('data-home-beat={beat}');
    expect(PAGE_SRC).toContain('ConsumerDashboard');
    expect(PAGE_SRC).not.toContain('sessionRole');

    const beatsBlock = HOME.slice(
      HOME.indexOf('data-home-beats="true"'),
      HOME.indexOf('<DailyScoresPanel'),
    );
    expect(beatsBlock).toContain('<MorningCard');
    expect(beatsBlock).not.toContain('HomeBeatEntry');
    expect(beatsBlock).not.toContain('connections');
    expect(beatsBlock).not.toContain('command-center');
    for (const widthClass of ['hidden lg:', 'lg:hidden', 'hidden md:', 'md:hidden', 'hidden sm:']) {
      expect(beatsBlock).not.toContain(widthClass);
    }
    expect(beatsBlock).not.toContain('lg:grid-cols');
    expect(beatsBlock).not.toMatch(/Vitality/);
  });

  it('keeps MorningCard BOS score-only and protocol on TodaysProtocol, no Connections/CC home beats', () => {
    expect(CARD_SRC).toContain('ConnectionsBosDial');
    expect(CARD_SRC).toContain('MORNING_CARD_SCORE_LABEL');
    expect(CARD_SRC).toContain('hannahBos.sentence');
    expect(CARD_SRC).toContain('data-bos-honesty="centered"');
    expect(CARD_SRC).toContain('text-center text-sm leading-relaxed text-white');
    expect(CARD_SRC).toContain('brightReadout');
    expect(CARD_SRC).not.toContain('MorningProtocolCtaButton');
    expect(CARD_SRC).not.toContain('PROTOCOL_CTA_LOADING_BOUND_MS');
    expect(CARD_SRC).not.toContain('data-home-beat="protocol"');
    expect(PROTOCOL_SRC).toContain('data-home-beat="protocol"');
    expect(CHIPS_SRC).toContain('flex flex-wrap');
    expect(CHIPS_SRC).not.toContain('md:grid-cols-7');
    expect(CHIPS_SRC).not.toContain('bg-[#1A2744]/70');
    expect(CHIPS_SRC).toContain('min-h-[44px]');
    expect(CHIPS_SRC).toContain('strokeWidth={1.5}');
    expect(CHIPS_SRC).toContain('href={chip.href}');
    expect(CARD_SRC).not.toContain('MORNING_CHIP_PRIMARY_KEYS');
    expect(CARD_SRC).not.toContain('MORNING_CHIP_FOOTER_KEYS');
    expect(CARD_SRC).not.toContain('showHeading={false}');
    expect(CARD_SRC).not.toContain('data-morning-chip-slot="footer"');
    expect(CARD_SRC).not.toContain('border-t border-white/10');
    expect(CARD_SRC.indexOf('hannahBos.sentence')).toBeLessThan(
      CARD_SRC.indexOf('<MorningChipGrid'),
    );
    expect(CARD_SRC.indexOf('<MorningChipGrid')).toBeLessThan(
      CARD_SRC.indexOf('hannahBos.result.chips'),
    );
    expect(CARD_SRC.indexOf('hannahBos.result.chips')).toBeLessThan(
      CARD_SRC.indexOf('<HabitSleepPair'),
    );
    expect((CARD_SRC.match(/<MorningChipGrid/g) ?? []).length).toBe(1);
    expect(CTA_SRC).toContain('data-cta-kind="action"');
    expect(CTA_SRC).toContain('data-cta-kind="empty"');
    expect(CTA_SRC).toContain('data-cta-kind="loading"');
    expect(CTA_SRC).toContain('data-cta-kind="error"');
    expect(CTA_SRC).toContain('data-cta-retry');
    expect(PROTOCOL_CTA_LOADING_BOUND_MS).toBe(1500);

    expect(HOME_CONNECTIONS_HREF).toBe('/body-tracker/connections');
    expect(HOME).not.toContain('HOME_CONNECTIONS_HREF');
    expect(HOME).not.toContain('href={HOME_CONNECTIONS_HREF}');
    expect(HOME).toContain('<ConnectCard type="wearable" href="/body-tracker/connections"');
    expect(HOME).toContain('<TodaysProtocol');
    expect(HOME).not.toMatch(/hidden(?:\s+\w+:)*\s*(?:lg:)?.*TodaysProtocol/);
    expect(HOME).not.toContain('hidden lg:');
    expect(HOME).not.toContain('lg:hidden');
  });

  it('keeps Jeffery CC on the admin sidebar and off the consumer dashboard', () => {
    expect(homeCommandCenterHref('consumer')).toBe(HOME_CONSUMER_HANNAH_HREF);
    expect(homeCommandCenterHref('practitioner')).toBe(HOME_CONSUMER_HANNAH_HREF);
    expect(homeCommandCenterHref('naturopath')).toBe(HOME_CONSUMER_HANNAH_HREF);
    expect(homeCommandCenterHref(undefined)).toBe(HOME_CONSUMER_HANNAH_HREF);
    expect(homeCommandCenterHref('admin')).toBe(HOME_ADMIN_CC_HREF);
    expect(HOME_CONSUMER_HANNAH_HREF).toBe('/wellness/advisor');
    expect(HOME_ADMIN_CC_HREF).toBe('/admin/jeffery');
    expect(homeCommandCenterLabel('consumer')).toBe(HOME_CONSUMER_HANNAH_LABEL);
    expect(homeCommandCenterLabel('admin')).toBe(HOME_ADMIN_CC_LABEL);
    expect(homeCommandCenterHref('consumer')).not.toBe(HOME_ADMIN_CC_HREF);
    expect(HOME).not.toContain('href="/admin/jeffery"');
    expect(HOME).not.toContain('/admin/jeffery');
    expect(HOME).not.toContain('HOME_ADMIN_CC_LABEL');
    expect(HOME).not.toContain('Jeffery™ Command Center');
    expect(HOME).not.toContain('homeCommandCenterHref');
    expect(src(SIDEBAR)).toContain('href: "/admin/jeffery"');
    expect(src(SIDEBAR)).toContain('Jeffery™ Command Center');
    expect(src(BEATS)).not.toMatch(/\bas any\b/);
  });

  it('does not add a desktop-only score or a second OVERALL above the home beats', () => {
    const homeBeatRegion = HOME.slice(
      HOME.indexOf('data-home-beats="true"'),
      HOME.indexOf('<DailyScoresPanel'),
    );
    expect(homeBeatRegion).toContain('<MorningCard');
    expect(homeBeatRegion).not.toContain('DailyScoresPanel');
    expect(homeBeatRegion).not.toContain('Overall');
    expect(homeBeatRegion).not.toContain('Vitality');
    expect(homeBeatRegion).not.toContain('HomeBeatEntry');
    expect(homeBeatRegion.match(/ConnectionsBosDial/g)).toBeNull();
    expect(HOME).not.toContain('hidden lg:block');
    expect(HOME).not.toContain('lg:block hidden');
    expect((HOME.match(/<MorningCard/g) ?? []).length).toBe(1);
    expect(CARD_SRC).toContain('MORNING_CARD_SCORE_LABEL');
    expect(src('src/lib/dashboard/morning-card/copy.ts')).toContain(
      "export const MORNING_CARD_SCORE_LABEL = 'Bio Optimization Score'",
    );
  });

  it.each(HOME_WIDTHS)('does not mount a Connections HomeBeatEntry on consumer home at %d', (width) => {
    expect(width === 390 || width === 1280).toBe(true);
    expect(HOME).not.toContain('HomeBeatEntry');
    expect(HOME).not.toContain('beat="connections"');
    expect(HOME).not.toContain('HOME_CONNECTIONS_LABEL');
    expect(HOME).not.toContain('Open Connections');

    const html = renderToStaticMarkup(
      createElement(HomeBeatEntry, {
        beat: 'connections',
        href: HOME_CONNECTIONS_HREF,
        label: HOME_CONNECTIONS_LABEL,
        cta: 'Open Connections',
        icon: Plug,
      }),
    );
    expect(html).toContain('data-home-beat="connections"');
    expect(html).toContain('href="/body-tracker/connections"');
    expect(html).toContain('Connections');
    expect(html).not.toMatch(/Vitality/);
    expect(html).not.toContain('Overall');
    expect(html).not.toContain('ConnectionsBosDial');
    expect(ENTRY_SRC).toContain('strokeWidth={1.5}');
    expect(ENTRY_SRC).not.toContain('strokeWidth={2}');
    expect(ENTRY_SRC).toContain('min-h-[44px]');
    expect(ENTRY_SRC).toContain('bg-[#1E3054]/60');
    expect(ENTRY_SRC).toContain('backdrop-blur-md');
    expect(ENTRY_SRC).not.toMatch(/\bas any\b/);
  });

  it('leaves Brief 49 homework on /supplements untouched', () => {
    expect(src(HOMEWORK)).toContain('buildProtocolHomework');
    expect(src(HOMEWORK)).toContain('Educational why is not on file');
    expect(src(SCHEDULE_CARD)).toContain('data-testid="schedule-row-homework"');
    expect(src(HOMEWORK_TEST)).toContain('Brief 49 protocol homework');
    expect(CTA_SRC).not.toContain('buildProtocolHomework');
    expect(CTA_SRC).not.toContain('schedule-row-homework');
    expect(sha256(HOMEWORK)).toBe(
      '10dd58a3d5983c2e9af511ea36d0ffe53a12285e0e1c885de2d884e2e5e324a5',
    );
    expect(sha256(HOMEWORK_TEST)).toBe(
      'dde9f633fad4668b0bee1c9108e1a21564831ad27798326245273390e4206955',
    );
    expect(sha256(SCHEDULE_CARD)).toBe(
      '0e9310a605ec3c9d6be19c390fba1a86313990ff72287872e46f29f1afa3fb03',
    );
  });
});
