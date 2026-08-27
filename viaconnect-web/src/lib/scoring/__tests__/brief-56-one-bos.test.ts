import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ConnectionsBosDial } from '@/components/body-tracker/connections/ConnectionsBosDial';
import { ScoreDetailPanel } from '@/components/body-tracker/connections/ScoreDetailPanel';
import {
  CONNECTIONS_BOS_COMPOSITE,
  connectionsBosNumericScore,
} from '@/lib/body-tracker/wearable-tiles';
import {
  HANNAH_BOS_BLEND_SENTENCE,
  blendHannahBos,
  emptyHannahBosInput,
  hannahBosToConnectionsDisplay,
  hydrationScoreFromToday,
  sameMomentBosDisplays,
  wearableHannahGate,
} from '../hannah-bos';
import { emptyWearableTilesSnapshot } from '@/hooks/useWearableTilesSnapshot';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Brief 56 one Bio Optimization Score', () => {
  it('hero, Analytics, and Connections mount ConnectionsBosDial + blendHannahBos', () => {
    const morning = src('src/components/dashboard/morning-card/MorningCard.tsx');
    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');

    expect(morning).toContain('ConnectionsBosDial');
    expect(morning).toContain('useHannahBosDisplay');
    expect(morning).toContain('data-bos-card="dashboard"');
    expect(morning).toContain('hannahBos.sentence');
    expect(morning).not.toContain('Vitality');
    expect(morning).not.toMatch(/Helix/);

    expect(journey).toContain('ConnectionsBosDial');
    expect(journey).toContain('useHannahBosDisplay');
    expect(journey).toContain('HANNAH_BOS_BLEND_SENTENCE');
    expect(journey).toContain('data-bos-card={isBos ? "analytics"');

    expect(panel).toContain('ConnectionsBosDial');
    expect(surface).toContain('useHannahBosDisplay');
    expect(surface).toContain('composite={hannahBos.display}');
  });

  it('same account, same moment: hero === analytics === connections', () => {
    const result = blendHannahBos({
      ...emptyHannahBosInput(),
      checkin: {
        hasTodayCheckin: true,
        subs: { sleep: 70, energy: 70, mood: 70, activity: 70, hydration: null },
      },
    });
    const display = hannahBosToConnectionsDisplay(result);
    expect(sameMomentBosDisplays(display, display, display)).toBe(true);
    expect(connectionsBosNumericScore(display)).toBe(70);
  });

  it('no wearables + no XML omits wearable; never a silent Daily Scores 59 labeled as BOS', () => {
    const tiles = emptyWearableTilesSnapshot('web');
    const gate = wearableHannahGate(tiles);
    expect(gate.pluggedIn).toBe(false);
    expect(tiles.every((t) => t.status === 'disconnected')).toBe(true);

    const empty = blendHannahBos(emptyHannahBosInput());
    expect(empty.score).toBeNull();
    expect(hannahBosToConnectionsDisplay(empty)).toEqual(CONNECTIONS_BOS_COMPOSITE);

    const checkin = blendHannahBos({
      ...emptyHannahBosInput(),
      checkin: {
        hasTodayCheckin: true,
        subs: { sleep: 59, energy: 59, mood: 59, activity: 59, hydration: null },
      },
    });
    expect(checkin.chips).toEqual(['from check-in']);
    expect(checkin.chips).not.toContain('from wearable');
    expect(hannahBosToConnectionsDisplay(checkin).band).not.toBe('Overall Wellness');
  });

  it('DailyScoresPanel has no OVERALL / Overall Wellness 0-100; check-in rings remain', () => {
    const panel = src('src/components/dashboard/DailyScoresPanel.tsx');
    expect(panel).not.toContain('Overall Wellness');
    expect(panel).not.toMatch(/text-\[9px\] uppercase tracking-wider text-white\/40">Overall</);
    expect(panel).not.toContain('metric="wellness"');
    expect(panel).not.toContain('{result.overall.score}/100');
    expect(panel).toContain('metric="sleep"');
    expect(panel).toContain('metric="energy"');
    expect(panel).toContain('metric="mood"');
    expect(panel).toContain('metric="nutrition"');
    expect(panel).toContain('metric="activity"');
    expect(panel).toContain('hydrationScoreFromToday');
    expect(panel).toContain('icon={Droplet}');
  });

  it('Nutrition / Analytics Nutrition / Macros stay UNKNOWN with no meals', () => {
    const result = blendHannahBos({
      ...emptyHannahBosInput(),
      nutrition: { mealCount: 0, score: 0 },
      macros: { mealCount: 0, score: 0 },
    });
    expect(result.score).toBeNull();

    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    expect(journey).toContain('nutrition: dailyScores.nutrition');
    expect(journey).not.toContain('nutrition: dailyScores.nutrition ?? 0');
    expect(journey).toContain('hydrationScoreFromToday');

    const hub = src('src/components/nutrition/hub/nutritionHubScoreDisplay.ts');
    expect(hub).toContain('UNKNOWN');
  });

  it('Arnold body chips are the locked four; empty BOS stays UNKNOWN', () => {
    const bos = src('src/lib/scoring/hannah-bos.ts');
    expect(bos).toContain("'from FormaVision'");
    expect(bos).toContain('HANNAH_BOS_BLEND_SENTENCE');
    expect(bos).toContain('blendHannahBos');
    expect(bos).toContain('Never Vitality');
    expect(blendHannahBos(emptyHannahBosInput()).score).toBeNull();
  });

  it('Biological Age is not 0 YEARS; omitted from BOS while DRAFT', () => {
    const tile = src('src/components/body-tracker/dashboard/BiologicalAgeHeroTile.tsx');
    expect(tile).not.toContain('result?.displayAge ?? 0');
    expect(tile).toContain('UNKNOWN');
    expect(tile).toContain('display === null');

    const omitted = blendHannahBos({
      ...emptyHannahBosInput(),
      biologicalAge: { state: 'draft', score: 0 },
    });
    expect(omitted.score).toBeNull();
  });

  it('Whoop/Oura/Google/Garmin coming soon do not move BOS', () => {
    const tiles = emptyWearableTilesSnapshot('web');
    const coming = tiles.filter((t) =>
      t.id === 'whoop' || t.id === 'oura' || t.id === 'google_health' || t.id === 'garmin',
    );
    expect(coming.every((t) => t.status === 'disconnected')).toBe(true);
    expect(wearableHannahGate(tiles).pluggedIn).toBe(false);
  });

  it('renders the Hannah sentence, not the intended weights, on the shared dial card', () => {
    const html = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows: [],
        lastUpdatedAt: null,
        composite: CONNECTIONS_BOS_COMPOSITE,
        sentence: HANNAH_BOS_BLEND_SENTENCE,
      }),
    );
    expect(html).toContain(HANNAH_BOS_BLEND_SENTENCE);
    expect(html).toContain('Bio Optimization Score');
    expect(html).not.toContain('Vitality');
    expect(html).not.toContain('>25<');
    expect(html).toContain('--');
    expect(html).toContain('UNKNOWN');

    const dial = renderToStaticMarkup(
      createElement(ConnectionsBosDial, { composite: CONNECTIONS_BOS_COMPOSITE }),
    );
    expect(dial).toContain('--');
    expect(dial).toContain('UNKNOWN');
  });

  it('hydrationScoreFromToday is UNKNOWN without a log and 0 only when they logged 0 ml', () => {
    expect(hydrationScoreFromToday(null)).toBeNull();
    expect(hydrationScoreFromToday({
      percentage_of_target: 0,
      log_count: 0,
      events_today: [],
      total_ml: 0,
    })).toBeNull();
    expect(hydrationScoreFromToday({
      percentage_of_target: 0,
      log_count: 1,
      events_today: [{}],
      total_ml: 0,
    })).toBe(0);
    expect(hydrationScoreFromToday({
      percentage_of_target: 40,
      log_count: 2,
      events_today: [{}, {}],
      total_ml: 800,
    })).toBe(40);
  });
});
