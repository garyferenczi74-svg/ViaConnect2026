import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  HEALTH_XML_IMPORT_COPY,
} from '@/components/body-tracker/connected-sources/AppleHealthImportModal';
import { isNavHrefActive } from '@/components/layout/navActive';
import { FIRST_CLASS_TILE_IDS } from '@/lib/body-tracker/wearable-tiles';
import {
  PLUGIN_APP_REGISTRY_FALLBACK,
  PLUGIN_STATE_COPY,
  isTruthfulWearablesManage,
} from '@/lib/integrations/pluginAppRegistry';

vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
  }) => createElement('a', { href, className }, children),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/plugins',
  useRouter: () => ({ push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import { AppleHealthImportModal } from '@/components/body-tracker/connected-sources/AppleHealthImportModal';
import { PluginAppCard } from '@/components/plugins/PluginAppCard';
import type { PluginAppCardModel } from '@/lib/integrations/connectionState';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Brief 25 connections honesty', () => {
  it('Hume modal copy is Hume and Apple modal copy stays Apple', () => {
    expect(HEALTH_XML_IMPORT_COPY.hume.title).toBe('Import Hume Body Pod');
    expect(HEALTH_XML_IMPORT_COPY.hume.lead).toMatch(/Hume-tagged/);
    expect(HEALTH_XML_IMPORT_COPY.hume.lead).not.toMatch(/OAuth/i);
    expect(HEALTH_XML_IMPORT_COPY.apple.title).toBe('Import from Apple Health');
    expect(HEALTH_XML_IMPORT_COPY.apple.lead).toMatch(/Export All Health Data/);
    expect(HEALTH_XML_IMPORT_COPY.apple.title).not.toContain('Hume');

    const modal = src('src/components/body-tracker/connected-sources/AppleHealthImportModal.tsx');
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(modal).toContain('recordsAttributedHume');
    expect(modal).not.toMatch(/\bas any\b/);
    expect(surface).toContain("tile.id === 'hume' ? 'hume' : 'apple'");
    expect(surface).toContain('intent={importIntent ?? \'apple\'}');
    expect(surface).not.toMatch(/Hume authorize|hume\/oauth/i);

    const hume = renderToStaticMarkup(
      createElement(AppleHealthImportModal, {
        open: true,
        intent: 'hume',
        onClose: () => undefined,
      }),
    );
    const apple = renderToStaticMarkup(
      createElement(AppleHealthImportModal, {
        open: true,
        intent: 'apple',
        onClose: () => undefined,
      }),
    );
    expect(hume).toContain('Import Hume Body Pod');
    expect(hume).toContain('data-import-intent="hume"');
    expect(hume).toContain('Hume-tagged');
    expect(hume).not.toContain('Import from Apple Health');
    expect(apple).toContain('Import from Apple Health');
    expect(apple).toContain('data-import-intent="apple"');
    expect(apple).toContain('Export All Health Data');
    expect(apple).not.toContain('Import Hume Body Pod');
  });

  it('keeps six Connections tiles including Google Health and Garmin as Coming soon', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    const tiles = src('src/lib/body-tracker/wearable-tiles.ts');
    expect(tiles).toContain("'google_health'");
    expect(tiles).toContain('FORBIDDEN_FIRST_CLASS_TILE_IDS');
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(surface).toContain('FIRST_CLASS_TILE_IDS');
    expect(surface).not.toMatch(/id: 'google_health'/);
  });

  it('Google Manage does not claim Connections will show Google', () => {
    const gh = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === 'google_health');
    expect(gh?.status).toBe('coming_soon');
    expect(gh?.wearablesCrossLink).toBeNull();
    expect(gh && isTruthfulWearablesManage(gh)).toBe(false);

    const google = renderToStaticMarkup(
      createElement(PluginAppCard, {
        card: {
          ...(gh as PluginAppCardModel),
          cardState: 'connected',
          connectedAt: '2026-08-01T00:00:00.000Z',
          lastSyncAt: '2026-08-23T22:00:00.000Z',
          wearablesCrossLink: '/body-tracker/connections',
        },
      }),
    );
    expect(google).not.toContain('Manage in Wearables Data');
    expect(google).not.toContain('href="/body-tracker/connections"');
  });

  it('Coming soon is one line without a duplicate No action yet', () => {
    const mfp = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === 'myfitnesspal');
    const markup = renderToStaticMarkup(
      createElement(PluginAppCard, {
        card: {
          ...(mfp as PluginAppCardModel),
          cardState: 'coming_soon',
          connectedAt: null,
          lastSyncAt: null,
        },
      }),
    );
    expect(markup).toContain(PLUGIN_STATE_COPY.comingSoon);
    expect(markup).not.toContain('plugin-no-action-myfitnesspal');
    expect(markup.match(/No action yet\./g)?.length ?? 0).toBeLessThanOrEqual(1);
    const card = src('src/components/plugins/PluginAppCard.tsx');
    expect(card).not.toContain('PLUGIN_STATE_COPY.noActionYet');
    expect(card).toContain('@/lib/body-tracker/last-sync-state');
  });

  it('nav and copy use /body-tracker/connections as the canonical wearables path', () => {
    const sidebar = src('src/components/layout/Sidebar.tsx');
    const mobile = src('src/components/layout/MobileNavBar.tsx');
    const quick = src('src/components/dashboard/QuickActionsGrid.tsx');
    const pills = src('src/lib/scoring/pill-routes.ts');
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    const nextConfig = src('next.config.mjs');
    expect(sidebar).toContain('href: "/body-tracker/connections"');
    expect(sidebar).not.toContain('href: "/wearables"');
    expect(mobile).toContain("href: '/body-tracker/connections'");
    expect(mobile).not.toContain("href: '/wearables'");
    expect(quick).toContain("href: '/body-tracker/connections'");
    expect(pills).toContain("wearable_dashboard: '/body-tracker/connections'");
    expect(wearables).toContain("redirect('/body-tracker/connections')");
    expect(nextConfig).toContain('source: "/wearables"');
    expect(nextConfig).toContain('destination: "/body-tracker/connections"');
  });

  it('does not let My Biology steal the Connections nav item', () => {
    const hrefs = ['/body-tracker', '/body-tracker/connections'];
    expect(isNavHrefActive('/body-tracker/connections', '/body-tracker/connections', hrefs)).toBe(
      true,
    );
    expect(isNavHrefActive('/body-tracker/connections', '/body-tracker', hrefs)).toBe(false);
    expect(isNavHrefActive('/body-tracker/composition', '/body-tracker', hrefs)).toBe(true);
    expect(isNavHrefActive('/body-tracker/composition', '/body-tracker/connections', hrefs)).toBe(
      false,
    );
  });

  it('the XML import fails closed on a non-complete server status and reads real counts', () => {
    const modal = src('src/components/body-tracker/connected-sources/AppleHealthImportModal.tsx');
    expect(modal).toContain('isImportComplete');
    expect(modal).toContain('parseImportSummary');
    expect(modal).toContain('withAbortTimeout');
    expect(modal).toMatch(/!res\.ok \|\| !isImportComplete/);
  });
});
