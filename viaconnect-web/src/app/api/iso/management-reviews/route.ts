// Prompt #127 P6: ISO 27001 management review write route. Clause 9.3.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ISO_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

interface Body {
  reviewDate?: string;
  attendees?: string;
  inputsSummary?: string;
  decisions?: unknown[];
  actionItems?: unknown[];
  storageKey?: string | null;
}

export async function POST(req: NextRequest) {
  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!ISO_ADMIN_ROLES.has(role)) return NextResponse.json({ error: 'ISO admin role required' }, { status: 403 });

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const reviewDate = (body.reviewDate ?? '').trim();
  const attendees = (body.attendees ?? '').trim();
  const inputsSummary = (body.inputsSummary ?? '').trim();

  if (!reviewDate) return NextResponse.json({ error: 'review_date_required' }, { status: 400 });
  if (attendees.length < 5) return NextResponse.json({ error: 'attendees_too_short', minLength: 5 }, { status: 400 });
  if (inputsSummary.length < 20) return NextResponse.json({ error: 'inputs_summary_too_short', minLength: 20 }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await sb
    .from('iso_management_reviews')
    .insert({
      review_date: reviewDate,
      attendees,
      inputs_summary: inputsSummary,
      decisions: Array.isArray(body.decisions) ? body.decisions : [],
      action_items: Array.isArray(body.actionItems) ? body.actionItems : [],
      storage_key: body.storageKey ?? null,
      recorded_by: user.id,
    })
    .select('id')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[iso management-reviews] insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
