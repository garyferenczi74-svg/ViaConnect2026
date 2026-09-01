// Rythm Health import status. Reads lab_report_uploads provenance only.
// Fail-closed: a failed read is UNKNOWN (null counts), never a fabricated 0.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { RYTHM_HEALTH_LAB_NAME } from '@/lib/labs/rythmHealth';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('lab_report_uploads')
      .select('id, collection_date, created_at')
      .eq('user_id', user.id)
      .eq('lab_name', RYTHM_HEALTH_LAB_NAME)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      safeLog.warn('api.labs.rythm-health.status', 'upload read failed', {
        user_id: user.id,
        error: error.message,
      });
      return NextResponse.json({
        imported: false,
        savedCount: null,
        lastCollectionDate: null,
        status: 'UNKNOWN',
      });
    }

    const uploads = data ?? [];
    if (uploads.length === 0) {
      return NextResponse.json({
        imported: false,
        savedCount: null,
        lastCollectionDate: null,
        status: 'empty',
      });
    }

    const uploadIds = uploads.map((row) => row.id);
    const { count, error: bioErr } = await supabase
      .from('lab_biomarkers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('upload_id', uploadIds);

    if (bioErr) {
      safeLog.warn('api.labs.rythm-health.status', 'biomarker count failed', {
        user_id: user.id,
        error: bioErr.message,
      });
      return NextResponse.json({
        imported: true,
        savedCount: null,
        lastCollectionDate: uploads[0]?.collection_date ?? null,
        status: 'UNKNOWN',
      });
    }

    const savedCount = typeof count === 'number' ? count : null;
    return NextResponse.json({
      imported: typeof savedCount === 'number' ? savedCount > 0 : true,
      savedCount,
      lastCollectionDate: uploads[0]?.collection_date ?? null,
      status: typeof savedCount === 'number' && savedCount > 0 ? 'imported' : 'UNKNOWN',
    });
  } catch (err) {
    safeLog.error('api.labs.rythm-health.status', 'status threw', {
      user_id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({
      imported: false,
      savedCount: null,
      lastCollectionDate: null,
      status: 'UNKNOWN',
    });
  }
}
