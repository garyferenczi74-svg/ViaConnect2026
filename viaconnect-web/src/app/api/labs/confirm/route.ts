// Prompt 204c lab surface (2026-06-18): the confirm step for a verified lab
// report. Persists the biomarkers the member reviewed. The flag is recomputed
// server-side in persistLabBiomarkers, so it never depends on client input.
// Owner-scoped via RLS.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { persistLabBiomarkers, type ConfirmedBiomarker } from '@/lib/labs/labUploadStore';

const MAX_ROWS = 2000;

interface ConfirmBody {
  biomarkers?: Array<{
    name?: unknown; value?: unknown; unit?: unknown;
    referenceLow?: unknown; referenceHigh?: unknown;
  }>;
  sourceFilename?: unknown;
}

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

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
    });
  }

  if (biomarkers.length === 0) {
    return NextResponse.json({ error: 'No biomarkers to save.' }, { status: 400 });
  }

  const sourceFilename = typeof body.sourceFilename === 'string' ? body.sourceFilename.slice(0, 300) : null;

  try {
    const result = await persistLabBiomarkers(supabase, user.id, biomarkers, sourceFilename);
    return NextResponse.json({ saved: result.saved, uploadId: result.uploadId });
  } catch (err) {
    safeLog.error('api.labs.confirm', 'save failed', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not save your results. Try again.' }, { status: 500 });
  }
}
