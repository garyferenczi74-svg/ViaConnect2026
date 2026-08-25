import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { CONTRIBUTOR_METRICS, METRIC_LABELS } from '@/lib/body-tracker/contributor-rows';
import { FIRST_CLASS_TILE_IDS } from '@/lib/body-tracker/wearable-tiles';
import { buildMorningChips } from '@/lib/dashboard/morning-card/contributors';
import { buildConnectionsStripSources } from '@/lib/body-tracker/connections-strip-sources';
import { wearableSyncLineFromTiles } from '@/lib/body-tracker/wearable-sync-line';
import { LAST_SYNC_LABELS } from '@/lib/body-tracker/last-sync-state';
import { resolveHonestBosDisplay } from '@/lib/scoring/bos-display';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Brief 29 Dashboard Analytics Biology SSOT', () => {
  it('Dashboard morning chips are exactly the 7 METRIC_LABELS, not the 8 marketing keys', () => {
    const chips = buildMorningChips();
    expect(chips.map((c) => c.label)).toEqual([
      'HRV',
      'Sleep',
      'Resting HR',
      'Recovery',
      'Workouts',
      'Body comp.',
      'Steps',
    ]);
    expect(chips.map((c) => c.key)).toEqual([...CONTRIBUTOR_METRICS]);
    expect(chips.map((c) => c.label)).toEqual(CONTRIBUTOR_METRICS.map((k) => METRIC_LABELS[k]));
    expect(chips).toHaveLength(7);
    const keys = src('src/lib/dashboard/morning-card/keys.ts');
    expect(keys).not.toContain('MARKETING_CHIP_KEYS');
    expect(keys).not.toContain("'regimen'");
    expect(keys).not.toContain("'immune'");
  });

  it('Analytics Bio Optimization default is not 62 when contributors are empty', () => {
    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    expect(journey).not.toMatch(/label:\s*"Bio Optimization",\s*value:\s*62/);
    expect(journey).toContain('label: "Bio Optimization", value: null, delta: null');
    expect(journey).toContain('resolveHonestBosDisplay');
    expect(journey).not.toContain('from "@/lib/scoring/sources/wearable-source"');
    const honest = resolveHonestBosDisplay({ score: 62, contributors: [] });
    expect(honest.score).toBeNull();
  });

  it('ConnectionsStrip lists 6 first-class tiles and does not hardcode connected:true', () => {
    const strip = src('src/components/body-tracker/hub/ConnectionsStrip.tsx');
    const sources = buildConnectionsStripSources([]);
    expect(sources.map((s) => s.id)).toEqual([...FIRST_CLASS_TILE_IDS]);
    expect(sources.every((s) => s.connected === false)).toBe(true);
    expect(strip).toContain('FIRST_CLASS_TILE_IDS');
    expect(strip).toContain('buildConnectionsStripSources');
    expect(strip).toContain('href={CONNECTIONS.href}');
    expect(strip).not.toMatch(/connected:\s*true/);
    expect(strip).not.toContain('native_health_bridge');
  });

  it('Coming soon / not connected rows stay UNKNOWN or Connect your device', () => {
    const chips = buildMorningChips();
    for (const chip of chips) {
      expect(['UNKNOWN', 'Connect your device']).toContain(chip.displayValue);
      expect(chip.contributors[0]?.name).toBe('Connect your device');
      expect(chip.contributors[0]?.displayValue).toBe('UNKNOWN');
    }
    expect(wearableSyncLineFromTiles([]).lastSyncLabel).toBe(LAST_SYNC_LABELS.not_connected);
  });

  it('does not invent native_health_bridge HRV/RHR or last-sync', () => {
    const card = src('src/components/dashboard/morning-card/MorningCard.tsx');
    const contributors = src('src/lib/dashboard/morning-card/contributors.ts');
    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    const strip = src('src/components/body-tracker/hub/ConnectionsStrip.tsx');
    const hook = src('src/hooks/useWearableTilesSnapshot.ts');
    const joined = card + contributors + journey + strip + hook;
    expect(joined).not.toContain('native_health_bridge');
    expect(joined).not.toContain('healthBridge');
    expect(joined).not.toContain('getWearableSource');
    expect(contributors).not.toMatch(/latest_hrv|resting_hr_bpm/);
  });

  it('deep link href is /body-tracker/connections', () => {
    const chips = src('src/components/dashboard/morning-card/MorningChipGrid.tsx');
    const list = src('src/components/dashboard/morning-card/MorningContributorList.tsx');
    const strip = src('src/components/body-tracker/hub/ConnectionsStrip.tsx');
    const hub = src('src/components/body-tracker/hub/hubConfig.ts');
    expect(buildMorningChips()[0]?.href).toBe('/body-tracker/connections');
    expect(chips).toContain('href={chip.href}');
    expect(list).toContain('href={row.href}');
    expect(hub).toContain('href: "/body-tracker/connections"');
    expect(strip).toContain('href={CONNECTIONS.href}');
  });
});
