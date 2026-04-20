// Prompt #98 Phase 7: Admin tax summary (W-9 + 1099 status).
//
// GET: list practitioners with tax earnings, W-9 status, 1099 status.
// Filterable by tax_year (defaults to current year) and
// form_1099_required=true to narrow to the 1099 pipeline.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const taxYear = Number(url.searchParams.get('tax_year') ?? now.getUTCFullYear());
  const requiredOnly = url.searchParams.get('required_only') === 'true';

  let q = sb
    .from('practitioner_referral_tax_earnings')
    .select(`
      id, practitioner_id, tax_year, total_earned_cents,
      crossed_600_threshold, crossed_600_threshold_at,
      form_1099_required, form_1099_generated, form_1099_generated_at, form_1099_document_url,
      w9_on_file, w9_collected_at, w9_document_url,
      practitioners!inner (practice_name, display_name)
    `)
    .eq('tax_year', taxYear)
    .order('total_earned_cents', { ascending: false });
  if (requiredOnly) q = q.eq('form_1099_required', true);

  const { data, error } = await q.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as Array<any>).map((t) => ({
    id: t.id,
    practitioner_id: t.practitioner_id,
    practice_name: t.practitioners?.practice_name ?? t.practitioners?.display_name ?? null,
    tax_year: t.tax_year,
    total_earned_cents: t.total_earned_cents,
    crossed_600_threshold: t.crossed_600_threshold,
    crossed_600_threshold_at: t.crossed_600_threshold_at,
    form_1099_required: t.form_1099_required,
    form_1099_generated: t.form_1099_generated,
    form_1099_generated_at: t.form_1099_generated_at,
    form_1099_document_url: t.form_1099_document_url,
    w9_on_file: t.w9_on_file,
    w9_collected_at: t.w9_collected_at,
    w9_document_url: t.w9_document_url,
  }));

  return NextResponse.json({ tax_year: taxYear, rows });
}
