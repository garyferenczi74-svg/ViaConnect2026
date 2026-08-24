import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PLUGIN_APP_REGISTRY_FALLBACK, isPluginPageApp } from '@/lib/integrations/pluginAppRegistry';
import type { PluginAppCardModel } from '@/lib/integrations/connectionState';

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

import { PluginAppCard } from '../PluginAppCard';
import { PluginVendorMark } from '../PluginVendorMark';

function cardFrom(
  slug: string,
  cardState: PluginAppCardModel['cardState'],
  lastSyncAt: string | null,
): PluginAppCardModel {
  const row = PLUGIN_APP_REGISTRY_FALLBACK.find((r) => r.slug === slug);
  if (!row) throw new Error(`missing ${slug}`);
  return {
    ...row,
    cardState,
    connectedAt: lastSyncAt ? '2026-08-01T00:00:00.000Z' : null,
    lastSyncAt,
  };
}

describe('PluginAppCard Connections chrome', () => {
  it('matches WearableTileCard frame and connected status • last-sync', () => {
    const google = renderToStaticMarkup(
      <PluginAppCard
        card={{
          ...cardFrom('google_health', 'connected', '2026-08-23T22:00:00.000Z'),
          disconnectPath: '/api/integrations/google-health/disconnect',
        }}
      />,
    );

    expect(google).toContain('rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4');
    expect(google).toContain('data-vendor-mark="google_health"');
    expect(google).toContain('data-last-sync-state="synced"');
    expect(google).toContain('Connected');
    expect(google).toContain('Synced');
    expect(google).not.toContain('Manage in Wearables Data');
    expect(google).not.toContain('/body-tracker/connections');
    expect(google).toContain('Disconnect');
    expect(google).not.toContain('Last sync unknown');
    expect(google).not.toContain('Last sync 0');
    expect(google).not.toContain('Upload XML');
    expect(google).not.toContain('UNKNOWN');
    expect(google).not.toContain('onDragOver');
  });

  it('keeps Coming soon as a right label, never Connect, on unwired apps', () => {
    const mfp = renderToStaticMarkup(
      <PluginAppCard card={cardFrom('myfitnesspal', 'coming_soon', null)} />,
    );
    const cronometer = renderToStaticMarkup(
      <PluginAppCard card={cardFrom('cronometer', 'coming_soon', '2026-08-23T22:00:00.000Z')} />,
    );

    expect(mfp).toContain('data-vendor-mark="myfitnesspal"');
    expect(mfp).toContain('Coming soon');
    expect(mfp).toContain('Not connected');
    expect(mfp).not.toContain('plugin-no-action-myfitnesspal');
    expect(mfp).not.toContain('type="button"');
    expect(mfp).not.toContain('plugin-connect-myfitnesspal');
    expect(mfp).not.toContain('Manage in Wearables Data');
    expect(mfp).not.toContain('Synced');
    expect(cronometer).not.toContain('plugin-connect-cronometer');
    expect(cronometer).not.toContain('Synced');
    expect(cronometer).toContain('Coming soon');
  });

  it('shows Connect only when the plugin can ingest', () => {
    const wired = renderToStaticMarkup(
      <PluginAppCard
        card={{
          slug: 'wired_live_app',
          displayName: 'Wired live app',
          category: 'Health Platforms',
          description: 'Test live connect.',
          iconKey: 'HeartPulse',
          status: 'live',
          connectionType: 'oauth2',
          stateSource: 'body_tracker_connections',
          connectPath: '/api/integrations/wired-live/start',
          disconnectPath: '/api/integrations/wired-live/disconnect',
          wearablesCrossLink: null,
          sortOrder: 1,
          cardState: 'not_connected',
          connectedAt: null,
          lastSyncAt: null,
        }}
      />,
    );
    const google = renderToStaticMarkup(
      <PluginAppCard card={cardFrom('google_health', 'not_connected', null)} />,
    );
    expect(wired).toContain('plugin-connect-wired_live_app');
    expect(wired).toContain('Connect');
    expect(wired).toContain('Not connected');
    expect(wired).not.toContain('Coming soon');
    expect(google).not.toContain('plugin-connect-google_health');
    expect(google).not.toContain('Manage in Wearables Data');
    expect(google).not.toContain('Upload XML');
  });

  it('still renders Manage chrome when a truthful wearables cross-link exists', () => {
    const manage = renderToStaticMarkup(
      <PluginAppCard
        card={{
          slug: 'wired_live_app',
          displayName: 'Wired live app',
          category: 'Health Platforms',
          description: 'Test manage chrome.',
          iconKey: 'HeartPulse',
          status: 'live',
          connectionType: 'oauth2',
          stateSource: 'body_tracker_connections',
          connectPath: '/api/integrations/wired-live/start',
          disconnectPath: '/api/integrations/wired-live/disconnect',
          wearablesCrossLink: '/plugins',
          sortOrder: 1,
          cardState: 'connected',
          connectedAt: '2026-08-01T00:00:00.000Z',
          lastSyncAt: '2026-08-23T22:00:00.000Z',
        }}
      />,
    );
    expect(manage).toContain('Manage in Wearables Data');
    expect(manage).toContain('href="/plugins"');
    expect(manage).not.toContain('href="/body-tracker/connections"');
  });

  it('does not invent last-sync when the timestamp is empty or invalid', () => {
    const empty = renderToStaticMarkup(
      <PluginAppCard card={cardFrom('google_health', 'connected', null)} />,
    );
    const bad = renderToStaticMarkup(
      <PluginAppCard card={cardFrom('google_health', 'connected', 'not-a-date')} />,
    );
    expect(empty).toContain('Connected');
    expect(empty).not.toContain('Synced');
    expect(empty).not.toContain('Last sync unknown');
    expect(bad).toContain('Connected');
    expect(bad).not.toContain('Synced');
    expect(bad).not.toContain('Last sync 0');
  });

  it('never copies Apple Health dropzone or wearable slugs onto plugin cards', () => {
    const markup = PLUGIN_APP_REGISTRY_FALLBACK.filter(isPluginPageApp)
      .map((row) =>
        renderToStaticMarkup(
          <PluginAppCard card={cardFrom(row.slug, 'coming_soon', null)} />,
        ),
      )
      .join('');
    const marks = PLUGIN_APP_REGISTRY_FALLBACK.filter(isPluginPageApp)
      .map((row) =>
        renderToStaticMarkup(
          <PluginVendorMark slug={row.slug} displayName={row.displayName} />,
        ),
      )
      .join('');

    expect(markup).not.toContain('Drag and drop');
    expect(markup).not.toContain('Upload XML');
    expect(markup).not.toContain('whoop');
    expect(markup).not.toContain('oura');
    expect(markup).not.toContain('hume');
    expect(markup).not.toContain('apple_health');
    expect(markup).not.toContain('UNKNOWN');
    expect(marks).toContain('data-vendor-mark="cronometer"');
    expect(marks).toContain('data-vendor-mark="strava"');
    expect(marks).toContain('data-vendor-mark="peloton"');
    expect(marks).toContain('data-vendor-mark="headspace"');
    expect(marks).toContain('data-vendor-mark="calm"');
    expect(marks).not.toContain('data-vendor-mark="whoop"');
  });
});
