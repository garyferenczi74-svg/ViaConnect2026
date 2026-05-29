// =============================================================================
// GET /api/body-tracker/entitlement  (Prompt #169a, spec section 3.1)
//
// Read-only body-scan entitlement for the authenticated consumer. The client
// data path for the three UI guard points (dashboard entry, pre-capture,
// results upgrade card). The AUTHORITATIVE gate stays server-side at finalize
// (supabase/functions/body-scan-analyze); this route only feeds the UX so the
// page can show a teaser banner vs. a paywall vs. the normal entry.
//
// Premium is resolved by REUSING resolveBodyScanEntitlement from
// src/lib/body-tracker/entitlement-check.ts (which reuses the web membership
// system). The free-teaser flag is read straight off profiles.free_body_scan_used.
// No membership logic is duplicated here.
//
// Mirrors the auth + timeout + logging conventions of /api/pricing/tier.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveBodyScanEntitlement } from '@/lib/body-tracker/entitlement-check';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export interface BodyScanEntitlementResponse {
  premium: boolean;
  subscriptionId: string | null;
  freeTeaserUsed: boolean;
  authenticated: boolean;
}

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.body-tracker.entitlement.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.body-tracker.entitlement', 'auth timeout', { requestId, error: err });
        return NextResponse.json(
          { error: 'Authentication timed out. Please try again.' },
          { status: 503 },
        );
      }
      throw err;
    }

    // Unauthenticated: report a non-premium, teaser-unused baseline. The UI
    // treats this as "show the free teaser invitation"; any real scan still
    // requires sign-in and passes through the server gate.
    if (!user) {
      const anon: BodyScanEntitlementResponse = {
        premium: false,
        subscriptionId: null,
        freeTeaserUsed: false,
        authenticated: false,
      };
      return NextResponse.json(anon);
    }

    try {
      // Premium signal: reuse the shared body-scan entitlement resolver (web
      // membership system). practitionerManaged is intentionally NOT inferred
      // here; the consumer self-view is never a practitioner-managed context,
      // and the server finalize verifies practitioner relationships itself.
      // The free-teaser read is a separate call: profiles.free_body_scan_used is
      // a #169a-migration column not yet in the generated Supabase types, so it
      // uses the same loose-cast pattern as the body-tracker hooks.
      type TeaserReader = {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: { free_body_scan_used?: boolean | null } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
      const teaserReader = supabase as unknown as TeaserReader;

      const [entitlement, profileResult] = await Promise.all([
        withTimeout(
          resolveBodyScanEntitlement(supabase, user.id),
          8000,
          'api.body-tracker.entitlement.resolve',
        ),
        withTimeout(
          teaserReader
            .from('profiles')
            .select('free_body_scan_used')
            .eq('id', user.id)
            .maybeSingle(),
          8000,
          'api.body-tracker.entitlement.teaser',
        ),
      ]);

      const freeTeaserUsed = profileResult.data?.free_body_scan_used === true;

      const payload: BodyScanEntitlementResponse = {
        premium: entitlement.premium,
        subscriptionId: entitlement.subscriptionId,
        freeTeaserUsed,
        authenticated: true,
      };
      return NextResponse.json(payload);
    } catch (error) {
      if (isTimeoutError(error)) {
        safeLog.error('api.body-tracker.entitlement', 'resolve timeout', { requestId, error });
        return NextResponse.json(
          { error: 'Entitlement resolution timed out. Please try again.' },
          { status: 503 },
        );
      }
      safeLog.error('api.body-tracker.entitlement', 'resolve failed', { requestId, error });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve entitlement' },
        { status: 500 },
      );
    }
  } catch (err) {
    safeLog.error('api.body-tracker.entitlement', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
