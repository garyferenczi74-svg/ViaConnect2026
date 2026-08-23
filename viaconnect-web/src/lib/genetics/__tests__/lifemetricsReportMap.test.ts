/**
 * LifeMetrics insight-report map + Elysium digest keys.
 * UNKNOWN is not 0. HormoneIQ stays DUTCH only. No em or en dashes.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildLifeMetricsDigestItems, LIFEMETRICS_DIGEST_KEYS } from '@/lib/elysium/lifemetricsDigest';
import {
  countsAsHormoneIqDutch,
  extractLifemetricsReportIds,
  isSnpPillSection,
  lookupLifemetricsFamily,
  mappedFamilyCount,
  normalizeLifemetricsSourceId,
  LIFEMETRICS_REPORT_MAP,
} from '../lifemetricsReportMap';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('normalizeLifemetricsSourceId', () => {
  it('accepts hash, bundle, and report prefixes', () => {
    expect(normalizeLifemetricsSourceId('#2851')).toBe('2851');
    expect(normalizeLifemetricsSourceId('b2850')).toBe('b2850');
    expect(normalizeLifemetricsSourceId('B2850')).toBe('b2850');
    expect(normalizeLifemetricsSourceId('r37476')).toBe('r37476');
    expect(normalizeLifemetricsSourceId('bundle 2850')).toBe('b2850');
  });
});

describe('LIFEMETRICS_REPORT_MAP catalog', () => {
  it('maps every listed bundle and report id onto a family', () => {
    const ids = [
      'b2850',
      'r37476',
      '#2851',
      '#2849',
      '#5202',
      '#12936',
      '#12930',
      '#12933',
      '#12932',
      '#12931',
      '#12929',
      '#5600',
    ];
    for (const id of ids) {
      expect(lookupLifemetricsFamily(id), id).not.toBeNull();
    }
  });

  it('returns null (UNKNOWN) for an unmapped id, never a 0-row family', () => {
    expect(lookupLifemetricsFamily('999999')).toBeNull();
    expect(mappedFamilyCount(null)).toBeNull();
    expect(mappedFamilyCount(['999999'])).toBe(0);
  });

  it('routes Combined Comprehensive Lifestyle nutrition panels to nutrigen_dx', () => {
    const family = lookupLifemetricsFamily('b2850');
    expect(family?.familyKey).toBe('combined_comprehensive_lifestyle');
    expect(lookupLifemetricsFamily('r37476')?.familyKey).toBe(family?.familyKey);
    const labels = family?.sections.map((section) => section.sectionLabel) ?? [];
    expect(labels).toEqual([
      'Result Scores',
      'Hunger/Fullness',
      'Protein',
      'Fats',
      'Saturated Fat',
      'Omega',
      'Carbs',
      'Food Sensitivities',
      'Insulin Resistance',
      'Plant Cholesterol',
      'Additional Nutrition Genetics',
    ]);
    expect(family?.sections.every((section) => section.genex360Unit === 'nutrigen_dx')).toBe(true);
    expect(
      family?.sections.every((section) =>
        section.surfaces.includes('my_nutrition.nutrition_by_genetics'),
      ),
    ).toBe(true);
    expect(family?.sections.every((section) => section.payloadKind === 'snp_and_lab')).toBe(true);
  });

  it('keeps Hormone Genetics as SNP context, never HormoneIQ DUTCH', () => {
    const family = lookupLifemetricsFamily('2851');
    const hormone = family?.sections.find((section) => section.sectionKey === 'hormone_genetics');
    expect(hormone).toBeDefined();
    expect(hormone?.surfaces).toEqual(['my_genetics', 'my_biology.hormones']);
    expect(hormone?.genex360Unit).toBeNull();
    expect(hormone?.payloadKind).toBe('snp');
    expect(countsAsHormoneIqDutch(hormone!)).toBe(false);
    expect(hormone?.hormoneIqDutch).toBe(false);
  });

  it('maps Lifestyle Demo peptides, supplements, methylation, and cannabis', () => {
    const family = lookupLifemetricsFamily('2849');
    const byKey = Object.fromEntries((family?.sections ?? []).map((section) => [section.sectionKey, section]));
    expect(byKey.peptides.surfaces).toEqual(['peptide_iq.education']);
    expect(byKey.peptides.genex360Unit).toBe('peptide_iq');
    expect(byKey.supplement_need_genetics.surfaces).toEqual(['my_supplements.flags_protocol']);
    expect(byKey.supplement_summary.surfaces).toEqual(['my_supplements.flags_protocol']);
    expect(byKey.methylation_30x.genex360Unit).toBe('genex_m');
    expect(byKey.cannabis_genetics.genex360Unit).toBe('cannabis_iq');
  });

  it('maps Lifestyle Demo variant peptides library plus the shared rules', () => {
    const family = lookupLifemetricsFamily('5202');
    const keys = family?.sections.map((section) => section.sectionKey) ?? [];
    expect(keys).toContain('peptide_genetic_library');
    expect(keys).toContain('hormone_genetics');
    expect(keys).toContain('methylation_30x');
    expect(keys).toContain('cannabis_genetics');
    expect(family?.sections.find((section) => section.sectionKey === 'peptide_genetic_library')?.genex360Unit).toBe(
      'peptide_iq',
    );
  });

  it('splits Combined/Omics hormones from Hormone Genetics and keeps DUTCH off', () => {
    const family = lookupLifemetricsFamily('12936');
    const hormones = family?.sections.find((section) => section.sectionKey === 'hormones');
    const genetics = family?.sections.find((section) => section.sectionKey === 'hormone_genetics');
    expect(hormones?.surfaces).toEqual(['my_biology.labs']);
    expect(hormones?.payloadKind).toBe('lab');
    expect(hormones?.hormoneIqDutch).toBe(false);
    expect(genetics?.payloadKind).toBe('snp');
    expect(genetics?.genex360Unit).toBeNull();
  });

  it('maps clinical PGx to genex_m.pgx and leaves BRCA pending Marshall', () => {
    const family = lookupLifemetricsFamily('12930');
    const pgx = family?.sections.find((section) => section.sectionKey === 'pgx');
    const brca = family?.sections.find((section) => section.sectionKey === 'brca_cancer_mutations');
    expect(pgx?.genex360Unit).toBe('genex_m.pgx');
    expect(brca?.payloadKind).toBe('pending_marshall');
    expect(brca?.marshallPending).toBe(true);
    expect(brca?.genex360Unit).toBeNull();
  });

  it('routes bloodwork, specialty urine, and gut away from SNP pills', () => {
    const blood = lookupLifemetricsFamily('12933')?.sections[0];
    const urine = lookupLifemetricsFamily('12932')?.sections.find(
      (section) => section.sectionKey === 'specialty_24hr_urine',
    );
    const gut = lookupLifemetricsFamily('12931')?.sections[0];
    expect(blood?.surfaces).toEqual(['my_biology.labs']);
    expect(isSnpPillSection(blood!)).toBe(false);
    expect(urine?.surfaces).toEqual(['my_biology.labs']);
    expect(urine?.hormoneIqDutch).toBe(false);
    expect(urine?.genex360Unit).toBeNull();
    expect(gut?.surfaces).toEqual(['my_biology.gut']);
    expect(isSnpPillSection(gut!)).toBe(false);
  });

  it('maps TruAge, Symphony Age, and TruHealth onto epigen_hq clocks', () => {
    expect(lookupLifemetricsFamily('12929')?.familyKey).toBe('epigenetic_age');
    expect(lookupLifemetricsFamily('5600')?.familyKey).toBe('epigenetic_age');
    const clocks = lookupLifemetricsFamily('12929')?.sections ?? [];
    expect(clocks.map((section) => section.sectionKey)).toEqual(['truage', 'symphony_age', 'truhealth']);
    expect(clocks.every((section) => section.genex360Unit === 'epigen_hq')).toBe(true);
    expect(clocks.every((section) => section.payloadKind === 'clock')).toBe(true);
  });

  it('never assigns hormone_iq as a LifeMetrics genex unit', () => {
    for (const family of LIFEMETRICS_REPORT_MAP) {
      for (const section of family.sections) {
        expect(section.genex360Unit).not.toBe('hormone_iq');
        expect(section.hormoneIqDutch).toBe(false);
      }
    }
  });

  it('keeps family labels free of institution name-drops', () => {
    const labels = LIFEMETRICS_REPORT_MAP.flatMap((family) => [
      family.familyLabel,
      ...family.sections.map((section) => section.sectionLabel),
    ]).join('\n');
    expect(labels).not.toMatch(/Harvard|Yale|Duke/);
  });
});

describe('LifeMetrics digest keys', () => {
  it('exports family keys Hannah can name', () => {
    expect(LIFEMETRICS_DIGEST_KEYS.nutritionGeneticsLabwork).toBe(
      'elysium.lifemetrics.nutrition_genetics_labwork',
    );
    expect(LIFEMETRICS_DIGEST_KEYS.clinicalPgx).toBe('elysium.lifemetrics.clinical_pgx');
    expect(LIFEMETRICS_DIGEST_KEYS.epigeneticAge).toBe('elysium.lifemetrics.epigenetic_age');
  });

  it('builds catalog digest items with UNKNOWN coverage, not 0', () => {
    const items = buildLifeMetricsDigestItems({ mappedSourceIds: null });
    const catalog = items.find((item) => item.id === LIFEMETRICS_DIGEST_KEYS.catalog);
    expect(catalog).toBeDefined();
    expect(catalog?.metricValue).toBeNull();
    expect(items.some((item) => item.id === LIFEMETRICS_DIGEST_KEYS.combinedComprehensiveLifestyle)).toBe(
      true,
    );
    expect(catalog?.refs).toContain(LIFEMETRICS_DIGEST_KEYS.comprehensiveLifestyleGenetic);
  });

  it('marks a known mapped family without fabricating unmapped counts as 0 success', () => {
    const items = buildLifeMetricsDigestItems({ mappedSourceIds: ['2851'] });
    const catalog = items.find((item) => item.id === LIFEMETRICS_DIGEST_KEYS.catalog);
    expect(catalog?.metricValue).toBe('1');
    const lifestyle = items.find((item) => item.id === LIFEMETRICS_DIGEST_KEYS.comprehensiveLifestyleGenetic);
    expect(lifestyle?.metricValue).toBe('mapped');
    const gut = items.find((item) => item.id === LIFEMETRICS_DIGEST_KEYS.gutMicrobiome);
    expect(gut?.metricValue).toBeNull();
  });

  it('extracts bundle and report ids from an insight payload', () => {
    expect(
      extractLifemetricsReportIds({
        event: 'insight_report.generation_succeeded',
        data: { bundle_id: 'b2850', report_id: 'r37476' },
      }),
    ).toEqual(['b2850', 'r37476']);
  });

  it('wires getElysiumDailyDigest to the LifeMetrics builder', () => {
    const digestSource = readFileSync(resolve(HERE, '../../elysium/digest.ts'), 'utf8');
    expect(digestSource).toContain('buildLifeMetricsDigestItems');
    const compilation = readFileSync(
      resolve(HERE, '../../hannah/compilation/digests.ts'),
      'utf8',
    );
    expect(compilation).toContain('LIFEMETRICS_DIGEST_KEYS');
  });
});
