import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PANEL_SLUGS } from '@/data/genex360/panels';
import { BLUEPRINT_ROUTE } from '@/lib/genex360/variantReport.config';
import {
  PANEL_ROUTE_ALLOWLIST,
  blueprintHrefForPanelPath,
  blueprintHrefForPanelSlug,
  canonicalPanelSlug,
  isAllowlistedPanelSlug,
} from '../panelRoute';

const ROUTE_SOURCE = readFileSync(
  path.resolve(__dirname, '..', 'panelRoute.ts'),
  'utf-8',
);

const FABRICATED_PANEL_IDS = [
  'methylation',
  'detoxification',
  'neurotransmitter',
  'hormone',
  'cardiovascular',
  'mitochondrial',
  'inflammation',
  'nutrition',
  'epigenetic',
  'peptide',
  'cannabis',
  'reference',
  'not-a-panel',
] as const;

describe('PANEL_ROUTE_ALLOWLIST', () => {
  it('is exactly the six catalog slugs', () => {
    expect([...PANEL_ROUTE_ALLOWLIST]).toEqual([...PANEL_SLUGS]);
    expect(PANEL_ROUTE_ALLOWLIST).toEqual([
      'genex-m',
      'nutrigen-dx',
      'hormone-iq',
      'epigen-hq',
      'peptide-iq',
      'cannabis-iq',
    ]);
  });

  it('does not remap hub keys through normalizeObservedPanelKey', () => {
    expect(ROUTE_SOURCE).not.toContain('normalizeObservedPanelKey');
    expect(ROUTE_SOURCE).not.toContain('PANEL_LABELS');
  });
});

describe('canonicalPanelSlug', () => {
  it('maps every allowlisted slug onto itself', () => {
    for (const slug of PANEL_ROUTE_ALLOWLIST) {
      expect(canonicalPanelSlug(slug)).toBe(slug);
      expect(isAllowlistedPanelSlug(slug)).toBe(true);
    }
  });

  it('maps product spellings onto allowlisted catalog slugs', () => {
    expect(canonicalPanelSlug('genex_m')).toBe('genex-m');
    expect(canonicalPanelSlug('genexm')).toBe('genex-m');
    expect(canonicalPanelSlug('GeneXM')).toBe('genex-m');
    expect(canonicalPanelSlug('nutrigen_dx')).toBe('nutrigen-dx');
    expect(canonicalPanelSlug('NutrigenDX')).toBe('nutrigen-dx');
    expect(canonicalPanelSlug('hormone_iq')).toBe('hormone-iq');
    expect(canonicalPanelSlug('HormoneIQ')).toBe('hormone-iq');
  });

  it('returns null for fabricated old panel ids so the page can notFound()', () => {
    for (const slug of FABRICATED_PANEL_IDS) {
      expect(canonicalPanelSlug(slug)).toBeNull();
      expect(isAllowlistedPanelSlug(slug)).toBe(false);
      expect(blueprintHrefForPanelSlug(slug)).toBeNull();
    }
    expect(canonicalPanelSlug('')).toBeNull();
    expect(canonicalPanelSlug(null)).toBeNull();
  });
});

describe('blueprintHrefForPanelPath', () => {
  it('redirects allowlisted panels onto BLUEPRINT_ROUTE hashes', () => {
    expect(blueprintHrefForPanelSlug('genex-m')).toBe(
      `${BLUEPRINT_ROUTE}#genex-m`,
    );
    expect(blueprintHrefForPanelSlug('nutrigen-dx')).toBe(
      `${BLUEPRINT_ROUTE}#nutrigen-dx`,
    );
    expect(blueprintHrefForPanelPath(['hormone-iq'])).toBe(
      `${BLUEPRINT_ROUTE}#hormone-iq`,
    );
  });

  it('keeps nested gene and rsid segments on the hash', () => {
    expect(blueprintHrefForPanelPath(['genex-m', 'mthfr', 'rs1801133'])).toBe(
      `${BLUEPRINT_ROUTE}#genex-m/mthfr/rs1801133`,
    );
  });

  it('rewrites nutrigen-dx MTHFR paths onto the GeneXM folate report', () => {
    expect(blueprintHrefForPanelPath(['nutrigen-dx', 'mthfr'])).toBe(
      `${BLUEPRINT_ROUTE}#genex-m/mthfr`,
    );
    expect(
      blueprintHrefForPanelPath(['nutrigen-dx', 'mthfr', 'rs1801133']),
    ).toBe(`${BLUEPRINT_ROUTE}#genex-m/mthfr/rs1801133`);
    expect(blueprintHrefForPanelPath(['nutrigen-dx', 'fut2'])).toBe(
      `${BLUEPRINT_ROUTE}#nutrigen-dx/fut2`,
    );
  });

  it('returns null for unknown first segments so the page can notFound()', () => {
    expect(blueprintHrefForPanelPath(['not-a-panel'])).toBeNull();
    expect(blueprintHrefForPanelPath(['detoxification', 'gst'])).toBeNull();
    expect(blueprintHrefForPanelPath(['methylation'])).toBeNull();
    expect(blueprintHrefForPanelPath([])).toBeNull();
  });
});
