/**
 * src/lib/genetics/lifemetricsReportMap.ts
 *
 * Append-only LifeMetrics insight-report catalog. Typed config (not a table):
 * these IDs are vendor catalog keys, not PHI, and Hannah / Elysium need them
 * without a database round trip. New families are added. Existing IDs are
 * never rewritten or reused.
 *
 * Surfaces and GENEX360 units follow Gary (2026-08-23):
 *   Nutrition Genetics and Labwork -> My Nutrition Nutrition-by-Genetics
 *     (nutrigen_dx). SNPs + labs.
 *   Comprehensive Lifestyle Genetic -> My Genetics SNPs. Hormone Genetics
 *     also feeds My Biology hormones as SNP context, never HormoneIQ DUTCH.
 *   Lifestyle peptides -> PeptideIQ education. Supplement Need / Summary ->
 *     My Supplements flags and protocol (Your Genetics | Your Protocol).
 *   30x Methylation -> genex_m. Cannabis Genetics -> cannabis_iq.
 *   Clinical PGx -> genex_m.pgx. BRCA / cancer stay pending Marshall.
 *   Bloodwork and specialty labs (including 24-Hr Comp Urine) -> My Biology
 *     labs, not SNP pills, not HormoneIQ DUTCH.
 *   Gut / microbiome -> My Biology gut, not genetics pills.
 *   TruAge / Symphony Age / TruHealth -> epigen_hq clocks.
 *
 * HormoneIQ remains Precision Analytical DUTCH only.
 * UNKNOWN is not 0: an unmapped ID returns null, never a fabricated count.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import type { SourceHub } from '@/lib/hannah/compilation/types';

export const LIFEMETRICS_REPORT_MAP_VERSION = 1 as const;

export type ViaConnectSurface =
  | 'my_nutrition.nutrition_by_genetics'
  | 'my_genetics'
  | 'my_biology.hormones'
  | 'my_biology.labs'
  | 'my_biology.gut'
  | 'my_supplements.flags_protocol'
  | 'peptide_iq.education';

export type LifemetricsGenex360Unit =
  | 'nutrigen_dx'
  | 'genex_m'
  | 'genex_m.pgx'
  | 'cannabis_iq'
  | 'peptide_iq'
  | 'epigen_hq';

export type LifemetricsPayloadKind =
  | 'snp'
  | 'lab'
  | 'snp_and_lab'
  | 'clock'
  | 'flag_protocol'
  | 'education'
  | 'pending_marshall';

export interface LifemetricsSectionMapping {
  sectionKey: string;
  sectionLabel: string;
  surfaces: readonly ViaConnectSurface[];
  genex360Unit: LifemetricsGenex360Unit | null;
  payloadKind: LifemetricsPayloadKind;
  digestKey: string;
  digestHub: SourceHub;
  /** Always false. HormoneIQ is DUTCH / Precision Analytical only. */
  hormoneIqDutch: false;
  marshallPending?: true;
}

export interface LifemetricsFamilyMapping {
  familyKey: string;
  familyLabel: string;
  digestKey: string;
  sourceIds: readonly string[];
  sections: readonly LifemetricsSectionMapping[];
}

/** Hannah / Elysium digest keys for LifeMetrics report families. */
export const LIFEMETRICS_DIGEST_KEYS = {
  catalog: 'elysium.lifemetrics.catalog',
  combinedComprehensiveLifestyle: 'elysium.lifemetrics.combined_comprehensive_lifestyle',
  nutritionGeneticsLabwork: 'elysium.lifemetrics.nutrition_genetics_labwork',
  comprehensiveLifestyleGenetic: 'elysium.lifemetrics.comprehensive_lifestyle_genetic',
  lifestyleDemo: 'elysium.lifemetrics.lifestyle_demo',
  lifestyleDemoVariant: 'elysium.lifemetrics.lifestyle_demo_variant',
  omicsCombined: 'elysium.lifemetrics.omics_combined',
  clinicalPgx: 'elysium.lifemetrics.clinical_pgx',
  bloodworkLabs: 'elysium.lifemetrics.bloodwork_labs',
  specialtyTests: 'elysium.lifemetrics.specialty_tests',
  gutMicrobiome: 'elysium.lifemetrics.gut_microbiome',
  epigeneticAge: 'elysium.lifemetrics.epigenetic_age',
  hormoneGenetics: 'elysium.lifemetrics.section.hormone_genetics',
  peptides: 'elysium.lifemetrics.section.peptides',
  peptideGeneticLibrary: 'elysium.lifemetrics.section.peptide_genetic_library',
  supplementNeedGenetics: 'elysium.lifemetrics.section.supplement_need_genetics',
  supplementSummary: 'elysium.lifemetrics.section.supplement_summary',
  methylation30x: 'elysium.lifemetrics.section.methylation_30x',
  cannabisGenetics: 'elysium.lifemetrics.section.cannabis_genetics',
  cannabisGeneticsLabwork: 'elysium.lifemetrics.section.cannabis_genetics_labwork',
  hormones: 'elysium.lifemetrics.section.hormones',
  pgx: 'elysium.lifemetrics.section.pgx',
  brcaPending: 'elysium.lifemetrics.section.brca_pending',
  bloodwork: 'elysium.lifemetrics.section.bloodwork',
  specialty24hrUrine: 'elysium.lifemetrics.section.specialty_24hr_urine',
  gut: 'elysium.lifemetrics.section.gut',
  truAge: 'elysium.lifemetrics.section.truage',
  symphonyAge: 'elysium.lifemetrics.section.symphony_age',
  truHealth: 'elysium.lifemetrics.section.truhealth',
} as const;

