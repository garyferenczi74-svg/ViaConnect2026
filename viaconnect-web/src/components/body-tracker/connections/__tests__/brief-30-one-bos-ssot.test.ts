import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { ScoreDetailPanel } from '@/components/body-tracker/connections/ScoreDetailPanel';
import { ConnectionsBosDial } from '@/components/body-tracker/connections/ConnectionsBosDial';
import { buildMorningChips } from '@/lib/dashboard/morning-card/contributors';
import {
  BOS_UNKNOWN_NEVER_ZERO_COPY,
  CONNECTIONS_BOS_COMPOSITE,
  buildWearableTiles,
  connectionsBosNumericScore,
  isAppleHealthConnected,
  isHumeConnected,
  namedWearableContributorCount,
  resolveConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';
import {
  buildHannahInsightTemplate,
  hannahInsightCitesNumericBos,
} from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useHannahInsights';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Brief 30 one Bio Optimization Score SSOT', () => {
  it('zero devices and no Hume/Apple XML ingest resolve to UNKNOWN / --, never 0', () => {
    expect(isHumeConnected(0)).toBe(false);
    expect(
      isAppleHealthConnected({
        appleXmlIngested: 0,
        healthKitPersisted: false,
        platform: 'web',
      }),
    ).toBe(false);

    const tiles = buildWearableTiles({
      oauth: [],
      humeIngestCount: 0,
      humeLastPersistAt: null,
      appleXmlIngested: 0,
      appleXmlLastPersistAt: null,
      healthKitPersisted: false,
      healthKitLastPersistAt: null,
      dimensionsFed: {},
      whoopConfigured: false,
      ouraConfigured: false,
      googleHealthConfigured: false,
      garminConfigured: false,
      platform: 'web',
    });
    expect(tiles.every((tile) => tile.status === 'disconnected')).toBe(true);

    const named = namedWearableContributorCount([]);
    expect(named).toBe(0);
    const display = resolveConnectionsBosDisplay(named);
    expect(display).toEqual({ value: '--', band: 'UNKNOWN' });
    expect(display).toEqual(CONNECTIONS_BOS_COMPOSITE);
    expect(connectionsBosNumericScore(display)).toBeNull();
    expect(display.value).not.toBe('0');
    expect(display.value).not.toBe('62');
    expect(display.band).not.toBe('Good');
    expect(display.band).not.toBe('GOOD');
  });

  it('Dashboard hero, Analytics, and Connections all mount the same Connections BOS', () => {
    const morning = src('src/components/dashboard/morning-card/MorningCard.tsx');
    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    const biology = src('src/components/formavision/BOSMovementReadout.tsx');

    expect(panel).toContain('ConnectionsBosDial');
    expect(morning).toContain('ConnectionsBosDial');
    expect(morning).toContain('useHannahBosDisplay');
    expect(morning).toContain('data-bos-card="dashboard"');
    expect(journey).toContain('useHannahBosDisplay');
    expect(journey).toContain('connectionsBosNumericScore');
    expect(journey).toContain('data-bos-card={isBos ? "analytics"');
    expect(biology).toContain('resolveConnectionsBosDisplay');
    expect(biology).toContain('connectionsBosNumericScore');

    expect(morning).not.toContain('useBOSCurrent');
    expect(morning).not.toContain('resolveHonestBosDisplay');
    expect(morning).not.toContain('labelForScore');
    expect(morning).not.toContain('contributorLine');
    expect(journey).not.toContain('useBOSCurrent');
    expect(journey).not.toContain('resolveHonestBosDisplay');
    expect(biology).not.toContain('useBOSCurrent');
  });

  it('renders -- / UNKNOWN on Connections and the shared dial, and keeps the never-zero footer', () => {
    const composite = resolveConnectionsBosDisplay(0);
    const dial = renderToStaticMarkup(
      createElement(ConnectionsBosDial, { composite }),
    );
    expect(dial).toContain('--');
    expect(dial).toContain('UNKNOWN');
    expect(dial).toContain('data-bos-composite="unknown"');
    expect(dial).not.toContain('>62<');
    expect(dial).not.toContain('Good');
    expect(dial).not.toContain('>0<');

    const connections = renderToStaticMarkup(
      createElement(ScoreDetailPanel, { rows: [], lastUpdatedAt: null }),
    );
    expect(connections).toContain('data-bos-card="connections"');
    expect(connections).toContain('Bio Optimization Score');
    expect(connections).toContain('--');
    expect(connections).toContain('UNKNOWN');
    expect(connections).toContain(BOS_UNKNOWN_NEVER_ZERO_COPY);
    expect(connections).toContain('Missing stays UNKNOWN, never 0.');
    expect((connections.match(/Connect your device/g) ?? []).length).toBe(7);
    expect(connections).not.toContain('>62<');
    expect(connections).not.toContain('Good');
    expect(connections).not.toContain('From CAQ');
  });

  it('Hannah does not cite 62 or Good while BOS is UNKNOWN', () => {
    const insight = buildHannahInsightTemplate({
      displayName: 'Gary',
      range: '7D',
      points: [],
      current: null,
      weeksActive: 1,
    });
    expect(insight.analysis).toContain('Not enough data yet for a Bio Optimization Score');
    expect(insight.analysis).not.toMatch(/62/);
    expect(insight.analysis).not.toMatch(/\bGood\b/);
    expect(insight.recommendation).not.toMatch(/62/);
    expect(insight.greeting).not.toMatch(/62/);
    expect(hannahInsightCitesNumericBos(insight)).toBe(false);

    const failing = {
      greeting: 'Hey Gary',
      analysis:
        'Gary, your Bio Optimization Score is 62 today. This is a solid baseline from your CAQ and logs. You are off to a Good start.',
      recommendation: 'Keep logging.',
      focusArea: 'CAQ',
      estimatedImpact: 0,
    };
    expect(hannahInsightCitesNumericBos(failing)).toBe(true);
  });

  it('7 MetricKeys stay UNKNOWN or Connect your device, never 0', () => {
    const chips = buildMorningChips();
    expect(chips).toHaveLength(7);
    for (const chip of chips) {
      expect(['UNKNOWN', 'Connect your device']).toContain(chip.displayValue);
      expect(chip.displayValue).not.toBe('0');
      expect(chip.contributors[0]?.name).toBe('Connect your device');
      expect(chip.contributors[0]?.displayValue).toBe('UNKNOWN');
    }
    const morning = src('src/components/dashboard/morning-card/MorningCard.tsx');
    expect(morning).toContain('BOS_UNKNOWN_NEVER_ZERO_COPY');
  });
});
