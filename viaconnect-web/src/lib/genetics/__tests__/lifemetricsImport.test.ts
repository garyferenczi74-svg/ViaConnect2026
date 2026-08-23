/**
 * LifeMetrics inbound mapper tests.
 * DUTCH / Precision Analytical / HormoneIQ only increment HormoneIQ.
 * Quest, Labcorp, and SNP rows do not. UNKNOWN is not 0.
 * Fixtures are synthetic. No em or en dashes.
 */

import { describe, expect, it } from 'vitest';
import {
  hormoneProvenanceForPersist,
  mapLifemetricsImport,
  summarizeMappedImport,
} from '../lifemetricsImport';

const MEMBER = '11111111-1111-4111-8111-111111111111';

describe('mapLifemetricsImport panel units', () => {
  it('maps GeneXM aliases onto methylation SNP rows', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_snp_m',
        event: 'genetics_result.uploaded',
        variants: [
          { panel: 'GENEX-M', rsid: 'rsTEST0001', gene: 'MTHFR', genotype: 'TT' },
          { panel: 'genex_m', rsid: 'rsTEST0002', gene: 'COMT', genotype: 'GG' },
          { panel: 'reference', rsid: 'rsTEST0003', gene: 'VDR', genotype: 'AA' },
        ],
      },
      MEMBER,
    );
    expect(mapped.variants).toHaveLength(3);
    expect(mapped.variants.every((row) => row.panel === 'methylation')).toBe(true);
    expect(mapped.hormoneMarkers).toHaveLength(0);
    expect(mapped.epigeneticMarkers).toHaveLength(0);
  });

  it('maps nutrition aliases including GENEX-N onto NutrigenDX', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_snp_n',
        event: 'genome_result.processing_succeeded',
        variants: [
          { panel: 'nutrition', rsid: 'rsTEST1001', gene: 'FTO', genotype: 'AT' },
          { panel: 'nutrigen_dx', rsid: 'rsTEST1002', gene: 'APOA2', genotype: 'CC' },
          { panel: 'GENEX-N', rsid: 'rsTEST1003', gene: 'MCM6', genotype: 'CT' },
        ],
      },
      MEMBER,
    );
    expect(mapped.variants.map((row) => row.panel)).toEqual([
      'nutrition',
      'nutrition',
      'nutrition',
    ]);
  });

  it('maps peptide_iq and cannabis_iq onto their SNP units', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_snp_pc',
        event: 'genetics_result.uploaded',
        variants: [
          { panel: 'peptide_iq', rsid: 'rsTEST2001', gene: 'IGF1R', genotype: 'AG' },
          { panel: 'cannabis_iq', rsid: 'rsTEST2002', gene: 'CNR1', genotype: 'TT' },
        ],
      },
      MEMBER,
    );
    expect(mapped.variants.map((row) => row.panel)).toEqual(['peptide', 'cannabis']);
  });

  it('does not write unknown SNP panels and does not invent a 0 count as success', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_unknown_panel',
        event: 'genetics_result.uploaded',
        variants: [{ panel: 'mystery-panel', rsid: 'rsTEST9999', gene: 'ZZZ1', genotype: 'AA' }],
      },
      MEMBER,
    );
    expect(mapped.variants).toHaveLength(0);
    expect(mapped.unknownReason).toBe('unclassified_units');
    expect(summarizeMappedImport(mapped).variants).toBeNull();
  });
});