export type LifemetricsDigestKey =
  (typeof LIFEMETRICS_DIGEST_KEYS)[keyof typeof LIFEMETRICS_DIGEST_KEYS];

const NUTRITION_PANELS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'result_scores', label: 'Result Scores' },
  { key: 'hunger_fullness', label: 'Hunger/Fullness' },
  { key: 'protein', label: 'Protein' },
  { key: 'fats', label: 'Fats' },
  { key: 'saturated_fat', label: 'Saturated Fat' },
  { key: 'omega', label: 'Omega' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'food_sensitivities', label: 'Food Sensitivities' },
  { key: 'insulin_resistance', label: 'Insulin Resistance' },
  { key: 'plant_cholesterol', label: 'Plant Cholesterol' },
  { key: 'additional_nutrition_genetics', label: 'Additional Nutrition Genetics' },
];

function nutritionSection(panel: { key: string; label: string }): LifemetricsSectionMapping {
  return {
    sectionKey: panel.key,
    sectionLabel: panel.label,
    surfaces: ['my_nutrition.nutrition_by_genetics'],
    genex360Unit: 'nutrigen_dx',
    payloadKind: 'snp_and_lab',
    digestKey: LIFEMETRICS_DIGEST_KEYS.nutritionGeneticsLabwork,
    digestHub: 'Nutrition',
    hormoneIqDutch: false,
  };
}

function section(
  partial: Omit<LifemetricsSectionMapping, 'hormoneIqDutch'>,
): LifemetricsSectionMapping {
  return { ...partial, hormoneIqDutch: false };
}

const HORMONE_GENETICS_SECTION = section({
  sectionKey: 'hormone_genetics',
  sectionLabel: 'Hormone Genetics',
  surfaces: ['my_genetics', 'my_biology.hormones'],
  genex360Unit: null,
  payloadKind: 'snp',
  digestKey: LIFEMETRICS_DIGEST_KEYS.hormoneGenetics,
  digestHub: 'Biology',
});

const PEPTIDES_11_SECTION = section({
  sectionKey: 'peptides',
  sectionLabel: 'Peptides (11)',
  surfaces: ['peptide_iq.education'],
  genex360Unit: 'peptide_iq',
  payloadKind: 'education',
  digestKey: LIFEMETRICS_DIGEST_KEYS.peptides,
  digestHub: 'Genetics',
});

const PEPTIDE_LIBRARY_SECTION = section({
  sectionKey: 'peptide_genetic_library',
  sectionLabel: 'Peptides 1.0 + Peptide Genetic Library (12)',
  surfaces: ['peptide_iq.education'],
  genex360Unit: 'peptide_iq',
  payloadKind: 'education',
  digestKey: LIFEMETRICS_DIGEST_KEYS.peptideGeneticLibrary,
  digestHub: 'Genetics',
});

const SUPPLEMENT_NEED_SECTION = section({
  sectionKey: 'supplement_need_genetics',
  sectionLabel: 'Supplement Need Genetics',
  surfaces: ['my_supplements.flags_protocol'],
  genex360Unit: null,
  payloadKind: 'flag_protocol',
  digestKey: LIFEMETRICS_DIGEST_KEYS.supplementNeedGenetics,
  digestHub: 'Supplements',
});

