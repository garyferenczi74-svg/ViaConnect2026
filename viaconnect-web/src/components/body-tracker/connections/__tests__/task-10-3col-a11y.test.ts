import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Task 10: three-column layout, G76 mobile order, 219i boundaries, source-list a11y', () => {
  it('renders three columns at 1280 and wraps each column in a 219i boundary', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(surface).toContain('min-[1280px]:grid-cols-[1fr_1.2fr_1fr]');
    expect(surface).toContain('AdminPanel');
    expect(surface).toContain('ActiveSourceDetailPanel');
  });

  it('grid steps single column below 900, two columns at 900, three at 1280', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(surface).toContain('grid-cols-1');
    expect(surface).toContain('min-[900px]:grid-cols-2');
    expect(surface).toContain('min-[1280px]:grid-cols-[1fr_1.2fr_1fr]');
  });

  it('imports AdminPanel from the 219i boundary module and wraps all three columns', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(surface).toContain(
      "import { AdminPanel } from '@/components/admin/AdminPanelErrorBoundary';",
    );
    expect(surface).toContain('<AdminPanel name="Sources">');
    expect(surface).toContain('<AdminPanel name="Active source">');
    expect(surface).toContain('<AdminPanel name="Score contributors">');
    // Exactly three panel boundaries in the surface, one per column.
    expect((surface.match(/<AdminPanel name="/g) ?? []).length).toBe(3);
  });

  it('preserves every wiring earlier tasks added inside the new grid', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    // Task 4 selection wiring
    expect(surface).toContain('selected={tile.id === selectedId}');
    expect(surface).toContain('onSelect={(t) => setSelectedId(t.id)}');
    expect(surface).toContain(
      "onDropXml={tile.id === 'apple_health' ? () => setImportIntent('apple') : undefined}",
    );
    // Task 6 panel key + onImported
    expect(surface).toMatch(/<ActiveSourceDetailPanel[^>]*key=\{selectedTile\?\.id \?\? 'none'\}/);
    expect(surface).toContain('onImported={load}');
    // Task 7 contributor wiring
    expect(surface).toContain('onOpenDimension={setOpenMetric}');
    expect(surface).toContain('lastUpdatedAt={lastUpdatedAt}');
    // Task 8 sheet + Task 9 single footer, still mounted below the grid
    expect(surface).toContain('<DimensionDetailSheet');
    expect(surface).toContain('onClose={() => setOpenMetric(null)}');
    expect((surface.match(/\{CONNECTIONS_FOOTER\}/g) ?? []).length).toBe(1);
    expect(surface).toContain('<AppleHealthImportModal');
    expect(surface).toContain('<WearableConsentModal');
    expect(surface).toContain('CONNECTIONS_LEAD');
  });

  it('G76: mobile order flips on anyConnected, cold favors contributors, connected favors sources', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(surface).toContain(
      "tiles.some((t) => t.lastSyncState === 'synced' || t.lastSyncState === 'connected_never_synced')",
    );
    // Sources: order-1 once anything is connected, order-2 while cold.
    expect(surface).toContain("anyConnected ? 'order-1' : 'order-2'");
    // Contributors: order-1 while cold, order-3 once connected.
    expect(surface).toContain("anyConnected ? 'order-3' : 'order-1'");
    // Detail: order-2 once connected, order-3 while cold.
    expect(surface).toContain("anyConnected ? 'order-2' : 'order-3'");
    // Order resets to source order at >= 900px on all three columns.
    expect((surface.match(/min-\[900px\]:order-none/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('source list is a proper single-select listbox with a labeled container', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(surface).toContain('role="listbox"');
    expect(surface).toContain('aria-label="Wearable sources"');
  });

  it('arrow-key navigation moves selection across tiles from the listbox container', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    expect(surface).toMatch(/ArrowDown/);
    expect(surface).toMatch(/ArrowUp/);
    expect(surface).toContain('onKeyDown={handleSourceListKeyDown}');
  });

  it('WearableTileCard swaps the invalid role=button + aria-selected for role=option with roving tabindex', () => {
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    expect(tile).toContain('role="option"');
    expect(tile).not.toContain('role="button"');
    expect(tile).toContain('tabIndex={selected ? 0 : -1}');
    expect(tile).toContain('aria-selected={selected ? \'true\' : undefined}');
    // Visible, non-color-only focus ring token (a ring/outline shape change,
    // not merely a color swap), consistent with the rest of the surface.
    expect(tile).toMatch(/focus-visible:ring-2 focus-visible:ring-teal\/\d+/);
    // Task 4's Enter/Space select + inner-button guard must survive.
    expect(tile).toContain("if (e.target !== e.currentTarget) return;");
    expect(tile).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/);
  });

  it('no inline hex and no dashes were introduced in the touched files', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    const joined = surface + tile;
    expect(joined).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(joined).not.toMatch(/—|–/);
  });
});
