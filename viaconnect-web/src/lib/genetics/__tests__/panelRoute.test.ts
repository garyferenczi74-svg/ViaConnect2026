import { describe, expect, it } from 'vitest';
import { PANEL_SLUGS } from '@/data/genex360/panels';
import { BLUEPRINT_ROUTE } from '@/lib/genex360/variantReport.config';
import {
  blueprintHrefForPanelPath,
  blueprintHrefForPanelSlug,
  canonicalPanelSlug,
} from '../panelRoute';

describe('canonicalPanelSlug', () => {
  it('maps every catalog slug onto itself', () => {
    for (const slug of PANEL_SLUGS) {
      expect(canonicalPanelSlug(slug)).toBe(slug);
    }
  });

  it('maps genex_m and nutrigen-dx aliases onto catalog slugs', () => {
    expect(canonicalPanelSlug('genex_m')).toBe('genex-m');
    expect(canonicalPanelSlug('genexm')).toBe('genex-m');
    expect(canonicalPanelSlug('GeneXM')).toBe('genex-m');
    expect(canonicalPanelSlug('methylation')).toBe('genex-m');
    expect(canonicalPanelSlug('nutrigen_dx')).toBe('nutrigen-dx');
    expect(canonicalPanelSlug('NutrigenDX')).toBe('nutrigen-dx');
    expect(canonicalPanelSlug('nutrition')).toBe('nutrigen-dx');
  });

  it('returns null for fabricated or unknown slugs', () => {
    expect(canonicalPanelSlug('detoxification')).toBeNull();
    expect(canonicalPanelSlug('cardiovascular')).toBeNull();
    expect(canonicalPanelSlug('not-a-panel')).toBeNull();
    expect(canonicalPanelSlug('')).toBeNull();
    expect(canonicalPanelSlug(null)).toBeNull();
  });
});

describe('blueprintHrefForPanelPath', () => {
  it('redirects real panels onto BLUEPRINT_ROUTE hashes', () => {
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
    expect(blueprintHrefForPanelPath([])).toBeNull();
  });
});
