/**
 * Plugin registry join + Picasso /plugins IA honesty.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  joinRegistryWithState,
  groupCardsByCategory,
  summarizePluginConnectionState,
} from '../connectionState';
import {
  PLUGIN_APP_REGISTRY_FALLBACK,
  PLUGIN_COMING_SOON_ACTION,
  PLUGIN_PAGE_SCOPE_LINE,
  PLUGIN_PAGE_SUBTITLE,
  honestPluginAppRow,
  isPluginConnectWired,
  isPluginPageApp,
  isTruthfulWearablesManage,
  type PluginAppRegistryRow,
} from '../pluginAppRegistry';

const root = process.cwd();

describe('Plugin app registry (apps only)', () => {
  it('subtitle and scope line match the IA', () => {
    expect(PLUGIN_PAGE_SUBTITLE).toBe('Connect your apps');
    expect(PLUGIN_PAGE_SCOPE_LINE).toBe(
      'App integrations only. Device wearables under Wearables Data (/body-tracker/connections).',
    );
    expect(PLUGIN_COMING_SOON_ACTION).toBe(
      'No action yet. We enable Connect when the flow ships.',
    );
  });

  it('seed is apps only and excludes wearable / Helix / ViaCura tiles', () => {
    const pageApps = PLUGIN_APP_REGISTRY_FALLBACK.filter(isPluginPageApp);
    const slugs = pageApps.map((r) => r.slug);
    expect(slugs).toContain('google_health');
    expect(slugs).toContain('myfitnesspal');
    expect(slugs).not.toContain('whoop');
    expect(slugs).not.toContain('oura');
    expect(slugs).not.toContain('hume');
    expect(slugs).not.toContain('apple_health');
    expect(slugs).not.toContain('apple_watch');
    expect(slugs).not.toContain('viacura');
    expect(slugs).not.toContain('helix');
    expect(slugs).not.toContain('genetics_file_import');
  });

  it('google_health is coming soon and does not claim Connections will show Google', () => {
    const gh = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === 'google_health');
    expect(gh?.status).toBe('coming_soon');
    expect(gh?.wearablesCrossLink).toBeNull();
    expect(gh?.connectPath).toBeNull();
    expect(gh && isPluginConnectWired(gh)).toBe(false);
    expect(gh && isTruthfulWearablesManage(gh)).toBe(false);
    expect(gh && isTruthfulWearablesManage({
      slug: gh.slug,
      wearablesCrossLink: '/body-tracker/connections',
    })).toBe(false);
    expect(honestPluginAppRow({
      ...(gh as PluginAppRegistryRow),
      status: 'live',
      wearablesCrossLink: '/body-tracker/connections',
    }).wearablesCrossLink).toBeNull();
  });

  it('MFP and Cronometer stay coming soon until OAuth exists', () => {
    for (const slug of ['myfitnesspal', 'cronometer']) {
      const row = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === slug);
      expect(row?.status).toBe('coming_soon');
      expect(row?.connectPath).toBeNull();
      expect(row && isPluginConnectWired(row)).toBe(false);
    }
  });
});

describe('joinRegistryWithState uses last-sync-state only', () => {
  it('never marks coming_soon as connected even with a snapshot', () => {
    const cards = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, [
      {
        slug: 'myfitnesspal',
        connected: true,
        status: 'connected',
        connectedAt: '2026-01-01T00:00:00.000Z',
        lastSyncAt: '2026-01-02T00:00:00.000Z',
        source: 'data_source_connections',
      },
    ]);
    const mfp = cards.find((c) => c.slug === 'myfitnesspal');
    expect(mfp?.cardState).toBe('coming_soon');
    expect(mfp?.lastSyncAt).toBeNull();
  });

  it('never invents Google Connected on Connections and keeps coming soon', () => {
    const offline = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, []);
    expect(offline.find((c) => c.slug === 'google_health')?.cardState).toBe('coming_soon');

    const persistNoSync = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, [
      {
        slug: 'google_health',
        connected: true,
        status: 'connected',
        connectedAt: '2026-08-01T00:00:00.000Z',
        lastSyncAt: null,
        source: 'body_tracker_connections',
      },
    ]);
    expect(persistNoSync.find((c) => c.slug === 'google_health')?.cardState).toBe(
      'coming_soon',
    );
    expect(persistNoSync.find((c) => c.slug === 'google_health')?.lastSyncAt).toBeNull();

    const online = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, [
      {
        slug: 'google_health',
        connected: true,
        status: 'connected',
        connectedAt: '2026-08-01T00:00:00.000Z',
        lastSyncAt: '2026-08-12T00:00:00.000Z',
        source: 'body_tracker_connections',
      },
    ]);
    const gh = online.find((c) => c.slug === 'google_health');
    expect(gh?.cardState).toBe('coming_soon');
    expect(gh?.lastSyncAt).toBeNull();
    expect(gh?.wearablesCrossLink).toBeNull();
  });

  it('marks a wired live app connected only when last-sync is real', () => {
    const live: PluginAppRegistryRow = {
      slug: 'wired_live_app',
      displayName: 'Wired live app',
      category: 'Health Platforms',
      description: 'Test live join.',
      iconKey: 'HeartPulse',
      status: 'live',
      connectionType: 'oauth2',
      stateSource: 'body_tracker_connections',
      connectPath: '/api/integrations/wired-live/start',
      disconnectPath: '/api/integrations/wired-live/disconnect',
      wearablesCrossLink: null,
      sortOrder: 1,
    };

    const persistNoSync = joinRegistryWithState([live], [
      {
        slug: 'wired_live_app',
        connected: true,
        status: 'connected',
        connectedAt: '2026-08-01T00:00:00.000Z',
        lastSyncAt: null,
        source: 'body_tracker_connections',
      },
    ]);
    expect(persistNoSync.find((c) => c.slug === 'wired_live_app')?.cardState).toBe(
      'not_connected',
    );

    const online = joinRegistryWithState([live], [
      {
        slug: 'wired_live_app',
        connected: true,
        status: 'connected',
        connectedAt: '2026-08-01T00:00:00.000Z',
        lastSyncAt: '2026-08-12T00:00:00.000Z',
        source: 'body_tracker_connections',
      },
    ]);
    const row = online.find((c) => c.slug === 'wired_live_app');
    expect(row?.cardState).toBe('connected');
    expect(row?.lastSyncAt).toBe('2026-08-12T00:00:00.000Z');
  });

  it('maps token/status failure to Needs reconnect for a wired live app', () => {
    const live: PluginAppRegistryRow = {
      slug: 'wired_live_app',
      displayName: 'Wired live app',
      category: 'Health Platforms',
      description: 'Test live join.',
      iconKey: 'HeartPulse',
      status: 'live',
      connectionType: 'oauth2',
      stateSource: 'body_tracker_connections',
      connectPath: '/api/integrations/wired-live/start',
      disconnectPath: '/api/integrations/wired-live/disconnect',
      wearablesCrossLink: null,
      sortOrder: 1,
    };
    const cards = joinRegistryWithState([live], [
      {
        slug: 'wired_live_app',
        connected: false,
        status: 'needs_reconnect',
        connectedAt: '2026-08-01T00:00:00.000Z',
        lastSyncAt: '2026-08-12T00:00:00.000Z',
        source: 'body_tracker_connections',
      },
    ]);
    expect(cards.find((c) => c.slug === 'wired_live_app')?.cardState).toBe('needs_reconnect');
  });

  it('fail-open never fabricates connected', () => {
    const cards = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, []);
    expect(cards.some((c) => c.cardState === 'connected')).toBe(false);
    expect(cards.find((c) => c.slug === 'google_health')?.cardState).toBe('coming_soon');
  });

  it('groups only IA sections that have a row', () => {
    const cards = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, []);
    const groups = groupCardsByCategory(cards);
    expect(groups.map((g) => g.category)).toEqual([
      'Health platforms',
      'Nutrition',
      'Fitness',
      'other',
    ]);
    expect(groups.every((g) => g.cards.length > 0)).toBe(true);
    expect(groups.some((g) => g.category === 'Mindfulness')).toBe(false);
    expect(groups.some((g) => g.category === 'Data Import')).toBe(false);
  });

  it('summary omits empty buckets instead of counting them as zero', () => {
    const comingSoon = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, []);
    const buckets = summarizePluginConnectionState(comingSoon);
    expect(buckets.map((b) => b.state)).toEqual(['coming_soon']);
    expect(buckets.some((b) => b.state === 'connected')).toBe(false);
    expect(buckets.some((b) => b.state === 'not_connected')).toBe(false);
    expect(buckets.every((b) => b.names.length > 0)).toBe(true);
    expect(buckets[0]?.names).not.toContain('Whoop');
    expect(buckets[0]?.names).not.toContain('Apple Health');
  });
});

describe('Plugins UI wiring', () => {
  it('plugins page uses PluginsAppsSurface not static mock list', () => {
    const page = readFileSync(
      join(root, 'src/app/(app)/(consumer)/plugins/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/PluginsAppsSurface/);
    expect(page).not.toMatch(/Apple Watch/);
    expect(page).not.toMatch(/SEED_COMMUNITY/);
    expect(page).not.toMatch(/activeConnections = \[/);
  });

  it('plugins/apps page no longer has hardcoded AppItem array', () => {
    const apps = readFileSync(
      join(root, 'src/app/(app)/(consumer)/plugins/apps/page.tsx'),
      'utf8',
    );
    expect(apps).toMatch(/PluginsAppsSurface/);
    expect(apps).not.toMatch(/const apps: AppItem/);
    expect(apps).not.toMatch(/Terra API integration in progress/);
  });

  it('shared connectionState module is the join owner and imports last-sync-state', () => {
    const src = readFileSync(join(root, 'src/lib/integrations/connectionState.ts'), 'utf8');
    expect(src).toMatch(/loadPluginAppCards/);
    expect(src).toMatch(/body_tracker_connections/);
    expect(src).toMatch(/data_source_connections/);
    expect(src).toContain("@/lib/body-tracker/last-sync-state");
    expect(src).toContain('resolveLastSyncState');
    expect(src).toContain('oauthNeedsReconnect');
    expect(src).not.toMatch(/\bas any\b/);
    expect(src).not.toContain("'available'");
    expect(src).not.toContain("'unavailable'");
  });
});
