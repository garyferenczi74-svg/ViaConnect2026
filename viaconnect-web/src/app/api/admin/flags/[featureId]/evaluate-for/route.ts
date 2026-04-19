// Prompt #93 Phase 4: live flag-for-user inspection.
//
// POST /api/admin/flags/[featureId]/evaluate-for
// Body: { userId: string | null }
// Admin-only. Bypasses the evaluateFlagCached wrapper so an admin sees the
// current database state, not a cached answer. Useful for debugging "why
// cannot user X see feature Y?" without disturbing production caching.

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/flags/admin-guard';
import { evaluateFlag } from '@/lib/flags/evaluation-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { featureId: string } },
) {
  const auth = await requireAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as { userId?: string | null } | null;
  const targetUserId = body?.userId ?? null;

  const result = await evaluateFlag({
    userId: targetUserId,
    featureId: params.featureId,
  });

  return NextResponse.json({ inspected_user: targetUserId, result });
}
