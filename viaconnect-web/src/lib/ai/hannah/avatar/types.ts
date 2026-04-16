export interface AvatarSession {
  id: string;
  userId: string;
  tavusConversationId: string;
  tavusReplicaId: string;
  tavusPersonaId: string;
  baaConfirmed: boolean;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  endReason?: 'user_left' | 'timeout' | 'error' | 'guardrail';
  error?: string;
}

export interface AvatarTranscriptLine {
  sessionId: string;
  userId: string;
  turnIndex: number;
  speaker: 'user' | 'hannah';
  textRedacted: string;
  sentiment?: string;
}

export interface CreateAvatarSessionResult {
  sessionId: string;
  conversationUrl: string;
}
