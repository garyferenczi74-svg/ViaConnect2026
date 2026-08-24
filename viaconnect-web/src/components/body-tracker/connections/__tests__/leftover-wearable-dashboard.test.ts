import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const WEARABLE_SURFACES = [
  'src/app/(app)/(consumer)/wearables/page.tsx',
  'src/app/(app)/(consumer)/body-tracker/connections/page.tsx',
  'src/components/body-tracker/connections/ConnectionsSurface.tsx',
  'src/components/body-tracker/connections/WearableTileCard.tsx',
  'src/app/(app)/(consumer)/plugins/manage/page.tsx',
  'src/components/dashboard/ConnectCard.tsx',
  'src/components/dashboard/QuickActionsGrid.tsx',
] as const;

describe('leftover WearableDashboard cannot invent variants', () => {
  it('kills WearableDashboardPage and the invented nine-tile last-sync copy', () => {
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    const connections = src('src/app/(app)/(consumer)/body-tracker/connections/page.tsx');
    const manage = src('src/app/(app)/(consumer)/plugins/manage/page.tsx');
    expect(wearables).toContain("redirect('/body-tracker/connections')");
    expect(wearables).not.toContain('ConnectionsSurface');
    expect(connections).toContain('ConnectionsSurface');
    expect(wearables).not.toContain('function WearableDashboardPage');
    expect(wearables).not.toContain('Last sync: 5 min ago');
    expect(wearables).not.toContain('Oura Ring · Apple Watch');
    expect(wearables).not.toContain('ScoreRing');
    expect(wearables).not.toContain('COMT AG');
    expect(manage).not.toContain('Apple Watch S9');
    expect(manage).not.toContain('Garmin Venu 3');
    expect(manage).not.toContain('Oura Ring Gen 3');
    expect(manage).not.toContain('5 minutes ago');
    expect(manage).toContain('/body-tracker/connections');
  });

  it('does not hardcode invented last-sync on wearable surfaces', () => {
    const joined = WEARABLE_SURFACES.map((rel) => src(rel)).join('\n');
    expect(joined).not.toMatch(/Last sync:\s*5 min ago/);
    expect(joined).not.toMatch(/Active\s*\+\s*Never synced/);
    expect(joined).not.toContain('Never Active+Never synced');
    expect(joined).not.toContain('Vitality');
    expect(src('src/components/dashboard/ConnectCard.tsx')).not.toContain('Apple Watch');
    expect(src('src/components/dashboard/ConnectCard.tsx')).not.toContain('Garmin');
    expect(src('src/components/dashboard/ConnectCard.tsx')).not.toContain('Fitbit');
  });

  it('keeps /wearables and connections on the locked four tiles', () => {
    const tiles = src('src/lib/body-tracker/wearable-tiles.ts');
    const hub = src('src/components/body-tracker/hub/hubConfig.ts');
    expect(tiles).toContain("id: 'whoop'");
    expect(tiles).toContain("id: 'oura'");
    expect(tiles).toContain("id: 'hume'");
    expect(tiles).toContain("id: 'apple_health'");
    expect(tiles).toContain('Hume Body Pod');
    expect(tiles).toContain('resolveLastSyncState');
    expect(hub).toContain('Hume Body Pod');
    expect(hub).not.toContain('Garmin');
    expect(hub).not.toContain('Dexcom');
  });
});
