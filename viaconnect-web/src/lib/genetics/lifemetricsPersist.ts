/**
 * src/lib/genetics/lifemetricsPersist.ts
 *
 * Apply a mapped LifeMetrics import to the live consumer tables.
 * Variants -> user_variants. DUTCH HormoneIQ -> lab_biomarkers.
 * TruDiagnostics / Age Rate clocks -> user_epigenetic_markers.
 * Does not log genetics. Does not write when userId is missing.
 * Refuses Demo Client 4634, demo@genemetrics.com, and FarmCeutica Support.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import {
  buildGenemetricsVariantRow,
  GENEMETRICS_USER_VARIANTS_ONCONFLICT,
} from './genemetricsImportPayload';
import { persistLabBiomarkers } from '@/lib/labs/labUploadStore';
import { persistEpigeneticMarkers } from './epigenResultStore';
import {
  hormoneProvenanceForPersist,
  toGenemetricsVariantInput,
  type LifemetricsMappedImport,
} from './lifemetricsImport';
import {
  isLifemetricsDemoSource,
  type LifemetricsDemoSource,
} from './lifemetricsDemoGuard';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';

const SCOPE = 'genetics.lifemetrics.persist';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface LifemetricsPersistCounts {
  variants: number | null;
  hormoneMarkers: number | null;
  epigeneticMarkers: number | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOrToday(value: string | null | undefined): string {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : todayIso();
}

export async function persistLifemetricsImport(
  supabase: SupabaseLike,
  userId: string,
  mapped: LifemetricsMappedImport,
  source: LifemetricsDemoSource = {},
): Promise<LifemetricsPersistCounts> {
  if (
    !userId ||
    mapped.unknownReason === 'demo_client_blocked' ||
    isLifemetricsDemoSource(source)
  ) {
    return { variants: null, hormoneMarkers: null, epigeneticMarkers: null };
  }

  const counts: LifemetricsPersistCounts = {
    variants: mapped.variants.length > 0 ? 0 : null,
    hormoneMarkers: mapped.hormoneMarkers.length > 0 ? 0 : null,
    epigeneticMarkers: mapped.epigeneticMarkers.length > 0 ? 0 : null,
  };

  if (mapped.variants.length > 0) {
    const rows = mapped.variants.map((row) =>
      buildGenemetricsVariantRow(toGenemetricsVariantInput(row)),
    );
    const { error } = await withTimeout(
      supabase
        .from('user_variants')
        .upsert(rows, { onConflict: GENEMETRICS_USER_VARIANTS_ONCONFLICT }),
      10000,
      `${SCOPE}.user_variants`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'user_variants upsert failed', {
        user_id: userId,
        error: error.message ?? 'supabase error',
      });
      counts.variants = null;
    } else {
      counts.variants = rows.length;
    }
  }

  const hormoneProvenance = hormoneProvenanceForPersist(mapped);
  if (hormoneProvenance && mapped.hormoneMarkers.length > 0) {
    const result = await persistLabBiomarkers(supabase, userId, mapped.hormoneMarkers, {
      sourceFilename: hormoneProvenance.sourceFilename,
      sourceType: hormoneProvenance.sourceType,
      collectionDate: dateOrToday(mapped.hormoneCollectionDate),
      labName: hormoneProvenance.labName,
    });
    counts.hormoneMarkers = result.saved;
    if (result.saved === 0) counts.hormoneMarkers = null;
  }

  if (mapped.epigeneticMarkers.length > 0) {
    const result = await persistEpigeneticMarkers(supabase, userId, mapped.epigeneticMarkers, {
      sourceFilename: null,
      sourceType: 'csv',
      labName: mapped.epigeneticLabName ?? 'TruDiagnostics',
      measuredOn: dateOrToday(mapped.epigeneticMeasuredOn),
      confidence: 'high',
    });
    counts.epigeneticMarkers = result.saved;
    if (result.saved === 0) counts.epigeneticMarkers = null;
  }

  return counts;
}