const SUPPLEMENT_SUMMARY_SECTION = section({
  sectionKey: 'supplement_summary',
  sectionLabel: 'Supplement Summary',
  surfaces: ['my_supplements.flags_protocol'],
  genex360Unit: null,
  payloadKind: 'flag_protocol',
  digestKey: LIFEMETRICS_DIGEST_KEYS.supplementSummary,
  digestHub: 'Supplements',
});

const METHYLATION_30X_SECTION = section({
  sectionKey: 'methylation_30x',
  sectionLabel: '30x Methylation',
  surfaces: ['my_genetics'],
  genex360Unit: 'genex_m',
  payloadKind: 'snp',
  digestKey: LIFEMETRICS_DIGEST_KEYS.methylation30x,
  digestHub: 'Genetics',
});

const CANNABIS_GENETICS_SECTION = section({
  sectionKey: 'cannabis_genetics',
  sectionLabel: 'Cannabis Genetics',
  surfaces: ['my_genetics'],
  genex360Unit: 'cannabis_iq',
  payloadKind: 'snp',
  digestKey: LIFEMETRICS_DIGEST_KEYS.cannabisGenetics,
  digestHub: 'Genetics',
});

const CANNABIS_LABWORK_SECTION = section({
  sectionKey: 'cannabis_genetics_labwork',
  sectionLabel: 'Cannabis Genetics and Labwork',
  surfaces: ['my_genetics', 'my_biology.labs'],
  genex360Unit: 'cannabis_iq',
  payloadKind: 'snp_and_lab',
  digestKey: LIFEMETRICS_DIGEST_KEYS.cannabisGeneticsLabwork,
  digestHub: 'Genetics',
});

/**
 * Frozen append-only catalog. Add families below. Do not edit sourceIds of
 * shipped rows. HormoneIQ is never a LifeMetrics genex360Unit.
 */
