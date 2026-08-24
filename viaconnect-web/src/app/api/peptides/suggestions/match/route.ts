/**
 * Prompt 226d Wave B: deterministic evidence-matched peptide briefing.
 * Never model-selected. G28 naming: suggestions only.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  runSuggestionMatch,
  type ScreeningInput,
} from '@/lib/peptides/suggestionMatch226d';
import { SUGGESTION_COPY_226D } from '@/lib/peptides/suggestionCopy226d';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const goalSlugs = Array.isArray(body.goalSlugs)
    ? body.goalSlugs.filter((g): g is string => typeof g === 'string')
    : [];

  const screeningRaw = (body.screening ?? {}) as Record<string, unknown>;
  const screening: ScreeningInput = {
    pregnantOrBreastfeedingOrTrying:
      typeof screeningRaw.pregnantOrBreastfeedingOrTrying === 'boolean'
        ? screeningRaw.pregnantOrBreastfeedingOrTrying
        : null,
    under18:
      typeof screeningRaw.under18 === 'boolean' ? screeningRaw.under18 : null,
    missingCriticalScreen:
      typeof screeningRaw.missingCriticalScreen === 'boolean'
        ? screeningRaw.missingCriticalScreen
        : false,
  };

  const result = await runSuggestionMatch({
    userId: user.id,
    goalSlugs,
    screening,
    persistSession: true,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, copy: SUGGESTION_COPY_226D },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    featureName: SUGGESTION_COPY_226D.featureName,
    copy: SUGGESTION_COPY_226D,
    thin: result.thin,
    goals: result.goals,
    bands: result.bands,
    screeningBlocked: result.screeningBlocked,
    screeningReason: result.screeningReason,
    sessionId: result.sessionId,
  });
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    featureName: SUGGESTION_COPY_226D.featureName,
    copy: SUGGESTION_COPY_226D,
    goalChips: (
      await import('@/lib/peptides/suggestionMatch226d')
    ).SUGGESTION_GOAL_CHIPS,
  });
}
