// Brief 19 honesty: variant-tab empty is Not analyzed, never 0 SNPs as
// "you have nothing." PR 32 / 42 own Demo and Unanalyzed chips. This file
// does not rename those chips.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  emptyObservedByPanel,
  formatObservedBadge,
  isHonestEmptyObserved,
  mergeObservedByPanel,
  unknownObservedByPanel,
} from '../observedPanelCounts';
import { PANEL_LABELS } from '../panelLabels';

const HERO_CARD = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'genetics',
  'hub',
  'BlueprintPanelCard.tsx',
);
const BENTO = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'genetics',
  'hub',
  'blueprintBentoData.ts',
);
const TABS = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'genetics',
  'hub',
  'YourVariantsCard.tsx',
);

describe('Brief 19 variant tab honesty', () => {
  it('voices honest empty as Not analyzed, never 0 SNPs or Demo/Unanalyzed', () => {
    const empty = emptyObservedByPanel().methylation;
    expect(isHonestEmptyObserved(empty)).toBe(true);
    expect(formatObservedBadge(empty)).toBe('Not analyzed');
    expect(formatObservedBadge(empty)).not.toBe('0 SNPs');
    expect(formatObservedBadge(empty)).not.toBe('0');
    expect(formatObservedBadge(empty)).not.toBe('Unanalyzed');
    expect(formatObservedBadge(empty)).not.toBe('Demo');
    expect(formatObservedBadge(empty)).not.toContain('0');
  });

  it('keeps a real observed count numeric and never substitutes catalog size', () => {
    const observed = mergeObservedByPanel({ methylation: 3, nutrition: 5 });
    expect(formatObservedBadge(observed.methylation)).toBe('3 SNPs');
    expect(formatObservedBadge(observed.nutrition)).toBe('5 SNPs');
    expect(observed.methylation.count).not.toBe(20);
    expect(observed.nutrition.count).not.toBe(27);
  });

  it('does not rename unknown to Not analyzed (PR 32 owns Unanalyzed on fail)', () => {
    const unknown = unknownObservedByPanel().methylation;
    expect(formatObservedBadge(unknown)).not.toBe('Not analyzed');
    expect(formatObservedBadge(unknown)).not.toBe('0 SNPs');
  });

  it('names each test by what it measures, not Genetics SNPs for every tab', () => {
    expect(PANEL_LABELS.methylation.measures_line).toContain('methylation and detox SNPs');
    expect(PANEL_LABELS.nutrition.measures_line).toContain('nutrient-metabolism SNPs');
    expect(PANEL_LABELS.hormone.measures_line).toContain('DUTCH');
    expect(PANEL_LABELS.hormone.measures_line).toContain('not SNP pills');
    expect(PANEL_LABELS.epigenetic.measures_line).toContain('clocks');
    expect(PANEL_LABELS.epigenetic.measures_line).toContain('not SNP pills');
    expect(PANEL_LABELS.nutrition.count_unit).toBe('SNPs');
    expect(PANEL_LABELS.hormone.count_unit).toBe('markers');
    expect(PANEL_LABELS.epigenetic.count_unit).toBe('clocks');
  });
});

describe('Brief 19 hub and hero copy', () => {
  it('does not voice 500+ variants on the blueprint hero', () => {
    const hero = readFileSync(HERO_CARD, 'utf-8');
    const bento = readFileSync(BENTO, 'utf-8');
    expect(hero).not.toContain('500+ variants');
    expect(bento).not.toContain('500+ variants');
    expect(bento).toContain('CATALOG_SIZE_LABEL');
  });

  it('uses Not analyzed on hub empty and does not imply no catalog', () => {
    const source = readFileSync(TABS, 'utf-8');
    expect(source).toContain('Not analyzed');
    expect(source).toContain('catalogOnFileLine');
    expect(source).not.toContain('No {activeGenericLabel} {activeEmptyNoun} yet.');
    expect(source).not.toMatch(/>0 SNPs</);
    expect(source).toContain('aria-label="GENEX360 tests"');
    expect(source).not.toContain('mthfrFolate');
    expect(source).not.toContain('Unanalyzed');
    expect(source).not.toContain('Demo');
  });
});
