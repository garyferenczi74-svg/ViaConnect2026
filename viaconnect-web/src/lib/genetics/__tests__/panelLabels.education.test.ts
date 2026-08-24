import { describe, expect, it } from 'vitest';
import { PANEL_LABELS, PANEL_KEYS } from '../panelLabels';

describe('panel education labels', () => {
  it('uses educational hub labels instead of calling every tab SNPs', () => {
    expect(PANEL_LABELS.methylation.generic_label).toBe('Genetic Methylation');
    expect(PANEL_LABELS.nutrition.generic_label).toBe('Genetic Nutrition');
    expect(PANEL_LABELS.hormone.generic_label).toBe('Hormone Mapping');
    expect(PANEL_LABELS.epigenetic.generic_label).toBe('Epigenetic Age');
    expect(PANEL_LABELS.peptide.generic_label).toBe('Peptide Response');
    expect(PANEL_LABELS.cannabis.generic_label).toBe('Cannabis Response');
  });

  it('gives each test a matching unit and empty noun', () => {
    expect(PANEL_LABELS.methylation.count_unit).toBe('SNPs');
    expect(PANEL_LABELS.nutrition.count_unit).toBe('SNPs');
    expect(PANEL_LABELS.hormone.count_unit).toBe('markers');
    expect(PANEL_LABELS.epigenetic.count_unit).toBe('clocks');
    expect(PANEL_LABELS.peptide.count_unit).toBe('genes');
    expect(PANEL_LABELS.cannabis.count_unit).toBe('genes');
    expect(PANEL_LABELS.hormone.empty_noun).not.toBe('SNPs');
    expect(PANEL_LABELS.epigenetic.empty_noun).not.toBe('SNPs');
    expect(PANEL_LABELS.methylation.measures_line).toContain('methylation and detox SNPs');
    expect(PANEL_LABELS.nutrition.measures_line).toContain('nutrient-metabolism SNPs');
    expect(PANEL_LABELS.hormone.measures_line).toContain('DUTCH');
    expect(PANEL_LABELS.epigenetic.measures_line).toContain('clocks');
  });

  it('keeps Hannah voice: no university name-drops and no dashes', () => {
    const em = String.fromCharCode(0x2014);
    const en = String.fromCharCode(0x2013);
    for (const key of PANEL_KEYS) {
      const entry = PANEL_LABELS[key];
      const blob = `${entry.generic_label} ${entry.measures_line} ${entry.empty_noun}`;
      expect(blob.includes(em)).toBe(false);
      expect(blob.includes(en)).toBe(false);
      expect(blob.toLowerCase()).not.toContain('harvard');
      expect(blob.toLowerCase()).not.toContain('yale');
      expect(blob.toLowerCase()).not.toContain('duke');
    }
  });
});
