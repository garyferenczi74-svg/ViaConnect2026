// Prompt #122 P8: Auditor magic-link sender.
//
// POST /api/auditor/send-link { email, firmName }
//
// Two-factor gate in lieu of SMS 2FA (P9 operational carry-in):
//   1. Email must match an active non-revoked soc2_auditor_grants row
//   2. Submitted firmName must match the stored auditor_firm (case-insensitive,
//      whitespace-normalized)
// Only after BOTH match do we send a Supabase magic link. This keeps a
// stolen email address alone from triggering a login.
//
// We deliberately return success regardless of match to avoid revealing
// whether an email has an active grant (timing-safe-ish; attacker can still
// time the response but both paths touch the DB once).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

interface Body {
  email?: string;
  firmName?: string;
}

const GENERIC_ACK = { ok: true, message: 'If your grant is active, a secure link is on its way.' };

export async function POST(req: NextRequest) {
  try {
    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

    const email = (body.email ?? '').trim().toLowerCase();
    const firmRaw = (body.firmName ?? '').trim();

    if (!email || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (!firmRaw) {
      return NextResponse.json({ error: 'firm_required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: grant } = await withTimeout(
      (async () => sb
        .from('soc2_auditor_grants')
        .select('id, auditor_firm, expires_at, revoked')
        .eq('auditor_email', email)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle())(),
      8000,
      'api.auditor.send-link.grant',
    );

    const grantRow = grant as { id: string; auditor_firm: string; expires_at: string; revoked: boolean } | null;
    const firmMatches = grantRow && normalize(grantRow.auditor_firm) === normalize(firmRaw);

    if (!grantRow || !firmMatches) {
      // Return generic success, never reveal grant existence.
      return NextResponse.json(GENERIC_ACK);
    }

    const nextBase = process.env.NEXTJS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://viaconnectapp.com';
    // Uses Supabase's already-configured email path. This does NOT modify any
    // auth template or SMTP wiring; those are explicitly locked per Gary's
    // memo. signInWithOtp triggers Supabase to email the user the link.
    const session = createServerClient();
    const { error } = await withTimeout(
      session.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${nextBase.replace(/\/$/, '')}/auditor/dashboard`,
        },
      }),
      10000,
      'api.auditor.send-link.otp',
    );

    if (error) {
      safeLog.error('api.auditor.send-link', 'signInWithOtp failed', { email, message: error.message });
      // Still return the generic ack so no enumeration occurs.
      return NextResponse.json(GENERIC_ACK);
    }

    return NextResponse.json(GENERIC_ACK);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.auditor.send-link', 'timeout', { error: err });
      // Still return the generic ack so no enumeration occurs.
      return NextResponse.json(GENERIC_ACK);
    }
    safeLog.error('api.auditor.send-link', 'unexpected error', { error: err });
    return NextResponse.json(GENERIC_ACK);
  }
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
