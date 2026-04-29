// Prompt #124 P4: Disposition POST endpoint.
//
// Steve Rica (compliance_officer / compliance_admin / admin / superadmin)
// records a disposition on a determination. The body is a single row into
// counterfeit_dispositions; RLS enforces decided_by = auth.uid().
//
// We do NOT auto-submit takedowns. A disposition of 'confirmed_counterfeit'
// surfaces a "Draft takedown" CTA on the detail page; submission is a
// separate action in P5.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

const VALID_DISPOSITIONS = new Set([
  'confirmed_counterfeit',
  'confirmed_authentic',
  'confirmed_unauthorized_channel',
  'inconclusive_after_review',
  'requires_test_buy',
  'referred_to_legal',
  'dismissed',
]);

interface Body {
  disposition: string;
  confirmationNote?: string | null;
  disagreedWithModel?: boolean;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.marshall.vision.disposition.auth');
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!COMPLIANCE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
    if (!VALID_DISPOSITIONS.has(body.disposition)) {
      return NextResponse.json({ error: 'invalid_disposition' }, { status: 400 });
    }
    if (body.disposition === 'confirmed_counterfeit' || body.disposition === 'referred_to_legal') {
      if (!body.confirmationNote || body.confirmationNote.trim().length < 10) {
        return NextResponse.json({ error: 'confirmation_note_required' }, { status: 400 });
      }
    }

    const determinationId = params.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from('counterfeit_dispositions')
      .insert({
        determination_id: determinationId,
        disposition: body.disposition,
        confirmation_note: body.confirmationNote ?? null,
        decided_by: user.id,
        disagreed_with_model: body.disagreedWithModel === true,
      })
      .select('id, decided_at')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as { id: string; decided_at: string };
    return NextResponse.json({
      ok: true,
      dispositionId: row.id,
      decidedAt: row.decided_at,
      nextSteps: nextStepsFor(body.disposition),
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.vision.disposition', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.vision.disposition', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

function nextStepsFor(disposition: string): string[] {
  switch (disposition) {
    case 'confirmed_counterfeit':
      return ['Route to takedown drafter', 'Open coordinated-attack search'];
    case 'confirmed_unauthorized_channel':
      return ['Open gray-market investigation card', 'Check authorized-reseller list'];
    case 'requires_test_buy':
      return ['Initiate test buy at /admin/marshall/vision/test-buys/new'];
    case 'referred_to_legal':
      return ['Notify Thomas + Gary', 'Pause automated workflow on this target'];
    case 'dismissed':
      return ['Close determination'];
    default:
      return [];
  }
}
