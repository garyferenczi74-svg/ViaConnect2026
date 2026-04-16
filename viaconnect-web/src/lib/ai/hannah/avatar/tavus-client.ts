const TAVUS_BASE = 'https://tavusapi.com/v2';

export interface CreateConversationArgs {
  replicaId: string;
  personaId: string;
  conversationalContext?: string;
  maxCallDurationSeconds?: number;
  enableRecording?: boolean;
}

export interface TavusConversation {
  conversation_id: string;
  conversation_url: string;
  status: string;
}

export async function createTavusConversation(
  args: CreateConversationArgs,
): Promise<TavusConversation> {
  const res = await fetch(`${TAVUS_BASE}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TAVUS_API_KEY!,
    },
    body: JSON.stringify({
      replica_id: args.replicaId,
      persona_id: args.personaId,
      conversational_context: args.conversationalContext,
      properties: {
        max_call_duration: args.maxCallDurationSeconds ?? 600,
        participant_left_timeout: 30,
        enable_recording: args.enableRecording ?? false,
        enable_transcription: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavus create conversation failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function endTavusConversation(conversationId: string): Promise<void> {
  const res = await fetch(`${TAVUS_BASE}/conversations/${conversationId}/end`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.TAVUS_API_KEY! },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Tavus end conversation failed: ${res.status}`);
  }
}
