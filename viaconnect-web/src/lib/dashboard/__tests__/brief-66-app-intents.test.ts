import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BosExplainChip } from '@/components/dashboard/morning-card/BosExplainChip';
import { HANNAH_APP_INTENT_VOICE } from '@/lib/hannah/app-intent-voice';
import { BOS_BAND_CUTOFFS } from '@/lib/dashboard/morning-card/glance';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const TOUCHED = [
  'src/lib/hannah/app-intent-voice.ts',
  'src/lib/dashboard/morning-card/glance.ts',
  'src/components/dashboard/morning-card/BosExplainChip.tsx',
  'src/components/dashboard/morning-card/MorningCard.tsx',
  'src/components/body-tracker/connections/ScoreDetailPanel.tsx',
  'src/components/journey/YourJourneyCoaching.tsx',
] as const;

describe('Brief 66 BOS / protocol App Intents glance', () => {
  it('locks Hannah spoken SSOT and omits Brief 62 band cutoffs', () => {
    const voice = src('src/lib/hannah/app-intent-voice.ts');
    expect(voice).toContain("Your Bio Optimization Score isn't ready yet. Missing pieces stay out, not counted as zero.");
    expect(voice).toContain("I don't have a Bio Optimization Score yet, so I can't say push or ease up.");
    expect(voice).toContain("You're caught up on today's protocol.");
    expect(voice).toContain('No protocol item due today.');
    expect(voice).not.toContain('No protocol items yet');
    expect(voice).toContain('{source} is coming soon.');
    expect(BOS_BAND_CUTOFFS).toBeNull();
    expect(src('src/lib/dashboard/morning-card/glance.ts')).toContain(
      'Brief 62 numeric cutoffs',
    );
  });

  it('keeps Bio Optimization Score, never Vitality, never TypeScript any', () => {
    for (const rel of TOUCHED) {
      const text = src(rel);
      expect(text).not.toMatch(/Vitality/);
      expect(text).not.toMatch(/:\s*any\b|as any\b/);
      expect(text).not.toMatch(/wearable_daily_vitals/);
    }
    expect(src('src/components/dashboard/morning-card/MorningCard.tsx')).toContain(
      'BosExplainChip',
    );
    expect(src('src/components/journey/YourJourneyCoaching.tsx')).toContain(
      'BosExplainChip',
    );
    expect(src('src/components/body-tracker/connections/ScoreDetailPanel.tsx')).toContain(
      'BosExplainChip',
    );
  });

  it('Explain chip is glass + Lucide 1.5, omitted when UNKNOWN, not a second hero score', () => {
    const chip = src('src/components/dashboard/morning-card/BosExplainChip.tsx');
    expect(chip).toContain('strokeWidth={1.5}');
    expect(chip).toContain('CONSUMER_HANNAH_CHIP');
    expect(chip).toContain('Info');
    expect(chip).not.toMatch(/text-5xl|text-6xl/);
    expect(chip).not.toMatch(/\bmd:/);

    const hidden = renderToStaticMarkup(
      createElement(BosExplainChip, { score: null, chips: ['from CAQ'] }),
    );
    expect(hidden).toBe('');

    const empty = renderToStaticMarkup(
      createElement(BosExplainChip, { score: 72, chips: [] }),
    );
    expect(empty).toBe('');

    const shown = renderToStaticMarkup(
      createElement(BosExplainChip, {
        score: 72,
        chips: ['from Hume Body Pod'],
      }),
    );
    expect(shown).toContain('data-bos-explain-chip="true"');
    expect(shown).toContain(HANNAH_APP_INTENT_VOICE.explainDefault);
    expect(shown).toContain('Right now the strongest real piece is from Hume Body Pod.');
    expect(shown).not.toContain('You\'re in');
    expect(shown).not.toContain('Vitality');

    const shownCaq = renderToStaticMarkup(
      createElement(BosExplainChip, {
        score: 71,
        chips: ['from CAQ'],
      }),
    );
    expect(shownCaq).toContain('data-bos-explain-chip="true"');
    expect(shownCaq).toContain(HANNAH_APP_INTENT_VOICE.explainDefault);
    expect(shownCaq).toContain('Right now the strongest real piece is from CAQ.');
  });

  it('Morning Explain sits after source pills, not under the dial-only column', () => {
    const card = src('src/components/dashboard/morning-card/MorningCard.tsx');
    const jsx = card.indexOf('return (');
    const dialCol = card.indexOf('md:col-start-1 md:row-start-2', jsx);
    const honestyCol = card.indexOf('md:col-start-2 md:row-start-2', jsx);
    const pills = card.indexOf('hannahBos.result.chips.length', jsx);
    const explain = card.indexOf('<BosExplainChip', jsx);
    const habit = card.indexOf('<HabitSleepPair', jsx);
    const dialOnly = card.slice(dialCol, honestyCol);

    expect(dialOnly).toContain('ConnectionsBosDial');
    expect(dialOnly).not.toContain('BosExplainChip');
    expect(explain).toBeGreaterThan(pills);
    expect(habit).toBeGreaterThan(explain);
    expect(card).toContain('data-bos-explain-eligible=');
    expect(card).toContain('data-bos-explain-chip-count={String(explainChips.length)}');
    expect(card).toContain('shouldShowBosExplainChip');
    expect(card).toContain('flex justify-center pt-2');
    expect(card).toContain('md:items-center');
    expect(card).not.toContain('md:items-start');
  });

  it('does not reopen Helix, FormaVision, or email templates', () => {
    const glance = src('src/lib/dashboard/morning-card/glance.ts');
    expect(glance).not.toMatch(/Helix/);
    expect(glance).not.toMatch(/FormaVision|GLB/);
    expect(src('src/lib/hannah/app-intent-voice.ts')).not.toMatch(/Helix/);
  });
});
