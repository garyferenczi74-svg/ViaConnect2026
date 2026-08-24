// Server loader for GET /api/genetics/variants.
// Reads user_variants (alias-normalized), hormone / DUTCH marker tables, and
// user_epigenetic_markers. Hub is read-only: this file never writes
// user_variants.
//
// Standing rules: no em or en dashes, TypeScript strict (no any).

import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getBrandedPanelKeys } from './brandedProvenance';
import {
  buildHubVariantsPayload,
  type HubEpigeneticMarker,
  type HubVariantsPayload,
} from './hubVariantsPayload';
import type { HormoneMarkerSourceRow } from './hormoneObservedCount';
import { isRealKitUploadFilename } from './geneticsUploadState';
import { buildVariantProvenance, type VariantProvenance } from './variantProvenance';

const TIMEOUT_MS = 4_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

interface LabBiomarkerRow {
  name?: string | null;
  value?: number | null;
  unit?: string | null;
  source_type?: string | null;
  collection_date?: string | null;
  upload_id?: string | null;
}

interface LabUploadRow {
  id?: string | null;
  lab_name?: string | null;
  source_type?: string | null;
  source_filename?: string | null;
}

interface EpigenRow {
  marker_key?: string | null;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
}

async function readUserVariants(
  supabase: SupabaseLike,
  userId: string,
): Promise<{ rows: Array<Record<string, unknown>>; failed: boolean }> {
  try {
    const result = (await withTimeout(
      supabase
        .from('user_variants')
        .select(
          'panel_key, rsid, gene, genotype, status, clinical_significance, is_sample, created_at, upload_id',
        )
        .eq('user_id', userId)
        .order('panel_key', { ascending: true }),
      TIMEOUT_MS,
      'genetics.hub.user_variants',
    )) as { data: Array<Record<string, unknown>> | null; error: { message?: string } | null };
    if (result.error) {
      safeLog.warn('genetics.hub', 'user_variants read failed', {
        user_id: userId,
        error: result.error.message ?? 'supabase error',
      });
      return { rows: [], failed: true };
    }
    return { rows: Array.isArray(result.data) ? result.data : [], failed: false };
  } catch (err) {
    safeLog.warn('genetics.hub', 'user_variants read failed', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { rows: [], failed: true };
  }
}

async function readHormoneMarkerRows(
  supabase: SupabaseLike,
  userId: string,
): Promise<{ rows: HormoneMarkerSourceRow[]; failed: boolean }> {
  let failed = false;
  const rows: HormoneMarkerSourceRow[] = [];

  try {
    const uploadsResult = (await withTimeout(
      supabase
        .from('lab_report_uploads')
        .select('id, lab_name, source_type, source_filename')
        .eq('user_id', userId),
      TIMEOUT_MS,
      'genetics.hub.lab_report_uploads',
    )) as { data: LabUploadRow[] | null; error: { message?: string } | null };

    const uploadById = new Map<string, LabUploadRow>();
    if (uploadsResult.error) {
      safeLog.warn('genetics.hub', 'lab_report_uploads read failed', {
        user_id: userId,
        error: uploadsResult.error.message ?? 'supabase error',
      });
      failed = true;
    } else {
      for (const upload of uploadsResult.data ?? []) {
        if (upload.id) uploadById.set(String(upload.id), upload);
      }
    }

    const bioResult = (await withTimeout(
      supabase
        .from('lab_biomarkers')
        .select('name, value, unit, source_type, collection_date, upload_id')
        .eq('user_id', userId)
        .order('collection_date', { ascending: false }),
      TIMEOUT_MS,
      'genetics.hub.lab_biomarkers',
    )) as { data: LabBiomarkerRow[] | null; error: { message?: string } | null };

    if (bioResult.error) {
      safeLog.warn('genetics.hub', 'lab_biomarkers read failed', {
        user_id: userId,
        error: bioResult.error.message ?? 'supabase error',
      });
      failed = true;
    } else {
      for (const row of bioResult.data ?? []) {
        const upload = row.upload_id ? uploadById.get(String(row.upload_id)) : undefined;
        rows.push({
          name: String(row.name ?? ''),
          value: row.value == null ? null : Number(row.value),
          unit: row.unit == null ? null : String(row.unit),
          measured_at: row.collection_date == null ? null : String(row.collection_date),
          source_type: row.source_type ?? upload?.source_type ?? null,
          lab_name: upload?.lab_name ?? null,
          source_filename: upload?.source_filename ?? null,
        });
      }
    }
  } catch (err) {
    safeLog.warn('genetics.hub', 'hormone marker tables read failed', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
    failed = true;
  }

  // lab_results_normalized has no DUTCH / hormone_iq provenance. Gary: generic
  // hormone-like names from other labs must not increment HormoneIQ. Untagged
  // normalized rows stay out of this count.

  if (failed && rows.length === 0) return { rows: [], failed: true };
  return { rows, failed: false };
}

async function readEpigeneticMarkers(
  supabase: SupabaseLike,
  userId: string,
): Promise<{ rows: HubEpigeneticMarker[]; failed: boolean }> {
  try {
    const result = (await withTimeout(
      supabase
        .from('user_epigenetic_markers')
        .select('marker_key, value_num, value_text, unit, measured_on')
        .eq('user_id', userId)
        .order('measured_on', { ascending: false }),
      TIMEOUT_MS,
      'genetics.hub.user_epigenetic_markers',
    )) as { data: EpigenRow[] | null; error: { message?: string } | null };
    if (result.error) {
      safeLog.warn('genetics.hub', 'user_epigenetic_markers read failed', {
        user_id: userId,
        error: result.error.message ?? 'supabase error',
      });
      return { rows: [], failed: true };
    }
    const seen = new Set<string>();
    const rows: HubEpigeneticMarker[] = [];
    for (const row of result.data ?? []) {
      const key = String(row.marker_key ?? '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push({
        markerKey: key,
        valueNum: typeof row.value_num === 'number' ? row.value_num : null,
        valueText: typeof row.value_text === 'string' ? row.value_text : null,
        unit: typeof row.unit === 'string' ? row.unit : null,
      });
    }
    return { rows, failed: false };
  } catch (err) {
    safeLog.warn('genetics.hub', 'user_epigenetic_markers read failed', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { rows: [], failed: true };
  }
}

interface DnaUploadProvenanceRow {
  id?: string | null;
  provider?: string | null;
  created_at?: string | null;
  branded_product_code?: string | null;
  source_filename?: string | null;
}

async function readDnaUploadProvenance(
  supabase: SupabaseLike,
  userId: string,
  uploadIds: string[],
): Promise<{ byId: Map<string, DnaUploadProvenanceRow>; realKitIngest: boolean }> {
  const byId = new Map<string, DnaUploadProvenanceRow>();
  let realKitIngest = false;
  try {
    const result = (await withTimeout(
      supabase
        .from('dna_uploads')
        .select('id, provider, created_at, branded_product_code, source_filename')
        .eq('user_id', userId),
      TIMEOUT_MS,
      'genetics.hub.dna_uploads',
    )) as { data: DnaUploadProvenanceRow[] | null; error: { message?: string } | null };
    if (result.error) {
      safeLog.warn('genetics.hub', 'dna_uploads read failed', {
        user_id: userId,
        error: result.error.message ?? 'supabase error',
      });
      return { byId, realKitIngest: false };
    }
    for (const row of result.data ?? []) {
      if (row.id) byId.set(String(row.id), row);
      if (isRealKitUploadFilename(row.source_filename)) realKitIngest = true;
    }
    if (uploadIds.length === 0) {
      return { byId, realKitIngest };
    }
    return { byId, realKitIngest };
  } catch (err) {
    safeLog.warn('genetics.hub', 'dna_uploads read failed', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { byId, realKitIngest: false };
  }
}

async function readCompletedKitIngest(
  supabase: SupabaseLike,
  userId: string,
): Promise<boolean> {
  try {
    const result = (await withTimeout(
      supabase
        .from('kit_registrations')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'completed'),
      TIMEOUT_MS,
      'genetics.hub.kit_registrations',
    )) as { data: Array<{ status?: string | null }> | null; error: { message?: string } | null };
    if (result.error) return false;
    return (result.data ?? []).some((row) => row.status === 'completed');
  } catch {
    return false;
  }
}

function attachProvenance(
  row: Record<string, unknown>,
  uploadsById: Map<string, DnaUploadProvenanceRow>,
): VariantProvenance {
  const uploadId = typeof row.upload_id === 'string' ? row.upload_id : null;
  const upload = uploadId ? uploadsById.get(uploadId) : undefined;
  return buildVariantProvenance({
    provider: upload?.provider ?? null,
    uploadCreatedAt: upload?.created_at ?? null,
    variantCreatedAt: typeof row.created_at === 'string' ? row.created_at : null,
    brandedProductCode: upload?.branded_product_code ?? null,
  });
}

export async function loadHubVariants(
  supabase: SupabaseLike,
  userId: string,
): Promise<HubVariantsPayload<Record<string, unknown> & { panel_key: string }>> {
  const [variants, hormone, epigenetic, brandedPanels] = await Promise.all([
    readUserVariants(supabase, userId),
    readHormoneMarkerRows(supabase, userId),
    readEpigeneticMarkers(supabase, userId),
    getBrandedPanelKeys(supabase, userId),
  ]);

  const uploadIds = variants.rows
    .map((row) => (typeof row.upload_id === 'string' ? row.upload_id : null))
    .filter((id): id is string => id !== null);

  const [uploadProvenance, completedKit] = await Promise.all([
    readDnaUploadProvenance(supabase, userId, uploadIds),
    readCompletedKitIngest(supabase, userId),
  ]);

  return buildHubVariantsPayload({
    variantRows: variants.rows.map((row) => ({
      ...row,
      panel_key: typeof row.panel_key === 'string' ? row.panel_key : '',
      stored_panel_key: typeof row.panel_key === 'string' ? row.panel_key : '',
      provenance: attachProvenance(row, uploadProvenance.byId),
    })),
    variantsReadFailed: variants.failed,
    hormoneRows: hormone.rows,
    hormoneReadFailed: hormone.failed,
    epigeneticRows: epigenetic.rows,
    epigeneticReadFailed: epigenetic.failed,
    brandedPanels,
    realKitIngest: uploadProvenance.realKitIngest || completedKit,
  });
}
