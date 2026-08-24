import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
import { ActiveSourceDetailPanel } from '@/components/body-tracker/connections/ActiveSourceDetailPanel';
import { buildWearableTiles, type WearableTileInput } from '@/lib/body-tracker/wearable-tiles';
const NOW = Date.parse('2026-08-24T10:00:00.000Z');
const base = (o: Partial<WearableTileInput> = {}): WearableTileInput => ({ oauth: [], humeIngestCount: 0, humeLastPersistAt: null, appleXmlIngested: 0, appleXmlLastPersistAt: null, healthKitPersisted: false, healthKitLastPersistAt: null, dimensionsFed: {}, whoopConfigured: false, ouraConfigured: false, googleHealthConfigured: false, garminConfigured: false, platform: 'web', now: NOW, ...o });
const tile = (id: string) => buildWearableTiles(base()).find((t) => t.id === id)!;

describe('ActiveSourceDetailPanel', () => {
  it('shows the export dropzone for Apple Health', () => {
    const m = renderToStaticMarkup(createElement(ActiveSourceDetailPanel, { tile: tile('apple_health') }));
    expect(m).toContain('data-detail-source="apple_health"');
    expect(m).toContain('Export All Health Data');
    expect(m).toContain('data-inline-dropzone');
  });
  it('shows a non-interactive Coming soon detail for Google Health with no Connect', () => {
    const m = renderToStaticMarkup(createElement(ActiveSourceDetailPanel, { tile: tile('google_health') }));
    expect(m).toContain('Coming soon');
    expect(m).not.toContain('>Connect<');
  });
  it('prompts to pick a source when nothing is selected', () => {
    const m = renderToStaticMarkup(createElement(ActiveSourceDetailPanel, { tile: null }));
    expect(m).toContain('data-detail-source="none"');
  });
  it('ConnectionsSurface keys the panel per source and refreshes tiles after an inline import', () => {
    // renderToStaticMarkup (node env, no jsdom) cannot exercise a real
    // remount or the tile-refresh network effect, so this is a source guard:
    // the mount must carry a per-source React key (so switching the
    // selected tile remounts the panel and drops stale useHealthXmlImport
    // phase/result/errorMsg state) and must forward the same `load` used to
    // refresh tiles after AppleHealthImportModal's onImported.
    const surface = readFileSync(
      join(process.cwd(), 'src/components/body-tracker/connections/ConnectionsSurface.tsx'),
      'utf8',
    );
    expect(surface).toMatch(/<ActiveSourceDetailPanel[^>]*key=\{selectedTile\?\.id \?\? 'none'\}/);
    expect(surface).toContain('onImported={load}');
  });
});
