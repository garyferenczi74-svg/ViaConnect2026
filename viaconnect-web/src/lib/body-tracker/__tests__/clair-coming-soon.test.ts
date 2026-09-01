import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { WearableTileCard } from '@/components/body-tracker/connections/WearableTileCard';
import { ActiveSourceDetailPanel } from '@/components/body-tracker/connections/ActiveSourceDetailPanel';
import { CONNECTED_SOURCES } from '@/lib/body-tracker/connected-sources/registry';
import {
  FIRST_CLASS_TILE_IDS,
  WEARABLE_TILE_SPECS,
  buildWearableTiles,
  isComingSoonTile,
  railFeedDimensions,
  railFeedHeading,
  tileContributorLine,
  type WearableTileInput,
} from '@/lib/body-tracker/wearable-tiles';
import { assembleWearableSnapshot, type WearableSnapshotInput } from '@/lib/body-tracker/wearable-snapshot';
import { wearableHannahGate } from '@/lib/scoring/hannah-bos';
import {
  CLAIR_DISPLAY_NAME,
  CLAIR_PARTNER_HOST,
  CLAIR_PARTNER_ORIGIN,
  CLAIR_SOURCE_ID,
  getClairCreds,
  isAllowedClairHost,
  isClairConfigured,
} from '@/lib/wearables/clair/config';

vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

const root = process.cwd();
const NOW = Date.parse('2026-08-24T10:00:00.000Z');

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx|md|json)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function bannedClairHosts(): string[] {
  const leaf = ['ask', 'clair', '.ai'].join('');
  return [leaf, `prod.${leaf}`];
}

function bannedWellnessNeedles(): string[] {
  return ['estradiol', 'progesterone', 'semaglutide', 'glp-1', 'glp1'];
}

function baseInput(over: Partial<WearableTileInput> = {}): WearableTileInput {
  return {
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
    clairConfigured: false,
    platform: 'web',
    now: NOW,
    ...over,
  };
}

function snapshotBase(over: Partial<WearableSnapshotInput> = {}): WearableSnapshotInput {
  return {
    connected: [],
    tokenProviders: [],
    appleImports: [],
    bodyRows: [],
    sleepRows: [],
    recoveryRows: [],
    workoutRows: [],
    dailyVitalsRows: [],
    healthKitPersisted: false,
    healthKitLastPersistAt: null,
    whoopConfigured: false,
    ouraConfigured: false,
    platform: 'web',
    metabolicManual: false,
    now: NOW,
    ...over,
  };
}

