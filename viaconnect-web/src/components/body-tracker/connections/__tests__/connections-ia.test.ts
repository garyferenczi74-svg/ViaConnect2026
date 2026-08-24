import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Connections IA contracts', () => {
  it('uses the same surface for 390 connections and 1280 wearables alias', () => {
    const connections = src('src/app/(app)/(consumer)/body-tracker/connections/page.tsx');
    const wearables = src('src/app/(app)/(consumer)/wearables/page.tsx');
    expect(connections).toContain('ConnectionsSurface');
    expect(wearables).toContain('ConnectionsSurface');
    expect(wearables).not.toContain('5 min ago');
    expect(wearables).not.toContain('Apple Watch');
    expect(wearables).not.toContain('Vitality');
  });

  it('ships four tiles, XML Hume action, and BOS footer', () => {
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    const detail = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    expect(surface).toContain('CONNECTIONS_FOOTER');
    expect(surface).not.toContain('Hume authorize');
    expect(surface).not.toMatch(/Vitality Score/);
    expect(surface).not.toMatch(/helix.?reward/i);
    expect(tile).toContain('Upload XML');
    expect(tile).toContain('Watch');
    expect(tile).not.toContain('Connected Watch');
    expect(surface + tile + detail).not.toContain('font-serif');
    expect(surface + tile + detail).not.toContain('#224852');
    expect(surface + tile + detail).not.toContain('#4ADE80');
    expect(surface).not.toMatch(/ViaConnect/);
    expect(surface + tile + detail).not.toMatch(/Arnold|Thanos/i);
    expect(tile).toContain('Not configured');
    expect(tile).not.toMatch(/waiting on/i);
    expect(detail).toContain('Bio Optimization Score');
    expect(detail).not.toMatch(/Vitality/);
    expect(detail).toContain('DISAGREE');
    expect(detail).toContain('Active');
    expect(detail).toContain('strokeWidth={1.5}');
    const disagree = src('src/lib/body-tracker/source-disagreement.ts');
    expect(disagree).toContain('averaged because equal trust.');
  });

  it('redirects plugins wearables catalog to connections', () => {
    const plugins = src('src/app/(app)/(consumer)/plugins/wearables/page.tsx');
    expect(plugins).toContain("/body-tracker/connections");
    expect(plugins).toContain('redirect');
  });

  it('keeps Hume action as xml_upload in the tile model', () => {
    const model = src('src/lib/body-tracker/wearable-tiles.ts');
    expect(model).toContain("id: 'hume'");
    expect(model).toContain("action: 'xml_upload'");
    expect(model).toContain('Bio Optimization Score uses these sources.');
  });
});
