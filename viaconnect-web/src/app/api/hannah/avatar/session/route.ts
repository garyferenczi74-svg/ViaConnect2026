import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTavusConversation } from '@/lib/ai/hannah/avatar/tavus-client';
import { buildHannahContext } from '@/lib/ai/unified-context';
import { redactPHI } from '@/lib/ai/hannah/ultrathink/redaction';
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function POST(_request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isFeatureEnabled('hannah_avatar_enabled', user.id)) {
    return NextResponse.json({ error: 'Avatar feature disabled' }, { status: 403 });
  }

  const baaConfirmed = isFeatureEnabled('hannah_avatar_baa_confirmed', user.id);

  // Build sanitized context. ALWAYS redact for Tavus until BAA + explicit user consent.
  const ctx = await buildHannahContext(user.id, { includePHI: false });
  const safeContext = redactPHI(ctx.summary).slice(0, 4000);

  const conversation = await createTavusConversation({
    replicaId: process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID!,
    personaId: process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID!,
    conversationalContext: safeContext,
    maxCallDurationSeconds: Number(process.env.TAVUS_MAX_CALL_DURATION_SECONDS ?? 600),
    enableRecording: false,
  });

  const { data: session, error } = await (supabase as any)
    .from('hannah_avatar_sessions')
    .insert({
      user_id: user.id,
      tavus_conversation_id: conversation.conversation_id,
      tavus_replica_id: process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID!,
      tavus_persona_id: process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID!,
      baa_confirmed: baaConfirmed,
    })
    .select('id')
    .single();

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
}
