/**
 * Avatar session lifecycle manager.
 * Handles creation, ending, and transcript logging for Tavus CVI sessions.
 */

import { createTavusConversation, endTavusConversation } from './tavus-client';
import { redactPHI } from '../ultrathink/redaction';
import type { AvatarSession, AvatarTranscriptLine } from './types';

export interface SessionManagerDeps {
  insertSession: (session: Omit<AvatarSession, 'endedAt' | 'durationSeconds' | 'endReason' | 'error'>) => Promise<string | null>;
  updateSession: (id: string, patch: Partial<AvatarSession>) => Promise<void>;
  insertTranscriptLine: (line: AvatarTranscriptLine) => Promise<void>;
}

export async function startAvatarSession(args: {
  userId: string;
  replicaId: string;
  personaId: string;
  context: string;
  baaConfirmed: boolean;
  deps: SessionManagerDeps;
}) {
  const safeContext = redactPHI(args.context).slice(0, 4000);

  const conversation = await createTavusConversation({
    replicaId: args.replicaId,
    personaId: args.personaId,
    conversationalContext: safeContext,
    maxCallDurationSeconds: Number(process.env.TAVUS_MAX_CALL_DURATION_SECONDS ?? 600),
    enableRecording: false,
  });

  const sessionId = await args.deps.insertSession({
    id: '',
    userId: args.userId,
    tavusConversationId: conversation.conversation_id,
    tavusReplicaId: args.replicaId,
    tavusPersonaId: args.personaId,
    baaConfirmed: args.baaConfirmed,
    startedAt: new Date().toISOString(),
  });

  return {
    sessionId,
    conversationUrl: conversation.conversation_url,
  };
}

export async function endAvatarSession(args: {
  sessionId: string;
  tavusConversationId: string;
  endReason: AvatarSession['endReason'];
  deps: SessionManagerDeps;
}) {
  await endTavusConversation(args.tavusConversationId).catch(() => {});

  await args.deps.updateSession(args.sessionId, {
    endedAt: new Date().toISOString(),
    endReason: args.endReason,
  });
}

export function appendTranscriptLine(args: {
  sessionId: string;
  userId: string;
  turnIndex: number;
  speaker: 'user' | 'hannah';
  rawText: string;
  deps: SessionManagerDeps;
}) {
  const redacted = redactPHI(args.rawText);
  return args.deps.insertTranscriptLine({
    sessionId: args.sessionId,
    userId: args.userId,
    turnIndex: args.turnIndex,
    speaker: args.speaker,
    textRedacted: redacted,
  });
}
