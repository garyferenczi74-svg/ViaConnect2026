// Prompt 204c lab surface (2026-06-18): server-side persistence for verified lab
// biomarkers. Creates the lab_report_uploads provenance row and upserts
// lab_biomarkers on (user_id, name, collection_date) so a re-upload on a new
// date is kept as history (for trends) while the same date updates in place.
// Each value carries a confidence marker. Fail-open with structured logging; the
// flag is recomputed server-side from the range so it never trusts client input.
//
// lab_report_uploads and lab_biomarkers are new tables not yet in the generated
// typegen, so the writes cast the client to any (matching the genetics routes).

import { safeLog } from '@/lib/utils/safe-log';

export interface ConfirmedBiomarker {
  name: string;
  value: number;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  /** high (manual/csv), medium (parsed text), low (ocr/scan), or null. */
  confidence?: string | null;
}

export interface PersistLabOptions {
  sourceFilename: string | null;
  /** pdf_text | pdf_scanned | photo | csv | manual */
  sourceType: string;
  /** YYYY-MM-DD; null defaults to today so the history key is always set. */
  collectionDate: string | null;
  labName?: string | null;
}

export interface LabPersistResult {
  uploadId: string | null;
  saved: number;
}

function flagFor(value: number, low: number | null, high: number | null): string | null {
  if (low === null || high === null) return null;
  if (value < low) return 'low';
  if (value > high) return 'high';
  return 'normal';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function persistLabBiomarkers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  biomarkers: ConfirmedBiomarker[],
  opts: PersistLabOptions,
): Promise<LabPersistResult> {
  const collectionDate = opts.collectionDate ?? todayIso();
  try {
    const { data: upload, error: uploadErr } = await supabase
      .from('lab_report_uploads')
      .insert({
        user_id: userId,
        source_filename: opts.sourceFilename,
        source_type: opts.sourceType,
        lab_name: opts.labName ?? null,
        collection_date: collectionDate,
        status: 'completed',
      })
      .select('id')
      .single();

    if (uploadErr || !upload) {
      safeLog.warn('labs.persist', 'lab_report_uploads insert failed (continuing)', {
        user_id: userId, error: uploadErr?.message ?? 'no row',
      });
      return { uploadId: null, saved: 0 };
    }

    const uploadId = upload.id as string;
    const rows = biomarkers.map((b) => ({
      user_id: userId,
      upload_id: uploadId,
      name: b.name,
      value: b.value,
      unit: b.unit,
      reference_low: b.referenceLow,
      reference_high: b.referenceHigh,
      flag: flagFor(b.value, b.referenceLow, b.referenceHigh),
      confidence: b.confidence ?? 'medium',
      source_type: opts.sourceType,
      collection_date: collectionDate,
    }));

    if (rows.length > 0) {
      const { error: bioErr } = await supabase
        .from('lab_biomarkers')
        .upsert(rows, { onConflict: 'user_id,name,collection_date' });
      if (bioErr) {
        safeLog.warn('labs.persist', 'lab_biomarkers upsert failed (continuing)', {
          user_id: userId, upload_id: uploadId, error: bioErr.message,
        });
        return { uploadId, saved: 0 };
      }
    }

    return { uploadId, saved: rows.length };
  } catch (err) {
    safeLog.error('labs.persist', 'persistLabBiomarkers threw (fail-open)', {
      user_id: userId, error: err instanceof Error ? err.message : String(err),
    });
    return { uploadId: null, saved: 0 };
  }
}
