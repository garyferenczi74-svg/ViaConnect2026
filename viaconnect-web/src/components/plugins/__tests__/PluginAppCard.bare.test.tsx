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

describe('PluginAppCard 390 anatomy render', () => {
  it('renders vendor marks and connected actions without a coming-soon control', () => {
    const google = renderToStaticMarkup(
      <PluginAppCard
        card={cardFrom('google_health', 'connected', '2026-08-23T22:00:00.000Z')}
      />,
    );
    const mfp = renderToStaticMarkup(
      <PluginAppCard card={cardFrom('myfitnesspal', 'coming_soon', null)} />,
    );
    const marks = PLUGIN_APP_REGISTRY_FALLBACK.filter(isPluginPageApp)
      .map((row) =>
        renderToStaticMarkup(
          <PluginVendorMark slug={row.slug} displayName={row.displayName} />,
        ),
      )
      .join('');

    expect(google).toContain('data-vendor-mark="google_health"');
    expect(google).toContain('Manage in Wearables Data');
    expect(google).toContain('Disconnect');
    expect(google).toContain('Last sync');
    expect(google).not.toContain('Last sync 0');
    expect(mfp).toContain('data-vendor-mark="myfitnesspal"');
    expect(mfp).toContain('No action yet.');
    expect(mfp).not.toContain('type="button"');
    expect(mfp).not.toContain('Manage in Wearables Data');
    expect(marks).toContain('data-vendor-mark="cronometer"');
    expect(marks).toContain('data-vendor-mark="strava"');
    expect(marks).toContain('data-vendor-mark="peloton"');
    expect(marks).toContain('data-vendor-mark="headspace"');
    expect(marks).toContain('data-vendor-mark="calm"');
    expect(marks).not.toContain('data-vendor-mark="whoop"');
  });
});
