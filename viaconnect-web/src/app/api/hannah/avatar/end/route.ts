import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { endTavusConversation } from '@/lib/ai/hannah/avatar/tavus-client';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as {
    sessionId: string;
    endReason?: string;
  };

  // Look up the session to get the Tavus conversation ID
  const { data: session } = await (supabase as any)
    .from('hannah_avatar_sessions')
    .select('tavus_conversation_id, started_at')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // End the Tavus conversation (best effort)
  await endTavusConversation(session.tavus_conversation_id).catch(() => {});

  // Calculate duration
  const startedAt = new Date(session.started_at).getTime();
  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

  // Update session record
  await (supabase as any)
    .from('hannah_avatar_sessions')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      end_reason: body.endReason || 'user_left',
    })
    .eq('id', body.sessionId)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true, durationSeconds });
}
