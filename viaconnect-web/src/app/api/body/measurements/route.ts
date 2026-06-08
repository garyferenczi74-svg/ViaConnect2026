// Prompt 179c GET /api/body/measurements: the member's non-deleted circumference
// events (history + per-site trend source data), the latest scan id for the
// explicit import action, and whether the member is Platinum (drives import vs
// upsell). Reads fail open; never blocks the page.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  listMeasurementEvents,
  getLatestScanId,
  type AccessClient,
} from '@/lib/body-measurements/measurementsAccess';
import { getEffectiveTierForUser } from '@/lib/pricing/membership-manager';
import { isPlatinum } from '@/lib/body-measurements/ingestScanMeasurements';
import type { TierId } from '@/types/pricing';

export async function GET() {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.measurements.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const access = sb as unknown as AccessClient;
    const [events, latestScanId, tier] = await Promise.all([
      listMeasurementEvents(user.id, access),
      getLatestScanId(user.id, access),
      // Fail open on the read: an entitlement error shows the upsell, never the
      // paid action, and never blocks the list.
      getEffectiveTierForUser(sb, user.id).catch(() => 'free' as TierId),
    ]);

    return NextResponse.json({
      ok: true,
      events,
      latestScanId,
      platinum: isPlatinum(tier),
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body.measurements', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.measurements', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
