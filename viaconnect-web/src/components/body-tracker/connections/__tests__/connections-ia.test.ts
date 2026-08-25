import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Connections IA contracts', () => {
  it('uses ConnectionsSurface on the canonical path and redirects /wearables there', () => {
    const connections = src('src/app/(app)/(consumer)/body-tracker/connections/page.tsx');
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    expect(connections).toContain('ConnectionsSurface');
    expect(wearables).toContain("redirect('/body-tracker/connections')");
    expect(wearables).not.toContain('ConnectionsSurface');
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
    // Prompt 230 Task 7 split the per-dimension row render out of
    // ScoreDetailPanel.tsx into ContributorColumn.tsx (the panel now just
    // mounts it). DISAGREE / data-ring / strokeWidth chrome moved with it,
    // so this honesty scan follows the code to its new file.
    const detail =
      src('src/components/body-tracker/connections/ScoreDetailPanel.tsx') +
      src('src/components/body-tracker/connections/ContributorColumn.tsx');
    expect(surface).toContain('CONNECTIONS_FOOTER');
    expect(surface).toContain('min-[1280px]:grid-cols-[1fr_1.2fr_1fr]');
    expect(surface).not.toContain('Hume authorize');
    expect(surface).not.toMatch(/Vitality Score/);
    expect(surface).not.toMatch(/helix.?reward/i);
    expect(tile).toContain('Upload XML');
    // Task 11 moved the tile icon out of WearableTileCard.tsx into the
    // Lex-gated WearableBrandMark component (tile now renders
    // <WearableBrandMark id={tile.id} .../> instead of a local switch on
    // lucide-react icons), so the vendor-icon honesty check follows it
    // there: the shipped fallback set must still cover the Watch icon for
    // both whoop and garmin -- task-11-brief.md pins garmin to Watch (not
    // Activity), matching WEARABLE_TILE_SPECS.icon in wearable-tiles.ts.
    expect(tile).toContain('WearableBrandMark');
    const brandMark = src('src/components/body-tracker/connections/WearableBrandMark.tsx');
    expect(brandMark).toContain('Watch');
    expect(tile).not.toContain('Connected Watch');
    expect(tile).not.toMatch(/className="[^"]*\btruncate\b/);
    expect(tile).toContain('whitespace-normal break-words');
    expect(tile).toContain('Reconnect');
    // Task 11: the forbidden-string scan now also covers the new
    // WearableBrandMark.tsx (strengthened, not weakened, per the brief).
    expect(surface + tile + detail + brandMark).not.toContain('font-serif');
    expect(surface + tile + detail + brandMark).not.toContain('#224852');
    expect(surface + tile + detail + brandMark).not.toContain('#4ADE80');
    expect(surface).not.toMatch(/ViaConnect/);
    expect(surface + tile + detail + brandMark).not.toMatch(/Arnold|Thanos/i);
    expect(tile).toContain('{tile.statusLabel}');
    expect(tile).not.toMatch(/sr-only[^>]*>Coming soon/);
    expect(tile).not.toContain('Not configured');
    expect(tile).not.toMatch(/waiting on/i);
    expect(detail).toContain('Bio Optimization Score');
    expect(detail).not.toMatch(/Vitality/);
    expect(detail).not.toMatch(/Stability|Symmetry|Helix/);
    expect(detail).toContain('DISAGREE');
    expect(detail).toContain('data-ring');
    expect(detail).toContain('strokeWidth={1.5}');
    expect(detail).toContain('Missing stays UNKNOWN, never 0.');
    // The per-source "Active" badge (which source won a disagreement) moved
    // to the Task 8 dimension detail sheet along with the rest of the
    // per-source breakdown; is_active itself still drives it honestly.
    const disagreement = src('src/lib/body-tracker/source-disagreement.ts');
    expect(disagreement).toContain('is_active');
    expect(tile).toContain('Upload Apple Health XML');
    expect(surface).toContain("tile.id === 'hume' ? 'hume' : 'apple'");
    const disagree = src('src/lib/body-tracker/source-disagreement.ts');
    expect(disagree).toContain('averaged because equal trust.');
  });

  it('says the UNKNOWN disclosure once and softens the not-configured toast', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    const col = src('src/components/body-tracker/connections/ContributorColumn.tsx');
    const tiles = src('src/lib/body-tracker/wearable-tiles.ts');
    // CONNECTIONS_FOOTER rendered exactly once across surface + panel + column.
    // Matched as an actual JSX render site (curly-brace expression), not the
    // import specifier, since a legitimately-imported constant always names
    // itself once at the import site in addition to its single render.
    const footerRenders = (surface + panel + col).match(/\{CONNECTIONS_FOOTER\}/g) ?? [];
    expect(footerRenders.length).toBe(1);
    expect(surface).not.toContain('is not configured yet');
    expect(surface).toContain('is not available yet');

    // Say-once disclosure: centralized in wearable-tiles.ts (Task 9 moved it
    // off ContributorColumn's local CONTRIBUTOR_DISCLOSURE), imported and
    // rendered exactly once, only in the contributor column.
    expect(tiles).toContain('export const CONNECTIONS_DISCLOSURE');
    expect(col).toContain('CONNECTIONS_DISCLOSURE');
    expect(col).not.toContain('CONTRIBUTOR_DISCLOSURE');
    expect(surface).not.toContain('CONNECTIONS_DISCLOSURE');
    expect(panel).not.toContain('CONNECTIONS_DISCLOSURE');
    const disclosureRenders = (surface + panel + col).match(/\{CONNECTIONS_DISCLOSURE\}/g) ?? [];
    expect(disclosureRenders.length).toBe(1);
  });

  it('wires the 228 state contract into load(): timeout, distinct error state, named retry', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    // The tiles fetch is wrapped in the resilience timeout util, not a bare fetch.
    expect(surface).toContain("import { withAbortTimeout } from '@/lib/utils/with-timeout';");
    expect(surface).toMatch(
      /withAbortTimeout\(\s*\(signal\) => fetch\(`\/api\/integrations\/wearable-tiles\?platform=\$\{platform\}`, \{ signal \}\)/,
    );
    // A dedicated load-status state distinct from the tiles data itself.
    expect(surface).toContain("useState<'loading' | 'ready' | 'error'>('loading')");
    expect(surface).toContain("setLoadStatus('ready')");
    // Both the !res.ok branch and the catch branch (inside load() itself,
    // not the unrelated persistPhiConsent catch below it) land on 'error',
    // and neither overwrites tiles with emptyTiles -- a failed load must
    // never be presented as a truthful "Not connected" answer.
    const loadFnStart = surface.indexOf('const load = useCallback');
    const loadFnEnd = surface.indexOf('}, [platform]);', loadFnStart);
    expect(loadFnStart).toBeGreaterThan(-1);
    expect(loadFnEnd).toBeGreaterThan(loadFnStart);
    const loadFn = surface.slice(loadFnStart, loadFnEnd);
    expect((loadFn.match(/setLoadStatus\('error'\)/g) ?? []).length).toBe(2);
    expect(loadFn).not.toContain('setTiles(emptyTiles');
    // The error branch renders a distinct, actionable notice: an honest
    // message plus a real touch-target Retry control that calls load() again.
    expect(surface).toContain("loadStatus === 'error'");
    expect(surface).toMatch(/setLoadStatus\('loading'\);\s*void load\(\);/);
    expect(surface).toContain('min-h-[44px]');
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
    expect(model).toContain(
      "FIRST_CLASS_TILE_IDS = ['whoop', 'hume', 'apple_health', 'oura', 'google_health', 'garmin']",
    );
    expect(model).toContain('FORBIDDEN_FIRST_CLASS_TILE_IDS');
    expect(model).toContain("'fitbit'");
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

  it('/wearables redirects to Connections and last-sync SM stays on the canonical page', () => {
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    const connections = src('src/app/(app)/(consumer)/body-tracker/connections/page.tsx');
    expect(wearables).toContain("redirect('/body-tracker/connections')");
    expect(wearables).not.toContain('ConnectionsSurface');
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
