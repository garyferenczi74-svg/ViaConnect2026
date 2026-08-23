import { describe, expect, it } from 'vitest';
import {
  normalizeObservedPanelKey,
  panelKeyAliasesFor,
} from '../panelKeyAliases';

describe('normalizeObservedPanelKey', () => {
  it('maps Genemetrics GENEX-M, remapped genex_m, and slug genex-m onto methylation', () => {
    expect(normalizeObservedPanelKey('GENEX-M')).toBe('methylation');
    expect(normalizeObservedPanelKey('genex_m')).toBe('methylation');
    expect(normalizeObservedPanelKey('genex-m')).toBe('methylation');
    expect(normalizeObservedPanelKey('methylation')).toBe('methylation');
    expect(normalizeObservedPanelKey('GeneXM')).toBe('methylation');
    expect(normalizeObservedPanelKey('reference')).toBe('methylation');
  });

  it('maps peer product spellings onto the matching hub pill', () => {
    expect(normalizeObservedPanelKey('nutrigen_dx')).toBe('nutrition');
    expect(normalizeObservedPanelKey('NUTRIGENDX')).toBe('nutrition');
    expect(normalizeObservedPanelKey('hormone-iq')).toBe('hormone');
    expect(normalizeObservedPanelKey('GENEX-H')).toBe('hormone');
    expect(normalizeObservedPanelKey('epigen_hq')).toBe('epigenetic');
    expect(normalizeObservedPanelKey('peptideiq')).toBe('peptide');
    expect(normalizeObservedPanelKey('CANNABISIQ')).toBe('cannabis');
  });

  it('returns null for unknown keys and never invents a panel', () => {
    expect(normalizeObservedPanelKey('UNKNOWN')).toBeNull();
    expect(normalizeObservedPanelKey('GENEX-N')).toBeNull();
    expect(normalizeObservedPanelKey('')).toBeNull();
    expect(normalizeObservedPanelKey(null)).toBeNull();
  });
});

describe('panelKeyAliasesFor', () => {
  it('includes remapped and Genemetrics spellings for nutrition reads', () => {
    const aliases = panelKeyAliasesFor('nutrition');
    expect(aliases).toContain('nutrition');
    expect(aliases).toContain('nutrigen-dx');
    expect(aliases).toContain('nutrigen_dx');
  });

  it('includes leftover reference as a methylation alias', () => {
    expect(panelKeyAliasesFor('methylation')).toContain('reference');
  });
});
