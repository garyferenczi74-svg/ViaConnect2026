// Prompt #93 Phase 2.3: Flag evaluation cache.
//
// Flag evaluation runs on every request in the hot path, so caching is
// essential. We use Next's `unstable_cache` with tag-based invalidation:
//   * Cache key is (userId, featureId). Anonymous uses `anon`.
//   * Tags are `flag:<featureId>` (invalidated on any flag config change)
//     and `user:<userId>` (invalidated when a user's entitlements change).
// Admins call `invalidateFlag` after every audit-trail-tracked change so
// the kill switch takes effect within one request.

import { unstable_cache } from 'next/cache';
import { evaluateFlag } from './evaluation-engine';
import type { FlagEvaluationResult } from '@/types/flags';

const CACHE_DURATION_SECONDS = 60;

export function evaluateFlagCached(
  userId: string | null,
  featureId: string,
): Promise<FlagEvaluationResult> {
  return unstable_cache(
    () => evaluateFlag({ userId, featureId }),
    [`flag-eval-${userId ?? 'anon'}-${featureId}`],
    {
      revalidate: CACHE_DURATION_SECONDS,
      tags: [`flag:${featureId}`, userId ? `user:${userId}` : 'user:anon'],
    },
  )();
}

export async function invalidateFlag(featureId: string): Promise<void> {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(`flag:${featureId}`);
}

export async function invalidateUser(userId: string): Promise<void> {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(`user:${userId}`);
}
