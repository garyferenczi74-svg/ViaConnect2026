// Prompt #93 Phase 3: client flag evaluation endpoint.
//
// GET /api/flags/evaluate?feature=<featureId>
// Returns a FlagEvaluationResult. Routes through the cached evaluation
// engine so client and server see identical state within the 60s TTL.
// Never returns Helix internals — the flag system intentionally knows
// nothing about Helix balances, tiers, or rewards.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateFlagCached } from '@/lib/flags/cache';

export async function GET(request: NextRequest) {
  const featureId = request.nextUrl.searchParams.get('feature');
  if (!featureId) {
    return NextResponse.json({ error: 'Missing feature query parameter' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const result = await evaluateFlagCached(userId, featureId);
  return NextResponse.json(result);
}
