/**
 * POST /api/ai/report
 * Records a report of one AI reply. Does not store the reply text.
 * Body: { surface: "advisor" | "hannah", messageId: uuid, reason, note? }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

const REASONS = ['offensive', 'inaccurate', 'harmful', 'privacy', 'other'] as const;
type ReportReason = (typeof REASONS)[number];
const SURFACES = ['advisor', 'hannah'] as const;
type ReportSurface = (typeof SURFACES)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTE_MAX = 500;

function isReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && (REASONS as readonly string[]).includes(value);
}

function isSurface(value: unknown): value is ReportSurface {
  return typeof value === 'string' && (SURFACES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  let body: { surface?: unknown; messageId?: unknown; reason?: unknown; note?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messageId = typeof body.messageId === 'string' ? body.messageId.trim() : '';
  if (!UUID_RE.test(messageId)) {
    return NextResponse.json({ error: 'messageId must be a uuid' }, { status: 400 });
  }
  if (!isSurface(body.surface)) {
    return NextResponse.json({ error: 'surface must be advisor or hannah' }, { status: 400 });
  }
  if (!isReason(body.reason)) {
    return NextResponse.json({ error: 'reason is not recognized' }, { status: 400 });
  }

  let note: string | null = null;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== 'string') {
      return NextResponse.json({ error: 'note must be text' }, { status: 400 });
    }
    const trimmed = body.note.trim();
    if (trimmed.length > NOTE_MAX) {
      return NextResponse.json({ error: 'note is too long' }, { status: 400 });
    }
    note = trimmed.length > 0 ? trimmed : null;
  }

  let userClient;
  try {
    userClient = await createClient();
  } catch (error) {
    safeLog.error('api.ai.report', 'createClient failed', { error });
    return NextResponse.json({ error: 'Session unavailable' }, { status: 503 });
  }

  let user: { id: string } | null = null;
  try {
    const authResult = await withTimeout(userClient.auth.getUser(), 5000, 'api.ai.report.auth');
    user = authResult.data.user;
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ error: 'Authentication check timed out.' }, { status: 503 });
    }
    safeLog.error('api.ai.report', 'auth failed', { error });
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  if (body.surface === 'advisor') {
    const { data: conv, error: convErr } = await userClient
      .from('ultrathink_advisor_conversations')
      .select('id, message_role')
      .eq('id', messageId)
      .maybeSingle();
    if (convErr || !conv) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (conv.message_role !== 'assistant') {
      return NextResponse.json({ error: 'Reports apply to assistant messages only' }, { status: 400 });
    }
  } else {
    const { data: query, error: queryErr } = await userClient
      .from('knowledge_queries')
      .select('id')
      .eq('id', messageId)
      .maybeSingle();
    if (queryErr || !query) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
  }

  const { data: inserted, error: insertErr } = await userClient
    .from('ai_response_reports')
    .insert({
      user_id: user.id,
      message_id: messageId,
      surface: body.surface,
      reason: body.reason,
      note,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    safeLog.error('api.ai.report', 'insert failed', { code: insertErr?.code ?? 'unknown' });
    return NextResponse.json({ error: 'Could not save the report.' }, { status: 500 });
  }

  safeLog.info('api.ai.report', 'saved', {
    reportId: inserted.id,
    surface: body.surface,
    reason: body.reason,
  });

  return NextResponse.json({ ok: true, id: inserted.id });
}
