import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Connections IA contracts', () => {
  it('uses the same surface for 390 connections and 1280 wearables alias', () => {
    const connections = src('src/app/(app)/(consumer)/body-tracker/connections/page.tsx');
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    expect(connections).toContain('ConnectionsSurface');
    expect(wearables).toContain('ConnectionsSurface');
    expect(wearables).not.toContain('5 min ago');
    expect(wearables).not.toContain('Apple Watch');
    expect(wearables).not.toContain('Vitality');
    expect(wearables).not.toContain('WearableDashboardPage');
    expect(wearables).not.toContain('dailyScores');
    expect(wearables).not.toContain('COMT');
    expect(wearables).not.toContain('ScoreRing');
    expect(wearables).not.toContain('Recovery 78');
    expect(wearables).not.toContain('Sleep 85');
    expect(wearables).not.toContain('Strain 42');
  });

  it('ships four tiles, XML Hume action, and BOS footer', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    const detail = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    expect(surface).toContain('CONNECTIONS_FOOTER');
    expect(surface).toContain('min-[1280px]:grid-cols-2');
    expect(surface).not.toContain('Hume authorize');
    expect(surface).not.toMatch(/Vitality Score/);
    expect(surface).not.toMatch(/helix.?reward/i);
    expect(tile).toContain('Upload XML');
    expect(tile).toContain('Watch');
    expect(tile).not.toContain('Connected Watch');
    expect(tile).not.toMatch(/className="[^"]*\btruncate\b/);
    expect(tile).toContain('whitespace-normal break-words');
    expect(tile).toContain('Reconnect');
    expect(surface + tile + detail).not.toContain('font-serif');
    expect(surface + tile + detail).not.toContain('#224852');
    expect(surface + tile + detail).not.toContain('#4ADE80');
    expect(surface).not.toMatch(/ViaConnect/);
    expect(surface + tile + detail).not.toMatch(/Arnold|Thanos/i);
    expect(tile).toContain('Coming soon');
    expect(tile).not.toContain('Not configured');
    expect(tile).not.toMatch(/waiting on/i);
    expect(detail).toContain('Bio Optimization Score');
    expect(detail).not.toMatch(/Vitality/);
    expect(detail).not.toMatch(/Stability|Symmetry|Helix/);
    expect(detail).toContain('DISAGREE');
    expect(detail).toContain('Active');
    expect(detail).toContain('data-ring');
    expect(detail).toContain('strokeWidth={1.5}');
    expect(detail).toContain('Missing stays UNKNOWN, never 0.');
    expect(tile).toContain('Upload Apple Health XML');
    expect(surface).toContain("tile.id === 'hume' ? 'hume' : 'apple'");
    const disagree = src('src/lib/body-tracker/source-disagreement.ts');
    expect(disagree).toContain('averaged because equal trust.');
  });

  it('redirects plugins wearables catalog to connections', () => {
    const plugins = src('src/app/(app)/(consumer)/plugins/wearables/page.tsx');
    expect(plugins).toContain("/body-tracker/connections");
    expect(plugins).toContain('redirect');
  });

  it('ships XML ingest and keeps OAuth tiles honest without secrets', () => {
    const model = src('src/lib/body-tracker/wearable-tiles.ts');
    const whoop = src('src/lib/wearables/whoop/config.ts');
    const oura = src('src/lib/wearables/oura/config.ts');
    const env = src('.env.example');
    const envLocal = src('.env.local.example');
    expect(model).toContain("action: 'xml_upload'");
    expect(model).toContain('isOAuthConnected');
    expect(model).toContain("name: 'Hume Body Pod'");
    expect(whoop + oura).not.toMatch(/YOUR_|changeme|dummy.?id|placeholder.?id/i);
    expect(whoop).not.toMatch(/WHOOP_CLIENT_ID\s*=\s*['"][^'"]+['"]/);
    expect(oura).not.toMatch(/OURA_CLIENT_ID\s*=\s*['"][^'"]+['"]/);
    expect(env).toMatch(/^WHOOP_CLIENT_ID=\s*$/m);
    expect(env).toMatch(/^OURA_CLIENT_ID=\s*$/m);
    expect(envLocal).toMatch(/^WHOOP_CLIENT_ID=\s*$/m);
    expect(envLocal).toMatch(/^OURA_CLIENT_ID=\s*$/m);
    expect(env + envLocal).not.toMatch(/WHOOP_CLIENT_ID=.+/);
    expect(env + envLocal).not.toMatch(/OURA_CLIENT_ID=.+/);
  });

  it('keeps Hume action as xml_upload in the tile model', () => {
    const model = src('src/lib/body-tracker/wearable-tiles.ts');
    expect(model).toContain("id: 'hume'");
    expect(model).toContain("action: 'xml_upload'");
    expect(model).toContain('Bio Optimization Score uses these sources.');
  });

  it('kills leftover nine-tile CONNECTED_SOURCES surface and old dashboard copy', () => {
    expect(existsSync(join(root, 'src/components/body-tracker/connected-sources/ConnectedSourceCard.tsx'))).toBe(false);
    const connections = src('src/app/(app)/(consumer)/body-tracker/connections/page.tsx');
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    const hub = src('src/components/body-tracker/hub/hubConfig.ts');
    const joined = connections + wearables + surface + tile;
    expect(joined).not.toContain('CONNECTED_SOURCES');
    expect(joined).not.toContain('ConnectedSourceCard');
    expect(joined).not.toContain('5 min ago');
    expect(hub).not.toMatch(/garmin/i);
    expect(hub).not.toMatch(/dexcom/i);
    expect(hub).not.toMatch(/fitbit/i);
    expect(hub).toContain('Hume Body Pod');
    expect(hub).toContain('Apple Health');
    const model = src('src/lib/body-tracker/wearable-tiles.ts');
    expect(model).toContain("FIRST_CLASS_TILE_IDS = ['whoop', 'hume', 'apple_health', 'oura']");
    expect(model).toContain('FORBIDDEN_FIRST_CLASS_TILE_IDS');
    expect(model).toContain("'fitbit'");
    expect(model).toContain("'garmin'");
    expect(model).toContain("'apple_watch'");
  });

  it('uses the PR40 last-sync SM only — no duplicate LAST_SYNC_STATES module', () => {
    const sm = src('src/lib/body-tracker/last-sync-state.ts');
    const tiles = src('src/lib/body-tracker/wearable-tiles.ts');
    expect(sm).toContain('LAST_SYNC_KINDS');
    expect(sm).toContain('linked: boolean');
    expect(sm).toContain('needsReconnect');
    expect(sm).toContain('LastSyncState');
    expect(sm).toMatch(/label: string/);
    expect(sm).not.toContain('LAST_SYNC_STATES');
    expect(sm).not.toContain('persisted: boolean');
    expect(sm).not.toContain('reconnectRequired');
    expect(sm).not.toContain('LastSyncView');
    expect(tiles).toContain("@/lib/body-tracker/last-sync-state");
    expect(tiles).toContain('needsReconnect');
    expect(tiles).toContain('linked');
    expect(tiles).not.toContain('reconnectRequired');
    expect(tiles).not.toContain('LAST_SYNC_STATES');
  });

  it('/wearables is ConnectionsSurface + last-sync SM only — no WearableDashboardPage', () => {
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    const connections = src('src/app/(app)/(consumer)/body-tracker/connections/page.tsx');
    expect(wearables).toContain('ConnectionsSurface');
    expect(wearables).toMatch(/return <ConnectionsSurface \/>/);
    expect(wearables).not.toMatch(/WearableDashboardPage|Wearable Dashboard|ScoreRing/);
    expect(wearables).not.toMatch(/Last sync:\s*5 min ago|["'`]5 min ago["'`]/);
    expect(wearables).not.toMatch(/px-4 py-6/);
    expect(connections).toMatch(/return <ConnectionsSurface \/>/);

    const srcRoot = join(root, 'src');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          walk(full);
          continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
        const text = readFileSync(full, 'utf8');
        if (text.includes('WearableDashboardPage') || /function WearableDashboard\b/.test(text)) {
          hits.push(full.replace(`${srcRoot}/`, 'src/'));
        }
      }
    };
    walk(srcRoot);
    expect(hits).toEqual([]);
  });
});
