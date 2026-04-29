import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { endTavusConversation } from '@/lib/ai/hannah/avatar/tavus-client';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';

const tavusBreaker = getCircuitBreaker('tavus-api');

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 5000, 'api.hannah.avatar.end.auth');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as {
      sessionId: string;
      endReason?: string;
    };

    // Look up the session to get the Tavus conversation ID
    const { data: session } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('hannah_avatar_sessions')
        .select('tavus_conversation_id, started_at')
        .eq('id', body.sessionId)
        .eq('user_id', user.id)
        .single())(),
      8000,
      'api.hannah.avatar.end.read',
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // End the Tavus conversation (best effort)
    await tavusBreaker.execute(() => withTimeout(
      endTavusConversation(session.tavus_conversation_id),
      15000,
      'api.hannah.avatar.end.tavus',
    )).catch((vendorErr) => {
      if (isCircuitBreakerError(vendorErr)) {
        safeLog.warn('api.hannah.avatar.end', 'tavus circuit open', { vendor: 'tavus-api' });
      } else {
        safeLog.warn('api.hannah.avatar.end', 'tavus end failed (best-effort)', { error: vendorErr });
      }
    });

    // Calculate duration
    const startedAt = new Date(session.started_at).getTime();
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

    // Update session record
    await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('hannah_avatar_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          end_reason: body.endReason || 'user_left',
        })
        .eq('id', body.sessionId)
        .eq('user_id', user.id))(),
      8000,
      'api.hannah.avatar.end.update',
    );

    return NextResponse.json({ ok: true, durationSeconds });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hannah.avatar.end', 'timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.hannah.avatar.end', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
