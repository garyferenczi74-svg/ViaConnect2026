import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), 5000, 'api.ultrathink.recommendation.auth');
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.ultrathink.recommendation', 'auth timeout', { error: err });
        return NextResponse.json({ error: 'Authentication check timed out.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (body.is_accepted !== undefined) {
      update.is_accepted = body.is_accepted;
      if (body.is_accepted) update.added_to_protocol_at = new Date().toISOString();
    }
    if (body.is_dismissed !== undefined) {
      update.is_dismissed = body.is_dismissed;
      if (body.dismissed_reason) update.dismissed_reason = body.dismissed_reason;
    }

    const { error } = await withTimeout(
      (async () => supabase
        .from('ultrathink_recommendations')
        .update(update)
        .eq('id', params.id)
        .eq('user_id', user.id))(),
      8000,
      'api.ultrathink.recommendation.update',
    );

    if (error) {
      safeLog.error('api.ultrathink.recommendation', 'update failed', { id: params.id, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.ultrathink.recommendation', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.ultrathink.recommendation', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
