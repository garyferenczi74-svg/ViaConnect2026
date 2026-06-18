// Prompt 204c lab surface (2026-06-18): server-side persistence for verified lab
// biomarkers. Creates the lab_report_uploads provenance row and upserts
// lab_biomarkers on (user_id, name) so a re-upload updates in place. Fail-open
// with structured logging; the flag is recomputed server-side from the range so
// it never depends on what the client sent.
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

export async function persistLabBiomarkers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  biomarkers: ConfirmedBiomarker[],
  sourceFilename: string | null,
): Promise<LabPersistResult> {
  try {
    const { data: upload, error: uploadErr } = await supabase
      .from('lab_report_uploads')
      .insert({ user_id: userId, source_filename: sourceFilename, status: 'completed' })
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
    }));

    if (rows.length > 0) {
      const { error: bioErr } = await supabase
        .from('lab_biomarkers')
        .upsert(rows, { onConflict: 'user_id,name' });
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
