/**
 * Mobile-first consumer chrome: hub/card titles, subheads, and main plasma
 * floors at 390. Empty plasma stays `--`. Bio Optimization Score, not Vitality.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONSUMER_CARD_SUBHEAD,
  CONSUMER_CARD_TITLE,
  CONSUMER_EYEBROW,
  CONSUMER_BOS_CHIP,
  CONSUMER_HANNAH_CHIP,
  CONSUMER_OPEN_PILL_BASE,
  CONSUMER_SCHEDULE_ROW_SCALE,
  CONSUMER_SOURCE_PILL,
  PLASMA_MAIN_DESKTOP,
  PLASMA_MAIN_MOBILE,
} from '@/lib/ui/consumerChrome';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const HUB_CARD_FILES = [
  'src/components/body-tracker/hub/BentoCard.tsx',
  'src/components/body-tracker/hub/GuidanceStrip.tsx',
  'src/components/peptide-protocol/PeptideEducationBento.tsx',
  'src/components/nutrition/hub/NutritionHub.tsx',
  'src/components/nutrition/hub/NutritionInsightsTile.tsx',
  'src/components/nutrition/hub/NutritionGettingStartedStrip.tsx',
  'src/components/genetics/hub/GeneticsActionCards.tsx',
  'src/components/genetics/hub/GeneticsGettingStartedStrip.tsx',
] as const;

const CONSUMER_SURFACE_FILES = [
  ...HUB_CARD_FILES,
  'src/components/dashboard/morning-card/MorningCard.tsx',
  'src/components/dashboard/DailyScoresPanel.tsx',
  'src/components/nutrition/hub/NutritionHub.tsx',
  'src/components/body-tracker/connections/ConnectionsBosDial.tsx',
  'src/components/gauges/PlasmaGauge.tsx',
  'src/lib/ui/consumerChrome.ts',
] as const;

function defaultTitleClass(source: string): string {
  const tokenUse = source.includes('CONSUMER_CARD_TITLE') || source.includes('CONSUMER_HUB_H1');
  if (tokenUse) return CONSUMER_CARD_TITLE;
  const match = source.match(/className=["'`]([^"'`]*text-(?:xl|\[22px\]|\[26px\]|2xl)[^"'`]*)["'`]/);
  return match?.[1] ?? '';
}

function defaultClassIsAtLeastXl(className: string): boolean {
  const tokens = className.split(/\s+/);
  const size = tokens.find((t) => t.startsWith('text-') && !t.includes(':'));
  return size === 'text-xl' || size === 'text-2xl' || size === 'text-[22px]';
}

describe('consumer mobile-scale IA', () => {
  it('shared chrome tokens lock the 390 floors', () => {
    expect(CONSUMER_CARD_TITLE).toMatch(/^text-xl\b/);
    expect(CONSUMER_CARD_SUBHEAD).toMatch(/^text-sm\b/);
    expect(CONSUMER_CARD_SUBHEAD).toMatch(/text-white\/8[05]|text-white\/90/);
    expect(CONSUMER_EYEBROW).toMatch(/^text-xs\b/);
    expect(CONSUMER_BOS_CHIP).toMatch(/\btext-xs\b/);
    expect(CONSUMER_BOS_CHIP).not.toMatch(/\btext-sm\b/);
    expect(CONSUMER_BOS_CHIP).toMatch(/min-h-\[44px\]/);
    expect(CONSUMER_SOURCE_PILL).toMatch(/\btext-sm\b/);
    expect(CONSUMER_SOURCE_PILL).toMatch(/text-white\/90/);
    expect(CONSUMER_SOURCE_PILL).not.toMatch(/min-h-\[44px\]/);
    expect(CONSUMER_OPEN_PILL_BASE).toMatch(/text-sm\b/);
    expect(CONSUMER_OPEN_PILL_BASE).toMatch(/min-h-\[44px\]/);
    expect(CONSUMER_HANNAH_CHIP).toMatch(/min-h-\[44px\]/);
    expect(src('src/components/dashboard/morning-card/MorningChipGrid.tsx')).toContain(
      'whitespace-nowrap',
    );
    expect(src('src/components/dashboard/morning-card/MorningChipGrid.tsx')).toContain(
      'flex flex-wrap',
    );
    expect(src('src/components/dashboard/morning-card/MorningChipGrid.tsx')).not.toContain(
      'data-morning-chip-slot="footer"',
    );
    expect(PLASMA_MAIN_MOBILE).toBeGreaterThanOrEqual(200);
    expect(PLASMA_MAIN_DESKTOP).toBeGreaterThanOrEqual(PLASMA_MAIN_MOBILE);
    expect(CONSUMER_SCHEDULE_ROW_SCALE).toContain('schedule-row-homework');
    expect(CONSUMER_SCHEDULE_ROW_SCALE).toMatch(/text-sm/);
    expect(src('src/components/supplements/DailySchedule.tsx')).toContain(
      'CONSUMER_SCHEDULE_ROW_SCALE',
    );
    expect(src('src/components/supplements/ScheduleSupplementCard.tsx')).not.toContain(
      'CONSUMER_SCHEDULE_ROW_SCALE',
    );
  });

  it('main hub and glass-card titles are at least text-xl on the default class', () => {
    for (const rel of HUB_CARD_FILES) {
      const source = src(rel);
      expect(source, rel).toContain('CONSUMER_CARD_TITLE');
      expect(defaultClassIsAtLeastXl(defaultTitleClass(source)), rel).toBe(true);
      expect(source, rel).not.toMatch(
        /className=["'`][^"'`]*\btext-\[15px\][^"'`]*font-semibold[^"'`]*["'`]/,
      );
    }
  });

  it('Nutrition Score, Daily Macros, and BOS main plasma stay at the mobile floor', () => {
    const nutrition = src('src/components/nutrition/hub/NutritionHub.tsx');
    const dial = src('src/components/body-tracker/connections/ConnectionsBosDial.tsx');
    const chrome = src('src/lib/ui/consumerChrome.ts');

    expect(chrome).toContain('export const PLASMA_MAIN_MOBILE = 200');
    expect(nutrition).toContain('size: PLASMA_MAIN_MOBILE');
    expect(nutrition).toContain('size={PLASMA_MAIN_MOBILE}');
    expect(nutrition).not.toContain('size={176}');
    expect(nutrition).not.toContain('size: 176');
    expect(dial).toContain('size={PLASMA_MAIN_MOBILE}');
    expect(dial).toContain('size={PLASMA_MAIN_DESKTOP}');
    expect(PLASMA_MAIN_MOBILE).toBeGreaterThanOrEqual(200);
  });

  it('empty plasma still paints -- and never Vitality', () => {
    const plasma = src('src/components/gauges/PlasmaGauge.tsx');
    expect(plasma).toContain('empty');
    expect(plasma).toContain('`--`');
    expect(plasma).toMatch(/center reads `--`|the center reads `--`/);

    for (const rel of CONSUMER_SURFACE_FILES) {
      expect(src(rel), rel).not.toMatch(/\bVitality\b/);
    }
  });

  it('does not invent a second landing or restore Connections on the consumer dashboard', () => {
    const hero = src('src/components/landing/HeroSection.tsx');
    const morning = src('src/components/dashboard/morning-card/MorningCard.tsx');
    expect(hero).toMatch(/Precision Personal Health/);
    expect(morning).not.toMatch(/Jeffery Command Center/);
    expect(morning).toContain('ConnectionsBosDial');
    expect(morning).toContain('brightReadout');
  });
});
