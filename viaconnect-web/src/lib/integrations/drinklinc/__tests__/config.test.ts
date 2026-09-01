import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  DRINKLINC_COMING_SOON_MESSAGE,
  DRINKLINC_DISPLAY_NAME,
  DRINKLINC_ENV_NAMES,
  DRINKLINC_SLUG,
  drinkLincComingSoonBody,
  isDrinkLincConfigured,
} from '../config';
import { FIRST_CLASS_TILE_IDS } from '@/lib/body-tracker/wearable-tiles';
import {
  PLUGIN_APP_REGISTRY_FALLBACK,
  PLUGIN_PAGE_EXCLUDED_SLUGS,
  isPluginConnectWired,
  isPluginPageApp,
} from '@/lib/integrations/pluginAppRegistry';
import { joinRegistryWithState } from '@/lib/integrations/connectionState';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('DrinkLinc / LINC config honesty', () => {
  it('is never configured and never invents auth or token URLs', () => {
    const prev = {
      id: process.env.DRINKLINC_CLIENT_ID,
      secret: process.env.DRINKLINC_CLIENT_SECRET,
      redirect: process.env.DRINKLINC_REDIRECT_URI,
    };
    expect(isDrinkLincConfigured()).toBe(false);
    process.env.DRINKLINC_CLIENT_ID = 'should-not-matter';
    process.env.DRINKLINC_CLIENT_SECRET = 'should-not-matter';
    process.env.DRINKLINC_REDIRECT_URI = 'https://example.com/callback';
    expect(isDrinkLincConfigured()).toBe(false);
    if (prev.id === undefined) delete process.env.DRINKLINC_CLIENT_ID;
    else process.env.DRINKLINC_CLIENT_ID = prev.id;
    if (prev.secret === undefined) delete process.env.DRINKLINC_CLIENT_SECRET;
    else process.env.DRINKLINC_CLIENT_SECRET = prev.secret;
    if (prev.redirect === undefined) delete process.env.DRINKLINC_REDIRECT_URI;
    else process.env.DRINKLINC_REDIRECT_URI = prev.redirect;

    const config = src('src/lib/integrations/drinklinc/config.ts');
    expect(config).toContain('DRINKLINC_CLIENT_ID');
    expect(config).toContain('DRINKLINC_CLIENT_SECRET');
    expect(config).toContain('DRINKLINC_REDIRECT_URI');
    expect(config).not.toMatch(/https:\/\/[^\s'"]+oauth/i);
    expect(config).not.toMatch(/AUTH_URL\s*=/);
    expect(config).not.toMatch(/TOKEN_URL\s*=/);
    expect(config).not.toMatch(/process\.env\.DRINKLINC_/);
    expect(DRINKLINC_ENV_NAMES.clientId).toBe('DRINKLINC_CLIENT_ID');
  });

  it('coming soon body never claims Connected', () => {
    const body = drinkLincComingSoonBody();
    expect(body.status).toBe('coming_soon');
    expect(body.connected).toBe(false);
    expect(body.configured).toBe(false);
    expect(body.slug).toBe(DRINKLINC_SLUG);
    expect(body.displayName).toBe(DRINKLINC_DISPLAY_NAME);
    expect(body.message).toBe(DRINKLINC_COMING_SOON_MESSAGE);
    expect(JSON.stringify(body)).not.toMatch(/"connected"\s*:\s*true/);
  });
});

describe('DrinkLinc / LINC plugins IA', () => {
  it('lists LINC in Nutrition coming soon and stays off wearables tiles', () => {
    const row = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === 'drinklinc');
    expect(row).toBeDefined();
    expect(row?.displayName).toBe('LINC');
    expect(row?.category).toBe('Nutrition');
    expect(row?.status).toBe('coming_soon');
    expect(row?.connectionType).toBe('oauth2');
    expect(row?.connectPath).toBeNull();
    expect(row?.disconnectPath).toBeNull();
    expect(row?.wearablesCrossLink).toBeNull();
    expect(row?.iconKey).toBe('Droplets');
    expect(row?.sortOrder).toBe(35);
    expect(row && isPluginPageApp(row)).toBe(true);
    expect(row && isPluginConnectWired(row)).toBe(false);
    expect((PLUGIN_PAGE_EXCLUDED_SLUGS as readonly string[]).includes('drinklinc')).toBe(
      false,
    );
    expect((FIRST_CLASS_TILE_IDS as readonly string[]).includes('drinklinc')).toBe(false);
    expect((FIRST_CLASS_TILE_IDS as readonly string[]).includes('linc')).toBe(false);

    const crono = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === 'cronometer');
    const strava = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === 'strava');
    expect(row!.sortOrder).toBeGreaterThan(crono!.sortOrder);
    expect(row!.sortOrder).toBeLessThan(strava!.sortOrder);

    expect(row?.description).toMatch(/Coming soon/i);
    expect(row?.description).toMatch(/No public API yet/i);
    expect(row?.description).not.toMatch(/Semaglutide/i);
    expect(row?.description).not.toContain('\u2014');
    expect(row?.description).not.toContain('\u2013');
  });

  it('never marks drinklinc Connected even with a snapshot', () => {
    const cards = joinRegistryWithState(PLUGIN_APP_REGISTRY_FALLBACK, [
      {
        slug: 'drinklinc',
        connected: true,
        status: 'connected',
        connectedAt: '2026-09-01T00:00:00.000Z',
        lastSyncAt: '2026-09-01T12:00:00.000Z',
        source: 'data_source_connections',
      },
    ]);
    const linc = cards.find((c) => c.slug === 'drinklinc');
    expect(linc?.cardState).toBe('coming_soon');
    expect(linc?.lastSyncAt).toBeNull();
    expect(linc?.displayName).toBe('LINC');
  });

  it('seed migration matches fallback and does not invent OAuth paths', () => {
    const sql = src('supabase/migrations/20260901080000_drinklinc_plugin_app_registry.sql');
    expect(sql).toContain("'drinklinc'");
    expect(sql).toContain("'LINC'");
    expect(sql).toContain("'Nutrition'");
    expect(sql).toContain("'coming_soon'");
    expect(sql).toContain("'oauth2'");
    expect(sql).toContain("'Droplets'");
    expect(sql).toContain('35');
    expect(sql).not.toMatch(/\/api\/integrations\/drinklinc\/authorize/);
    expect(sql).toContain('Do not add drinklinc to FIRST_CLASS_TILE_IDS');
    expect(sql).toContain('not a wearable');
    expect(sql).not.toMatch(/INSERT INTO.*wearable/i);
  });
});
