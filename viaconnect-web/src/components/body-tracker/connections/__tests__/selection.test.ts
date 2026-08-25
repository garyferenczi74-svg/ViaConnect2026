import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
import { WearableTileCard } from '@/components/body-tracker/connections/WearableTileCard';
import { buildWearableTiles, type WearableTileInput } from '@/lib/body-tracker/wearable-tiles';
const NOW = Date.parse('2026-08-24T10:00:00.000Z');
const base = (o: Partial<WearableTileInput> = {}): WearableTileInput => ({ oauth: [], humeIngestCount: 0, humeLastPersistAt: null, appleXmlIngested: 0, appleXmlLastPersistAt: null, healthKitPersisted: false, healthKitLastPersistAt: null, dimensionsFed: {}, whoopConfigured: false, ouraConfigured: false, googleHealthConfigured: false, garminConfigured: false, platform: 'web', now: NOW, ...o });
const apple = () => buildWearableTiles(base()).find((t) => t.id === 'apple_health')!;

describe('tile selection state', () => {
  it('marks the selected tile with data-selected and aria-selected and a non-opacity signal', () => {
    const sel = renderToStaticMarkup(createElement(WearableTileCard, { tile: apple(), onPrimary: () => undefined, onSelect: () => undefined, selected: true }));
    const unsel = renderToStaticMarkup(createElement(WearableTileCard, { tile: apple(), onPrimary: () => undefined, onSelect: () => undefined, selected: false }));
    expect(sel).toContain('data-selected="true"');
    expect(sel).toContain('aria-selected="true"');
    expect(sel).toContain('border-teal'); // greyscale-distinguishable border, not opacity alone
    expect(unsel).toContain('data-selected="false"');
    expect(unsel).not.toContain('aria-selected="true"');
  });

  // Task 10 addendum: role="button" with aria-selected is invalid ARIA
  // (aria-selected is not allowed on role=button). The card is now a
  // role="option" inside ConnectionsSurface's role="listbox", which makes
  // aria-selected valid, plus roving tabindex (selected tile tabbable,
  // others removed from tab order).
  it('uses role=option (not role=button) with roving tabindex, valid for aria-selected', () => {
    const sel = renderToStaticMarkup(createElement(WearableTileCard, { tile: apple(), onPrimary: () => undefined, onSelect: () => undefined, selected: true }));
    const unsel = renderToStaticMarkup(createElement(WearableTileCard, { tile: apple(), onPrimary: () => undefined, onSelect: () => undefined, selected: false }));
    expect(sel).toContain('role="option"');
    expect(unsel).toContain('role="option"');
    expect(sel).not.toContain('role="button"');
    expect(sel).toContain('tabindex="0"');
    expect(unsel).toContain('tabindex="-1"');
  });
});