export const LIFEMETRICS_REPORT_MAP: readonly LifemetricsFamilyMapping[] = Object.freeze([
  {
    familyKey: 'combined_comprehensive_lifestyle',
    familyLabel: 'Combined Comprehensive Lifestyle',
    digestKey: LIFEMETRICS_DIGEST_KEYS.combinedComprehensiveLifestyle,
    sourceIds: Object.freeze(['b2850', '2850', 'r37476', '37476']),
    sections: Object.freeze(NUTRITION_PANELS.map(nutritionSection)),
  },
  {
    familyKey: 'comprehensive_lifestyle_genetic',
    familyLabel: 'Comprehensive Lifestyle Genetic Report',
    digestKey: LIFEMETRICS_DIGEST_KEYS.comprehensiveLifestyleGenetic,
    sourceIds: Object.freeze(['2851']),
    sections: Object.freeze([
      section({
        sectionKey: 'lifestyle_snps',
        sectionLabel: 'Lifestyle Genetic SNPs',
        surfaces: ['my_genetics'],
        genex360Unit: null,
        payloadKind: 'snp',
        digestKey: LIFEMETRICS_DIGEST_KEYS.comprehensiveLifestyleGenetic,
        digestHub: 'Genetics',
      }),
      HORMONE_GENETICS_SECTION,
    ]),
  },
  {
    familyKey: 'lifestyle_demo',
    familyLabel: 'Lifestyle Demo',
    digestKey: LIFEMETRICS_DIGEST_KEYS.lifestyleDemo,
    sourceIds: Object.freeze(['2849']),
    sections: Object.freeze([
      PEPTIDES_11_SECTION,
      SUPPLEMENT_NEED_SECTION,
      SUPPLEMENT_SUMMARY_SECTION,
      METHYLATION_30X_SECTION,
      CANNABIS_GENETICS_SECTION,
    ]),
  },
  {
    familyKey: 'lifestyle_demo_variant',
    familyLabel: 'Lifestyle Demo variant',
    digestKey: LIFEMETRICS_DIGEST_KEYS.lifestyleDemoVariant,
    sourceIds: Object.freeze(['5202']),
    sections: Object.freeze([
      PEPTIDE_LIBRARY_SECTION,
      SUPPLEMENT_NEED_SECTION,
      SUPPLEMENT_SUMMARY_SECTION,
      METHYLATION_30X_SECTION,
      CANNABIS_GENETICS_SECTION,
      HORMONE_GENETICS_SECTION,
    ]),
  },
  {
    familyKey: 'omics_combined',
    familyLabel: 'Combined/Omics Demo',
    digestKey: LIFEMETRICS_DIGEST_KEYS.omicsCombined,
    sourceIds: Object.freeze(['12936']),
    sections: Object.freeze([
      section({
        sectionKey: 'hormones',
        sectionLabel: 'Hormones',
        surfaces: ['my_biology.labs'],
        genex360Unit: null,
        payloadKind: 'lab',
        digestKey: LIFEMETRICS_DIGEST_KEYS.hormones,
        digestHub: 'Labs',
      }),
      HORMONE_GENETICS_SECTION,
      CANNABIS_LABWORK_SECTION,
      METHYLATION_30X_SECTION,
      SUPPLEMENT_SUMMARY_SECTION,
    ]),
  },
  {
    familyKey: 'clinical_pgx',
    familyLabel: 'Diagnostic/Clinical PGx',
    digestKey: LIFEMETRICS_DIGEST_KEYS.clinicalPgx,
    sourceIds: Object.freeze(['12930']),
    sections: Object.freeze([
      section({
        sectionKey: 'pgx',
        sectionLabel: 'Clinical PGx',
        surfaces: ['my_genetics'],
        genex360Unit: 'genex_m.pgx',
        payloadKind: 'snp',
        digestKey: LIFEMETRICS_DIGEST_KEYS.pgx,
        digestHub: 'Genetics',
      }),
      section({
        sectionKey: 'brca_cancer_mutations',
        sectionLabel: 'BRCA / cancer mutations',
        surfaces: ['my_genetics'],
        genex360Unit: null,
        payloadKind: 'pending_marshall',
        digestKey: LIFEMETRICS_DIGEST_KEYS.brcaPending,
        digestHub: 'Genetics',
        marshallPending: true,
      }),
    ]),
  },
  {
    familyKey: 'bloodwork_labs',
    familyLabel: 'Bloodwork Labs',
    digestKey: LIFEMETRICS_DIGEST_KEYS.bloodworkLabs,
    sourceIds: Object.freeze(['12933']),
    sections: Object.freeze([
      section({
        sectionKey: 'bloodwork',
        sectionLabel: 'Bloodwork Labs',
        surfaces: ['my_biology.labs'],
        genex360Unit: null,
        payloadKind: 'lab',
        digestKey: LIFEMETRICS_DIGEST_KEYS.bloodwork,
        digestHub: 'Labs',
      }),
    ]),
  },
  {
    familyKey: 'specialty_tests',
    familyLabel: 'Specialty Tests',
    digestKey: LIFEMETRICS_DIGEST_KEYS.specialtyTests,
    sourceIds: Object.freeze(['12932']),
    sections: Object.freeze([
      section({
        sectionKey: 'specialty_24hr_urine',
        sectionLabel: '24-Hr Comp Urine',
        surfaces: ['my_biology.labs'],
        genex360Unit: null,
        payloadKind: 'lab',
        digestKey: LIFEMETRICS_DIGEST_KEYS.specialty24hrUrine,
        digestHub: 'Labs',
      }),
      section({
        sectionKey: 'specialty_other',
        sectionLabel: 'Specialty Tests',
        surfaces: ['my_biology.labs'],
        genex360Unit: null,
        payloadKind: 'lab',
        digestKey: LIFEMETRICS_DIGEST_KEYS.specialtyTests,
        digestHub: 'Labs',
      }),
    ]),
  },
  {
    familyKey: 'gut_microbiome',
    familyLabel: 'Gut/Microbiome',
    digestKey: LIFEMETRICS_DIGEST_KEYS.gutMicrobiome,
    sourceIds: Object.freeze(['12931']),
    sections: Object.freeze([
      section({
        sectionKey: 'gut',
        sectionLabel: 'Gut/Microbiome',
        surfaces: ['my_biology.gut'],
        genex360Unit: null,
        payloadKind: 'lab',
        digestKey: LIFEMETRICS_DIGEST_KEYS.gut,
        digestHub: 'Biology',
      }),
    ]),
  },
  {
    familyKey: 'epigenetic_age',
    familyLabel: 'Epigenetic Age',
    digestKey: LIFEMETRICS_DIGEST_KEYS.epigeneticAge,
    sourceIds: Object.freeze(['12929', '5600']),
    sections: Object.freeze([
      section({
        sectionKey: 'truage',
        sectionLabel: 'TruAge',
        surfaces: ['my_genetics'],
        genex360Unit: 'epigen_hq',
        payloadKind: 'clock',
        digestKey: LIFEMETRICS_DIGEST_KEYS.truAge,
        digestHub: 'Genetics',
      }),
      section({
        sectionKey: 'symphony_age',
        sectionLabel: 'Symphony Age',
        surfaces: ['my_genetics'],
        genex360Unit: 'epigen_hq',
        payloadKind: 'clock',
        digestKey: LIFEMETRICS_DIGEST_KEYS.symphonyAge,
        digestHub: 'Genetics',
      }),
      section({
        sectionKey: 'truhealth',
        sectionLabel: 'TruHealth',
        surfaces: ['my_genetics'],
        genex360Unit: 'epigen_hq',
        payloadKind: 'clock',
        digestKey: LIFEMETRICS_DIGEST_KEYS.truHealth,
        digestHub: 'Genetics',
      }),
    ]),
  },
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalize bundle / report tokens (#2851, b2850, r37476, 2851). */
export function normalizeLifemetricsSourceId(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const hashless = trimmed.replace(/^#/, '');
  const labeledBundle = hashless.match(/^bundle[:\s_-]+(?:b)?(\d+)$/);
  if (labeledBundle) return `b${labeledBundle[1]}`;
  const labeledReport = hashless.match(/^report[:\s_-]+(?:r)?(\d+)$/);
  if (labeledReport) return `r${labeledReport[1]}`;
  const bundle = hashless.match(/^b(\d+)$/);
  if (bundle) return `b${bundle[1]}`;
  const report = hashless.match(/^r(\d+)$/);
  if (report) return `r${report[1]}`;
  const numeric = hashless.match(/^(\d+)$/);
  if (numeric) return numeric[1];
  return hashless;
}

const FAMILY_BY_SOURCE_ID: ReadonlyMap<string, LifemetricsFamilyMapping> = (() => {
  const map = new Map<string, LifemetricsFamilyMapping>();
  for (const family of LIFEMETRICS_REPORT_MAP) {
    for (const sourceId of family.sourceIds) {
      map.set(normalizeLifemetricsSourceId(sourceId), family);
    }
  }
  return map;
})();

/** Unmapped IDs return null (UNKNOWN), never a fabricated 0-row family. */
export function lookupLifemetricsFamily(
  sourceId: string | null | undefined,
): LifemetricsFamilyMapping | null {
  if (!sourceId || !sourceId.trim()) return null;
  return FAMILY_BY_SOURCE_ID.get(normalizeLifemetricsSourceId(sourceId)) ?? null;
}

export function lookupLifemetricsFamilies(
  sourceIds: readonly string[],
): LifemetricsFamilyMapping[] {
  const seen = new Set<string>();
  const out: LifemetricsFamilyMapping[] = [];
  for (const sourceId of sourceIds) {
    const family = lookupLifemetricsFamily(sourceId);
    if (!family || seen.has(family.familyKey)) continue;
    seen.add(family.familyKey);
    out.push(family);
  }
  return out;
}

/**
 * Count of mapped families for a known id list.
 * null mappedIds means coverage is UNKNOWN, not 0.
 */
export function mappedFamilyCount(mappedIds: readonly string[] | null | undefined): number | null {
  if (mappedIds == null) return null;
  return lookupLifemetricsFamilies(mappedIds).length;
}

export function countsAsHormoneIqDutch(section: LifemetricsSectionMapping): false {
  return section.hormoneIqDutch;
}

export function isSnpPillSection(section: LifemetricsSectionMapping): boolean {
  return section.payloadKind === 'snp' || section.payloadKind === 'snp_and_lab';
}

export function extractLifemetricsReportIds(payload: unknown): string[] {
  if (!isRecord(payload)) return [];
  const bags: unknown[] = [
    payload.bundle_id,
    payload.bundleId,
    payload.report_id,
    payload.reportId,
    payload.insight_report_id,
    payload.insightReportId,
    isRecord(payload.data) ? payload.data.bundle_id : null,
    isRecord(payload.data) ? payload.data.report_id : null,
    isRecord(payload.payload) ? payload.payload.bundle_id : null,
    isRecord(payload.payload) ? payload.payload.report_id : null,
    isRecord(payload.report) ? payload.report.id : null,
    isRecord(payload.bundle) ? payload.bundle.id : null,
  ];
  if (isRecord(payload.data) && isRecord(payload.data.report)) {
    bags.push(payload.data.report.id, payload.data.report.report_id);
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of bags) {
    const raw = asString(value);
    if (!raw) continue;
    const normalized = normalizeLifemetricsSourceId(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    ids.push(normalized);
  }
  return ids;
}
