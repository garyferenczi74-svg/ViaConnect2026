/**
 * POST /api/genetics/lifemetrics/pull
 *
 * Optional authenticated pull helper. Writes only to the signed-in member.
 * Never accepts a destination user id from the body. Requires
 * LIFEMETRICS_API_KEY when the partner API should be called.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import {
  extractLifemetricsPullPointer,
  pullLifemetricsResult,
  readLifemetricsApiKey,
} from '@/lib/genetics/lifemetricsClient';
import { extractLifemetricsIdentityHints } from '@/lib/genetics/lifemetricsIdentity';
import { mapLifemetricsImport } from '@/lib/genetics/lifemetricsImport';
import { persistLifemetricsImport } from '@/lib/genetics/lifemetricsPersist';
import { planLifemetricsPersist } from '@/lib/genetics/lifemetricsDemoGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.genetics.lifemetrics.pull';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized', applied: null }, { status: 401 });
  }

  if (!readLifemetricsApiKey()) {
    return NextResponse.json({ error: 'not_configured', applied: null }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json', applied: null }, { status: 400 });
  }

  const pointer = extractLifemetricsPullPointer(body);
  if (!pointer.resultId && !pointer.orderId && !pointer.kitBarcode) {
    return NextResponse.json({ error: 'missing_pointer', applied: null }, { status: 400 });
  }

  try {
    const eventType =
      body && typeof body === 'object' && 'event' in body && typeof body.event === 'string'
        ? body.event
        : null;
    const pulled = await pullLifemetricsResult(pointer, eventType);
    if (!pulled) {
      return NextResponse.json({
        ok: true,
        pulled: false,
        applied: { variants: null, hormoneMarkers: null, epigeneticMarkers: null },
      });
    }
    const mapped = mapLifemetricsImport(pulled, user.id);
    const source = extractLifemetricsIdentityHints(pulled);
    const planned = planLifemetricsPersist({
      source,
      targetUserId: user.id,
      mapped,
    });
    if (planned.blocked) {
      safeLog.info(SCOPE, 'demo client blocked, no write', { user_id: user.id });
      return NextResponse.json({
        ok: true,
        pulled: true,
        blocked: true,
        reason: planned.reason,
        applied: { variants: null, hormoneMarkers: null, epigeneticMarkers: null },
      });
    }
    const applied = await persistLifemetricsImport(supabase, user.id, planned.mapped, source);
    safeLog.info(SCOPE, 'pull applied', {
      user_id: user.id,
      variants: applied.variants,
      hormone_markers: applied.hormoneMarkers,
      epigenetic_markers: applied.epigeneticMarkers,
    });
    return NextResponse.json({ ok: true, pulled: true, applied });
  } catch (err) {
    safeLog.error(SCOPE, 'pull failed', {
      user_id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'pull_failed', applied: null }, { status: 500 });
  }
}
