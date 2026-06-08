// Prompt 179c POST /api/body/measurements/from-scan/:scanId: explicit
// Platinum-gated import of a scan's girths into circumference (Section 7 +
// criterion 5). Idempotent and fail closed (DD-3): a non-Platinum member gets 403
// and no write. Shares the exact ingest path used by the post-scan hook.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { ingestMeasurementsFromScan, type IngestClient } from '@/lib/body-measurements/ingestScanMeasurements';

export async function POST(_req: Request, { params }: { params: { scanId: string } }) {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.measurements.fromScan.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const result = await ingestMeasurementsFromScan(
      { scanId: params.scanId, userId: user.id },
      sb as unknown as IngestClient,
    );
    if (!result.ok && result.reason === 'not_platinum') {
      return NextResponse.json({ ok: false, error: 'platinum_required' }, { status: 403 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.measurements.fromScan', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
