// Prompt #127 P6: ISO 27001 Statement of Applicability (SoA) write route.
// Clause 6.1.3, SoA.
//
// Creates a new version of the SoA row for a given control_ref. Version is
// auto-bumped server-side: the latest version for the control is queried
// and the new row gets version + 1. Prior versions remain for audit-trail
// integrity; the narrator reads the highest-version row whose effective_from
// <= packet period end.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ISO_ADMIN_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);
const VALID_APPLICABILITY = new Set(['applicable', 'excluded']);
const VALID_IMPL_STATUS = new Set(['implemented', 'in_progress', 'planned', 'not_applicable']);

interface Body {
  controlRef?: string;
  applicability?: string;
  justification?: string;
  implementationStatus?: string;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
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

  const controlRef = (body.controlRef ?? '').trim();
  const applicability = (body.applicability ?? '').trim();
  const justification = (body.justification ?? '').trim();
  const implementationStatus = (body.implementationStatus ?? '').trim();
  const effectiveFrom = (body.effectiveFrom ?? '').trim();

  if (!controlRef) return NextResponse.json({ error: 'control_ref_required' }, { status: 400 });
  if (!VALID_APPLICABILITY.has(applicability)) return NextResponse.json({ error: 'invalid_applicability' }, { status: 400 });
  if (justification.length < 20) return NextResponse.json({ error: 'justification_too_short', minLength: 20 }, { status: 400 });
  if (!VALID_IMPL_STATUS.has(implementationStatus)) return NextResponse.json({ error: 'invalid_implementation_status' }, { status: 400 });
  if (!effectiveFrom) return NextResponse.json({ error: 'effective_from_required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = session as any;

  // Auto-bump version: latest version for this control ref + 1, or 1 if none exist.
  const { data: priorRow } = await sb
    .from('iso_statements_of_applicability')
    .select('version')
    .eq('control_ref', controlRef)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const priorVersion = (priorRow as { version?: number } | null)?.version ?? 0;
  const nextVersion = priorVersion + 1;

  const { data, error } = await sb
    .from('iso_statements_of_applicability')
    .insert({
      control_ref: controlRef,
      version: nextVersion,
      applicability,
      justification,
      implementation_status: implementationStatus,
      effective_from: effectiveFrom,
      effective_until: body.effectiveUntil ?? null,
      recorded_by: user.id,
    })
    .select('id, version')
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[iso soa] insert failed', { message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  const row = data as { id: string; version: number };
  return NextResponse.json({ ok: true, id: row.id, version: row.version });
}
