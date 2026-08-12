// Prompt 204c lab surface (2026-06-18): the confirm step for a verified lab
// report. Persists the biomarkers the member reviewed. The flag is recomputed
// server-side in persistLabBiomarkers, so it never depends on client input.
// Owner-scoped via RLS.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { persistLabBiomarkers, type ConfirmedBiomarker } from '@/lib/labs/labUploadStore';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 2000;

interface ConfirmBody {
  biomarkers?: Array<{
    name?: unknown; value?: unknown; unit?: unknown;
    referenceLow?: unknown; referenceHigh?: unknown;
  }>;
  sourceFilename?: unknown;
  sourceType?: unknown;
  collectionDate?: unknown;
}

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const VALID_SOURCE_TYPES = new Set(['pdf_text', 'pdf_scanned', 'photo', 'csv', 'manual']);

// Per-source confidence: the member typed it or it came structured (high), it was
// parsed from a text layer (medium), or it came from OCR of a scan (low).
function confidenceForSource(sourceType: string): string {
  if (sourceType === 'manual' || sourceType === 'csv') return 'high';
  if (sourceType === 'pdf_scanned' || sourceType === 'photo') return 'low';
  return 'medium';
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to save.' }, { status: 401 });
  }

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const sourceType =
    typeof body.sourceType === 'string' && VALID_SOURCE_TYPES.has(body.sourceType)
      ? body.sourceType
      : 'pdf_text';
  const confidence = confidenceForSource(sourceType);

  const raw = Array.isArray(body.biomarkers) ? body.biomarkers.slice(0, MAX_ROWS) : [];
  const biomarkers: ConfirmedBiomarker[] = [];
  for (const b of raw) {
    const value = numOrNull(b?.value);
    if (typeof b?.name !== 'string' || b.name.trim().length === 0 || value === null) continue;
    biomarkers.push({
      name: b.name.trim().slice(0, 120),
      value,
      unit: typeof b.unit === 'string' ? b.unit.slice(0, 30) : null,
      referenceLow: numOrNull(b.referenceLow),
      referenceHigh: numOrNull(b.referenceHigh),
      confidence,
    });
  }

  if (biomarkers.length === 0) {
    return NextResponse.json({ error: 'No biomarkers to save.' }, { status: 400 });
  }

  const sourceFilename = typeof body.sourceFilename === 'string' ? body.sourceFilename.slice(0, 300) : null;
  // Accept a YYYY-MM-DD collection date; persist defaults to today when null.
  const collectionDate =
    typeof body.collectionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.collectionDate)
      ? body.collectionDate
      : null;

  try {
    const result = await persistLabBiomarkers(supabase, user.id, biomarkers, {
      sourceFilename,
      sourceType,
      collectionDate,
    });
    return NextResponse.json({ saved: result.saved, uploadId: result.uploadId });
  } catch (err) {
    safeLog.error('api.labs.confirm', 'save failed', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not save your results. Try again.' }, { status: 500 });
  }
}