describe('Clair Health Coming soon lock', () => {
  it('registers tile id clair as Coming soon with Sleep + Recovery only', () => {
    expect(CLAIR_SOURCE_ID).toBe('clair');
    expect(CLAIR_DISPLAY_NAME).toBe('Clair Health');
    expect(FIRST_CLASS_TILE_IDS).toContain('clair');
    expect(FIRST_CLASS_TILE_IDS.length).toBeGreaterThan(4);

    const spec = WEARABLE_TILE_SPECS.find((s) => s.id === 'clair');
    expect(spec?.name).toBe('Clair Health');
    expect(spec?.advertisedDimensions).toEqual(['sleep', 'recovery']);
    expect(spec?.advertisedDimensions).not.toContain('body_comp');
    expect(spec?.action).toBe('oauth');
    expect(spec?.notes).toMatch(/Coming soon/);
    expect(spec?.notes).toContain(CLAIR_PARTNER_HOST);
    expect(spec?.notes).not.toMatch(/estradiol|progesterone|semaglutide/i);

    const registry = CONNECTED_SOURCES.find((s) => s.id === 'clair');
    expect(registry?.displayName).toBe('Clair Health');
    expect(registry?.status).toBe('coming_soon');
    expect(registry?.authMethod).toBe('oauth2');
    expect(registry?.capabilities).toEqual([]);
    expect(registry?.notes).toContain(CLAIR_PARTNER_HOST);
  });

  it('never shows Connect, last-sync, or Connected without real config', () => {
    expect(isClairConfigured()).toBe(false);
    expect(getClairCreds()).toBeNull();

    const leftover = buildWearableTiles(
      baseInput({
        clairConfigured: true,
        oauth: [
          {
            provider: 'clair',
            status: 'connected',
            last_sync_at: '2026-08-24T00:00:00.000Z',
            has_tokens: true,
          },
        ],
        healthKitPersisted: true,
        healthKitLastPersistAt: '2026-08-24T00:00:00.000Z',
        platform: 'ios',
        dimensionsFed: { clair: ['sleep', 'recovery'] },
      }),
    ).find((t) => t.id === 'clair');
    if (!leftover) throw new Error('missing clair tile');

    expect(isComingSoonTile(leftover)).toBe(true);
    expect(leftover.status).toBe('disconnected');
    expect(leftover.statusLabel).toBe('Coming soon');
    expect(leftover.lastSyncState).toBe('not_connected');
    expect(leftover.lastSyncAt).toBeNull();
    expect(leftover.action).toEqual({ kind: 'oauth', configured: false });
    expect(leftover.dimensionsFed).toEqual([]);
    expect(tileContributorLine(leftover)).toBe('Will feed Sleep, Recovery');
    expect(railFeedHeading(leftover)).toBe('Will feed');
    expect(railFeedDimensions(leftover)).toEqual(['sleep', 'recovery']);

    const markup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: leftover, onPrimary: () => undefined }),
    );
    expect(markup).toContain('Clair Health');
    expect(markup).toContain('Coming soon');
    expect(markup).toContain('Will feed Sleep, Recovery');
    expect(markup).not.toContain('Connect');
    expect(markup).not.toContain('Last synced');
    expect(markup).not.toContain('Connected');
    expect(markup).not.toContain('Upload XML');

    const rail = renderToStaticMarkup(
      createElement(ActiveSourceDetailPanel, { tile: leftover }),
    );
    expect(rail).toContain('data-feeds-rail="true"');
    expect(rail).toContain('Will feed');
    expect(rail).toContain('Sleep, Recovery');
    expect(rail).not.toContain('Body comp');
    expect(rail).not.toMatch(/estradiol|progesterone|semaglutide/i);
  });

  it('Coming soon Clair never moves the BOS wearable slice or copies phone_health', () => {
    const snap = assembleWearableSnapshot(
      snapshotBase({
        connected: [
          { provider: 'clair', status: 'connected', last_sync_at: '2026-08-24T00:00:00.000Z' },
        ],
        tokenProviders: ['clair'],
        healthKitPersisted: true,
        healthKitLastPersistAt: '2026-08-24T00:00:00.000Z',
        sleepRows: [
          {
            source_provider: 'clair',
            sleep_efficiency_pct: 91,
            total_sleep_min: 420,
            end_at: '2026-08-24T07:00:00.000Z',
            source_app: 'clair',
          },
        ],
        recoveryRows: [
          {
            source_provider: 'clair',
            recovery_score: 88,
            cycle_date: '2026-08-24',
            hrv_ms: 62,
            resting_hr_bpm: 54,
            source_app: 'clair',
          },
        ],
      }),
    );
    const clair = snap.tiles.find((t) => t.id === 'clair');
    expect(clair?.statusLabel).toBe('Coming soon');
    expect(clair?.lastSyncAt).toBeNull();
    expect(clair?.dimensionsFed).toEqual([]);
    expect(clair?.status).toBe('disconnected');
    expect(snap.scoreDetail.find((r) => r.dimension === 'sleep')?.sources).toEqual([]);
    expect(snap.scoreDetail.find((r) => r.dimension === 'recovery')?.sources).toEqual([]);
    expect(snap.scoreDetail.find((r) => r.dimension === 'hrv')?.sources ?? []).toEqual([]);
    expect(wearableHannahGate(snap.tiles).pluggedIn).toBe(false);
    expect(wearableHannahGate(snap.tiles).comingSoonOnly).toBe(true);
  });

  it('hard-bans legacy Clair hosts and hormone / GLP-1 adjacency in this scaffold', () => {
    expect(CLAIR_PARTNER_ORIGIN).toBe('https://wearclair.com');
    expect(isAllowedClairHost('https://wearclair.com/oauth')).toBe(true);
    expect(isAllowedClairHost('https://www.wearclair.com')).toBe(true);
    expect(isAllowedClairHost(`https://${bannedClairHosts()[0]}`)).toBe(false);
    expect(isAllowedClairHost(`https://${bannedClairHosts()[1]}`)).toBe(false);

    const scoped = [
      'src/lib/wearables/clair/config.ts',
      'src/app/api/integrations/clair/[[...path]]/route.ts',
      'src/lib/body-tracker/wearable-tiles.ts',
      'src/lib/body-tracker/connected-sources/registry.ts',
      'src/lib/body-tracker/wearable-snapshot.ts',
      'src/components/body-tracker/connections/ConnectionsSurface.tsx',
      'src/components/body-tracker/connections/WearableBrandMark.tsx',
      'src/lib/scoring/hannah-bos.ts',
    ].map((rel) => src(rel)).join('\n');

    for (const host of bannedClairHosts()) {
      expect(scoped).not.toContain(host);
    }
    for (const needle of bannedWellnessNeedles()) {
      expect(scoped.toLowerCase()).not.toContain(needle.toLowerCase());
    }
    expect(src('src/lib/wearables/clair/config.ts')).not.toMatch(/CLAIR_CLIENT_ID\s*=\s*['"][^'"]+['"]/);
    expect(src('src/app/api/integrations/clair/[[...path]]/route.ts')).toContain("error: 'not_configured'");
    expect(src('src/app/api/integrations/clair/[[...path]]/route.ts')).toContain('501');

    const prFiles = walkFiles(join(root, 'src/lib/wearables/clair'))
      .concat(walkFiles(join(root, 'src/app/api/integrations/clair')))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    for (const host of bannedClairHosts()) {
      expect(prFiles).not.toContain(host);
    }
  });
});
