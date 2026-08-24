/**
 * Prompt 218: shared connection state + apps-only registry contracts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  joinRegistryWithState,
  groupCardsByCategory,
} from '../connectionState';
import {
  PLUGIN_APP_REGISTRY_FALLBACK,
  PLUGIN_PAGE_SUBTITLE,
} from '../pluginAppRegistry';

const root = process.cwd();

describe('Prompt 218 plugin app registry', () => {
  it('subtitle is Connect your apps', () => {
    expect(PLUGIN_PAGE_SUBTITLE).toBe('Connect your apps');
  });

  it('seed is apps only (no pure wearable device slugs as primary wearables)', () => {
    const slugs = PLUGIN_APP_REGISTRY_FALLBACK.map((r) => r.slug);
    expect(slugs).toContain('google_health');
    expect(slugs).toContain('myfitnesspal');
    // WHOOP is wearable-owned; not in app registry seed
    expect(slugs).not.toContain('whoop');
    expect(slugs).not.toContain('oura');
    expect(slugs).not.toContain('apple_watch');
  });

  it('google_health is live with wearables cross-link', () => {
    const gh = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === 'google_health');
    expect(gh?.status).toBe('live');
    expect(gh?.wearablesCrossLink).toMatch(/body-tracker\/connections/);
    expect(gh?.connectPath).toMatch(/google-health\/start/);
    expect(gh?.disconnectPath).toMatch(/google-health\/disconnect/);
  });
});

describe('Prompt 218 joinRegistryWithState', () => {
  it('never marks coming_soon as connected', () => {
    const cards = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, [
      { slug: 'myfitnesspal', connected: true, connectedAt: '2026-01-01', lastSyncAt: null, source: 'data_source_connections' },
    ]);
    const mfp = cards.find((c) => c.slug === 'myfitnesspal');
    expect(mfp?.cardState).toBe('coming_soon');
  });

  it('marks google_health connected only from real snapshot', () => {
    const offline = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, []);
    expect(offline.find((c) => c.slug === 'google_health')?.cardState).toBe('available');

    const online = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, [
      {
        slug: 'google_health',
        connected: true,
        connectedAt: '2026-08-01T00:00:00.000Z',
        lastSyncAt: '2026-08-12T00:00:00.000Z',
        source: 'body_tracker_connections',
      },
    ]);
    expect(online.find((c) => c.slug === 'google_health')?.cardState).toBe('connected');
  });

  it('forceUnavailable never fabricates available/connected for live apps', () => {
    const cards = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, [], {
      forceUnavailable: true,
    });
    expect(cards.every((c) => c.cardState === 'unavailable')).toBe(true);
  });

  it('groups by category', () => {
    const cards = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, []);
    const groups = groupCardsByCategory(cards);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.some((g) => g.category === 'Health Platforms')).toBe(true);
  });
});

describe('Prompt 218 UI wiring (no hardcoded plugin cards)', () => {
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

  it('shared connectionState module is the join owner', () => {
    const src = readFileSync(
      join(root, 'src/lib/integrations/connectionState.ts'),
      'utf8',
    );
    expect(src).toMatch(/loadPluginAppCards/);
    expect(src).toMatch(/body_tracker_connections/);
    expect(src).toMatch(/data_source_connections/);
  });
});
