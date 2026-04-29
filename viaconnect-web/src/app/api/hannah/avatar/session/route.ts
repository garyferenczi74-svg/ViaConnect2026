import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTavusConversation } from '@/lib/ai/hannah/avatar/tavus-client';
import { buildHannahContext } from '@/lib/ai/unified-context';
import { redactPHI } from '@/lib/ai/hannah/ultrathink/redaction';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';

const tavusBreaker = getCircuitBreaker('tavus-api');

export async function POST(_request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 5000, 'api.hannah.avatar.session.auth');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isFeatureEnabled('hannah_avatar_enabled', user.id)) {
      return NextResponse.json({ error: 'Avatar feature disabled' }, { status: 403 });
    }

    const baaConfirmed = isFeatureEnabled('hannah_avatar_baa_confirmed', user.id);

    // Build sanitized context. ALWAYS redact for Tavus until BAA + explicit user consent.
    const ctx = await withTimeout(
      buildHannahContext(user.id, { includePHI: false }),
      15000,
      'api.hannah.avatar.session.context',
    );
    const safeContext = redactPHI(ctx.summary).slice(0, 4000);

    let conversation;
    try {
      conversation = await tavusBreaker.execute(() => withTimeout(
        createTavusConversation({
          replicaId: process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID!,
          personaId: process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID!,
          conversationalContext: safeContext,
          maxCallDurationSeconds: Number(process.env.TAVUS_MAX_CALL_DURATION_SECONDS ?? 600),
          enableRecording: false,
        }),
        30000,
        'api.hannah.avatar.session.tavus',
      ));
    } catch (vendorErr) {
      if (isCircuitBreakerError(vendorErr)) {
        safeLog.warn('api.hannah.avatar.session', 'tavus circuit open', { vendor: 'tavus-api' });
        return NextResponse.json({ error: 'Avatar service temporarily unavailable. Please try again shortly.' }, { status: 503 });
      }
      if (isTimeoutError(vendorErr)) {
        safeLog.warn('api.hannah.avatar.session', 'tavus timeout', { error: vendorErr });
        return NextResponse.json({ error: 'Avatar service took too long. Please try again.' }, { status: 504 });
      }
      safeLog.error('api.hannah.avatar.session', 'tavus failed', { error: vendorErr });
      return NextResponse.json({ error: 'Avatar service failed.' }, { status: 502 });
    }

    const { data: session, error } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('hannah_avatar_sessions')
        .insert({
          user_id: user.id,
          tavus_conversation_id: conversation.conversation_id,
          tavus_replica_id: process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID!,
          tavus_persona_id: process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID!,
          baa_confirmed: baaConfirmed,
        })
        .select('id')
        .single())(),
      8000,
      'api.hannah.avatar.session.insert',
    );

    if (error) {
      return NextResponse.json(
        { error: 'Session persistence failed', details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      conversationUrl: conversation.conversation_url,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hannah.avatar.session', 'auth/db timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.hannah.avatar.session', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
