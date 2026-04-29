import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runUltrathink } from '@/lib/ai/hannah/ultrathink/engine';
import { extractFeatures, routeTier } from '@/lib/ai/hannah/ultrathink/router';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { createHash } from 'crypto';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.hannah.ultrathink.auth');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isFeatureEnabled('hannah_ultrathink_enabled', user.id)) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
  }

  const body = (await request.json()) as {
    query: string;
    forceTier?: 'fast' | 'standard' | 'ultrathink';
  };
  const { query, forceTier } = body;

  // Input validation
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }
  if (query.length > 5000) {
    return NextResponse.json({ error: 'Query exceeds maximum length' }, { status: 400 });
  }

  // Jeffery's routing decision
  const features = extractFeatures(query);
  const autoEscalate = isFeatureEnabled('hannah_ultrathink_auto_escalate', user.id);
  const decision = forceTier
    ? { tier: forceTier, reason: 'forced', autoEscalated: false }
    : routeTier(features, autoEscalate);

  const queryHash = createHash('sha256').update(query).digest('hex');

  // Persist routing decision
  await (supabase as any).from('jeffery_hannah_routing_log').insert({
    user_id: user.id,
    query_hash: queryHash,
    chose_tier: decision.tier,
    chose_modality: 'text',
    reason: decision.reason,
    auto_escalated: decision.autoEscalated,
  });

  // Run the reasoning engine
  let response;
  try {
    response = await withTimeout(
      runUltrathink({
        userId: user.id,
        query,
        tier: decision.tier,
        modality: 'text',
        phiAllowed: true,
      }),
      60000,
      'api.hannah.ultrathink.engine',
    );
  } catch (engineErr) {
    if (isTimeoutError(engineErr)) {
      safeLog.warn('api.hannah.ultrathink', 'engine timeout', { userId: user.id, tier: decision.tier, error: engineErr });
      return NextResponse.json({ error: 'Reasoning engine took too long. Please try again.' }, { status: 504 });
    }
    safeLog.error('api.hannah.ultrathink', 'engine failed', { userId: user.id, tier: decision.tier, error: engineErr });
    return NextResponse.json({ error: 'Reasoning engine failed.' }, { status: 502 });
  }

  // Persist session
  const { data: session } = await (supabase as any)
    .from('hannah_ultrathink_sessions')
    .insert({
      user_id: user.id,
      tier: response.tier,
      modality: 'text',
      query_hash: queryHash,
      input_tokens: response.inputTokens,
      output_tokens: response.outputTokens,
      thinking_tokens: response.thinkingTokens,
      latency_ms: response.latencyMs,
      confidence: response.confidence,
      escalated_from_tier: decision.autoEscalated ? 'standard' : null,
    })
    .select('id')
    .single();

  // Persist trace
  if (session?.id && response.thinkingSummary) {
    await (supabase as any).from('hannah_ultrathink_traces').insert({
      session_id: session.id,
      user_id: user.id,
      thinking_summary: response.thinkingSummary,
      critique_passed: response.critiquePassed,
      critique_notes: response.critiqueNotes,
    });
  }

  // Persist citations
  if (session?.id && response.citations.length > 0) {
    await (supabase as any).from('hannah_evidence_citations').insert(
      response.citations.map((c) => ({
        session_id: session.id,
        user_id: user.id,
        source_type: c.type,
        source_id: c.id,
        source_title: c.title,
        source_url: c.url,
        relevance_score: c.relevanceScore,
        rank: c.rank,
      })),
    );
  }

    return NextResponse.json({
      answer: response.answer,
      tier: response.tier,
      citations: response.citations,
      confidence: response.confidence,
      sessionId: session?.id,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.hannah.ultrathink', 'auth/db timeout', { error: err });
      return NextResponse.json({ error: 'Operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.hannah.ultrathink', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
