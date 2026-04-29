// Prompt #98 Phase 7: Admin per-row tax update (W-9 + 1099 tracking).
//
// PATCH /api/admin/practitioner-referrals/tax/[practitionerId]/[taxYear]
//
// Body supports:
//   { w9_on_file: true,      w9_document_url?: string }
//   { w9_on_file: false }                 -- revoke (rare)
//   { form_1099_generated: true, form_1099_document_url?: string }
//
// Actual PDF generation for 1099s is deferred to governance approval +
// a downstream batch job. This endpoint only records that a form was
// generated so the program-health dashboard can show pipeline status.
// Values that change trigger an updated_at bump.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { practitionerId: string; taxYear: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.admin.practitioner-referrals.tax.patch.auth',
    );
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const { data: profile } = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.tax.patch.profile',
    );
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const taxYear = Number(params.taxYear);
    if (!Number.isInteger(taxYear) || taxYear < 2020 || taxYear > 2100) {
      return NextResponse.json({ error: 'Invalid tax_year' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) ?? {};
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const nowIso = new Date().toISOString();

    if (body.w9_on_file === true) {
      update.w9_on_file = true;
      update.w9_collected_at = nowIso;
      update.w9_collected_by = user.id;
      if (typeof body.w9_document_url === 'string' && body.w9_document_url.length > 0) {
        update.w9_document_url = body.w9_document_url;
      }
    } else if (body.w9_on_file === false) {
      update.w9_on_file = false;
      update.w9_collected_at = null;
      update.w9_collected_by = null;
      update.w9_document_url = null;
    }

    if (body.form_1099_generated === true) {
      update.form_1099_generated = true;
      update.form_1099_generated_at = nowIso;
      update.form_1099_generated_by = user.id;
      if (typeof body.form_1099_document_url === 'string' && body.form_1099_document_url.length > 0) {
        update.form_1099_document_url = body.form_1099_document_url;
      }
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'No recognized fields in body' }, { status: 400 });
    }

    // Upsert: if the row doesn't exist yet (admin pre-marking W-9 before
    // any earnings), insert a zero-earnings row so the update lands.
    const { data: existing } = await withTimeout(
      (async () =>
        sb
          .from('practitioner_referral_tax_earnings')
          .select('id')
          .eq('practitioner_id', params.practitionerId)
          .eq('tax_year', taxYear)
          .maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.tax.patch.existing',
    );

    if (!existing) {
      const { error: insertErr } = await withTimeout(
        (async () =>
          sb.from('practitioner_referral_tax_earnings').insert({
            practitioner_id: params.practitionerId,
            tax_year: taxYear,
            ...update,
          }))(),
        8000,
        'api.admin.practitioner-referrals.tax.patch.insert',
      );
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, created: true });
    }

    const { error: updateErr } = await withTimeout(
      (async () =>
        sb
          .from('practitioner_referral_tax_earnings')
          .update(update)
          .eq('practitioner_id', params.practitionerId)
          .eq('tax_year', taxYear))(),
      8000,
      'api.admin.practitioner-referrals.tax.patch.update',
    );
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, updated: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.practitioner-referrals.tax.patch', 'request timed out', { error: err });
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    safeLog.error('api.admin.practitioner-referrals.tax.patch', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
