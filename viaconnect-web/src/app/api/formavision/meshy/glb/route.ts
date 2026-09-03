// Mint a short-lived signed URL for OUR mirrored Meshy GLB. Never a Meshy CDN URL.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';
import { readOwnedSession, signStoredGlb } from '@/lib/formavision/meshy/meshySupabase';
import { sanitizeMeshyVisual } from '@/lib/formavision/meshy/meshyVisualState';
import { GLB_SIGNED_TTL_SECONDS } from '@/lib/formavision/meshy/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCOPE = 'api.formavision.meshy.glb';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: userData } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!inMemoryRateLimit(`formavision-meshy-glb:${user.id}`, 30, 60_000)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const admin = createAdminClient();
    const session = await readOwnedSession(admin, sessionId, user.id);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const visual = sanitizeMeshyVisual(session.meshy_visual);
    if (!visual.glbPath || visual.status !== 'succeeded') {
      return NextResponse.json({ ok: false, error: 'not_ready' }, { status: 404 });
    }

    const signedUrl = await signStoredGlb(admin, visual.glbPath, GLB_SIGNED_TTL_SECONDS);
    if (!signedUrl) {
      return NextResponse.json({ ok: false, error: 'sign_failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      signedUrl,
      glbPath: visual.glbPath,
      glbBytes: visual.glbBytes,
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
