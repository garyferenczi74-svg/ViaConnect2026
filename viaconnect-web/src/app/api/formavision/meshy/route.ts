// FormaVision Meshy FRBL -> textured GLB. Server-only. Never client-fetch api.meshy.ai.
// POST creates a task and returns immediately. GET advances one poll + mirrors GLB.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';
import { createMeshyVisual } from '@/lib/formavision/meshy/createMeshyVisual';
import { advanceMeshyVisual } from '@/lib/formavision/meshy/advanceMeshyVisual';
import { buildAdvanceDeps, buildCreateDeps, readOwnedSession } from '@/lib/formavision/meshy/meshySupabase';
import { sanitizeMeshyVisual } from '@/lib/formavision/meshy/meshyVisualState';
import { isTerminalMeshyStatus } from '@/lib/formavision/meshy/meshyVisualState';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const SCOPE = 'api.formavision.meshy';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function publicVisual(visual: ReturnType<typeof sanitizeMeshyVisual>) {
  return {
    taskId: visual.taskId,
    status: visual.status,
    glbPath: visual.glbPath,
    glbBytes: visual.glbBytes,
    views: visual.views,
    errorCode: visual.errorCode,
    progress: visual.progress,
  };
}

async function requireUser(): Promise<{ id: string } | NextResponse> {
  const supabase = await createClient();
  const { data: userData } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
  const user = userData.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return { id: user.id };
}

function parseSessionId(raw: unknown): string | null {
  return typeof raw === 'string' && UUID_RE.test(raw) ? raw : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;
    if (!inMemoryRateLimit(`formavision-meshy-create:${auth.id}`, 8, 60_000)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const sessionId = parseSessionId(
      body && typeof body === 'object' ? (body as Record<string, unknown>).sessionId : null,
    );
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const admin = createAdminClient();
    const created = await createMeshyVisual(sessionId, auth.id, buildCreateDeps(admin, auth.id));
    return NextResponse.json({
      ok: created.ok || created.skipped,
      skipped: created.skipped,
      error: created.errorCode,
      visual: publicVisual(created.visual),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'create unexpected', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;
    if (!inMemoryRateLimit(`formavision-meshy-poll:${auth.id}`, 30, 60_000)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const url = new URL(request.url);
    const sessionId = parseSessionId(url.searchParams.get('sessionId'));
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const admin = createAdminClient();
    const session = await readOwnedSession(admin, sessionId, auth.id);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    let visual = sanitizeMeshyVisual(session.meshy_visual);
    if (!visual.taskId && visual.status === 'idle') {
      const created = await createMeshyVisual(sessionId, auth.id, buildCreateDeps(admin, auth.id));
      visual = created.visual;
    } else if (visual.taskId && !isTerminalMeshyStatus(visual.status)) {
      visual = await advanceMeshyVisual(sessionId, auth.id, visual, buildAdvanceDeps(admin, auth.id));
    } else if (visual.status === 'succeeded' && !visual.glbPath && visual.taskId) {
      visual = await advanceMeshyVisual(sessionId, auth.id, visual, buildAdvanceDeps(admin, auth.id));
    }

    return NextResponse.json({
      ok: true,
      visual: publicVisual(visual),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'poll unexpected', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
