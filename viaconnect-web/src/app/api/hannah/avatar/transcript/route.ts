import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redactPHI } from '@/lib/ai/hannah/ultrathink/redaction';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as {
    sessionId: string;
    turnIndex: number;
    speaker: 'user' | 'hannah';
    text: string;
  };

  // Verify session ownership
  const { data: session } = await (supabase as any)
    .from('hannah_avatar_sessions')
    .select('id')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Always redact PHI before storage, even after BAA (defense in depth)
  const textRedacted = redactPHI(body.text);

  await (supabase as any).from('hannah_avatar_transcripts').insert({
    session_id: body.sessionId,
    user_id: user.id,
    turn_index: body.turnIndex,
    speaker: body.speaker,
    text_redacted: textRedacted,
  });

  return NextResponse.json({ ok: true });
}
