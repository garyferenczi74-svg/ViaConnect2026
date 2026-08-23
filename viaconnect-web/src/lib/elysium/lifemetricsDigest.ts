/**
 * src/lib/elysium/lifemetricsDigest.ts
 *
 * Elysium getDailyDigest keys for LifeMetrics insight-report families.
 * Hannah names families from these keys. User coverage stays UNKNOWN (null)
 * until a member-owned mapped report exists. UNKNOWN is never coerced to 0.
 *
 * Demo Client 4634 genotypes are never treated as member coverage.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import type { DigestItem } from '@/lib/hannah/compilation/types';
import {
  LIFEMETRICS_DIGEST_KEYS,
  LIFEMETRICS_REPORT_MAP,
  lookupLifemetricsFamilies,
  mappedFamilyCount,
} from '@/lib/genetics/lifemetricsReportMap';

export { LIFEMETRICS_DIGEST_KEYS };

export interface LifeMetricsDigestInput {
  /** null / undefined = coverage UNKNOWN. [] = honest empty. */
  mappedSourceIds?: readonly string[] | null;
}

function familySummary(familyLabel: string, coverageUnknown: boolean): string {
  if (coverageUnknown) {
    return `${familyLabel}: member coverage UNKNOWN. Elysium can name this LifeMetrics family. No fabricated 0.`;
  }
  return `${familyLabel}: mapped LifeMetrics family available for Hannah naming.`;
}

/**
 * Catalog + optional member-mapped families for Hannah.
 * Always includes family keys so Hannah can name the report set.
 */
export function buildLifeMetricsDigestItems(
  input: LifeMetricsDigestInput = {},
): DigestItem[] {
  const mappedIds = input.mappedSourceIds;
  const coverageUnknown = mappedIds == null;
  const mappedFamilies = coverageUnknown ? [] : lookupLifemetricsFamilies(mappedIds);
  const mappedCount = mappedFamilyCount(mappedIds);
  const items: DigestItem[] = [
    {
      id: LIFEMETRICS_DIGEST_KEYS.catalog,
      hub: 'Genetics',
      summary:
        'LifeMetrics insight-report families Elysium can name: Combined Comprehensive Lifestyle, Comprehensive Lifestyle Genetic, Lifestyle Demo, Combined/Omics Demo, Clinical PGx, Bloodwork Labs, Specialty Tests, Gut/Microbiome, Epigenetic Age. Demo Client 4634 is never imported onto a member.',
      metricLabel: 'mapped_report_families',
      metricValue: mappedCount === null ? null : String(mappedCount),
      refs: LIFEMETRICS_REPORT_MAP.map((family) => family.digestKey),
    },
  ];

  for (const family of LIFEMETRICS_REPORT_MAP) {
    const mapped = mappedFamilies.some((hit) => hit.familyKey === family.familyKey);
    items.push({
      id: family.digestKey,
      hub: family.sections[0]?.digestHub ?? 'Genetics',
      summary: familySummary(family.familyLabel, coverageUnknown || !mapped),
      metricLabel: 'family_mapped',
      metricValue: coverageUnknown ? null : mapped ? 'mapped' : null,
      refs: [family.digestKey, ...family.sourceIds],
    });
  }

  return items;
}
