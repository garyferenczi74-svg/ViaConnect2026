// =============================================================================
// GET /api/body-tracker/entitlement  (Prompt #169a, realigned to the #169f TIER
// MODEL)
//
// Read-only body-scan entitlement for the authenticated consumer. The client
// data path for the body-scan UI guard points (dashboard entry, pre-capture,
// results upgrade card). The AUTHORITATIVE gate stays server-side at finalize
// (the body_photo_sessions finalize trigger, migration 20260516000150); this
// route only feeds the UX so the page can show the normal entry vs a Platinum
// upgrade prompt.
//
// Entitlement is resolved by REUSING resolveBodyScanEntitlement from
// src/lib/body-tracker/entitlement-check.ts (the TS mirror of the SQL resolver
// fn_resolve_body_scan_tier_status). Under #169f the Free tier has NO body scan
// and the free teaser is RETIRED, so there is no profiles.free_body_scan_used
// read and no teaser flag in the response. No membership logic is duplicated
// here.
//
// Mirrors the auth + timeout + logging conventions of /api/pricing/tier.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveBodyScanEntitlement } from '@/lib/body-tracker/entitlement-check';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export interface BodyScanEntitlementResponse {
  entitled: boolean;
  subscriptionId: string | null;
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

    // Unauthenticated: report a non-entitled baseline. The UI treats this as
    // "show the Platinum upgrade prompt"; any real scan still requires sign-in
    // and passes through the server gate.
    if (!user) {
      const anon: BodyScanEntitlementResponse = {
        entitled: false,
        subscriptionId: null,
        authenticated: false,
      };
      return NextResponse.json(anon);
    }

    try {
      // Entitlement signal: reuse the shared body-scan entitlement resolver (the
      // TS mirror of the SQL resolver, over the web membership system).
      // practitionerManaged is intentionally NOT inferred here; the consumer
      // self-view is never a practitioner-managed context, and the server
      // finalize verifies practitioner relationships itself.
      const entitlement = await withTimeout(
        resolveBodyScanEntitlement(supabase, user.id),
        8000,
        'api.body-tracker.entitlement.resolve',
      );

      const payload: BodyScanEntitlementResponse = {
        entitled: entitlement.entitled,
        subscriptionId: entitlement.subscriptionId,
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
