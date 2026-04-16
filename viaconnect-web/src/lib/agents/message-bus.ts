/**
 * Agent Message Bus (Prompt #85, Section 9)
 *
 * Inter-agent communication layer. All agents (Arnold, Hannah, Jeffery,
 * Michelangelo, Sherlock) use this bus to send structured messages to
 * each other via the agent_messages table.
 *
 * Uses a service-role client because agent messages are written
 * programmatically on behalf of agents, not on behalf of users.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentName = 'arnold' | 'hannah' | 'jeffery' | 'michelangelo' | 'sherlock';
type AgentTarget = AgentName | 'all';
type MessageStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'rejected';

export interface AgentMessage {
  fromAgent: AgentName;
  toAgent: AgentTarget;
  messageType: string;
  userId?: string;
  payload: Record<string, unknown>;
}

export interface AgentMessageRow {
  id: string;
  from_agent: AgentName;
  to_agent: AgentTarget;
  message_type: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  status: MessageStatus;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for message-bus');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Send a message from one agent to another (or to all agents).
 */
export async function sendAgentMessage(message: AgentMessage): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await (supabase as any)
    .from('agent_messages')
    .insert({
      from_agent: message.fromAgent,
      to_agent: message.toAgent,
      message_type: message.messageType,
      user_id: message.userId ?? null,
      payload: message.payload,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.warn(`[message-bus] sendAgentMessage failed: ${error.message}`);
    return null;
  }
  return data?.id as string;
}

/**
 * Arnold notifies Hannah (e.g., body score changed, milestone achieved).
 */
export async function arnoldNotifyHannah(
  type: string,
  payload: Record<string, unknown>,
  userId?: string,
): Promise<string | null> {
  return sendAgentMessage({
    fromAgent: 'arnold',
    toAgent: 'hannah',
    messageType: type,
    userId,
    payload,
  });
}

/**
 * Arnold escalates to Jeffery (e.g., anomaly detected, reconciliation conflict).
 */
export async function arnoldEscalateToJeffery(
  type: string,
  payload: Record<string, unknown>,
  userId?: string,
): Promise<string | null> {
  return sendAgentMessage({
    fromAgent: 'arnold',
    toAgent: 'jeffery',
    messageType: type,
    userId,
    payload,
  });
}

/**
 * Hannah notifies Arnold (e.g., user asked about body metrics in chat).
 */
export async function hannahNotifyArnold(
  type: string,
  payload: Record<string, unknown>,
  userId?: string,
): Promise<string | null> {
  return sendAgentMessage({
    fromAgent: 'hannah',
    toAgent: 'arnold',
    messageType: type,
    userId,
    payload,
  });
}

/**
 * Fetch pending (or filtered) messages for a specific agent.
 */
export async function getAgentMessages(
  toAgent: AgentTarget,
  status?: MessageStatus,
): Promise<AgentMessageRow[]> {
  const supabase = getSupabase();
  let query = (supabase as any)
    .from('agent_messages')
    .select('*')
    .or(`to_agent.eq.${toAgent},to_agent.eq.all`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.warn(`[message-bus] getAgentMessages failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as AgentMessageRow[];
}

/**
 * Mark a message as acknowledged.
 */
export async function acknowledgeMessage(messageId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await (supabase as any)
    .from('agent_messages')
    .update({ status: 'acknowledged' })
    .eq('id', messageId);

  if (error) {
    console.warn(`[message-bus] acknowledgeMessage failed: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Resolve a message with optional notes.
 */
export async function resolveMessage(
  messageId: string,
  notes?: string,
): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await (supabase as any)
    .from('agent_messages')
    .update({
      status: 'resolved',
      resolution_notes: notes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  if (error) {
    console.warn(`[message-bus] resolveMessage failed: ${error.message}`);
    return false;
  }
  return true;
}
