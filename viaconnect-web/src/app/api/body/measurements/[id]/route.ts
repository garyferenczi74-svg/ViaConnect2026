// Prompt 179c DELETE /api/body/measurements/:id: soft-delete (manual) or hide
// (scan) a circumference event by setting deleted_at, preserving the row (DD-4 +
// criterion 7). Scoped to the owner; RLS also enforces ownership.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { softDeleteMeasurement, type AccessClient } from '@/lib/body-measurements/measurementsAccess';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.measurements.delete.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const ok = await softDeleteMeasurement(params.id, user.id, sb as unknown as AccessClient);
    return NextResponse.json({ ok });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.measurements.delete', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
