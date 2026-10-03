import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  aiConsentDeniedBody,
  aiRouteNeedsConsent,
  decideAiConsentAccess,
  isAiDataSharingGateEnabled,
} from './consent';
import { readAiConsentSnapshot } from './read-consent';

function jsonStatus(status: 401 | 403): NextResponse {
  return NextResponse.json(aiConsentDeniedBody(status), { status });
}

/**
 * Returns a response when this request must not reach an AI vendor.
 * Returns null when the call may continue. Never throws.
 * Fail closed while the gate is on: a lookup error or a missing session
 * does not fall through to the vendor.
 */
export async function blockAiRouteWithoutConsent(
  request: NextRequest,
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  try {
    if (!isAiDataSharingGateEnabled()) return null;
    if (!aiRouteNeedsConsent(pathname, method)) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      safeLog.warn('ai-consent', 'gate on without supabase env', { path: pathname });
      return jsonStatus(403);
    }

    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {
          /* Session refresh already ran in updateSession. */
        },
        remove() {
          /* Read-only check. */
        },
      },
    });

    let userId: string | null = null;
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getClaims(),
        2000,
        'ai-consent.getClaims',
      );
      if (!error) {
        const sub = data?.claims?.sub;
        userId = typeof sub === 'string' && sub.length > 0 ? sub : null;
      }
    } catch (error) {
      safeLog.warn('ai-consent', 'claims lookup failed', { path: pathname, error });
      userId = null;
    }

    if (!userId) return jsonStatus(401);

    let row: Awaited<ReturnType<typeof readAiConsentSnapshot>>;
    try {
      row = await withTimeout(
        readAiConsentSnapshot(supabase, userId),
        2000,
        'ai-consent.read',
      );
    } catch (error) {
      safeLog.warn('ai-consent', 'consent read failed', { path: pathname, error });
      row = 'error';
    }

    const decision = decideAiConsentAccess(true, userId, row);
    if (decision === 'allow') return null;
    return jsonStatus(decision === 'unauthenticated' ? 401 : 403);
  } catch (error) {
    safeLog.warn('ai-consent', 'block failed closed', { path: pathname, error });
    if (!isAiDataSharingGateEnabled()) return null;
    if (!aiRouteNeedsConsent(pathname, method)) return null;
    return jsonStatus(403);
  }
}
