// Prompt 231: mint a short-lived signed URL for one pose image of a scan
// session. The object path is ALWAYS resolved server-side from the parent
// body_photo_sessions row filtered by .eq('user_id', user.id) - a
// client-supplied path is never accepted or signed. Admin client is used
// only after ownership is confirmed through that filtered read.

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

const BUCKET = 'body-progress-photos';
const SCOPE = 'api.scan.signed-url';
const SIGNED_URL_TTL_SECONDS = 300;
const DB_TIMEOUT_MS = 5000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

const VIEWS = ['front', 'right', 'back', 'left'] as const;
type View = (typeof VIEWS)[number];
const VARIANTS = ['full', 'thumb'] as const;
type Variant = (typeof VARIANTS)[number];

function isView(v: unknown): v is View {
  return typeof v === 'string' && (VIEWS as readonly string[]).includes(v);
}
function isVariant(v: unknown): v is Variant {
  return typeof v === 'string' && (VARIANTS as readonly string[]).includes(v);
}

const SESSION_COLUMNS =
  'id,front_full_path,front_thumb_path,right_full_path,right_thumb_path,' +
  'back_full_path,back_thumb_path,left_full_path,left_thumb_path';

interface SessionPathRow {
  id: string;
  [key: string]: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: userData } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      `${SCOPE}.auth`,
    );
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!inMemoryRateLimit(`scan-signed-url:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const { sessionId, view, variant } = body as Record<string, unknown>;
    if (typeof sessionId !== 'string' || !sessionId || !isView(view)) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const resolvedVariant: Variant = isVariant(variant) ? variant : 'full';

    const admin: SupabaseClient = createAdminClient();

    // Ownership resolved ONLY through the parent session filtered by
    // user_id. A second user's sessionId never matches this filter.
    let session: SessionPathRow | null = null;
    try {
      const res = await withTimeout<{ data: SessionPathRow | null; error: { message: string } | null }>(
        Promise.resolve(
          admin
            .from('body_photo_sessions')
            .select(SESSION_COLUMNS)
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .maybeSingle(),
        ) as Promise<{ data: SessionPathRow | null; error: { message: string } | null }>,
        DB_TIMEOUT_MS,
        `${SCOPE}.session`,
      );
      if (res.error) {
        safeLog.error(SCOPE, 'session lookup error', { error: res.error });
        return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
      }
      session = res.data;
    } catch (error) {
      if (isTimeoutError(error)) throw error;
      safeLog.error(SCOPE, 'session lookup threw', { error });
      return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
    }

    // Not found OR owned by someone else: identical 404, never disclose which.
    if (!session) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const columnKey = `${view}_${resolvedVariant}_path`;
    const path = session[columnKey];
    if (typeof path !== 'string' || !path) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const signResult = await withTimeout<{
      data: { signedUrl: string } | null;
      error: { message: string } | null;
    }>(
      Promise.resolve(admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)) as Promise<{
        data: { signedUrl: string } | null;
        error: { message: string } | null;
      }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.sign`,
    );
    if (signResult.error || !signResult.data?.signedUrl) {
      safeLog.error(SCOPE, 'sign failed', { error: signResult.error });
      return NextResponse.json({ ok: false, error: 'sign_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, signedUrl: signResult.data.signedUrl });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error(SCOPE, 'timeout', { error });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { error });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
