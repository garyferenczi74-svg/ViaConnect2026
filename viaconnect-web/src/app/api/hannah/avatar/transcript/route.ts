import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redactPHI } from '@/lib/ai/hannah/ultrathink/redaction';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 5000, 'api.hannah.avatar.transcript.auth');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as {
      sessionId: string;
      turnIndex: number;
      speaker: 'user' | 'hannah';
      text: string;
    };

    // Verify session ownership
    const { data: session } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any)
        .from('hannah_avatar_sessions')
        .select('id')
        .eq('id', body.sessionId)
        .eq('user_id', user.id)
        .single())(),
      8000,
      'api.hannah.avatar.transcript.read',
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Always redact PHI before storage, even after BAA (defense in depth)
    const textRedacted = redactPHI(body.text);

    await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any).from('hannah_avatar_transcripts').insert({
        session_id: body.sessionId,
        user_id: user.id,
        turn_index: body.turnIndex,
        speaker: body.speaker,
        text_redacted: textRedacted,
      }))(),
      8000,
      'api.hannah.avatar.transcript.insert',
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hannah.avatar.transcript', 'timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.hannah.avatar.transcript', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
