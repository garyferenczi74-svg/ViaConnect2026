// Prompt #127 P6: ISO 27001 nonconformity and corrective action write route.
// Clause 10.2.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ISO_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const VALID_SOURCE = new Set(['internal_audit', 'external_audit', 'incident', 'management_review', 'risk_review', 'other']);
const VALID_SEVERITY = new Set(['major', 'minor', 'observation']);
const VALID_STATUS = new Set(['open', 'root_cause_analysis', 'action_planned', 'in_progress', 'closed', 'verified']);

interface Body {
  ncRef?: string;
  source?: string;
  sourceRef?: string | null;
  description?: string;
  severity?: string;
  rootCause?: string | null;
  correctiveAction?: string | null;
  targetDate?: string | null;
  status?: string;
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

  const ncRef = (body.ncRef ?? '').trim();
  const source = (body.source ?? '').trim();
  const description = (body.description ?? '').trim();
  const severity = (body.severity ?? '').trim();
  const status = (body.status ?? '').trim();

  if (!ncRef) return NextResponse.json({ error: 'nc_ref_required' }, { status: 400 });
  if (!VALID_SOURCE.has(source)) return NextResponse.json({ error: 'invalid_source' }, { status: 400 });
  if (description.length < 20) return NextResponse.json({ error: 'description_too_short', minLength: 20 }, { status: 400 });
  if (!VALID_SEVERITY.has(severity)) return NextResponse.json({ error: 'invalid_severity' }, { status: 400 });
  if (!VALID_STATUS.has(status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;
  const { data, error } = await sb
    .from('iso_nonconformities')
    .insert({
      nc_ref: ncRef,
      source,
      source_ref: body.sourceRef ?? null,
      description,
      severity,
      root_cause: body.rootCause ?? null,
      corrective_action: body.correctiveAction ?? null,
      target_date: body.targetDate ?? null,
      status,
      recorded_by: user.id,
    })
    .select('id')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[iso nonconformities] insert failed', { message: error.message });
    if (error.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'duplicate_nc_ref' }, { status: 409 });
    }
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
