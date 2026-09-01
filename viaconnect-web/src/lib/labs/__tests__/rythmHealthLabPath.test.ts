import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIRST_CLASS_TILE_IDS, WEARABLE_TILE_SPECS } from '@/lib/body-tracker/wearable-tiles';
import { countHormoneMarkers } from '@/lib/genetics/hormoneObservedCount';
import { chipForProtocolSource } from '@/lib/supplements/protocolHomework';
import { RYTHM_HEALTH_COPY, RYTHM_HEALTH_PARTNER_FORM } from '../rythmHealth';

const root = join(process.cwd());

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Rythm Health stays on the lab path', () => {
  it('does not add rythm_health to wearable tiles or WearableProvider', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    expect(WEARABLE_TILE_SPECS.map((s) => s.id)).not.toContain('rythm_health');
    const tiles = src('src/lib/body-tracker/wearable-tiles.ts');
    expect(tiles).not.toMatch(/rythm/i);
    expect(tiles).not.toContain('rythm_health');

    const snapshot = src('src/lib/body-tracker/wearable-snapshot.ts');
    const arnold = src('src/lib/body-tracker/arnold-trust.ts');
    expect(snapshot + arnold).not.toMatch(/rythm_health/);
  });

  it('does not scaffold a live Rythm wearable OAuth route', () => {
    const confirm = src('src/app/api/labs/confirm/route.ts');
    const card = src('src/components/labs/RythmHealthLabCard.tsx');
    const readme = src('src/lib/labs/rythm-health/README.md');
    expect(confirm).toContain("ALLOWED_LAB_NAMES = new Set(['Rythm Health'])");
    expect(card).not.toMatch(/\/api\/integrations\/rythm_health/);
    expect(card).not.toContain('Connect Rythm');
    expect(card).toContain('partnerComingSoon');
    expect(card).toContain('RYTHM_HEALTH_COPY.uploadCta');
    expect(RYTHM_HEALTH_COPY.partnerComingSoon).toBe(
      'A direct Rythm Health connection is coming soon. Partner connection is not available yet.',
    );
    expect(RYTHM_HEALTH_COPY.partnerComingSoon).not.toMatch(/developer API/i);
    expect(readme).toContain('There is no public developer API');
    expect(readme).toContain('Do not add `RYTHM_HEALTH_CLIENT_ID`');
    expect(readme).toContain(RYTHM_HEALTH_PARTNER_FORM);
  });

  it('does not copy Lex-sensitive marketing into product copy', () => {
    const joined = JSON.stringify(RYTHM_HEALTH_COPY);
    expect(joined).not.toMatch(/#1|10M\+|HIPAA|CLIA|CAP/);
    expect(RYTHM_HEALTH_COPY.category).toMatch(/not a wearable/i);
    expect(joined).not.toMatch(/wrist wearable|sleep|HRV/i);
  });

  it('keeps HormoneIQ DUTCH counts DUTCH-only when Rythm rows exist', () => {
    const count = countHormoneMarkers([
      { name: 'Estradiol', lab_name: 'Rythm Health', source_type: 'csv' },
      { name: 'Cortisol', lab_name: 'Rythm Health' },
      { name: 'Testosterone', lab_name: 'Rythm Health', source_filename: 'rythm-export.csv' },
      { name: '2-OH-E1', lab_name: 'Precision Analytical (DUTCH)' },
    ]);
    expect(count).toBe(1);
  });

  it('maps rythm_health protocol source to the Brief 49 from lab chip', () => {
    expect(chipForProtocolSource('rythm_health')).toBe('from lab');
    expect(chipForProtocolSource('lab_biomarkers')).toBe('from lab');
    expect(chipForProtocolSource('farmceutica')).toBeNull();
  });

  it('surfaces the lab card on Hormones, Connections Labs, and lab upload', () => {
    const hormones = src('src/app/(app)/(consumer)/body-tracker/hormones/page.tsx');
    const connections = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const labs = src('src/app/(app)/(consumer)/plugins/labs/page.tsx');
    expect(hormones).toContain('RythmHealthLabCard');
    expect(connections).toContain('connections-labs-heading');
    expect(connections).toContain('RythmHealthLabCard');
    expect(connections).toContain('These are not wearables');
    expect(labs).toContain('RythmHealthLabCard');
    const listbox = connections.slice(
      connections.indexOf('aria-label="Wearable sources"'),
      connections.indexOf('</AdminPanel>'),
    );
    expect(listbox).not.toContain('RythmHealthLabCard');
    expect(listbox).not.toContain('rythm_health');
  });
});