describe('mapLifemetricsImport HormoneIQ DUTCH only', () => {
  it('maps Precision Analytical DUTCH metabolites to lab biomarker rows', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_dutch',
        event: 'lab_results.received',
        lab_name: 'Precision Analytical (DUTCH)',
        source_type: 'dutch',
        results: [
          { name: '2-OH-E1', value: 4.2, unit: 'ng/mg' },
          { name: 'a-THF', value: 1.1, unit: 'ng/mg' },
        ],
      },
      MEMBER,
    );
    expect(mapped.hormoneMarkers).toHaveLength(2);
    expect(mapped.hormoneMarkers.map((row) => row.name)).toEqual(['2-OH-E1', 'a-THF']);
    expect(mapped.variants).toHaveLength(0);
    expect(hormoneProvenanceForPersist(mapped)?.labName).toMatch(/Precision Analytical/);
  });

  it('maps HormoneIQ labeled labs to hormone biomarkers', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_hiq',
        event: 'lab_order.results_ready',
        lab_name: 'HormoneIQ',
        biomarkers: [{ name: 'Cortisol', value: 12, unit: 'ug/dL' }],
      },
      MEMBER,
    );
    expect(mapped.hormoneMarkers).toHaveLength(1);
    expect(mapped.hormoneMarkers[0].name).toBe('Cortisol');
  });

  it('does not map Quest or Labcorp hormone names to HormoneIQ', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_quest',
        event: 'lab_results.received',
        results: [
          { name: 'Estradiol', value: 88, unit: 'pg/mL', lab_name: 'Quest' },
          { name: 'Cortisol', value: 10, unit: 'ug/dL', lab_name: 'Labcorp' },
        ],
      },
      MEMBER,
    );
    expect(mapped.hormoneMarkers).toHaveLength(0);
    expect(hormoneProvenanceForPersist(mapped)).toBeNull();
  });

  it('never treats SNP rows as HormoneIQ even when the panel says hormone', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_hormone_snps',
        event: 'genetics_result.uploaded',
        lab_name: 'Precision Analytical (DUTCH)',
        variants: [
          { panel: 'hormoneiq', rsid: 'rsTEST3001', gene: 'ESR1', genotype: 'AG' },
          { panel: 'GENEX-H', rsid: 'rsTEST3002', gene: 'COMT', genotype: 'GG' },
        ],
      },
      MEMBER,
    );
    expect(mapped.hormoneMarkers).toHaveLength(0);
    expect(mapped.variants).toHaveLength(0);
  });
});

describe('mapLifemetricsImport EpigenHQ', () => {
  it('maps TruDiagnostics clocks to epigenetic markers, not SNPs', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_epigen',
        event: 'lab_results.received',
        lab_name: 'TruDiagnostics',
        clocks: [
          { name: 'Epigenetic Age', value: 41.2, unit: 'years' },
          { name: 'Pace of Aging', value: 0.94, unit: 'years per year' },
        ],
      },
      MEMBER,
    );
    expect(mapped.epigeneticMarkers.map((row) => row.markerKey)).toEqual([
      'epigenetic-age',
      'pace-of-aging',
    ]);
    expect(mapped.variants).toHaveLength(0);
    expect(mapped.hormoneMarkers).toHaveLength(0);
  });

  it('maps Age Rate provenance onto epigenetic clocks', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_agerate',
        event: 'lab_results.received',
        source_type: 'Age Rate',
        markers: [{ marker: 'Biological Age Gap', value: 2.1, unit: 'years' }],
      },
      MEMBER,
    );
    expect(mapped.epigeneticMarkers).toHaveLength(1);
    expect(mapped.epigeneticMarkers[0].markerKey).toBe('biological-age-gap');
  });
});

describe('mapLifemetricsImport metadata and identity', () => {
  it('treats insight_report.generation_succeeded as metadata only', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_insight',
        event: 'insight_report.generation_succeeded',
        variants: [{ panel: 'GENEX-M', rsid: 'rsTEST4001', gene: 'MTHFR', genotype: 'TT' }],
      },
      MEMBER,
    );
    expect(mapped.metadataOnly).toBe(true);
    expect(mapped.variants).toHaveLength(0);
  });

  it('does not invent a destination user when userId is empty', () => {
    const mapped = mapLifemetricsImport(
      {
        event_id: 'evt_nouser',
        event: 'genetics_result.uploaded',
        variants: [{ panel: 'GENEX-M', rsid: 'rsTEST4002', gene: 'MTHFR', genotype: 'TT' }],
      },
      '',
    );
    expect(mapped.unknownReason).toBe('unresolved_user');
    expect(mapped.variants).toHaveLength(0);
    expect(summarizeMappedImport(mapped).variants).toBeNull();
  });
});
